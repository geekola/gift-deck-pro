"use client";

import React, { useState } from "react";

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

const CATEGORIES = [
  {
    key: "Casual",
    label: "Casual",
    sizing: "XS \u2013 XXL",
    desc: "Standard ready-to-wear sizing.",
    sizeColumns: ["XS qty", "S qty", "M qty", "L qty", "XL qty", "XXL qty"],
  },
  {
    key: "Business",
    label: "Business",
    sizing: "XS \u2013 XXL",
    desc: "Same sizing structure as Casual.",
    sizeColumns: ["XS qty", "S qty", "M qty", "L qty", "XL qty", "XXL qty"],
  },
  {
    key: "Formal",
    label: "Formal",
    sizing: "Waist, jacket, neck",
    desc: "Suiting-style measurements, not standard sizes.",
    sizeColumns: ["Waist sizes & qty", "Jacket sizes & qty", "Neck sizes & qty"],
  },
  {
    key: "Footwear",
    label: "Footwear",
    sizing: "Numeric (6\u201313, half sizes)",
    desc: "Numeric shoe sizing.",
    sizeColumns: [
      "Size 6 qty", "Size 6_5 qty", "Size 7 qty", "Size 7_5 qty", "Size 8 qty", "Size 8_5 qty",
      "Size 9 qty", "Size 9_5 qty", "Size 10 qty", "Size 10_5 qty", "Size 11 qty", "Size 11_5 qty",
      "Size 12 qty", "Size 13 qty",
    ],
  },
  {
    key: "Custom",
    label: "Custom",
    sizing: "Open / free text",
    desc: "No fixed sizing system — for one-off or bespoke items.",
    sizeColumns: ["Size label (free text)", "Quantity"],
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

function validateRows(headers, dataRows, category) {
  const idx = (name) => headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const colIdx = {
    name: idx("Product name"),
    itemType: idx("Item type"),
    costPrice: idx("Cost price"),
    retailPrice: idx("Retail price"),
    currency: idx("Currency"),
    returnPolicy: idx("Return policy"),
    isMTO: idx("Made to order?"),
    deliveryWindow: idx("Delivery window"),
  };

  const cat = CATEGORIES.find((c) => c.key === category);
  const sizeColIdxs = cat.sizeColumns
    .map((label) => ({ label, i: idx(label) }))
    .filter((c) => c.i !== -1);

  const results = dataRows.map((row, i) => {
    const errors = [];
    const get = (i2) => (i2 >= 0 ? (row[i2] || "").trim() : "");

    const name = get(colIdx.name);
    const itemType = get(colIdx.itemType).toLowerCase();
    const costPrice = get(colIdx.costPrice);
    const retailPrice = get(colIdx.retailPrice);
    const currency = get(colIdx.currency);
    const returnPolicy = get(colIdx.returnPolicy);
    const isMTO = get(colIdx.isMTO).toUpperCase();
    const deliveryWindow = get(colIdx.deliveryWindow);

    if (!name) errors.push("Product name is required.");
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
    if (isMTO !== "TRUE" && isMTO !== "FALSE") {
      errors.push('Made to order? must be exactly "TRUE" or "FALSE".');
    }
    if (isMTO === "TRUE" && !deliveryWindow) {
      errors.push("Delivery window is required when made to order is TRUE.");
    }

    // Stock validation: required unless made-to-order. At least one size
    // column must carry a value (or, for Formal, a size:qty pair).
    if (isMTO !== "TRUE") {
      const anyStock = sizeColIdxs.some(({ i: colI }) => get(colI) !== "");
      if (!anyStock) {
        errors.push(
          "At least one size column must have a quantity — stock quantity is required unless the item is made to order."
        );
      }
    }

    return { rowNumber: i + 2, name: name || "(missing name)", errors }; // +2: header row + 1-index
  });

  return results;
}

export default function BulkUploadTemplateSelector() {
  const [theme, setTheme] = useState("dark");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [parseError, setParseError] = useState("");
  const fileInputRef = React.useRef(null);

  const t = tokens[theme];

  const resetUploadState = () => {
    setFileName(null);
    setValidationResults(null);
    setParseError("");
  };

  const processFile = (file) => {
    setParseError("");
    setValidationResults(null);

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
      // Real .xlsx binary parsing needs a library (e.g. SheetJS) not loaded in
      // this preview — CSV is parsed fully and for real, below.
      setParseError(
        "This preview parses .csv files directly in the browser. For a live .xlsx upload, the real build will parse it server-side the same way — try the .csv version of the template here to see full row-level validation now."
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
        const results = validateRows(headers, dataRows, selectedCategory);
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

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          maxWidth: 720,
          margin: "0 auto 24px auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            Gift Deck Pro
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: t.textSecondary,
              letterSpacing: "0.03em",
            }}
          >
            BRAND PORTAL
          </span>
        </div>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: t.textSecondary,
            background: "transparent",
            border: `1px solid ${t.border}`,
            borderRadius: 6,
            padding: "5px 10px",
            cursor: "pointer",
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          {theme === "dark" ? "Preview: light" : "Preview: dark"}
        </button>
      </div>

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
            Bulk upload
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, maxWidth: 480 }}>
            Download the template matching your product category, fill it in, then upload it
            below. Sizing columns differ by category, so the right template matters.
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
            1. Choose your product category
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

        {selectedCategory && (
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
              2. Download the {selectedCategory} template
            </p>
            <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 14px 0" }}>
              Includes an instructions tab, column reference, and one filled-in example row.
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button
                onClick={() =>
                  alert(
                    `In the real app, this downloads PSF_Bulk_Upload_Template_${selectedCategory}.xlsx`
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
                Download .xlsx
              </button>
              <button
                onClick={() =>
                  alert(
                    `In the real app, this downloads PSF_Bulk_Upload_Template_${selectedCategory}.csv`
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
                Download .csv
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
                3. Upload your completed file
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
                  .csv or .xlsx — must match the {selectedCategory} template's columns exactly
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
                  Remove file
                </button>
              )}

              {parseError && (
                <p style={{ fontSize: 12.5, color: "#E27A7A", margin: "12px 0 0 0", lineHeight: 1.5 }}>
                  {parseError}
                </p>
              )}

              {validationResults && (
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

                        {failed.length === 0 && (
                          <button
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
                              cursor: "pointer",
                              fontFamily: "'Roboto', sans-serif",
                            }}
                            onClick={() =>
                              alert(
                                `In the real app, this commits ${passed.length} product(s) to your catalogue.`
                              )
                            }
                          >
                            Import {passed.length} product{passed.length === 1 ? "" : "s"}
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

      <p
        style={{
          fontSize: 11,
          color: t.textSecondary,
          marginTop: 18,
          opacity: 0.7,
          textAlign: "center",
        }}
      >
        Prototype preview — mock data only, no live backend connection. Downloads are simulated.
      </p>
    </div>
  );
}
