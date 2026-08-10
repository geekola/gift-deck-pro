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
    inputBg: "#141414",
  },
  light: {
    bgBase: "#EAEAEA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    textPrimary: "#181818",
    textSecondary: "#6B6B6B",
    border: "#D5D5D5",
    inputBg: "#FFFFFF",
  },
  gold: "#B98128",
};

const CATEGORIES = ["Casual", "Business", "Formal", "Custom"];
const CURRENCIES = ["USD", "EUR"];

let variantIdCounter = 1;
function newVariant() {
  return {
    id: `draft_v_${variantIdCounter++}`,
    size: "",
    stockQuantity: "",
    lowStockThreshold: "",
  };
}

function validate(form, erpSyncEnabled) {
  const errors = {};

  if (!form.name.trim()) errors.name = "Product name is required.";
  if (!form.description.trim()) errors.description = "Description is required.";
  if (!form.category) errors.category = "Select a category.";

  if (form.costPrice === "" || isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) {
    errors.costPrice = "Cost price is required (mandatory regardless of item type).";
  }

  if (form.itemType === "purchase") {
    if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 0) {
      errors.price = "Retail price is required for purchase items.";
    }
    if (!form.returnPolicy.trim()) {
      errors.returnPolicy = "Return policy is required for purchase items.";
    }
  }

  if (form.isMadeToOrder && !form.deliveryWindow.trim()) {
    errors.deliveryWindow = "Delivery window is mandatory for made-to-order items.";
  }

  if (form.images.length === 0) {
    errors.images = "At least one image is required.";
  }

  // Variant-level validation
  const variantErrors = {};
  form.variants.forEach((v) => {
    const vErr = {};
    if (!v.size.trim()) vErr.size = "Size label is required.";

    // stockQuantity required UNLESS: ERP-sync-pending OR made-to-order
    if (!form.isMadeToOrder && !erpSyncEnabled) {
      if (v.stockQuantity === "" || isNaN(Number(v.stockQuantity)) || Number(v.stockQuantity) < 0) {
        vErr.stockQuantity = "Required — enter 0 if none in stock.";
      }
    }
    if (Object.keys(vErr).length > 0) variantErrors[v.id] = vErr;
  });
  if (Object.keys(variantErrors).length > 0) errors.variants = variantErrors;
  if (form.variants.length === 0) errors.noVariants = "Add at least one size.";

  return errors;
}

export default function ProductForm() {
  const [theme, setTheme] = useState("dark");
  const [erpSyncEnabled, setErpSyncEnabled] = useState(false); // toggle to preview the ERP-pending stock state
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    itemType: "gift",
    costPrice: "",
    price: "",
    currency: "USD",
    returnPolicy: "",
    isMadeToOrder: false,
    deliveryWindow: "",
    images: [],
    heroImageIndex: 0,
    variants: [newVariant()],
  });

  const t = tokens[theme];

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const markTouched = (key) => setTouched((tt) => ({ ...tt, [key]: true }));

  const handleVariantChange = (id, key, value) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v.id === id ? { ...v, [key]: value } : v)),
    }));
  };

  const addVariant = () => {
    setForm((f) => ({ ...f, variants: [...f.variants, newVariant()] }));
  };

  const removeVariant = (id) => {
    setForm((f) => ({ ...f, variants: f.variants.filter((v) => v.id !== id) }));
  };

  const handleAddMockImage = () => {
    if (form.images.length >= 3) return;
    setForm((f) => ({ ...f, images: [...f.images, `mock_image_${f.images.length + 1}`] }));
  };

  const removeImage = (idx) => {
    setForm((f) => {
      const newImages = f.images.filter((_, i) => i !== idx);
      let heroImageIndex = f.heroImageIndex;
      if (idx === f.heroImageIndex) heroImageIndex = 0;
      else if (idx < f.heroImageIndex) heroImageIndex -= 1;
      return { ...f, images: newImages, heroImageIndex: Math.max(0, heroImageIndex) };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const allErrors = validate(form, erpSyncEnabled);
    setErrors(allErrors);
    setTouched({
      name: true,
      description: true,
      category: true,
      costPrice: true,
      price: true,
      returnPolicy: true,
      deliveryWindow: true,
      images: true,
    });
    if (Object.keys(allErrors).length === 0) {
      setSubmitted(true);
    }
  };

  const labelStyle = {
    display: "block",
    fontSize: 12.5,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 6,
    letterSpacing: "0.01em",
  };

  const inputStyle = (hasError) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    fontSize: 13.5,
    fontFamily: "'Roboto', sans-serif",
    color: t.textPrimary,
    background: t.inputBg,
    border: `1px solid ${hasError ? "#C24747" : t.border}`,
    borderRadius: 8,
    outline: "none",
  });

  const sectionTitleStyle = {
    fontSize: 13,
    fontWeight: 500,
    color: t.textPrimary,
    margin: "0 0 14px 0",
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  if (submitted) {
    return (
      <div
        style={{
          fontFamily: "'Roboto', sans-serif",
          background: t.bgBase,
          minHeight: 640,
          padding: "32px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
        />
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: "32px 28px",
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 28,
              height: 3,
              background: tokens.gold,
              borderRadius: 2,
              margin: "0 auto 18px auto",
            }}
          />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, margin: "0 0 8px 0" }}>
            Product saved
          </h1>
          <p style={{ fontSize: 13.5, color: t.textSecondary, lineHeight: 1.6, margin: "0 0 22px 0" }}>
            "{form.name}" passed all validation and would now be written to the catalogue.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#0F0F0F",
              background: tokens.gold,
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              cursor: "pointer",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Back to form
          </button>
        </div>
      </div>
    );
  }

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
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
      />

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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setErpSyncEnabled((v) => !v)}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: erpSyncEnabled ? tokens.gold : t.textSecondary,
              background: erpSyncEnabled ? "rgba(185,129,40,0.12)" : "transparent",
              border: `1px solid ${erpSyncEnabled ? tokens.gold : t.border}`,
              borderRadius: 6,
              padding: "5px 10px",
              cursor: "pointer",
              fontFamily: "'Roboto', sans-serif",
            }}
            title="Preview-only toggle — simulates this brand having ERP stock sync enabled"
          >
            {erpSyncEnabled ? "Preview: ERP-synced brand" : "Preview: no ERP"}
          </button>
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}>
            Add product
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
            All fields enforce the current schema rules live as you fill them in.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Basic info ── */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <p style={sectionTitleStyle}>Basic information</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Product name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                onBlur={() => markTouched("name")}
                placeholder="e.g. Peak Lapel Tuxedo"
                style={inputStyle(touched.name && errors.name)}
              />
              {touched.name && errors.name && (
                <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.name}</p>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                onBlur={() => markTouched("description")}
                rows={3}
                placeholder="Brief description shown to the customer"
                style={{ ...inputStyle(touched.description && errors.description), resize: "vertical" }}
              />
              {touched.description && errors.description && (
                <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>
                  {errors.description}
                </p>
              )}
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={labelStyle}>Category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.map((cat) => {
                  const selected = form.category === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => {
                        setField("category", cat);
                        markTouched("category");
                      }}
                      style={{
                        padding: "8px 14px",
                        fontSize: 13,
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 500,
                        borderRadius: 7,
                        cursor: "pointer",
                        border: selected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                        background: selected ? "rgba(185,129,40,0.12)" : "transparent",
                        color: selected ? tokens.gold : t.textPrimary,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "6px 0 0 0", lineHeight: 1.4 }}>
                Pure style taxonomy — independent of made-to-order status below.
              </p>
              {touched.category && errors.category && (
                <p style={{ fontSize: 12, color: "#E27A7A", margin: "6px 0 0 0" }}>
                  {errors.category}
                </p>
              )}
            </div>
          </div>

          {/* ── Pricing & item type ── */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <p style={sectionTitleStyle}>Pricing &amp; item type</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Item type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { key: "gift", label: "Gift" },
                  { key: "purchase", label: "Purchase" },
                ].map((opt) => {
                  const selected = form.itemType === opt.key;
                  return (
                    <button
                      type="button"
                      key={opt.key}
                      onClick={() => setField("itemType", opt.key)}
                      style={{
                        flex: 1,
                        padding: "9px 0",
                        fontSize: 13,
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 500,
                        borderRadius: 7,
                        cursor: "pointer",
                        border: selected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                        background: selected ? "rgba(185,129,40,0.12)" : "transparent",
                        color: selected ? tokens.gold : t.textPrimary,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Cost price (internal — never shown to customer)</label>
                <input
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => setField("costPrice", e.target.value)}
                  onBlur={() => markTouched("costPrice")}
                  placeholder="0.00"
                  style={inputStyle(touched.costPrice && errors.costPrice)}
                />
                {touched.costPrice && errors.costPrice && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>
                    {errors.costPrice}
                  </p>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>
                  Retail price {form.itemType === "purchase" ? "(required)" : "(n/a for gift items)"}
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  onBlur={() => markTouched("price")}
                  placeholder={form.itemType === "purchase" ? "0.00" : "—"}
                  disabled={form.itemType !== "purchase"}
                  style={{
                    ...inputStyle(touched.price && errors.price),
                    opacity: form.itemType !== "purchase" ? 0.45 : 1,
                  }}
                />
                {touched.price && errors.price && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>
                    {errors.price}
                  </p>
                )}
              </div>
              <div style={{ flex: "0 0 100px" }}>
                <label style={labelStyle}>Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value)}
                  style={inputStyle(false)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.itemType === "purchase" && (
              <div>
                <label style={labelStyle}>Return policy (required for purchase items)</label>
                <textarea
                  value={form.returnPolicy}
                  onChange={(e) => setField("returnPolicy", e.target.value)}
                  onBlur={() => markTouched("returnPolicy")}
                  rows={2}
                  placeholder="e.g. Returns accepted within 14 days, unworn with tags."
                  style={{
                    ...inputStyle(touched.returnPolicy && errors.returnPolicy),
                    resize: "vertical",
                  }}
                />
                {touched.returnPolicy && errors.returnPolicy && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>
                    {errors.returnPolicy}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Made to order ── */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: form.isMadeToOrder ? 14 : 0,
              }}
            >
              <div>
                <p style={{ ...sectionTitleStyle, margin: 0 }}>Made to order</p>
                <p style={{ fontSize: 12, color: t.textSecondary, margin: "4px 0 0 0", maxWidth: 440 }}>
                  Independent of category — any of the four categories may be made-to-order.
                  No stock tracking applies; item is always treated as available.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setField("isMadeToOrder", !form.isMadeToOrder)}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: form.isMadeToOrder ? tokens.gold : t.border,
                  position: "relative",
                  marginLeft: 16,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: form.isMadeToOrder ? 23 : 3,
                    transition: "left 0.15s ease",
                  }}
                />
              </button>
            </div>

            {form.isMadeToOrder && (
              <div>
                <label style={labelStyle}>Delivery window (mandatory)</label>
                <input
                  type="text"
                  value={form.deliveryWindow}
                  onChange={(e) => setField("deliveryWindow", e.target.value)}
                  onBlur={() => markTouched("deliveryWindow")}
                  placeholder="e.g. 4–6 weeks"
                  style={inputStyle(touched.deliveryWindow && errors.deliveryWindow)}
                />
                {touched.deliveryWindow && errors.deliveryWindow && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>
                    {errors.deliveryWindow}
                  </p>
                )}
                <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "8px 0 0 0", lineHeight: 1.4 }}>
                  The customer-facing card will show a "Made to Order" watermark, applied at
                  presentation time. Disclosure timing: shown before payment for purchase items,
                  at order confirmation for gift items.
                </p>
              </div>
            )}
          </div>

          {/* ── Images ── */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <p style={sectionTitleStyle}>
              Images{" "}
              <span style={{ color: t.textSecondary, fontWeight: 400, fontSize: 12 }}>
                ({form.images.length}/3)
              </span>
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              {form.images.map((img, idx) => (
                <div
                  key={img}
                  onClick={() => setField("heroImageIndex", idx)}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 8,
                    background: t.surfaceRaised,
                    border: `2px solid ${idx === form.heroImageIndex ? tokens.gold : t.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: t.textSecondary,
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  IMG {idx + 1}
                  {idx === form.heroImageIndex && (
                    <span style={{ fontSize: 9, color: tokens.gold, marginTop: 3 }}>HERO</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#C24747",
                      color: "#fff",
                      border: "none",
                      fontSize: 11,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {form.images.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddMockImage}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 8,
                    background: "transparent",
                    border: `1px dashed ${t.border}`,
                    color: t.textSecondary,
                    fontSize: 22,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0 }}>
              Click a thumbnail to set it as the hero image. Max 3, no override path.
            </p>
            {touched.images && errors.images && (
              <p style={{ fontSize: 12, color: "#E27A7A", margin: "6px 0 0 0" }}>
                {errors.images}
              </p>
            )}
          </div>

          {/* ── Sizes (variants) ── */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 20,
            }}
          >
            <p style={sectionTitleStyle}>Sizes (variants)</p>

            {erpSyncEnabled && !form.isMadeToOrder && (
              <p
                style={{
                  fontSize: 12,
                  color: tokens.gold,
                  background: "rgba(185,129,40,0.1)",
                  border: `1px solid rgba(185,129,40,0.3)`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  margin: "0 0 14px 0",
                  lineHeight: 1.5,
                }}
              >
                This brand has ERP stock sync enabled. Stock quantity is read-only here and will
                populate once the ERP syncs — leaving it blank is valid in this mode.
              </p>
            )}

            {form.isMadeToOrder && (
              <p
                style={{
                  fontSize: 12,
                  color: t.textSecondary,
                  margin: "0 0 14px 0",
                  lineHeight: 1.5,
                }}
              >
                Made-to-order items still need size rows for customer selection — stock quantity
                doesn't apply and stays blank/untracked.
              </p>
            )}

            {form.variants.map((v, idx) => (
              <div
                key={v.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  {idx === 0 && <label style={labelStyle}>Size</label>}
                  <input
                    type="text"
                    value={v.size}
                    onChange={(e) => handleVariantChange(v.id, "size", e.target.value)}
                    placeholder="e.g. 42R, M, EU 39"
                    style={inputStyle(errors.variants?.[v.id]?.size)}
                  />
                  {errors.variants?.[v.id]?.size && (
                    <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "4px 0 0 0" }}>
                      {errors.variants[v.id].size}
                    </p>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {idx === 0 && (
                    <label style={labelStyle}>
                      Stock qty{" "}
                      {form.isMadeToOrder || erpSyncEnabled ? "(n/a)" : "(required)"}
                    </label>
                  )}
                  <input
                    type="number"
                    value={v.stockQuantity}
                    onChange={(e) => handleVariantChange(v.id, "stockQuantity", e.target.value)}
                    placeholder={form.isMadeToOrder ? "Always available" : erpSyncEnabled ? "Pending sync" : "0"}
                    disabled={form.isMadeToOrder || erpSyncEnabled}
                    style={{
                      ...inputStyle(errors.variants?.[v.id]?.stockQuantity),
                      opacity: form.isMadeToOrder || erpSyncEnabled ? 0.45 : 1,
                    }}
                  />
                  {errors.variants?.[v.id]?.stockQuantity && (
                    <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "4px 0 0 0" }}>
                      {errors.variants[v.id].stockQuantity}
                    </p>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {idx === 0 && <label style={labelStyle}>Low-stock alert</label>}
                  <input
                    type="number"
                    value={v.lowStockThreshold}
                    onChange={(e) =>
                      handleVariantChange(v.id, "lowStockThreshold", e.target.value)
                    }
                    placeholder="Optional"
                    disabled={form.isMadeToOrder || erpSyncEnabled}
                    style={{
                      ...inputStyle(false),
                      opacity: form.isMadeToOrder || erpSyncEnabled ? 0.45 : 1,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeVariant(v.id)}
                  style={{
                    flexShrink: 0,
                    marginTop: idx === 0 ? 22 : 0,
                    width: 36,
                    height: 38,
                    borderRadius: 8,
                    background: "transparent",
                    border: `1px solid ${t.border}`,
                    color: t.textSecondary,
                    cursor: "pointer",
                    fontSize: 15,
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            {errors.noVariants && (
              <p style={{ fontSize: 12, color: "#E27A7A", margin: "0 0 10px 0" }}>
                {errors.noVariants}
              </p>
            )}

            <button
              type="button"
              onClick={addVariant}
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: tokens.gold,
                background: "transparent",
                border: `1px solid ${tokens.gold}`,
                borderRadius: 7,
                padding: "7px 14px",
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
                marginTop: 4,
              }}
            >
              + Add size
            </button>
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "13px 0",
              fontSize: 14.5,
              fontWeight: 500,
              fontFamily: "'Roboto', sans-serif",
              color: "#0F0F0F",
              background: tokens.gold,
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Save product
          </button>
        </form>
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
        Prototype preview — mock data only, no live backend connection
      </p>
    </div>
  );
}
