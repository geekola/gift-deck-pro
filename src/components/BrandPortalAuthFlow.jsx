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
  [{ key: "brandName", label: "Brand name", type: "text", placeholder: "e.g. Atelier Noir" }],
  [{ key: "email", label: "Admin login email", type: "email", placeholder: "admin@yourbrand.com" }],
  [{ key: "password", label: "Password", type: "password", placeholder: "At least 8 characters" }],
  [
    { key: "contactFirstName", label: "Primary contact first name", type: "text", placeholder: "First name" },
    { key: "contactLastName", label: "Primary contact last name", type: "text", placeholder: "Last name" },
  ],
  [{ key: "phoneNumber", label: "Phone number", type: "tel", placeholder: "+1 (555) 555-0100" }],
  [{ key: "website", label: "Brand website", type: "text", placeholder: "https://yourbrand.com" }],
  [
    {
      key: "fulfilmentEmail",
      label: "Fulfilment email",
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

export default function BrandPortalAuthFlow() {
  const router = useRouter();
  const supabase = createClient();

  const [theme, setTheme] = useState("dark");
  const [step, setStep] = useState("register");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const t = tokens[theme];

  // Landed here either from the email-confirmation callback after
  // registering, or bounced back by the (protected) layout's guard (a
  // signed-in but not-yet-approved brand_user tried to load a protected
  // page directly). Read window.location directly (rather than
  // next/navigation's useSearchParams) so this doesn't need a Suspense
  // boundary - this component is already 100% client-rendered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const err = params.get("error");

    if (status === "pending") {
      setStep("pending");
    } else if (status === "rejected") {
      fetchRejectionReason();
    } else if (err === "forbidden") {
      setLoginError("This login isn't linked to a brand account.");
      setStep("login");
    }
  }, []);

  const fetchRejectionReason = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStep("login");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("brand_id")
      .eq("id", user.id)
      .single();
    if (!profile?.brand_id) {
      setStep("login");
      return;
    }
    const { data: brand } = await supabase
      .from("brands")
      .select("rejection_reason")
      .eq("id", profile.brand_id)
      .single();
    setRejectionReason(brand?.rejection_reason || "");
    setStep("rejected");
  };

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
      setStep("pending");
    } else {
      setIsSubmitting(false);
      setStep("check-email");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Enter your email and password.");
      return;
    }

    setLoginError("");
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setIsSubmitting(false);
      setLoginError(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, brand_id")
      .eq("id", data.user.id)
      .single();

    if (!profile || profile.role !== "brand_user" || !profile.brand_id) {
      setIsSubmitting(false);
      setLoginError("This login isn't linked to a brand account.");
      await supabase.auth.signOut();
      return;
    }

    const { data: brand } = await supabase
      .from("brands")
      .select("status, rejection_reason")
      .eq("id", profile.brand_id)
      .single();

    setIsSubmitting(false);

    if (brand?.status === "approved") {
      router.push("/brand/products");
      router.refresh();
    } else if (brand?.status === "rejected") {
      setRejectionReason(brand?.rejection_reason || "");
      setStep("rejected");
    } else {
      setStep("pending");
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setLoginError("Enter a valid email address.");
      return;
    }

    setLoginError("");
    setIsSubmitting(true);
    // Same intentional non-disclosure as the customer flow - Supabase
    // doesn't reveal whether the address has an account, and neither
    // does this UI.
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setIsSubmitting(false);

    if (error) {
      setLoginError(error.message);
      return;
    }
    setStep("forgot-sent");
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
          title="In the real app this lives in Settings only — exposed here for preview convenience"
        >
          {theme === "dark" ? "Preview: light" : "Preview: dark"}
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
                Register your brand
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
                {isSubmitting ? "Submitting…" : "Submit application"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, marginTop: 20 }}>
              Already approved?{" "}
              <span
                onClick={() => setStep("login")}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Log in
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
              Check your email
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
              Back to start
            </button>
          </div>
        )}

        {step === "pending" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, margin: "0 auto 20px auto" }} />
            <h1 style={{ fontSize: 19, fontWeight: 700, color: t.textPrimary, margin: "0 0 10px 0" }}>
              Application received
            </h1>
            <p style={{ fontSize: 13.5, color: t.textSecondary, lineHeight: 1.6, margin: "0 0 24px 0" }}>
              A platform admin will review your brand application. You'll get an email at the
              address you provided once a decision is made. There's nothing else to do right now.
            </p>
            <div
              style={{
                background: t.surfaceRaised,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: "14px 16px",
                fontSize: 13,
                color: t.textSecondary,
                textAlign: "left",
                marginBottom: 24,
              }}
            >
              Status: <span style={{ color: tokens.gold, fontWeight: 500 }}>Pending review</span>
            </div>
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
              Back to start
            </button>
          </div>
        )}

        {step === "rejected" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 28, height: 3, background: "#C24747", borderRadius: 2, margin: "0 auto 20px auto" }} />
            <h1 style={{ fontSize: 19, fontWeight: 700, color: t.textPrimary, margin: "0 0 10px 0" }}>
              Application not approved
            </h1>
            <p style={{ fontSize: 13.5, color: t.textSecondary, lineHeight: 1.6, margin: "0 0 16px 0" }}>
              A platform admin reviewed your brand application and it wasn't approved for portal
              access.
            </p>
            <div
              style={{
                background: t.surfaceRaised,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: "14px 16px",
                fontSize: 13,
                color: t.textSecondary,
                textAlign: "left",
                marginBottom: 24,
              }}
            >
              <div style={{ marginBottom: rejectionReason ? 8 : 0 }}>
                Status: <span style={{ color: "#C24747", fontWeight: 500 }}>Not approved</span>
              </div>
              {rejectionReason && (
                <div>
                  <span style={{ color: t.textPrimary, fontWeight: 500 }}>Reason: </span>
                  {rejectionReason}
                </div>
              )}
            </div>
            <p style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.6, margin: "0 0 20px 0" }}>
              If you think this is a mistake, contact support rather than re-registering — a new
              application won't override this decision.
            </p>
            <button
              onClick={() => {
                setStep("login");
                setLoginEmail("");
                setLoginPassword("");
                setLoginError("");
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
              Back to log in
            </button>
          </div>
        )}

        {step === "login" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                Log in
              </h1>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Brand portal login.
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  placeholder="you@yourbrand.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 14px",
                    fontSize: 14,
                    fontFamily: "'Roboto', sans-serif",
                    color: t.textPrimary,
                    background: t.inputBg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  placeholder="Your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 14px",
                    fontSize: 14,
                    fontFamily: "'Roboto', sans-serif",
                    color: t.textPrimary,
                    background: t.inputBg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    outline: "none",
                  }}
                />
              </div>
              <p style={{ textAlign: "right", fontSize: 12.5, margin: "0 0 8px 0" }}>
                <span
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setStep("forgot");
                    setLoginError("");
                  }}
                  style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
                >
                  Forgot password?
                </span>
              </p>
              {loginError && (
                <p style={{ fontSize: 12, color: "#E27A7A", margin: "4px 0 16px 0" }}>{loginError}</p>
              )}
              {!loginError && <div style={{ marginBottom: 16 }} />}

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
                {isSubmitting ? "Logging in…" : "Log in"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, marginTop: 20 }}>
              New brand?{" "}
              <span
                onClick={() => setStep("register")}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Register here
              </span>
            </p>
          </>
        )}

        {step === "forgot" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                Reset your password
              </h1>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Enter your login email and we'll send you a link to set a new password.
              </p>
            </div>

            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  placeholder="you@yourbrand.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 14px",
                    fontSize: 14,
                    fontFamily: "'Roboto', sans-serif",
                    color: t.textPrimary,
                    background: t.inputBg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    outline: "none",
                  }}
                />
              </div>
              {loginError && (
                <p style={{ fontSize: 12, color: "#E27A7A", margin: "4px 0 16px 0" }}>{loginError}</p>
              )}
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
                {isSubmitting ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, marginTop: 20 }}>
              <span
                onClick={() => {
                  setStep("login");
                  setLoginError("");
                }}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Back to log in
              </span>
            </p>
          </>
        )}

        {step === "forgot-sent" && (
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
              Check your email
            </h1>
            <p style={{ fontSize: 13.5, color: t.textSecondary, lineHeight: 1.6, margin: "0 0 24px 0" }}>
              If an account exists for <strong>{forgotEmail}</strong>, we've sent a link to reset
              your password.
            </p>
            <button
              onClick={() => {
                setStep("login");
                setForgotEmail("");
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
              Back to log in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
