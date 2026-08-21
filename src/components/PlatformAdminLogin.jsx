"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// No mock ever existed for this screen - platform admin accounts are
// provisioned manually (see register_brand()'s comments / the schema
// decisions doc: there is no self-signup path to role = 'platform_admin'
// anywhere in the app), so this is just a plain login, no register tab,
// no Google OAuth.
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
  gold: "#B98128",
};

export default function PlatformAdminLogin() {
  const router = useRouter();
  const supabase = createClient();
  const t = tokens.dark;

  const [mode, setMode] = useState("login"); // login | forgot | forgot-sent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Landed here from the (protected) layout's redirect - the role check
  // itself lives there, not in this component, so it can't be bypassed
  // by skipping this screen's logic.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "forbidden") {
      setError("That account doesn't have platform admin access.");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/platform-admin");
    router.refresh();
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    // Same intentional non-disclosure as the customer/brand flows -
    // Supabase doesn't reveal whether the address has an account.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
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
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: t.surface,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          padding: "32px 28px",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            {mode === "login" && "Platform Admin"}
            {mode === "forgot" && "Reset Your Password"}
            {mode === "forgot-sent" && "Check Your Email"}
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            {mode === "login" && "Gift Deck Pro"}
            {mode === "forgot" && "Enter your email and we'll send you a link to set a new password."}
            {mode === "forgot-sent" && (
              <>
                If an account exists for <strong>{forgotEmail}</strong>, we've sent a link to reset
                your password.
              </>
            )}
          </p>
        </div>

        {error && (
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
            {error}
          </div>
        )}

        {mode === "login" && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 500,
                color: t.textSecondary,
                marginBottom: 6,
                letterSpacing: "0.01em",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@giftdeckpro.com"
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
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 500,
                color: t.textSecondary,
                marginBottom: 6,
                letterSpacing: "0.01em",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
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
          <p style={{ textAlign: "right", fontSize: 12.5, margin: "0 0 20px 0" }}>
            <span
              onClick={() => {
                setForgotEmail(email);
                setMode("forgot");
                setError("");
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
        )}

        {mode === "forgot" && (
          <>
            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: t.textSecondary,
                    marginBottom: 6,
                    letterSpacing: "0.01em",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@giftdeckpro.com"
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
                  setError("");
                }}
                style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
              >
                Back to Sign In
              </span>
            </p>
          </>
        )}

        {mode === "forgot-sent" && (
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
              width: "100%",
            }}
          >
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
}
