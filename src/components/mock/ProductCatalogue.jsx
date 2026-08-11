"use client";

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

// Mock catalogue — illustrative only, deliberately spans the real schema variety:
// in-stock, low-stock, made-to-order (no stock concept), and ERP-synced (read-only mirror).
const SEED_PRODUCTS = [
  {
    id: "p_001",
    name: "Peak Lapel Tuxedo",
    category: "Formal",
    itemType: "gift",
    costPrice: 4800,
    price: null,
    currency: "USD",
    isMadeToOrder: false,
    deliveryWindow: null,
    erpSynced: false,
    variants: [
      { id: "v_001a", size: "40R", stockQuantity: 6, lowStockThreshold: 3 },
      { id: "v_001b", size: "42R", stockQuantity: 2, lowStockThreshold: 3 },
      { id: "v_001c", size: "42L", stockQuantity: 0, lowStockThreshold: 3 },
    ],
  },
  {
    id: "p_002",
    name: "Wool Travel Blazer",
    category: "Business",
    itemType: "purchase",
    costPrice: 310,
    price: 890,
    currency: "USD",
    isMadeToOrder: false,
    deliveryWindow: null,
    erpSynced: true,
    variants: [
      { id: "v_002a", size: "S", stockQuantity: 14, lowStockThreshold: 5 },
      { id: "v_002b", size: "M", stockQuantity: 9, lowStockThreshold: 5 },
      { id: "v_002c", size: "L", stockQuantity: 3, lowStockThreshold: 5 },
    ],
  },
  {
    id: "p_003",
    name: "Bespoke Evening Gown",
    category: "Formal",
    itemType: "gift",
    costPrice: 6200,
    price: null,
    currency: "EUR",
    isMadeToOrder: true,
    deliveryWindow: "5–7 weeks",
    erpSynced: false,
    variants: [
      { id: "v_003a", size: "Custom fit", stockQuantity: null, lowStockThreshold: null },
    ],
  },
  {
    id: "p_004",
    name: "Relaxed Linen Shirt",
    category: "Casual",
    itemType: "purchase",
    costPrice: 38,
    price: 145,
    currency: "USD",
    isMadeToOrder: false,
    deliveryWindow: null,
    erpSynced: false,
    variants: [
      { id: "v_004a", size: "S", stockQuantity: 0, lowStockThreshold: 4 },
      { id: "v_004b", size: "M", stockQuantity: 0, lowStockThreshold: 4 },
    ],
  },
];

function deriveActive(product) {
  // Product.active is derived — true if at least one variant has stock,
  // or is untracked-but-available (made-to-order).
  if (product.isMadeToOrder) return true;
  return product.variants.some((v) => (v.stockQuantity ?? 0) > 0);
}

function formatPrice(amount, currency) {
  if (amount == null) return "—";
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toLocaleString()}`;
}

export default function ProductCatalogue() {
  const [theme, setTheme] = useState("dark");
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all");

  const t = tokens[theme];

  const filtered = SEED_PRODUCTS.filter((p) => {
    if (filter === "all") return true;
    if (filter === "active") return deriveActive(p);
    if (filter === "inactive") return !deriveActive(p);
    if (filter === "made_to_order") return p.isMadeToOrder;
    return true;
  });

  const labelStyle = {
    fontSize: 11.5,
    fontWeight: 500,
    color: t.textSecondary,
    letterSpacing: "0.01em",
  };

  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        padding: "28px 20px",
        transition: "background 0.2s ease",
      }}
    >

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          maxWidth: 980,
          margin: "0 auto 24px auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
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

      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 18,
          }}
        >
          <div>
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
              style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}
            >
              Product catalogue
            </h1>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
              {filtered.length} of {SEED_PRODUCTS.length} products
            </p>
          </div>
          <button
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#0F0F0F",
              background: tokens.gold,
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              fontFamily: "'Roboto', sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            + Add product
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "inactive", label: "Inactive" },
            { key: "made_to_order", label: "Made to order" },
          ].map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  padding: "7px 13px",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                  border: active ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                  background: active ? "rgba(185,129,40,0.12)" : "transparent",
                  color: active ? tokens.gold : t.textSecondary,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Product list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((product) => {
            const isActive = deriveActive(product);
            const isExpanded = expandedId === product.id;
            const lowStockVariants = product.variants.filter(
              (v) =>
                !product.isMadeToOrder &&
                v.stockQuantity != null &&
                v.lowStockThreshold != null &&
                v.stockQuantity > 0 &&
                v.stockQuantity <= v.lowStockThreshold
            );

            return (
              <div
                key={product.id}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : product.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    cursor: "pointer",
                  }}
                >
                  {/* Hero image placeholder */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: t.surfaceRaised,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: t.textSecondary,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    IMG
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span
                        style={{
                          fontSize: 14.5,
                          fontWeight: 500,
                          color: t.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {product.name}
                      </span>
                      {product.isMadeToOrder && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 500,
                            color: tokens.gold,
                            background: "rgba(185,129,40,0.14)",
                            padding: "2px 7px",
                            borderRadius: 5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Made to order
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: t.textSecondary }}>
                        {product.category}
                      </span>
                      <span style={{ fontSize: 12, color: t.textSecondary }}>·</span>
                      <span style={{ fontSize: 12, color: t.textSecondary }}>
                        {product.itemType === "gift" ? "Gift" : "Purchase"}
                      </span>
                      {product.erpSynced && (
                        <>
                          <span style={{ fontSize: 12, color: t.textSecondary }}>·</span>
                          <span style={{ fontSize: 12, color: t.textSecondary }}>ERP-synced</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, margin: 0 }}>
                      {product.itemType === "purchase"
                        ? formatPrice(product.price, product.currency)
                        : formatPrice(product.costPrice, product.currency)}
                    </p>
                    <p style={{ fontSize: 11, color: t.textSecondary, margin: "2px 0 0 0" }}>
                      {product.itemType === "purchase" ? "retail" : "cost basis"}
                    </p>
                  </div>

                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: isActive ? "#8FBF5A" : t.textSecondary,
                        background: isActive ? "rgba(99,153,34,0.14)" : t.surfaceRaised,
                        padding: "3px 9px",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isActive ? "Active" : "Out of stock"}
                    </span>
                    {lowStockVariants.length > 0 && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 500,
                          color: "#E2A23A",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Low stock · {lowStockVariants.length}{" "}
                        {lowStockVariants.length === 1 ? "size" : "sizes"}
                      </span>
                    )}
                  </div>

                  <i
                    className="ti ti-chevron-down"
                    style={{
                      fontSize: 16,
                      color: t.textSecondary,
                      transform: isExpanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s ease",
                      flexShrink: 0,
                    }}
                  />
                </div>

                {isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${t.border}`,
                      padding: "14px 18px 16px 18px",
                      background: t.surfaceRaised,
                    }}
                  >
                    {product.isMadeToOrder ? (
                      <div style={{ marginBottom: 10 }}>
                        <span style={labelStyle}>Delivery window</span>
                        <p style={{ fontSize: 13.5, color: t.textPrimary, margin: "3px 0 0 0" }}>
                          {product.deliveryWindow}
                        </p>
                        <p style={{ fontSize: 12, color: t.textSecondary, margin: "4px 0 0 0" }}>
                          No stock tracking — always available.
                        </p>
                      </div>
                    ) : (
                      <p style={{ ...labelStyle, marginBottom: 8, display: "block" }}>
                        Sizes (variants){" "}
                        {product.erpSynced && (
                          <span style={{ color: t.textSecondary, fontWeight: 400 }}>
                            — read-only, mirrored from ERP
                          </span>
                        )}
                      </p>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {product.variants.map((v) => {
                        const isLow =
                          !product.isMadeToOrder &&
                          v.stockQuantity != null &&
                          v.lowStockThreshold != null &&
                          v.stockQuantity > 0 &&
                          v.stockQuantity <= v.lowStockThreshold;
                        const isOut = !product.isMadeToOrder && (v.stockQuantity ?? 0) === 0;

                        return (
                          <div
                            key={v.id}
                            style={{
                              background: t.surface,
                              border: `1px solid ${t.border}`,
                              borderRadius: 8,
                              padding: "9px 12px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: t.textPrimary,
                                margin: "0 0 3px 0",
                              }}
                            >
                              {v.size}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                margin: 0,
                                color: isOut
                                  ? "#E27A7A"
                                  : isLow
                                  ? "#E2A23A"
                                  : t.textSecondary,
                              }}
                            >
                              {v.stockQuantity == null
                                ? product.isMadeToOrder
                                  ? "Always available"
                                  : "Pending ERP sync"
                                : `${v.stockQuantity} in stock`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                fontSize: 13,
                color: t.textSecondary,
              }}
            >
              No products match this filter.
            </div>
          )}
        </div>
      </div>

      <p
        style={{
          fontSize: 11,
          color: t.textSecondary,
          marginTop: 18,
          opacity: 0.7,
          textAlign: "center",
        }}
      >
        Prototype preview — mock data only, no live backend connection
      </p>
    </div>
  );
}
