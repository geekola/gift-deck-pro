"use client";

import React, { useState } from "react";

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

// Mock saved items — illustrative continuity with the swipe deck's seed pool.
// Deliberately spans multiple brands, to demonstrate brand-scoped grouping
// (invoices are always brand-scoped, per the original spec — Section 7).
const SEED_SAVED = [
  {
    id: "p_001",
    name: "Peak Lapel Tuxedo",
    brandName: "Atelier Noir",
    category: "Formal",
    itemType: "gift",
    costPrice: 4800,
    price: null,
    currency: "USD",
    isMadeToOrder: false,
    deliveryWindow: null,
    variants: [
      { size: "40R", stockQuantity: 6 },
      { size: "42R", stockQuantity: 2 },
    ],
  },
  {
    id: "p_006",
    name: "One-of-One Embroidered Jacket",
    brandName: "Atelier Noir",
    category: "Custom",
    itemType: "gift",
    costPrice: 1200,
    price: null,
    currency: "USD",
    isMadeToOrder: true,
    deliveryWindow: "3–4 weeks",
    variants: [{ size: "One size, tailored to fit", stockQuantity: null }],
  },
  {
    id: "p_002",
    name: "Wool Travel Blazer",
    brandName: "Halden & Vance",
    category: "Business",
    itemType: "purchase",
    costPrice: 310,
    price: 890,
    currency: "USD",
    isMadeToOrder: false,
    deliveryWindow: null,
    variants: [
      { size: "S", stockQuantity: 14 },
      { size: "M", stockQuantity: 9 },
    ],
  },
  {
    id: "p_004",
    name: "Classic Leather Derby",
    brandName: "Halden & Vance",
    category: "Footwear",
    itemType: "purchase",
    costPrice: 85,
    price: 260,
    currency: "USD",
    isMadeToOrder: false,
    deliveryWindow: null,
    variants: [
      { size: "9", stockQuantity: 5 },
      { size: "9.5", stockQuantity: 3 },
    ],
  },
  {
    id: "p_003",
    name: "Bespoke Evening Gown",
    brandName: "Roux Studio",
    category: "Formal",
    itemType: "gift",
    costPrice: 6200,
    price: null,
    currency: "EUR",
    isMadeToOrder: true,
    deliveryWindow: "5–7 weeks",
    variants: [{ size: "Custom fit", stockQuantity: null }],
  },
];

function formatPrice(amount, currency) {
  if (amount == null) return null;
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toLocaleString()}`;
}

function groupByBrand(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.brandName]) groups[item.brandName] = [];
    groups[item.brandName].push(item);
  }
  return groups;
}

export default function SavedGallery() {
  const [theme, setTheme] = useState("dark");
  const [savedItems, setSavedItems] = useState(SEED_SAVED);
  const [selectedIds, setSelectedIds] = useState([]);
  const [removeConfirmId, setRemoveConfirmId] = useState(null);
  const [showMovePlaceholder, setShowMovePlaceholder] = useState(false);
  const [toast, setToast] = useState(null);

  const t = tokens[theme];
  const grouped = groupByBrand(savedItems);
  const brandNames = Object.keys(grouped);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  };

  const toggleSelect = (id) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );
  };

  const selectAllInBrand = (brand) => {
    const idsInBrand = grouped[brand].map((i) => i.id);
    const allSelected = idsInBrand.every((id) => selectedIds.includes(id));
    setSelectedIds((ids) =>
      allSelected
        ? ids.filter((id) => !idsInBrand.includes(id))
        : [...new Set([...ids, ...idsInBrand])]
    );
  };

  const handleRemove = (id) => {
    setSavedItems((items) => items.filter((i) => i.id !== id));
    setSelectedIds((ids) => ids.filter((i) => i !== id));
    setRemoveConfirmId(null);
    showToast("Removed from saved");
  };

  const handleMoveToReview = () => {
    setShowMovePlaceholder(true);
  };

  const selectedBrandsCount = new Set(
    savedItems.filter((i) => selectedIds.includes(i.id)).map((i) => i.brandName)
  ).size;

  if (showMovePlaceholder) {
    const selectedItems = savedItems.filter((i) => selectedIds.includes(i.id));
    const byBrand = groupByBrand(selectedItems);
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
        }}
      >
        <div style={{ width: "100%", maxWidth: 400, paddingTop: 40 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 14 }}
          />
          <h1 style={{ fontSize: 19, fontWeight: 700, color: t.textPrimary, margin: "0 0 8px 0" }}>
            Review & Submit
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: "0 0 20px 0", lineHeight: 1.6 }}>
            This screen — where a shipment request is actually reviewed and submitted, split one
            invoice per brand — hasn't been built yet. Confirming the right items carried through:
          </p>

          {Object.entries(byBrand).map(([brand, items]) => (
            <div
              key={brand}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 10,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 6px 0" }}>
                {brand}
              </p>
              {items.map((i) => (
                <p key={i.id} style={{ fontSize: 12.5, color: t.textSecondary, margin: "2px 0" }}>
                  {i.name}
                </p>
              ))}
            </div>
          ))}

          <button
            onClick={() => setShowMovePlaceholder(false)}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "11px 0",
              fontSize: 13,
              fontWeight: 500,
              color: t.textSecondary,
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            ← Back to saved
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        padding: "24px 16px 100px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        transition: "background 0.2s ease",
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>Gift Deck Pro</span>
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
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            Saved
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            Nothing here is reserved or holding anyone's stock. Sit with these as long as you
            like — pick a few when you're ready to send.
          </p>
        </div>

        {savedItems.length === 0 && (
          <div
            style={{
              border: `1px dashed ${t.border}`,
              borderRadius: 14,
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, margin: "0 0 6px 0" }}>
              Nothing saved yet
            </p>
            <p style={{ fontSize: 12.5, color: t.textSecondary, margin: 0 }}>
              Anything you save from the deck will show up here.
            </p>
          </div>
        )}

        {brandNames.map((brand) => {
          const items = grouped[brand];
          const idsInBrand = items.map((i) => i.id);
          const allSelected = idsInBrand.every((id) => selectedIds.includes(id));

          return (
            <div key={brand} style={{ marginBottom: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <p style={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                  {brand}
                </p>
                <button
                  onClick={() => selectAllInBrand(brand)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: tokens.gold,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Roboto', sans-serif",
                    padding: 0,
                  }}
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const priceLabel =
                    item.itemType === "purchase" ? formatPrice(item.price, item.currency) : null;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: t.surface,
                        border: isSelected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                        borderRadius: 12,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        onClick={() => toggleSelect(item.id)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          border: isSelected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                          background: isSelected ? tokens.gold : "transparent",
                          flexShrink: 0,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          color: "#0F0F0F",
                        }}
                      >
                        {isSelected && "✓"}
                      </div>

                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 8,
                          background: t.surfaceRaised,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9.5,
                          color: t.textSecondary,
                        }}
                      >
                        IMG
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13.5,
                            fontWeight: 500,
                            color: t.textPrimary,
                            margin: "0 0 2px 0",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.name}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 500,
                              color: item.itemType === "gift" ? tokens.gold : t.textSecondary,
                            }}
                          >
                            {item.itemType === "gift" ? "🎁 Gift" : "🛍 Purchase"}
                          </span>
                          {item.isMadeToOrder && (
                            <span style={{ fontSize: 10.5, color: t.textSecondary }}>
                              · Made to order
                            </span>
                          )}
                        </div>
                      </div>

                      {priceLabel && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, flexShrink: 0 }}>
                          {priceLabel}
                        </span>
                      )}

                      {removeConfirmId === item.id ? (
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => handleRemove(item.id)}
                            style={{
                              fontSize: 10.5,
                              fontWeight: 500,
                              color: "#fff",
                              background: "#C24747",
                              border: "none",
                              borderRadius: 5,
                              padding: "5px 8px",
                              cursor: "pointer",
                              fontFamily: "'Roboto', sans-serif",
                            }}
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setRemoveConfirmId(null)}
                            style={{
                              fontSize: 10.5,
                              fontWeight: 500,
                              color: t.textSecondary,
                              background: "transparent",
                              border: `1px solid ${t.border}`,
                              borderRadius: 5,
                              padding: "5px 8px",
                              cursor: "pointer",
                              fontFamily: "'Roboto', sans-serif",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRemoveConfirmId(item.id)}
                          style={{
                            fontSize: 14,
                            color: t.textSecondary,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            flexShrink: 0,
                            padding: "2px 6px",
                          }}
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating action bar — appears only once something is selected */}
      {selectedIds.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            padding: "16px",
            background: `linear-gradient(to top, ${t.bgBase} 60%, transparent)`,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: t.surface,
              border: `1px solid ${tokens.gold}`,
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12.5, color: t.textSecondary }}>
              {selectedIds.length} selected
              {selectedBrandsCount > 1 ? ` · ${selectedBrandsCount} brands` : ""}
            </span>
            <button
              onClick={handleMoveToReview}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#0F0F0F",
                background: tokens.gold,
                border: "none",
                borderRadius: 8,
                padding: "9px 16px",
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              Move to Review & Submit
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: selectedIds.length > 0 ? 90 : 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: t.surfaceRaised,
            border: `1px solid ${t.border}`,
            color: t.textPrimary,
            fontSize: 13,
            fontWeight: 500,
            padding: "10px 18px",
            borderRadius: 8,
            zIndex: 50,
          }}
        >
          {toast}
        </div>
      )}

      <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 14, opacity: 0.7, textAlign: "center" }}>
        Prototype preview — mock data only. Selecting multiple brands will split into separate
        invoices per brand once Review & Submit exists.
      </p>
    </div>
  );
}
