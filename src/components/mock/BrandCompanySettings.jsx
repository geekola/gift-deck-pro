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

const COUNTRIES = ["United States", "Canada", "United Kingdom", "France", "Italy", "Other"];

// Mock brand record — illustrative only. Represents an already-approved brand
// (post-registration) editing their settings for the first time, before a
// return address has ever been set — the new required field starts empty.
const SEED_BRAND = {
  brandName: "Atelier Noir",
  email: "admin@ateliernoir.com",
  contactFirstName: "Claire",
  contactLastName: "Dubois",
  phoneNumber: "+1 (212) 555-0148",
  website: "https://ateliernoir.com",
  fulfilmentEmail: "orders@ateliernoir.com",
  category: "Formal",
  returnAddress: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
  },
};

function validate(form) {
  const errors = {};
  if (!form.brandName.trim()) errors.brandName = "Brand name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.contactFirstName.trim()) errors.contactFirstName = "First name is required.";
  if (!form.contactLastName.trim()) errors.contactLastName = "Last name is required.";
  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = "Phone number is required.";
  } else if (!/^[\d\s().+-]{7,}$/.test(form.phoneNumber.trim())) {
    errors.phoneNumber = "Enter a valid phone number.";
  }
  if (!form.website.trim()) {
    errors.website = "Website is required.";
  } else if (!/^https?:\/\/.+\..+/.test(form.website.trim())) {
    errors.website = "Enter a full URL, including https://";
  }
  if (!form.fulfilmentEmail.trim()) {
    errors.fulfilmentEmail = "Fulfilment email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.fulfilmentEmail)) {
    errors.fulfilmentEmail = "Enter a valid email address.";
  }
  if (!form.category) errors.category = "Select a category.";

  // ── Return address — NEW, required, structured fields ──
  const addrErrors = {};
  if (!form.returnAddress.line1.trim()) addrErrors.line1 = "Street address is required.";
  if (!form.returnAddress.city.trim()) addrErrors.city = "City is required.";
  if (!form.returnAddress.state.trim()) addrErrors.state = "State/province is required.";
  if (!form.returnAddress.zip.trim()) addrErrors.zip = "ZIP/postal code is required.";
  if (!form.returnAddress.country.trim()) addrErrors.country = "Country is required.";
  if (Object.keys(addrErrors).length > 0) errors.returnAddress = addrErrors;

  return errors;
}

export default function BrandSettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [form, setForm] = useState(SEED_BRAND);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saved, setSaved] = useState(false);

  const t = tokens[theme];

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const setAddressField = (key, value) => {
    setForm((f) => ({ ...f, returnAddress: { ...f.returnAddress, [key]: value } }));
    setSaved(false);
  };

  const markTouched = (key) => setTouched((tt) => ({ ...tt, [key]: true }));
  const markAddrTouched = (key) =>
    setTouched((tt) => ({ ...tt, [`addr_${key}`]: true }));

  const handleSave = (e) => {
    e.preventDefault();
    const allErrors = validate(form);
    setErrors(allErrors);
    setTouched({
      brandName: true,
      email: true,
      contactFirstName: true,
      contactLastName: true,
      phoneNumber: true,
      website: true,
      fulfilmentEmail: true,
      category: true,
      addr_line1: true,
      addr_city: true,
      addr_state: true,
      addr_zip: true,
      addr_country: true,
    });
    if (Object.keys(allErrors).length === 0) {
      setSaved(true);
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
    margin: "0 0 4px 0",
  };

  const sectionSubStyle = {
    fontSize: 12,
    color: t.textSecondary,
    margin: "0 0 16px 0",
    lineHeight: 1.5,
  };

  const errorText = (msg) => (
    <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{msg}</p>
  );

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 22,
          }}
        >
          <div>
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
              Company settings
            </h1>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
              Available after approval. Updates here apply immediately across the portal.
            </p>
          </div>
          {saved && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#8FBF5A",
                background: "rgba(99,153,34,0.14)",
                padding: "5px 12px",
                borderRadius: 7,
                whiteSpace: "nowrap",
              }}
            >
              Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSave}>
          {/* ── Brand details ── */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <p style={sectionTitleStyle}>Brand details</p>
            <p style={sectionSubStyle}>Internal account info — not all of this is shown to customers.</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Brand name</label>
              <input
                type="text"
                value={form.brandName}
                onChange={(e) => setField("brandName", e.target.value)}
                onBlur={() => markTouched("brandName")}
                style={inputStyle(touched.brandName && errors.brandName)}
              />
              {touched.brandName && errors.brandName && errorText(errors.brandName)}
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={labelStyle}>Category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.map((cat) => {
                  const sel = form.category === cat;
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
                        border: sel ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                        background: sel ? "rgba(185,129,40,0.12)" : "transparent",
                        color: sel ? tokens.gold : t.textPrimary,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              {touched.category && errors.category && errorText(errors.category)}
            </div>
          </div>

          {/* ── Contact info ── */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <p style={sectionTitleStyle}>Contact</p>
            <p style={sectionSubStyle}>Primary point of contact for platform admin communications.</p>

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>First name</label>
                <input
                  type="text"
                  value={form.contactFirstName}
                  onChange={(e) => setField("contactFirstName", e.target.value)}
                  onBlur={() => markTouched("contactFirstName")}
                  style={inputStyle(touched.contactFirstName && errors.contactFirstName)}
                />
                {touched.contactFirstName &&
                  errors.contactFirstName &&
                  errorText(errors.contactFirstName)}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Last name</label>
                <input
                  type="text"
                  value={form.contactLastName}
                  onChange={(e) => setField("contactLastName", e.target.value)}
                  onBlur={() => markTouched("contactLastName")}
                  style={inputStyle(touched.contactLastName && errors.contactLastName)}
                />
                {touched.contactLastName &&
                  errors.contactLastName &&
                  errorText(errors.contactLastName)}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Admin login email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onBlur={() => markTouched("email")}
                  style={inputStyle(touched.email && errors.email)}
                />
                {touched.email && errors.email && errorText(errors.email)}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Phone number</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setField("phoneNumber", e.target.value)}
                  onBlur={() => markTouched("phoneNumber")}
                  style={inputStyle(touched.phoneNumber && errors.phoneNumber)}
                />
                {touched.phoneNumber && errors.phoneNumber && errorText(errors.phoneNumber)}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                onBlur={() => markTouched("website")}
                style={inputStyle(touched.website && errors.website)}
              />
              {touched.website && errors.website && errorText(errors.website)}
            </div>

            <div>
              <label style={labelStyle}>Fulfilment email</label>
              <input
                type="email"
                value={form.fulfilmentEmail}
                onChange={(e) => setField("fulfilmentEmail", e.target.value)}
                onBlur={() => markTouched("fulfilmentEmail")}
                style={inputStyle(touched.fulfilmentEmail && errors.fulfilmentEmail)}
              />
              <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "5px 0 0 0" }}>
                Where order invoices are sent until an ERP connection is configured.
              </p>
              {touched.fulfilmentEmail && errors.fulfilmentEmail && errorText(errors.fulfilmentEmail)}
            </div>
          </div>

          {/* ── Return address (NEW) ── */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${tokens.gold}`,
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <p style={{ ...sectionTitleStyle, margin: 0 }}>Return address</p>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: tokens.gold,
                  background: "rgba(185,129,40,0.14)",
                  padding: "2px 7px",
                  borderRadius: 5,
                }}
              >
                Required
              </span>
            </div>
            <p style={sectionSubStyle}>
              Where customers send back purchase items. Shown on the packing slip, order form,
              and return info screen for every purchase-type order.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Street address</label>
              <input
                type="text"
                value={form.returnAddress.line1}
                onChange={(e) => setAddressField("line1", e.target.value)}
                onBlur={() => markAddrTouched("line1")}
                placeholder="123 Market Street"
                style={inputStyle(touched.addr_line1 && errors.returnAddress?.line1)}
              />
              {touched.addr_line1 && errors.returnAddress?.line1 && errorText(errors.returnAddress.line1)}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Apartment, suite, etc. (optional)</label>
              <input
                type="text"
                value={form.returnAddress.line2}
                onChange={(e) => setAddressField("line2", e.target.value)}
                placeholder="Suite 400"
                style={inputStyle(false)}
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>City</label>
                <input
                  type="text"
                  value={form.returnAddress.city}
                  onChange={(e) => setAddressField("city", e.target.value)}
                  onBlur={() => markAddrTouched("city")}
                  style={inputStyle(touched.addr_city && errors.returnAddress?.city)}
                />
                {touched.addr_city && errors.returnAddress?.city && errorText(errors.returnAddress.city)}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>State / province</label>
                <input
                  type="text"
                  value={form.returnAddress.state}
                  onChange={(e) => setAddressField("state", e.target.value)}
                  onBlur={() => markAddrTouched("state")}
                  style={inputStyle(touched.addr_state && errors.returnAddress?.state)}
                />
                {touched.addr_state && errors.returnAddress?.state && errorText(errors.returnAddress.state)}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>ZIP / postal</label>
                <input
                  type="text"
                  value={form.returnAddress.zip}
                  onChange={(e) => setAddressField("zip", e.target.value)}
                  onBlur={() => markAddrTouched("zip")}
                  style={inputStyle(touched.addr_zip && errors.returnAddress?.zip)}
                />
                {touched.addr_zip && errors.returnAddress?.zip && errorText(errors.returnAddress.zip)}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Country</label>
              <select
                value={form.returnAddress.country}
                onChange={(e) => setAddressField("country", e.target.value)}
                onBlur={() => markAddrTouched("country")}
                style={inputStyle(touched.addr_country && errors.returnAddress?.country)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {touched.addr_country && errors.returnAddress?.country && errorText(errors.returnAddress.country)}
            </div>
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
            Save changes
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
