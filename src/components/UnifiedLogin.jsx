"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens (shared system, dark-default) ────────────────────────────
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

function validateLogin(form) {
  const errors = {};
  if (!form.email.trim()) errors.email = "Email is required.";
  if (!form.password) errors.password = "Password is required.";
  return errors;
}

// One login for customer and brand_user accounts - they're both regular
// self-serve roles that share the same auth.users table, so there's no
// real reason to make someone pick a portal before they've even typed
// their email. platform_admin is deliberately NOT handled here: there's
// no self-signup path to that role anywhere in the app (accounts are
// provisioned manually), so it stays on its own dedicated login at
// /platform-admin/login rather than being folded into this form.
export default function UnifiedLogin() {
  const router = useRouter();
  const supabase = createClient();

  const [theme, setTheme] = useState("dark");
  const [mode, setMode] = useState("login"); // login | forgot | forgot-sent | pending | rejected
  const [rejectionReason, setRejectionReason] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = tokens[theme];

  // Landed here either bounced back by a (protected) layout's guard (not
  // signed in, wrong role, or - brand-specific - pending/rejected status),
  // or redirected here after completing a brand's email-confirmation flow
  // while approval is still pending (see /auth/callback).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const err = params.get("error");

    if (status === "pending") {
      setMode("pending");
    } else if (status === "rejected") {
      fetchRejectionReason();
    } else if (err === "forbidden") {
      setAuthError("That account isn't set up as a customer or brand login. Platform admins should use the admin login instead.");
    } else if (err === "auth") {
      setAuthError("That link didn't work. Try signing in again.");
    } else if (err === "registration_failed") {
      setAuthError("Your email was confirmed, but finishing your brand registration failed. Contact support so we can complete it manually - your account is still just a plain login for now.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRejectionReason = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMode("login");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("brand_id")
      .eq("id", user.id)
      .single();
    if (!profile?.brand_id) {
      setMode("login");
      return;
    }
    const { data: brand } = await supabase
      .from("brands")
      .select("rejection_reason")
      .eq("id", profile.brand_id)
      .single();
    setRejectionReason(brand?.rejection_reason || "");
    setMode("rejected");
  };

  const labelStyle = {
    display: "block",
    fontSize: 12.5,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 6,
    letterSpacing: "0.01em",
  };

  const inputStyle = (hasError, hasToggle) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    paddingRight: hasToggle ? 52 : 14,
    fontSize: 14,
    fontFamily: "'Roboto', sans-serif",
    color: t.textPrimary,
    background: t.inputBg,
    border: `1px solid ${hasError ? "#C24747" : t.border}`,
    borderRadius: 8,
    outline: "none",
  });

  const passwordToggleStyle = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 11.5,
    fontWeight: 500,
    color: tokens.gold,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Roboto', sans-serif",
    padding: 0,
  };

  const markTouched = (key) => setTouched((tt) => ({ ...tt, [key]: true }));

  const handleGoogleAuth = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // On success the browser navigates away to Google - role-based
    // routing on return happens in /auth/callback, not here. Only
    // reachable on failure to even start the flow.
    if (error) setAuthError(error.message);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const errs = validateLogin(loginForm);
    setErrors(errs);
    setTouched({ email: true, password: true });
    if (Object.keys(errs).length > 0) return;

    setAuthError("");
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    if (error) {
      setIsSubmitting(false);
      setAuthError(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, brand_id")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "platform_admin") {
      setIsSubmitting(false);
      setAuthError("This is a platform admin account - sign in at the admin login instead.");
      await supabase.auth.signOut();
      return;
    }

    if (profile?.role === "brand_user" && profile.brand_id) {
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
        setMode("rejected");
      } else {
        setMode("pending");
      }
      return;
    }

    // Default: customer. Every profile gets role='customer' from
    // handle_new_auth_user unless explicitly promoted, so this is the
    // correct fallback rather than a special case.
    setIsSubmitting(false);
    router.push("/customer/categories");
    router.refresh();
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setAuthError("Enter a valid email address.");
      return;
    }

    setAuthError("");
    setIsSubmitting(true);
    // Deliberately don't reveal whether the address is registered -
    // matches Supabase's own non-disclosure behavior on
    // resetPasswordForEmail.
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setIsSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }
    setMode("forgot-sent");
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
          {theme === "dark" ? "Preview: Light" : "Preview: Dark"}
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
        {authError && (
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
            {authError}
          </div>
        )}

        {mode === "login" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div
                style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
              />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                Welcome Back
              </h1>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Sign in to your customer or brand account.
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
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    onBlur={() => markTouched("password")}
                    placeholder="Your password"
                    style={inputStyle(touched.password && errors.password, true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={passwordToggleStyle}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.password}</p>
                )}
              </div>
              <p style={{ textAlign: "right", fontSize: 12.5, margin: "0 0 20px 0" }}>
                <span
                  onClick={() => {
                    setForgotEmail(loginForm.email);
                    setMode("forgot");
                    setErrors({});
                    setTouched({});
                    setAuthError("");
                  }}
                  style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
                >
                  Forgot Password?
                </span>
              </p>
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
                {isSubmitting ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, marginTop: 20 }}>
              New here?{" "}
              <span
                onClick={() => router.push("/sign-up")}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Get Started
              </span>
            </p>
          </>
        )}

        {mode === "forgot" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div
                style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
              />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                Reset Your Password
              </h1>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Enter your email and we'll send you a link to set a new password.
              </p>
            </div>

            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle(false)}
                />
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
                {isSubmitting ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, marginTop: 20 }}>
              <span
                onClick={() => {
                  setMode("login");
                  setAuthError("");
                }}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Back to Sign In
              </span>
            </p>
          </>
        )}

        {mode === "forgot-sent" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
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

            <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
              Check Your Email
            </h1>

            <p style={{ fontSize: 13, color: t.textSecondary, margin: "0 0 22px 0", lineHeight: 1.5 }}>
              If an account exists for <strong>{forgotEmail}</strong>, we've sent a link to reset
              your password.
            </p>

            <button
              onClick={() => {
                setMode("login");
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
              Back to Sign In
            </button>
          </div>
        )}

        {mode === "pending" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, margin: "0 auto 20px auto" }} />
            <h1 style={{ fontSize: 19, fontWeight: 700, color: t.textPrimary, margin: "0 0 10px 0" }}>
              Application Received
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
              Status: <span style={{ color: tokens.gold, fontWeight: 500 }}>Pending Review</span>
            </div>
            <button
              onClick={() => setMode("login")}
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
              Back to Sign In
            </button>
          </div>
        )}

        {mode === "rejected" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 28, height: 3, background: "#C24747", borderRadius: 2, margin: "0 auto 20px auto" }} />
            <h1 style={{ fontSize: 19, fontWeight: 700, color: t.textPrimary, margin: "0 0 10px 0" }}>
              Application Not Approved
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
                Status: <span style={{ color: "#C24747", fontWeight: 500 }}>Not Approved</span>
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
              onClick={() => setMode("login")}
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
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
