"use client";

import React, { useState } from "react";

// ── Design tokens (shared with Brand Portal — confirmed dark-default system) ─
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

const INDUSTRIES = ["Film", "Music", "Sports", "Fashion", "Business", "Media", "Technology", "Other"];

function validateSignup(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.password || form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (!form.industry) errors.industry = "Select an industry.";
  return errors;
}

function validateLogin(form) {
  const errors = {};
  if (!form.email.trim()) errors.email = "Email is required.";
  if (!form.password) errors.password = "Password is required.";
  return errors;
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function CustomerSignIn() {
  const [theme, setTheme] = useState("dark");
  const [mode, setMode] = useState("login"); // login | signup | success
  const [authedCustomer, setAuthedCustomer] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", industry: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const t = tokens[theme];

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
    padding: "11px 14px",
    fontSize: 14,
    fontFamily: "'Roboto', sans-serif",
    color: t.textPrimary,
    background: t.inputBg,
    border: `1px solid ${hasError ? "#C24747" : t.border}`,
    borderRadius: 8,
    outline: "none",
  });

  const markTouched = (key) => setTouched((tt) => ({ ...tt, [key]: true }));

  const handleGoogleAuth = () => {
    // Mock-only: simulates a successful Google OAuth round-trip.
    const mockCustomer = {
      id: "cust_mock_google",
      name: "Jordan Reyes",
      email: "jordan.reyes@gmail.com",
      authProvider: "google",
      industry: "",
      profileComplete: false,
    };
    setAuthedCustomer(mockCustomer);
    setMode("success");
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const errs = validateLogin(loginForm);
    setErrors(errs);
    setTouched({ email: true, password: true });
    if (Object.keys(errs).length === 0) {
      // Mock-only: any valid-looking credentials log in as an existing,
      // profile-complete customer — no real backend check exists here.
      setAuthedCustomer({
        id: "cust_mock_existing",
        name: "Alex Morgan",
        email: loginForm.email,
        authProvider: "password",
        industry: "Film",
        profileComplete: true,
      });
      setMode("success");
    }
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    const errs = validateSignup(signupForm);
    setErrors(errs);
    setTouched({ name: true, email: true, password: true, industry: true });
    if (Object.keys(errs).length === 0) {
      setAuthedCustomer({
        id: "cust_mock_new",
        name: signupForm.name,
        email: signupForm.email,
        authProvider: "password",
        industry: signupForm.industry,
        profileComplete: false,
      });
      setMode("success");
    }
  };

  const resetAll = () => {
    setMode("login");
    setAuthedCustomer(null);
    setLoginForm({ email: "", password: "" });
    setSignupForm({ name: "", email: "", password: "", industry: "" });
    setErrors({});
    setTouched({});
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

      <div
        style={{
          width: "100%",
          maxWidth: 400,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, letterSpacing: "0.01em" }}>
          Gift Deck Pro
        </span>
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
          maxWidth: 400,
          background: t.surface,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          padding: "32px 28px",
        }}
      >
        {mode === "login" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div
                style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
              />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Sign in to see what's been curated for you.
              </p>
            </div>

            <button
              onClick={handleGoogleAuth}
              style={{
                width: "100%",
                padding: "11px 0",
                fontSize: 13.5,
                fontWeight: 500,
                color: t.textPrimary,
                background: t.surfaceRaised,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>G</span> Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: t.border }} />
              <span style={{ fontSize: 11, color: t.textSecondary }}>or</span>
              <div style={{ flex: 1, height: 1, background: t.border }} />
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                  onBlur={() => markTouched("email")}
                  placeholder="you@example.com"
                  style={inputStyle(touched.email && errors.email)}
                />
                {touched.email && errors.email && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.email}</p>
                )}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                  onBlur={() => markTouched("password")}
                  placeholder="Your password"
                  style={inputStyle(touched.password && errors.password)}
                />
                {touched.password && errors.password && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.password}</p>
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
                Sign in
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, marginTop: 20 }}>
              New here?{" "}
              <span
                onClick={() => {
                  setMode("signup");
                  setErrors({});
                  setTouched({});
                }}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Create an account
              </span>
            </p>
          </>
        )}

        {mode === "signup" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div
                style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
              />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                Create your account
              </h1>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                One account works across every brand you have access to.
              </p>
            </div>

            <button
              onClick={handleGoogleAuth}
              style={{
                width: "100%",
                padding: "11px 0",
                fontSize: 13.5,
                fontWeight: 500,
                color: t.textPrimary,
                background: t.surfaceRaised,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>G</span> Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: t.border }} />
              <span style={{ fontSize: 11, color: t.textSecondary }}>or</span>
              <div style={{ flex: 1, height: 1, background: t.border }} />
            </div>

            <form onSubmit={handleSignupSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Full name</label>
                <input
                  type="text"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm((f) => ({ ...f, name: e.target.value }))}
                  onBlur={() => markTouched("name")}
                  placeholder="Your name"
                  style={inputStyle(touched.name && errors.name)}
                />
                {touched.name && errors.name && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.name}</p>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm((f) => ({ ...f, email: e.target.value }))}
                  onBlur={() => markTouched("email")}
                  placeholder="you@example.com"
                  style={inputStyle(touched.email && errors.email)}
                />
                {touched.email && errors.email && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.email}</p>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm((f) => ({ ...f, password: e.target.value }))}
                  onBlur={() => markTouched("password")}
                  placeholder="At least 8 characters"
                  style={inputStyle(touched.password && errors.password)}
                />
                {touched.password && errors.password && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.password}</p>
                )}
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Industry</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {INDUSTRIES.map((ind) => {
                    const selected = signupForm.industry === ind;
                    return (
                      <button
                        type="button"
                        key={ind}
                        onClick={() => {
                          setSignupForm((f) => ({ ...f, industry: ind }));
                          markTouched("industry");
                        }}
                        style={{
                          padding: "7px 12px",
                          fontSize: 12.5,
                          fontFamily: "'Roboto', sans-serif",
                          fontWeight: 500,
                          borderRadius: 7,
                          cursor: "pointer",
                          border: selected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                          background: selected ? "rgba(185,129,40,0.12)" : "transparent",
                          color: selected ? tokens.gold : t.textPrimary,
                        }}
                      >
                        {ind}
                      </button>
                    );
                  })}
                </div>
                {touched.industry && errors.industry && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "8px 0 0 0" }}>{errors.industry}</p>
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
                Create account
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, marginTop: 20 }}>
              Already have an account?{" "}
              <span
                onClick={() => {
                  setMode("login");
                  setErrors({});
                  setTouched({});
                }}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Sign in
              </span>
            </p>
          </>
        )}

        {mode === "success" && authedCustomer && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(185,129,40,0.14)",
                color: tokens.gold,
                fontSize: 18,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px auto",
              }}
            >
              {getInitials(authedCustomer.name)}
            </div>

            <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
              {authedCustomer.profileComplete ? `Welcome back, ${authedCustomer.name.split(" ")[0]}` : `You're in, ${authedCustomer.name.split(" ")[0]}`}
            </h1>

            <p style={{ fontSize: 13, color: t.textSecondary, margin: "0 0 4px 0" }}>
              {authedCustomer.email}
            </p>
            <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 22px 0" }}>
              Signed in via {authedCustomer.authProvider === "google" ? "Google" : "email & password"}
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
              {authedCustomer.profileComplete ? (
                <>
                  Profile status:{" "}
                  <span style={{ color: "#8FBF5A", fontWeight: 500 }}>Complete</span> — next stop is
                  the swipe deck.
                </>
              ) : (
                <>
                  Profile status:{" "}
                  <span style={{ color: tokens.gold, fontWeight: 500 }}>
                    {authedCustomer.industry ? "Needs measurements" : "Needs industry + measurements"}
                  </span>{" "}
                  — new accounts complete a short profile before reaching the deck.
                </>
              )}
            </div>

            <button
              onClick={resetAll}
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
      </div>

      <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 18, opacity: 0.7 }}>
        Prototype preview — mock data only, no live backend connection
      </p>
    </div>
  );
}
