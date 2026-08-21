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

// 5-value category enum — updated this session (Footwear added when
// designing the bulk upload templates). Descriptions are static copy;
// counts are real, fetched below (how many cards are currently
// available to THIS customer in each category, after
// access-policy/restriction/VIP-unlock filtering — that filtering
// happens in Postgres via RLS on the products_customer_select policy,
// not in this component).
const CATEGORIES = [
  { key: "Casual", label: "Casual", desc: "Everyday wear, ready-to-wear sizing." },
  { key: "Business", label: "Business", desc: "Workwear and travel-friendly pieces." },
  { key: "Formal", label: "Formal", desc: "Suiting, tuxedos, evening wear." },
  { key: "Footwear", label: "Footwear", desc: "Shoes, numeric sizing." },
  { key: "Custom", label: "Custom", desc: "One-off and bespoke pieces." },
];

export default function CategorySelector() {
  const router = useRouter();
  const supabase = createClient();

  const [theme, setTheme] = useState("dark");
  const [selected, setSelected] = useState(null);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // RLS (products_customer_select) already restricts this to
      // approved-access, non-restricted brands - no filtering needed here.
      const { data, error } = await supabase.from("products").select("category");
      if (!error && data) {
        const tally = {};
        for (const row of data) {
          tally[row.category] = (tally[row.category] || 0) + 1;
        }
        setCounts(tally);
      }
      setIsLoading(false);
    })();
  }, []);

  const t = tokens[theme];
  const selectedCategory = CATEGORIES.find((c) => c.key === selected);

  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        padding: "28px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "background 0.2s ease",
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Gift Deck Pro</span>
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
          {theme === "dark" ? "Preview: light" : "Preview: dark"}
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
                What are you in the mood for?
              </h1>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
                Pick a category to enter its deck. You can switch anytime.
              </p>
            </div>
            <button
              onClick={() => router.push("/customer/browse")}
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: tokens.gold,
                background: "transparent",
                border: `1px solid ${tokens.gold}`,
                borderRadius: 7,
                padding: "7px 12px",
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              + Browse brands
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selected === cat.key;
            return (
              <div
                key={cat.key}
                onClick={() => setSelected(cat.key)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 18px",
                  borderRadius: 12,
                  cursor: "pointer",
                  border: isSelected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                  background: isSelected ? "rgba(185,129,40,0.1)" : t.surface,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: isSelected ? tokens.gold : t.textPrimary,
                    }}
                  >
                    {cat.label}
                  </span>
                  <p style={{ fontSize: 12, color: t.textSecondary, margin: "3px 0 0 0" }}>
                    {cat.desc}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: t.textSecondary,
                    background: t.surfaceRaised,
                    padding: "4px 10px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  {isLoading ? "…" : `${counts[cat.key] || 0} pieces`}
                </span>
              </div>
            );
          })}
        </div>

        <button
          disabled={!selected}
          onClick={() => router.push(`/customer/deck?category=${encodeURIComponent(selected)}`)}
          style={{
            width: "100%",
            padding: "13px 0",
            fontSize: 14.5,
            fontWeight: 500,
            fontFamily: "'Roboto', sans-serif",
            color: selected ? "#0F0F0F" : t.textSecondary,
            background: selected ? tokens.gold : t.surfaceRaised,
            border: selected ? "none" : `1px solid ${t.border}`,
            borderRadius: 8,
            cursor: selected ? "pointer" : "not-allowed",
            opacity: selected ? 1 : 0.6,
          }}
        >
          {selected ? `Enter ${selectedCategory.label} deck` : "Select a category to continue"}
        </button>
      </div>
    </div>
  );
}
