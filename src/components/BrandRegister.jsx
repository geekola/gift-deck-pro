"use client";

import React, { useState } from "react";
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

const FIELD_ROWS = [
  [{ key: "brandName", label: "Brand Name", type: "text", placeholder: "e.g. Atelier Noir" }],
  [{ key: "email", label: "Admin Login Email", type: "email", placeholder: "admin@yourbrand.com" }],
  [{ key: "password", label: "Password", type: "password", placeholder: "At least 8 characters" }],
  [
    { key: "contactFirstName", label: "Primary Contact First Name", type: "text", placeholder: "First name" },
    { key: "contactLastName", label: "Primary Contact Last Name", type: "text", placeholder: "Last name" },
  ],
  [{ key: "phoneNumber", label: "Phone Number", type: "tel", placeholder: "+1 (555) 555-0100" }],
  [{ key: "website", label: "Brand Website", type: "text", placeholder: "https://yourbrand.com" }],
  [
    {
      key: "fulfilmentEmail",
      label: "Fulfilment Email",
      type: "email",
      placeholder: "orders@yourbrand.com",
      helper: "Where order invoices are sent until an ERP connection is configured.",
    },
  ],
];

const FIELD_DEFS = FIELD_ROWS.flat();

function validate(form) {
  const errors = {};
  if (!form.brandName.trim()) errors.brandName = "Brand name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.password || form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
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
  return errors;
}

const emptyForm = {
  brandName: "",
  email: "",
  password: "",
  contactFirstName: "",
  contactLastName: "",
  phoneNumber: "",
  website: "",
  fulfilmentEmail: "",
  category: "",
};

// Brand half of the shared /sign-up entry point. Login (and the
// pending/rejected post-auth states) moved to the unified /login (see
// UnifiedLogin.jsx) once customer + brand login was consolidated - this
// component is registration-only now.
export default function BrandRegister() {
  const router = useRouter();
  const supabase = createClient();

  const [theme, setTheme] = useState("dark");
  const [step, setStep] = useState("register"); // register | check-email
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = tokens[theme];

  const handleChange = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleBlur = (key) => () => {
    setTouched((tt) => ({ ...tt, [key]: true }));
    setErrors(validate({ ...form }));
  };

  const handleCategorySelect = (cat) => {
    setForm((f) => ({ ...f, category: cat }));
    setErrors((e) => ({ ...e, category: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allErrors = validate(form);
    setErrors(allErrors);
    setTouched(
      FIELD_DEFS.reduce((acc, f) => ({ ...acc, [f.key]: true }), { category: true })
    );
    if (Object.keys(allErrors).length > 0) return;

    setFormError("");
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // Carried through to the /auth/callback route so it can create
        // the brand + promote this account to brand_user once a session
        // exists - signUp alone doesn't guarantee one if email
        // confirmation is turned on.
        data: {
          pending_brand_registration: {
            brandName: form.brandName,
            contactFirstName: form.contactFirstName,
            contactLastName: form.contactLastName,
            phoneNumber: form.phoneNumber,
            website: form.website,
            fulfilmentEmail: form.fulfilmentEmail,
            category: form.category,
          },
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setIsSubmitting(false);
      setFormError(error.message);
      return;
    }

    if (data.session) {
      // Email confirmation is off - we already have a session, register
      // the brand right now instead of waiting on a callback that won't
      // happen.
      const { error: rpcError } = await supabase.rpc("register_brand", {
        p_brand_name: form.brandName,
        p_contact_first_name: form.contactFirstName,
        p_contact_last_name: form.contactLastName,
        p_phone_number: form.phoneNumber,
        p_website: form.website,
        p_fulfilment_email: form.fulfilmentEmail,
        p_category: form.category,
      });
      setIsSubmitting(false);
      if (rpcError) {
        setFormError(rpcError.message);
        return;
      }
      router.push("/login?status=pending");
    } else {
      setIsSubmitting(false);
      setStep("check-email");
    }
  };

  const inputStyle = (key) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    fontSize: 14,
    fontFamily: "'Roboto', sans-serif",
    fontWeight: 400,
    color: t.textPrimary,
    background: t.inputBg,
    border: `1px solid ${touched[key] && errors[key] ? "#C24747" : t.border}`,
    borderRadius: 8,
    outline: "none",
  });

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontFamily: "'Roboto', sans-serif",
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 6,
    letterSpacing: "0.01em",
  };

  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        padding: "32px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "background 0.2s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.01em" }}>
            Gift Deck Pro
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textSecondary, letterSpacing: "0.03em" }}>
            Brand Portal
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
          title="In the real app this lives in Settings only — exposed here for preview convenience"
        >
          {theme === "dark" ? "Preview: Light" : "Preview: Dark"}
        </button>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: t.surface,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          padding: "32px 28px",
        }}
      >
        {step === "register" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                Register Your Brand
              </h1>
              <p style={{ fontSize: 13, fontWeight: 400, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                A platform admin reviews every application before your portal access is activated.
              </p>
            </div>

            {formError && (
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
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {FIELD_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  {row.map((field) => (
                    <div key={field.key} style={{ flex: 1, minWidth: 0 }}>
                      <label style={labelStyle}>{field.label}</label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={form[field.key]}
                        onChange={handleChange(field.key)}
                        onBlur={handleBlur(field.key)}
                        style={inputStyle(field.key)}
                      />
                      {field.helper && (
                        <p style={{ fontSize: 12, color: t.textSecondary, margin: "5px 0 0 0", lineHeight: 1.4 }}>
                          {field.helper}
                        </p>
                      )}
                      {touched[field.key] && errors[field.key] && (
                        <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors[field.key]}</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Category</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CATEGORIES.map((cat) => {
                    const selected = form.category === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
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
                {touched.category && errors.category && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "8px 0 0 0" }}>{errors.category}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "'Roboto', sans-serif",
                  color: "#0F0F0F",
                  background: tokens.gold,
                  border: "none",
                  borderRadius: 8,
                  cursor: isSubmitting ? "default" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? "Submitting…" : "Submit Application"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, marginTop: 20 }}>
              Already approved?{" "}
              <span
                onClick={() => router.push("/login")}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Log In
              </span>
            </p>
          </>
        )}

        {step === "check-email" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(185,129,40,0.14)",
                color: tokens.gold,
                fontSize: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px auto",
              }}
            >
              ✉
            </div>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: t.textPrimary, margin: "0 0 10px 0" }}>
              Check Your Email
            </h1>
            <p style={{ fontSize: 13.5, color: t.textSecondary, lineHeight: 1.6, margin: "0 0 24px 0" }}>
              We sent a confirmation link to <strong>{form.email}</strong>. Click it to finish
              submitting your brand application.
            </p>
            <button
              onClick={() => {
                setStep("register");
                setForm(emptyForm);
                setErrors({});
                setTouched({});
                setFormError("");
              }}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: t.textSecondary,
                background: "transparent",
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "9px 16px",
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              Back to Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
