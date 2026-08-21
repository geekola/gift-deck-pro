"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens (shared system, dark-default — mirrors
// PlatformAdminDashboard's sidebar) ─────────────────────────────────────
const tokens = {
  dark: {
    surface: "#181818",
    textPrimary: "#EAEAEA",
    textSecondary: "#AFAFAF",
    border: "#2A2A2A",
  },
  gold: "#B98128",
};

// Every brand-facing screen was originally wired up as its own standalone
// mock component with no shared shell, so there was no way to get from
// "Add product" or "Company settings" back to anywhere else except the
// browser's back button. This is the persistent nav that was missing -
// rendered once in brand/(protected)/layout.tsx so it wraps every brand
// route automatically, including ones added later.
const NAV_ITEMS = [
  { href: "/brand/products", label: "Product Catalogue" },
  { href: "/brand/customers", label: "Customer Access" },
  { href: "/brand/vip-talent", label: "VIP Talent Contracts" },
  { href: "/brand/bulk-upload", label: "Bulk Upload" },
  { href: "/brand/notifications", label: "Document Notifications" },
  { href: "/brand/settings", label: "Company Settings" },
];

export default function BrandNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const t = tokens.dark;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <div
        style={{
          flex: "0 0 220px",
          background: t.surface,
          borderRight: `1px solid ${t.border}`,
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <div style={{ padding: "0 10px", marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>Gift Deck Pro</span>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 500, color: t.textSecondary, letterSpacing: "0.04em" }}>
            Brand Portal
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            // /brand/products should also read as active on
            // /brand/products/new - it's the catalogue's own "add" screen,
            // not a separate section.
            const active =
              pathname === item.href ||
              (item.href === "/brand/products" && pathname.startsWith("/brand/products/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 500,
                  fontFamily: "'Roboto', sans-serif",
                  cursor: "pointer",
                  textDecoration: "none",
                  background: active ? "rgba(185,129,40,0.12)" : "transparent",
                  color: active ? tokens.gold : t.textSecondary,
                  borderLeft: active ? `2px solid ${tokens.gold}` : "2px solid transparent",
                  position: "relative",
                  left: active ? -2 : 0,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Fixed rather than sidebar-bottom - the sidebar stretches to
          match the height of whatever's in the main content column, so a
          long product list or long form pushed this off the bottom of
          the screen entirely. Pinning it to the viewport keeps it
          reachable no matter how long the page is. */}
      <button
        onClick={handleSignOut}
        style={{
          position: "fixed",
          top: 16,
          right: 20,
          zIndex: 50,
          fontSize: 11,
          fontWeight: 500,
          color: t.textSecondary,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 6,
          padding: "7px 10px",
          cursor: "pointer",
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        Sign Out
      </button>
    </>
  );
}
