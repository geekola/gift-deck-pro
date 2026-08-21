"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

// ── Design tokens (shared system, dark-default) ────────────────────────────
const tokens = {
  dark: {
    bgBase: "#0F0F0F",
    surface: "#181818",
    surfaceRaised: "#1F1F1F",
    textPrimary: "#EAEAEA",
    textSecondary: "#AFAFAF",
    border: "#2A2A2A",
  },
  light: {
    bgBase: "#EAEAEA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    textPrimary: "#181818",
    textSecondary: "#6B6B6B",
    border: "#D5D5D5",
  },
  gold: "#B98128",
};

// Shared entry point for the two distinct signup flows. Login is unified
// (see UnifiedLogin.jsx / /login) since customer and brand_user accounts
// are both simple self-serve roles that share the same auth path - but
// signup stays genuinely different (a casual one-form customer signup vs.
// a multi-field brand application that a platform admin has to review),
// so this just routes to the right form rather than trying to merge them.
export default function SignUpChooser() {
  const router = useRouter();
  const [theme, setTheme] = useState("dark");
  const t = tokens[theme];

  const cardStyle = {
    flex: 1,
    textAlign: "left",
    padding: "20px 18px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.surfaceRaised,
    cursor: "pointer",
    fontFamily: "'Roboto', sans-serif",
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
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            Get Started
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            Are you shopping curated gifts, or registering a brand?
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.push("/customer/sign-up")} style={cardStyle}>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
              I'm a Customer
            </div>
            <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.5 }}>
              Browse curated pieces from brands you have access to.
            </div>
          </button>

          <button onClick={() => router.push("/brand/register")} style={cardStyle}>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
              I'm a Brand
            </div>
            <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.5 }}>
              Register your brand for review. A platform admin approves every
              application before portal access is activated.
            </div>
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: t.textSecondary, margin: 0 }}>
          Already have an account?{" "}
          <span
            onClick={() => router.push("/login")}
            style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
          >
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
}
