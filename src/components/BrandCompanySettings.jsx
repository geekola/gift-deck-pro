"use client";

import React, { useEffect, useState } from "react";
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

const COUNTRIES = ["United States", "Canada", "United Kingdom", "France", "Italy", "Other"];

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
};

// Maps a Supabase brands row (snake_case, flat return_* address columns)
// onto the camelCase/nested shape the form already expects.
function mapBrand(row) {
  return {
    brandName: row.brand_name ?? "",
    email: row.email ?? "",
    contactFirstName: row.contact_first_name ?? "",
    contactLastName: row.contact_last_name ?? "",
    phoneNumber: row.phone_number ?? "",
    website: row.website ?? "",
    fulfilmentEmail: row.fulfilment_email ?? "",
    category: row.category ?? "",
    returnAddress: {
      line1: row.return_line1 ?? "",
      line2: row.return_line2 ?? "",
      city: row.return_city ?? "",
      state: row.return_state ?? "",
      zip: row.return_zip ?? "",
      country: row.return_country ?? "United States",
    },
  };
}

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

  // ── Return address — required, structured fields ──
  const addrErrors = {};
  if (!form.returnAddress.line1.trim()) addrErrors.line1 = "Street address is required.";
  if (!form.returnAddress.city.trim()) addrErrors.city = "City is required.";
  if (!form.returnAddress.state.trim()) addrErrors.state = "State/province is required.";
  if (!form.returnAddress.zip.trim()) addrErrors.zip = "ZIP/postal code is required.";
  if (!form.returnAddress.country.trim()) addrErrors.country = "Country is required.";
  if (Object.keys(addrErrors).length > 0) errors.returnAddress = addrErrors;

  return errors;
}

export default function BrandCompanySettings() {
  const supabase = createClient();

  const [brandId, setBrandId] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("brand_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.brand_id) {
        setLoadError("Couldn't load your brand account. Try refreshing.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("brands")
        .select(
          "brand_name, email, contact_first_name, contact_last_name, phone_number, website, fulfilment_email, category, return_line1, return_line2, return_city, return_state, return_zip, return_country"
        )
        .eq("id", profile.brand_id)
        .single();

      if (error || !data) {
        setLoadError(error?.message || "Couldn't load your company settings.");
      } else {
        setBrandId(profile.brand_id);
        setForm(mapBrand(data));
      }
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dark only, matching BrandNav.jsx's sidebar - see ProductCatalogue.jsx
  // for why the per-page theme toggle was removed.
  const t = tokens.dark;

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

  const handleSave = async (e) => {
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
    if (Object.keys(allErrors).length > 0) return;

    setIsSaving(true);
    setSaveError("");

    const { error } = await supabase
      .from("brands")
      .update({
        brand_name: form.brandName.trim(),
        email: form.email.trim(),
        contact_first_name: form.contactFirstName.trim(),
        contact_last_name: form.contactLastName.trim(),
        phone_number: form.phoneNumber.trim(),
        website: form.website.trim(),
        fulfilment_email: form.fulfilmentEmail.trim(),
        category: form.category,
        return_line1: form.returnAddress.line1.trim(),
        return_line2: form.returnAddress.line2.trim() || null,
        return_city: form.returnAddress.city.trim(),
        return_state: form.returnAddress.state.trim(),
        return_zip: form.returnAddress.zip.trim(),
        return_country: form.returnAddress.country.trim(),
      })
      .eq("id", brandId);

    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
    }
    setIsSaving(false);
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

  if (isLoading || loadError || !form) {
    return (
      <div
        style={{
          fontFamily: "'Roboto', sans-serif",
          background: t.bgBase,
          minHeight: 640,
          padding: "28px 20px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 13, color: loadError ? "#E27A7A" : t.textSecondary, marginTop: 40 }}>
          {loadError || "Loading…"}
        </p>
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
              Company Settings
            </h1>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
              Updates here apply immediately across the portal.
            </p>
          </div>
        </div>

        {saveError && (
          <div
            style={{
              background: "rgba(194,71,71,0.12)",
              border: "1px solid rgba(194,71,71,0.4)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12.5,
              color: "#E27A7A",
              marginBottom: 16,
            }}
          >
            {saveError}
          </div>
        )}

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
            <p style={sectionTitleStyle}>Brand Details</p>
            <p style={sectionSubStyle}>Internal account info — not all of this is shown to customers.</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Brand Name</label>
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
                <label style={labelStyle}>First Name</label>
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
                <label style={labelStyle}>Last Name</label>
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
                <label style={labelStyle}>Admin Login Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onBlur={() => markTouched("email")}
                  style={inputStyle(touched.email && errors.email)}
                />
                <p style={{ fontSize: 11, color: t.textSecondary, margin: "5px 0 0 0" }}>
                  Display/contact only — doesn't change your actual sign-in email.
                </p>
                {touched.email && errors.email && errorText(errors.email)}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Phone Number</label>
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
              <label style={labelStyle}>Fulfilment Email</label>
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

          {/* ── Return address ── */}
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
              <p style={{ ...sectionTitleStyle, margin: 0 }}>Return Address</p>
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
              <label style={labelStyle}>Street Address</label>
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
              <label style={labelStyle}>Apartment, Suite, etc. (optional)</label>
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
                <label style={labelStyle}>State / Province</label>
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
                <label style={labelStyle}>ZIP / Postal</label>
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

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                flex: 1,
                padding: "13px 0",
                fontSize: 14.5,
                fontWeight: 500,
                fontFamily: "'Roboto', sans-serif",
                color: "#0F0F0F",
                background: tokens.gold,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
            {/* Right next to the button that was just clicked, rather than
                up in the header where it's easy to miss if you were
                editing a section further down the form (e.g. the return
                address, which sits at the very bottom). */}
            {saved && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#8FBF5A",
                  background: "rgba(99,153,34,0.14)",
                  padding: "10px 16px",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                }}
              >
                ✓ Saved
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
