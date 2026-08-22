"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef(null);

  const [erpSyncEnabled, setErpSyncEnabled] = useState(false); // per-product products.erp_synced
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [brandId, setBrandId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  // Dark only, matching BrandNav.jsx's sidebar - see ProductCatalogue.jsx
  // for why the per-page theme toggle was removed.
  const t = tokens.dark;

  // ProductForm only ever renders inside the brand (protected) route
  // group, so a session + approved brand_user is guaranteed by the
  // layout guard - this just needs the brand_id to write products
  // against and to scope the storage upload path.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("brand_id")
        .eq("id", user.id)
        .single();
      if (error || !profile?.brand_id) {
        setLoadError("Couldn't load your brand account. Try refreshing.");
        return;
      }
      setBrandId(profile.brand_id);
    })();
  }, []);

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

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || form.images.length >= 3 || !brandId) return;

    setIsUploading(true);
    setSubmitError("");
    const ext = file.name.split(".").pop();
    const path = `${brandId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file);

    if (uploadError) {
      setIsUploading(false);
      setSubmitError(`Image upload failed: ${uploadError.message}`);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(path);

    setIsUploading(false);
    setForm((f) => ({ ...f, images: [...f.images, publicUrl] }));
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

  const handleSubmit = async (e) => {
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
    if (Object.keys(allErrors).length > 0) return;

    if (!brandId) {
      setSubmitError("Couldn't load your brand account. Try refreshing.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        brand_id: brandId,
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        item_type: form.itemType,
        cost_price: Number(form.costPrice),
        price: form.itemType === "purchase" ? Number(form.price) : null,
        currency: form.currency,
        is_made_to_order: form.isMadeToOrder,
        delivery_window: form.isMadeToOrder ? form.deliveryWindow.trim() : null,
        return_policy: form.itemType === "purchase" ? form.returnPolicy.trim() : null,
        images: form.images,
        hero_image_index: form.heroImageIndex,
        erp_synced: erpSyncEnabled,
      })
      .select("id")
      .single();

    if (productError || !product) {
      setIsSubmitting(false);
      setSubmitError(productError?.message || "Couldn't save the product.");
      return;
    }

    const variantRows = form.variants.map((v) => ({
      product_id: product.id,
      size: v.size.trim(),
      stock_quantity:
        form.isMadeToOrder || erpSyncEnabled || v.stockQuantity === ""
          ? null
          : Number(v.stockQuantity),
      low_stock_threshold: v.lowStockThreshold === "" ? null : Number(v.lowStockThreshold),
    }));

    const { error: variantError } = await supabase.from("product_variants").insert(variantRows);

    setIsSubmitting(false);

    if (variantError) {
      // Product row exists but variants failed - surface it rather than
      // silently leaving a sizeless product in the catalogue. Not rolled
      // back automatically (no transaction across two REST calls); the
      // brand can delete/retry from the catalogue.
      setSubmitError(`Product saved, but sizes failed to save: ${variantError.message}`);
      return;
    }

    setSubmitted(true);
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
            Product Saved
          </h1>
          <p style={{ fontSize: 13.5, color: t.textSecondary, lineHeight: 1.6, margin: "0 0 22px 0" }}>
            "{form.name}" was added to your catalogue.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => router.push("/brand/products")}
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
              Back to Catalogue
            </button>
            <button
              onClick={() => {
                setForm({
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
                setErrors({});
                setTouched({});
                setErpSyncEnabled(false);
                setSubmitted(false);
              }}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: t.textSecondary,
                background: "transparent",
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "10px 18px",
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              Add Another
            </button>
          </div>
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

      {/* Top bar - just the ERP toggle now. The "Gift Deck Pro / Brand
          Portal" branding and theme-preview toggle that used to live here
          were removed as redundant with BrandNav.jsx's persistent sidebar,
          which already renders the same branding once. */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 24,
          maxWidth: 720,
          margin: "0 auto 24px auto",
        }}
      >
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
          title="Stock for this item is mirrored from an external ERP instead of tracked manually — stock quantity fields become read-only"
        >
          {erpSyncEnabled ? "ERP-Synced Item" : "Manual Stock"}
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}>
            Add Product
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
            All fields enforce the current schema rules live as you fill them in.
          </p>
        </div>

        {(loadError || submitError) && (
          <div
            style={{
              background: "rgba(194,71,71,0.12)",
              border: "1px solid rgba(194,71,71,0.4)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12.5,
              color: "#E27A7A",
              marginBottom: 18,
            }}
          >
            {loadError || submitError}
          </div>
        )}

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
            <p style={sectionTitleStyle}>Basic Information</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Product Name</label>
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
            <p style={sectionTitleStyle}>Pricing &amp; Item Type</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Item Type</label>
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
                <label style={labelStyle}>Cost Price (internal — never shown to customer)</label>
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
                  Retail Price {form.itemType === "purchase" ? "(required)" : "(n/a for gift items)"}
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
                <label style={labelStyle}>Return Policy (required for purchase items)</label>
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
                <p style={{ ...sectionTitleStyle, margin: 0 }}>Made to Order</p>
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
                <label style={labelStyle}>Delivery Window (mandatory)</label>
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
                    justifyContent: "flex-end",
                    fontSize: 10,
                    color: t.textSecondary,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    backgroundImage: `url(${img})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {idx === form.heroImageIndex && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 500,
                        color: "#0F0F0F",
                        background: tokens.gold,
                        padding: "1px 6px",
                        borderRadius: 4,
                        marginBottom: 4,
                      }}
                    >
                      HERO
                    </span>
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
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileSelected}
                    disabled={isUploading || !brandId}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !brandId}
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 8,
                      background: "transparent",
                      border: `1px dashed ${t.border}`,
                      color: t.textSecondary,
                      fontSize: isUploading ? 11 : 22,
                      cursor: isUploading || !brandId ? "default" : "pointer",
                      opacity: isUploading || !brandId ? 0.6 : 1,
                    }}
                  >
                    {isUploading ? "Uploading…" : "+"}
                  </button>
                </>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0 }}>
              Click a thumbnail to set it as the hero image. Max 3, 5MB each (PNG, JPEG, WebP).
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
            <p style={sectionTitleStyle}>Sizes (Variants)</p>

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
                      Stock Qty{" "}
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
                  {idx === 0 && <label style={labelStyle}>Low-Stock Alert</label>}
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
              + Add Size
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isUploading || !brandId}
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
              cursor: isSubmitting || isUploading || !brandId ? "default" : "pointer",
              opacity: isSubmitting || isUploading || !brandId ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Saving…" : "Save Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
