"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

// Maps a Supabase products row (snake_case, nested product_variants) onto
// the camelCase shape the render logic below already expects.
function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    itemType: row.item_type,
    costPrice: row.cost_price,
    price: row.price,
    currency: row.currency,
    isMadeToOrder: row.is_made_to_order,
    deliveryWindow: row.delivery_window,
    erpSynced: row.erp_synced,
    heroImage: row.images?.[row.hero_image_index] ?? row.images?.[0] ?? null,
    variants: (row.product_variants || []).map((v) => ({
      id: v.id,
      size: v.size,
      stockQuantity: v.stock_quantity,
      lowStockThreshold: v.low_stock_threshold,
    })),
  };
}

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
  const router = useRouter();
  const supabase = createClient();

  const [theme, setTheme] = useState("dark");
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("brand_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.brand_id) {
        setLoadError("Couldn't load your brand account. Try refreshing.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .eq("brand_id", profile.brand_id)
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError(error.message);
      } else {
        setProducts((data || []).map(mapProduct));
      }
      setIsLoading(false);
    })();
  }, []);

  const t = tokens[theme];

  const filtered = products.filter((p) => {
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
            Brand Portal
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
          {theme === "dark" ? "Preview: Light" : "Preview: Dark"}
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
              Product Catalogue
            </h1>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
              {filtered.length} of {products.length} products
            </p>
          </div>
          <button
            onClick={() => router.push("/brand/products/new")}
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
            + Add Product
          </button>
        </div>

        {loadError && (
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
            {loadError}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "inactive", label: "Inactive" },
            { key: "made_to_order", label: "Made to Order" },
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
          {isLoading && (
            <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: t.textSecondary }}>
              Loading products…
            </div>
          )}
          {!isLoading && filtered.map((product) => {
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
                  {/* Hero image */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: t.surfaceRaised,
                      backgroundImage: product.heroImage ? `url(${product.heroImage})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: t.textSecondary,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    {!product.heroImage && "IMG"}
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
                          Made to Order
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
                      {isActive ? "Active" : "Out of Stock"}
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
                        Low Stock · {lowStockVariants.length}{" "}
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
                        <span style={labelStyle}>Delivery Window</span>
                        <p style={{ fontSize: 13.5, color: t.textPrimary, margin: "3px 0 0 0" }}>
                          {product.deliveryWindow}
                        </p>
                        <p style={{ fontSize: 12, color: t.textSecondary, margin: "4px 0 0 0" }}>
                          No stock tracking — always available.
                        </p>
                      </div>
                    ) : (
                      <p style={{ ...labelStyle, marginBottom: 8, display: "block" }}>
                        Sizes (Variants){" "}
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

          {!isLoading && filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                fontSize: 13,
                color: t.textSecondary,
              }}
            >
              {products.length === 0 ? "No products yet — add your first one." : "No products match this filter."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
