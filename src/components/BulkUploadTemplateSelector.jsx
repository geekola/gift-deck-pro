"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens (from PSF design token system — confirmed) ──────────────
const tokens = {
  dark: {
    bgBase: "#0F0F0F",
    surface: "#181818",
    surfaceRaised: "#1F1F1F",
    textPrimary: "#EAEAEA",
    textSecondary: "#AFAFAF",
    border: "#2A2A2A",
  },
  light: {
    bgBase: "#EAEAEA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    textPrimary: "#181818",
    textSecondary: "#6B6B6B",
    border: "#D5D5D5",
  },
  gold: "#B98128",
};

// Scoped via AskUserQuestion: CSV-only real wiring. .xlsx generation/
// parsing would need a new binary-spreadsheet dependency (SheetJS) for a
// feature CSV already covers functionally - the upload panel already told
// brands to use CSV for full validation, so leaving .xlsx as a stub changes
// nothing that was true before. Real parts now: CSV template download,
// full client-side CSV parse + row validation (was already real), and a
// real Supabase commit on Import that inserts into products +
// product_variants per ProductForm.jsx's insert shape.
const CATEGORIES = [
  {
    key: "Casual",
    label: "Casual",
    sizing: "XS – XXL",
    desc: "Standard ready-to-wear sizing.",
    sizeColumns: ["XS qty", "S qty", "M qty", "L qty", "XL qty", "XXL qty"],
    kind: "simple",
  },
  {
    key: "Business",
    label: "Business",
    sizing: "XS – XXL",
    desc: "Same sizing structure as Casual.",
    sizeColumns: ["XS qty", "S qty", "M qty", "L qty", "XL qty", "XXL qty"],
    kind: "simple",
  },
  {
    key: "Formal",
    label: "Formal",
    sizing: "Waist, jacket, neck",
    desc: "Suiting-style measurements, not standard sizes.",
    sizeColumns: ["Waist sizes & qty", "Jacket sizes & qty", "Neck sizes & qty"],
    kind: "compound",
    example: { "Waist sizes & qty": "32:2, 34:1", "Jacket sizes & qty": "40:2", "Neck sizes & qty": "15.5:3" },
  },
  {
    key: "Footwear",
    label: "Footwear",
    sizing: "Numeric (6–13, half sizes)",
    desc: "Numeric shoe sizing.",
    sizeColumns: [
      "Size 6 qty", "Size 6_5 qty", "Size 7 qty", "Size 7_5 qty", "Size 8 qty", "Size 8_5 qty",
      "Size 9 qty", "Size 9_5 qty", "Size 10 qty", "Size 10_5 qty", "Size 11 qty", "Size 11_5 qty",
      "Size 12 qty", "Size 13 qty",
    ],
    kind: "simple",
  },
  {
    key: "Custom",
    label: "Custom",
    sizing: "Open / free text",
    desc: "No fixed sizing system — for one-off or bespoke items.",
    sizeColumns: ["Size label (free text)", "Quantity"],
    kind: "custom",
  },
];

// Common product-level columns every template shares, in header order.
const COMMON_HEADERS = [
  "Product name", "Description", "Item type", "Cost price", "Retail price",
  "Currency", "Return policy", "Made to order?", "Delivery window", "Low-stock alert level",
];

function parseCSV(text) {
  // Minimal CSV parser — handles quoted fields with embedded commas.
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function csvField(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function generateTemplateCSV(cat) {
  const headers = [...COMMON_HEADERS, ...cat.sizeColumns];
  const example = {
    "Product name": `Example ${cat.label} Item`,
    Description: "One-line description of the item.",
    "Item type": "purchase",
    "Cost price": "45.00",
    "Retail price": "120.00",
    Currency: "USD",
    "Return policy": "30-day return window.",
    "Made to order?": "FALSE",
    "Delivery window": "",
    "Low-stock alert level": "3",
  };
  if (cat.kind === "simple") {
    // Fill the first size column with a sample quantity, leave the rest
    // blank — matches "at least one size required" rather than every size.
    example[cat.sizeColumns[0]] = "5";
  } else if (cat.kind === "compound") {
    Object.assign(example, cat.example);
  } else if (cat.kind === "custom") {
    example["Size label (free text)"] = "One Size";
    example["Quantity"] = "10";
  }
  const rows = [headers, headers.map((h) => example[h] ?? "")];
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n");
}

function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parses one "label:qty, label:qty" free-text cell (Formal category) into
// individual {label, qty} entries. Bare tokens with no ":qty" are allowed
// only for made-to-order rows (qty stays null) - documented in the
// template's example row rather than enforced by any schema, since this
// is a free-text convention, not a fixed column.
function parseCompoundCell(value, isMTO) {
  const entries = [];
  const errors = [];
  const tokens = String(value || "").split(/[;,]/).map((t) => t.trim()).filter(Boolean);
  for (const token of tokens) {
    const [label, qtyRaw] = token.split(":").map((s) => s?.trim());
    if (!label) continue;
    if (qtyRaw === undefined || qtyRaw === "") {
      if (!isMTO) {
        errors.push(`"${token}" is missing a quantity (expected "size:qty", e.g. "32:2").`);
        continue;
      }
      entries.push({ label, qty: null });
    } else if (isNaN(Number(qtyRaw)) || Number(qtyRaw) < 0) {
      errors.push(`"${token}" has an invalid quantity.`);
    } else {
      entries.push({ label, qty: Number(qtyRaw) });
    }
  }
  return { entries, errors };
}

function buildRowRecord(row, headers, category) {
  const idx = (name) => headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const colIdx = {
    name: idx("Product name"),
    description: idx("Description"),
    itemType: idx("Item type"),
    costPrice: idx("Cost price"),
    retailPrice: idx("Retail price"),
    currency: idx("Currency"),
    returnPolicy: idx("Return policy"),
    isMTO: idx("Made to order?"),
    deliveryWindow: idx("Delivery window"),
    lowStock: idx("Low-stock alert level"),
  };
  const get = (i) => (i >= 0 ? (row[i] || "").trim() : "");

  const errors = [];

  const name = get(colIdx.name);
  const description = get(colIdx.description);
  const itemType = get(colIdx.itemType).toLowerCase();
  const costPrice = get(colIdx.costPrice);
  const retailPrice = get(colIdx.retailPrice);
  const currency = get(colIdx.currency);
  const returnPolicy = get(colIdx.returnPolicy);
  const isMTORaw = get(colIdx.isMTO).toUpperCase();
  const isMTO = isMTORaw === "TRUE";
  const deliveryWindow = get(colIdx.deliveryWindow);
  const lowStockRaw = get(colIdx.lowStock);

  if (!name) errors.push("Product name is required.");
  if (!description) errors.push("Description is required.");
  if (itemType !== "gift" && itemType !== "purchase") {
    errors.push('Item type must be exactly "gift" or "purchase".');
  }
  if (!costPrice || isNaN(Number(costPrice)) || Number(costPrice) < 0) {
    errors.push("Cost price is required and must be a number (mandatory for every item type).");
  }
  if (itemType === "purchase") {
    if (!retailPrice || isNaN(Number(retailPrice)) || Number(retailPrice) < 0) {
      errors.push("Retail price is required for purchase items.");
    }
    if (!returnPolicy) errors.push("Return policy is required for purchase items.");
  }
  if (currency !== "USD" && currency !== "EUR") {
    errors.push('Currency must be exactly "USD" or "EUR".');
  }
  if (isMTORaw !== "TRUE" && isMTORaw !== "FALSE") {
    errors.push('Made to order? must be exactly "TRUE" or "FALSE".');
  }
  if (isMTO && !deliveryWindow) {
    errors.push("Delivery window is required when made to order is TRUE.");
  }
  if (lowStockRaw && (isNaN(Number(lowStockRaw)) || Number(lowStockRaw) < 0)) {
    errors.push("Low-stock alert level must be a non-negative number if provided.");
  }

  // Size/variant parsing — every product needs at least one named size,
  // made-to-order or not (a size is what the customer picks in the swipe
  // deck; only whether stock is tracked differs). Only the stock number
  // itself is optional when made-to-order.
  const variants = [];
  if (category.kind === "simple") {
    for (const col of category.sizeColumns) {
      const i = idx(col);
      const cellRaw = get(i);
      if (!cellRaw) continue;
      const sizeLabel = col.replace(/^Size /, "").replace(/ qty$/, "").replace(/_/g, ".");
      if (isMTO) {
        variants.push({ size: sizeLabel, stockQuantity: null });
      } else if (isNaN(Number(cellRaw)) || Number(cellRaw) < 0) {
        errors.push(`"${col}" must be a non-negative number.`);
      } else {
        variants.push({ size: sizeLabel, stockQuantity: Number(cellRaw) });
      }
    }
  } else if (category.kind === "compound") {
    for (const col of category.sizeColumns) {
      const i = idx(col);
      const cellRaw = get(i);
      if (!cellRaw) continue;
      const dimension = col.replace(/ sizes & qty$/, "");
      const { entries, errors: cellErrors } = parseCompoundCell(cellRaw, isMTO);
      cellErrors.forEach((e) => errors.push(`"${col}": ${e}`));
      entries.forEach((e) => variants.push({ size: `${dimension} ${e.label}`, stockQuantity: e.qty }));
    }
  } else if (category.kind === "custom") {
    const label = get(idx("Size label (free text)"));
    const qtyRaw = get(idx("Quantity"));
    if (label) {
      if (isMTO) {
        variants.push({ size: label, stockQuantity: null });
      } else if (!qtyRaw || isNaN(Number(qtyRaw)) || Number(qtyRaw) < 0) {
        errors.push('"Quantity" is required and must be a non-negative number.');
      } else {
        variants.push({ size: label, stockQuantity: Number(qtyRaw) });
      }
    }
  }

  if (variants.length === 0) {
    errors.push(
      "At least one size column must be filled in — every product needs at least one named size, even made-to-order items."
    );
  }

  return {
    name: name || "(missing name)",
    errors,
    record:
      errors.length === 0
        ? {
            name,
            description,
            itemType,
            costPrice: Number(costPrice),
            price: itemType === "purchase" ? Number(retailPrice) : null,
            currency,
            returnPolicy: itemType === "purchase" ? returnPolicy : null,
            isMadeToOrder: isMTO,
            deliveryWindow: isMTO ? deliveryWindow : null,
            variants: variants.map((v) => ({
              size: v.size,
              stockQuantity: isMTO ? null : v.stockQuantity,
              lowStockThreshold: lowStockRaw ? Number(lowStockRaw) : null,
            })),
          }
        : null,
  };
}

function validateRows(headers, dataRows, category) {
  return dataRows.map((row, i) => {
    const built = buildRowRecord(row, headers, category);
    return { rowNumber: i + 2, name: built.name, errors: built.errors, record: built.record };
  });
}

export default function BulkUploadTemplateSelector() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [parseError, setParseError] = useState("");
  const [brandId, setBrandId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = React.useRef(null);

  // Dark only, matching BrandNav.jsx's sidebar - see ProductCatalogue.jsx
  // for why the per-page theme toggle was removed.
  const t = tokens.dark;
  const category = CATEGORIES.find((c) => c.key === selectedCategory);

  useEffect(() => {
    const loadBrand = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("brand_id").eq("id", user.id).single();
      setBrandId(profile?.brand_id || null);
    };
    loadBrand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetUploadState = () => {
    setFileName(null);
    setValidationResults(null);
    setParseError("");
    setImportResults(null);
  };

  const processFile = (file) => {
    setParseError("");
    setValidationResults(null);
    setImportResults(null);

    if (!file) return;
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");

    if (!isCsv && !isXlsx) {
      setParseError("Unsupported file type. Upload a .csv or .xlsx file.");
      setFileName(file.name);
      return;
    }

    setFileName(file.name);

    if (isXlsx) {
      // .xlsx parsing isn't wired — CSV is parsed fully and for real,
      // below, and covers the same data. Scoped this way deliberately
      // (CSV-only) rather than adding a binary-spreadsheet dependency for
      // a format the CSV path already handles.
      setParseError(
        "This screen parses .csv files directly in the browser. Download the .csv template above for full row-level validation and import."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result);
        if (rows.length < 2) {
          setParseError("File appears to have no data rows below the header.");
          return;
        }
        const headers = rows[0];
        const dataRows = rows.slice(1);
        const results = validateRows(headers, dataRows, category);
        setValidationResults(results);
      } catch (err) {
        setParseError("Could not read this file as CSV. Check it isn't corrupted.");
      }
    };
    reader.onerror = () => setParseError("Could not read this file.");
    reader.readAsText(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleImport = async () => {
    if (!brandId || !validationResults) return;
    const passed = validationResults.filter((r) => r.errors.length === 0 && r.record);
    if (passed.length === 0) return;

    setIsImporting(true);
    const results = [];

    // Sequential, one product at a time — mirrors ProductForm.jsx's own
    // non-transactional product-then-variants insert (two REST calls, no
    // cross-row transaction), and gives each row an individual pass/fail
    // result rather than an all-or-nothing batch.
    for (const row of passed) {
      const rec = row.record;
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          brand_id: brandId,
          name: rec.name,
          description: rec.description,
          category: category.key,
          item_type: rec.itemType,
          cost_price: rec.costPrice,
          price: rec.price,
          currency: rec.currency,
          is_made_to_order: rec.isMadeToOrder,
          delivery_window: rec.deliveryWindow,
          return_policy: rec.returnPolicy,
          images: [],
          hero_image_index: 0,
          erp_synced: false,
        })
        .select("id")
        .single();

      if (productError || !product) {
        results.push({ name: rec.name, success: false, message: productError?.message || "Couldn't save the product." });
        continue;
      }

      const variantRows = rec.variants.map((v) => ({
        product_id: product.id,
        size: v.size,
        stock_quantity: v.stockQuantity,
        low_stock_threshold: v.lowStockThreshold,
      }));
      const { error: variantError } = await supabase.from("product_variants").insert(variantRows);

      if (variantError) {
        results.push({ name: rec.name, success: false, message: `Product saved, but sizes failed: ${variantError.message}` });
      } else {
        results.push({ name: rec.name, success: true, message: "" });
      }
    }

    setImportResults(results);
    setIsImporting(false);
  };

  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        padding: "28px 20px",
        transition: "background 0.2s ease",
      }}
    >

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              width: 28,
              height: 3,
              background: tokens.gold,
              borderRadius: 2,
              marginBottom: 12,
            }}
          />
          <h1
            style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}
          >
            Bulk Upload
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, maxWidth: 480 }}>
            Download the .csv template matching your product category, fill it in, then upload it
            below. Sizing columns differ by category, so the right template matters. Images
            aren't supported through bulk upload — add those from the catalogue afterward.
          </p>
        </div>

        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: "20px 22px",
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: t.textPrimary,
              margin: "0 0 14px 0",
            }}
          >
            1. Choose Your Product Category
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <div
                  key={cat.key}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    resetUploadState();
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "13px 16px",
                    borderRadius: 9,
                    cursor: "pointer",
                    border: isSelected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                    background: isSelected ? "rgba(185,129,40,0.1)" : t.surfaceRaised,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: isSelected ? tokens.gold : t.textPrimary,
                      }}
                    >
                      {cat.label}
                    </span>
                    <p style={{ fontSize: 12, color: t.textSecondary, margin: "3px 0 0 0" }}>
                      {cat.desc}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: t.textSecondary,
                      background: t.bgBase,
                      padding: "4px 10px",
                      borderRadius: 6,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                  >
                    {cat.sizing}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {category && (
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: t.textPrimary,
                margin: "0 0 4px 0",
              }}
            >
              2. Download the {category.label} Template
            </p>
            <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 14px 0" }}>
              Includes column headers and one filled-in example row.
              {category.kind === "compound" &&
                ' Waist/jacket/neck columns accept multiple sizes per cell, e.g. "32:2, 34:1".'}
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button
                onClick={() =>
                  downloadTextFile(
                    `PSF_Bulk_Upload_Template_${category.key}.csv`,
                    generateTemplateCSV(category),
                    "text/csv;charset=utf-8;"
                  )
                }
                style={{
                  flex: 1,
                  padding: "11px 0",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#0F0F0F",
                  background: tokens.gold,
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                Download .csv
              </button>
              <button
                onClick={() =>
                  alert(
                    ".xlsx isn't supported yet — download the .csv template above, which covers the same data and gets full row-level validation."
                  )
                }
                style={{
                  flex: 1,
                  padding: "11px 0",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: t.textPrimary,
                  background: "transparent",
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                Download .xlsx
              </button>
            </div>

            <div
              style={{
                borderTop: `1px solid ${t.border}`,
                paddingTop: 14,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: t.textPrimary,
                  margin: "0 0 10px 0",
                }}
              >
                3. Upload Your Completed File
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileInputChange}
                style={{ display: "none" }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                  border: `1px dashed ${isDragging ? tokens.gold : t.border}`,
                  background: isDragging ? "rgba(185,129,40,0.08)" : "transparent",
                  borderRadius: 9,
                  padding: "22px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "background 0.15s ease, border-color 0.15s ease",
                }}
              >
                {fileName ? (
                  <p style={{ fontSize: 13, color: t.textPrimary, margin: 0, fontWeight: 500 }}>
                    {fileName}
                  </p>
                ) : (
                  <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
                    Click to choose a file, or drag and drop
                  </p>
                )}
                <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "4px 0 0 0" }}>
                  .csv or .xlsx — must match the {category.label} template's columns exactly
                </p>
              </div>

              {fileName && (
                <button
                  onClick={resetUploadState}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: t.textSecondary,
                    background: "transparent",
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontFamily: "'Roboto', sans-serif",
                    marginTop: 10,
                  }}
                >
                  Remove File
                </button>
              )}

              {parseError && (
                <p style={{ fontSize: 12.5, color: "#E27A7A", margin: "12px 0 0 0", lineHeight: 1.5 }}>
                  {parseError}
                </p>
              )}

              {validationResults && !importResults && (
                <div style={{ marginTop: 16 }}>
                  {(() => {
                    const failed = validationResults.filter((r) => r.errors.length > 0);
                    const passed = validationResults.filter((r) => r.errors.length === 0);
                    return (
                      <>
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            marginBottom: 12,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: "#8FBF5A",
                              background: "rgba(99,153,34,0.14)",
                              padding: "4px 10px",
                              borderRadius: 6,
                            }}
                          >
                            {passed.length} row{passed.length === 1 ? "" : "s"} ready to import
                          </span>
                          {failed.length > 0 && (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#E27A7A",
                                background: "rgba(194,71,71,0.14)",
                                padding: "4px 10px",
                                borderRadius: 6,
                              }}
                            >
                              {failed.length} row{failed.length === 1 ? "" : "s"} need attention
                            </span>
                          )}
                        </div>

                        {failed.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {failed.map((r) => (
                              <div
                                key={r.rowNumber}
                                style={{
                                  background: "rgba(194,71,71,0.08)",
                                  border: "1px solid rgba(194,71,71,0.25)",
                                  borderRadius: 8,
                                  padding: "10px 14px",
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 500,
                                    color: t.textPrimary,
                                    margin: "0 0 5px 0",
                                  }}
                                >
                                  Row {r.rowNumber} — {r.name}
                                </p>
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                  {r.errors.map((err, i) => (
                                    <li
                                      key={i}
                                      style={{ fontSize: 12, color: "#E27A7A", marginBottom: 2 }}
                                    >
                                      {err}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}

                        {passed.length > 0 && (
                          <p
                            style={{
                              fontSize: 11.5,
                              color: t.textSecondary,
                              margin: "10px 0 0 0",
                              lineHeight: 1.5,
                            }}
                          >
                            {failed.length > 0
                              ? `The ${passed.length} clean row${passed.length === 1 ? "" : "s"} would still import — only the flagged rows above are blocked.`
                              : "All rows passed validation and would import cleanly."}
                          </p>
                        )}

                        {passed.length > 0 && (
                          <button
                            disabled={isImporting || !brandId}
                            style={{
                              width: "100%",
                              marginTop: 14,
                              padding: "11px 0",
                              fontSize: 13.5,
                              fontWeight: 500,
                              color: "#0F0F0F",
                              background: tokens.gold,
                              border: "none",
                              borderRadius: 8,
                              cursor: isImporting || !brandId ? "default" : "pointer",
                              opacity: isImporting || !brandId ? 0.6 : 1,
                              fontFamily: "'Roboto', sans-serif",
                            }}
                            onClick={handleImport}
                          >
                            {isImporting
                              ? "Importing…"
                              : !brandId
                              ? "Couldn't load your brand account"
                              : `Import ${passed.length} product${passed.length === 1 ? "" : "s"}`}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {importResults && (
                <div style={{ marginTop: 16 }}>
                  {(() => {
                    const succeeded = importResults.filter((r) => r.success);
                    const failed = importResults.filter((r) => !r.success);
                    return (
                      <>
                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: "#8FBF5A",
                              background: "rgba(99,153,34,0.14)",
                              padding: "4px 10px",
                              borderRadius: 6,
                            }}
                          >
                            {succeeded.length} imported
                          </span>
                          {failed.length > 0 && (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#E27A7A",
                                background: "rgba(194,71,71,0.14)",
                                padding: "4px 10px",
                                borderRadius: 6,
                              }}
                            >
                              {failed.length} failed
                            </span>
                          )}
                        </div>

                        {failed.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                            {failed.map((r, i) => (
                              <div
                                key={i}
                                style={{
                                  background: "rgba(194,71,71,0.08)",
                                  border: "1px solid rgba(194,71,71,0.25)",
                                  borderRadius: 8,
                                  padding: "10px 14px",
                                }}
                              >
                                <p style={{ fontSize: 12.5, fontWeight: 500, color: t.textPrimary, margin: "0 0 3px 0" }}>
                                  {r.name}
                                </p>
                                <p style={{ fontSize: 12, color: "#E27A7A", margin: 0 }}>{r.message}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {succeeded.length > 0 && (
                          <button
                            onClick={() => router.push("/brand/products")}
                            style={{
                              width: "100%",
                              padding: "11px 0",
                              fontSize: 13.5,
                              fontWeight: 500,
                              color: "#0F0F0F",
                              background: tokens.gold,
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontFamily: "'Roboto', sans-serif",
                            }}
                          >
                            View Catalogue
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <p
                style={{
                  fontSize: 11.5,
                  color: t.textSecondary,
                  margin: "10px 0 0 0",
                  lineHeight: 1.5,
                }}
              >
                Rows with missing required fields (cost price, item type, etc.) fail row-level
                validation and are flagged individually — the rest of the file still imports.
              </p>
            </div>
          </div>
        )}

        <div
          style={{
            background: "rgba(185,129,40,0.08)",
            border: `1px solid rgba(185,129,40,0.25)`,
            borderRadius: 10,
            padding: "12px 16px",
          }}
        >
          <p style={{ fontSize: 12, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            Reminder: quantity columns represent your gifting allocation set aside for PSF — not
            your total retail or warehouse inventory. Quantities are individual units, not sets.
          </p>
        </div>
      </div>
    </div>
  );
}
