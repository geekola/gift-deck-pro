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

const STEPS = ["register", "pending", "login"];

export default function BrandPortalAuthFlow() {
  const [theme, setTheme] = useState("dark"); // default dark, per confirmed decision
  const [step, setStep] = useState("register");
  const [form, setForm] = useState({
    brandName: "",
    email: "",
    password: "",
    contactFirstName: "",
    contactLastName: "",
    phoneNumber: "",
    website: "",
    fulfilmentEmail: "",
    category: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const allErrors = validate(form);
    setErrors(allErrors);
    setTouched(
      FIELD_DEFS.reduce((acc, f) => ({ ...acc, [f.key]: true }), { category: true })
    );
    if (Object.keys(allErrors).length === 0) {
      setStep("pending");
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Mock-only: in this prototype, any non-empty credentials show the
    // "pending approval" gate, since this mock brand was just registered.
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Enter your email and password.");
      return;
    }
    setLoginError("");
    setStep("pending");
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
    border: `1px solid ${
      touched[key] && errors[key] ? "#C24747" : t.border
    }`,
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
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
      />

      {/* Top bar: wordmark + theme toggle note */}
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
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: t.textPrimary,
              letterSpacing: "0.01em",
            }}
          >
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
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: t.textPrimary,
                  margin: "0 0 6px 0",
                }}
              >
                Register your brand
              </h1>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: t.textSecondary,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                A platform admin reviews every application before your portal access is activated.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {FIELD_ROWS.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
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
                        <p
                          style={{
                            fontSize: 12,
                            color: t.textSecondary,
                            margin: "5px 0 0 0",
                            lineHeight: 1.4,
                          }}
                        >
                          {field.helper}
                        </p>
                      )}
                      {touched[field.key] && errors[field.key] && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "#E27A7A",
                            margin: "5px 0 0 0",
                          }}
                        >
                          {errors[field.key]}
                        </p>
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
                          border: selected
                            ? `1px solid ${tokens.gold}`
                            : `1px solid ${t.border}`,
                          background: selected
                            ? "rgba(185,129,40,0.12)"
                            : "transparent",
                          color: selected ? tokens.gold : t.textPrimary,
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                {touched.category && errors.category && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "8px 0 0 0" }}>
                    {errors.category}
                  </p>
                )}
              </div>

              <button
                type="submit"
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
                  cursor: "pointer",
                }}
              >
                Submit application
              </button>
            </form>

            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: t.textSecondary,
                marginTop: 20,
              }}
            >
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

        {step === "pending" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div
              style={{
                width: 28,
                height: 3,
                background: tokens.gold,
                borderRadius: 2,
                margin: "0 auto 20px auto",
              }}
            />
            <h1
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: t.textPrimary,
                margin: "0 0 10px 0",
              }}
            >
              Application received
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: t.textSecondary,
                lineHeight: 1.6,
                margin: "0 0 24px 0",
              }}
            >
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
              Status:{" "}
              <span style={{ color: tokens.gold, fontWeight: 500 }}>Pending review</span>
            </div>
            <button
              onClick={() => {
                setStep("register");
                setForm({
                  brandName: "",
                  email: "",
                  password: "",
                  contactFirstName: "",
                  contactLastName: "",
                  phoneNumber: "",
                  website: "",
                  fulfilmentEmail: "",
                  category: "",
                });
                setErrors({});
                setTouched({});
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
              Back to start (preview reset)
            </button>
          </div>
        )}

        {step === "login" && (
          <>
            <div style={{ marginBottom: 24 }}>
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
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: t.textPrimary,
                  margin: "0 0 6px 0",
                }}
              >
                Log in
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: t.textSecondary,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                One login for every account type. What you see next depends on your role.
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
              {loginError && (
                <p style={{ fontSize: 12, color: "#E27A7A", margin: "4px 0 16px 0" }}>
                  {loginError}
                </p>
              )}
              {!loginError && <div style={{ marginBottom: 16 }} />}

              <button
                type="submit"
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
                  cursor: "pointer",
                }}
              >
                Log in
              </button>
            </form>

            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: t.textSecondary,
                marginTop: 20,
              }}
            >
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
      </div>

      <p
        style={{
          fontSize: 11,
          color: t.textSecondary,
          marginTop: 18,
          opacity: 0.7,
        }}
      >
        Prototype preview — mock data only, no live backend connection
      </p>
    </div>
  );
}
