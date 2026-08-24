"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens (shared system, dark-default — mirrors BrandNav) ────────
const tokens = {
  bgBase: "#0F0F0F",
  surface: "#181818",
  surfaceRaised: "#1F1F1F",
  textPrimary: "#EAEAEA",
  textSecondary: "#AFAFAF",
  border: "#2A2A2A",
  gold: "#B98128",
};

// Every customer-facing screen was originally wired up as its own
// standalone component with no shared shell - same gap BrandNav.jsx
// closed for the brand portal, except worse here: there was no way to
// reach Settings, Saved Gallery, Order Status, or even sign out once
// signed in, short of typing a URL directly. Rendered once in
// customer/(protected)/layout.tsx so it wraps every customer route
// automatically, including ones added later.
//
// A left sidebar (BrandNav's pattern) didn't fit - customer screens are
// narrow, centered, mobile-card layouts (~400-460px), not the wide
// desktop tables brand/admin use. This is a slim top bar with a dropdown
// menu instead, confirmed via AskUserQuestion.
const NAV_ITEMS = [
  { href: "/customer/categories", label: "Categories" },
  { href: "/customer/browse", label: "Browse Brands" },
  { href: "/customer/gallery", label: "Saved Gallery" },
  { href: "/customer/orders", label: "Order Status" },
  { href: "/customer/settings", label: "Settings" },
];

export default function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          background: tokens.surface,
          borderBottom: `1px solid ${tokens.border}`,
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: tokens.textPrimary }}>
          Gift Deck Pro
        </span>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsOpen((v) => !v)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: tokens.textPrimary,
              background: "transparent",
              border: `1px solid ${tokens.border}`,
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "'Roboto', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>☰</span> Menu
          </button>

          {isOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                minWidth: 190,
                background: tokens.surfaceRaised,
                border: `1px solid ${tokens.border}`,
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                zIndex: 42,
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 14px",
                      fontSize: 13.5,
                      fontWeight: 500,
                      textDecoration: "none",
                      color: active ? tokens.gold : tokens.textPrimary,
                      background: active ? "rgba(185,129,40,0.12)" : "transparent",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div style={{ borderTop: `1px solid ${tokens.border}` }} />
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleSignOut();
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: tokens.textSecondary,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click-away backdrop - closes the dropdown without needing a
          document-level listener. z-index stays below the header bar's
          own stacking context (40) so it can't paint over the dropdown
          itself - only over the rest of the (unpositioned) page. */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 39 }}
        />
      )}
    </>
  );
}
