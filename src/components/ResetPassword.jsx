"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens (shared system, dark-default — matches UnifiedLogin /
// PlatformAdminLogin) ───────────────────────────────────────────────────
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

function validate(password, confirm) {
  const errors = {};
  if (!password || password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (confirm !== password) {
    errors.confirm = "Passwords don't match.";
  }
  return errors;
}

// One shared screen for all three roles (customer, brand_user,
// platform_admin) — they all live in the same auth.users table and
// Supabase's recovery flow doesn't distinguish between them. /auth/reset
// exchanges the recovery code for a session server-side before this
// component ever mounts; here we just confirm that session exists,
// collect a new password, and route the person to wherever their role
// actually belongs (mirroring the role lookup UnifiedLogin does after a
// normal password sign-in).
export default function ResetPassword() {
  const router = useRouter();
  const supabase = createClient();
  const t = tokens.dark;

  const [status, setStatus] = useState("checking"); // checking | form | invalid | done
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (new URLSearchParams(window.location.search).get("error") === "invalid") {
        setStatus("invalid");
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setStatus(user ? "form" : "invalid");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markTouched = (key) => setTouched((tt) => ({ ...tt, [key]: true }));

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(password, confirm);
    setErrors(errs);
    setTouched({ password: true, confirm: true });
    if (Object.keys(errs).length > 0) return;

    setFormError("");
    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setIsSubmitting(false);
      setFormError(updateError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, brand_id")
      .eq("id", user.id)
      .single();

    setIsSubmitting(false);
    setStatus("done");

    if (profile?.role === "platform_admin") {
      router.push("/platform-admin");
    } else if (profile?.role === "brand_user" && profile.brand_id) {
      // The brand's own (protected) layout guard handles pending/rejected
      // status - no need to re-check it here.
      router.push("/brand/products");
    } else {
      router.push("/customer/categories");
    }
    router.refresh();
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
          maxWidth: 400,
          background: t.surface,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          padding: "32px 28px",
        }}
      >
        {status === "checking" && (
          <p style={{ fontSize: 13, color: t.textSecondary, textAlign: "center", margin: 0 }}>
            Checking your reset link…
          </p>
        )}

        {status === "invalid" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{ width: 28, height: 3, background: "#C24747", borderRadius: 2, margin: "0 auto 20px auto" }}
            />
            <h1 style={{ fontSize: 19, fontWeight: 700, color: t.textPrimary, margin: "0 0 10px 0" }}>
              This Link Isn't Valid
            </h1>
            <p style={{ fontSize: 13.5, color: t.textSecondary, lineHeight: 1.6, margin: "0 0 24px 0" }}>
              Password reset links expire after a while, and each one only works once. Request a new
              one from your sign-in page.
            </p>
            <button
              onClick={() => router.push("/login")}
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
              Back to Sign In
            </button>
          </div>
        )}

        {(status === "form" || status === "done") && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                Set a New Password
              </h1>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Choose a new password for your account.
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
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => markTouched("password")}
                  placeholder="At least 8 characters"
                  disabled={status === "done"}
                  style={inputStyle(touched.password && errors.password)}
                />
                {touched.password && errors.password && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.password}</p>
                )}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => markTouched("confirm")}
                  placeholder="Re-enter your new password"
                  disabled={status === "done"}
                  style={inputStyle(touched.confirm && errors.confirm)}
                />
                {touched.confirm && errors.confirm && (
                  <p style={{ fontSize: 12, color: "#E27A7A", margin: "5px 0 0 0" }}>{errors.confirm}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || status === "done"}
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
                  cursor: isSubmitting || status === "done" ? "default" : "pointer",
                  opacity: isSubmitting || status === "done" ? 0.7 : 1,
                }}
              >
                {status === "done" ? "Password updated — redirecting…" : isSubmitting ? "Saving…" : "Save New Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
