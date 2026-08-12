"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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

// Maps a Supabase products row (joined with product_variants and the
// parent brand's name) onto the camelCase card shape the render logic
// below already expects. One card per Product, per Decision 3 — size
// selection happens within the like/select flow, not at the card level.
function mapCard(row) {
  return {
    id: row.id,
    name: row.name,
    brandName: row.brands?.brand_name ?? "",
    category: row.category,
    itemType: row.item_type,
    costPrice: row.cost_price,
    price: row.price,
    currency: row.currency,
    isMadeToOrder: row.is_made_to_order,
    deliveryWindow: row.delivery_window,
    description: row.description,
    heroImage: row.images?.[row.hero_image_index] ?? row.images?.[0] ?? null,
    variants: (row.product_variants || []).map((v) => ({
      size: v.size,
      stockQuantity: v.stock_quantity,
    })),
  };
}

const CATEGORIES = ["Casual", "Business", "Formal", "Footwear", "Custom"];

function formatPrice(amount, currency) {
  if (amount == null) return null;
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toLocaleString()}`;
}

export default function SwipeDeck() {
  const supabase = createClient();

  const [theme, setTheme] = useState("dark");
  const [activeCategory, setActiveCategory] = useState("Formal");
  const [swipedIds, setSwipedIds] = useState([]); // ids removed from any deck via like/pass/undo-tracking
  const [savedItems, setSavedItems] = useState([]);
  const [passedCount, setPassedCount] = useState(0);
  const [history, setHistory] = useState([]); // stack of { card, action: "saved" | "passed" }
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [exitDirection, setExitDirection] = useState(null);
  const [showToast, setShowToast] = useState(null);
  const startPos = useRef({ x: 0, y: 0 });

  const [allCards, setAllCards] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Reads the category CategorySelector navigated here with (e.g.
  // /customer/deck?category=Footwear). Read window.location directly
  // (rather than next/navigation's useSearchParams) so this doesn't need
  // a Suspense boundary - this component is already 100% client-rendered.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("category");
    if (cat && CATEGORIES.includes(cat)) {
      setActiveCategory(cat);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCustomerId(user.id);

      // RLS (products_customer_select) already restricts this to
      // approved-access, non-restricted brands - fetch the whole
      // accessible catalogue once and filter by category client-side,
      // same shape the deck used with SEED_CARDS.
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*), brands(brand_name)");

      if (error) {
        setLoadError(error.message);
      } else {
        setAllCards((data || []).map(mapCard));
      }
      setIsLoading(false);
    })();
  }, []);

  const t = tokens[theme];
  const cards = allCards.filter(
    (c) => c.category === activeCategory && !swipedIds.includes(c.id)
  );
  const topCard = cards[0];

  const showToastMsg = (msg) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 1400);
  };

  const advance = (direction, cardId) => {
    setExitDirection(direction);
    setTimeout(() => {
      setSwipedIds((ids) => [...ids, cardId]);
      setExitDirection(null);
      setDrag({ x: 0, y: 0, active: false });
    }, 220);
  };

  const handleLike = () => {
    if (!topCard) return;
    setSavedItems((s) => [...s, topCard]);
    setHistory((h) => [...h, { card: topCard, action: "saved" }]);
    showToastMsg("Saved to your gallery");
    advance("right", topCard.id);

    if (customerId) {
      // Fire-and-forget - the swipe already advanced optimistically, and
      // (customer_id, product_id) is unique so a duplicate like from an
      // undo/re-swipe just no-ops instead of erroring.
      supabase
        .from("saved_items")
        .upsert(
          { customer_id: customerId, product_id: topCard.id },
          { onConflict: "customer_id,product_id", ignoreDuplicates: true }
        )
        .then(({ error }) => {
          if (error) console.error("Failed to save item:", error.message);
        });
    }
  };

  const handlePass = () => {
    if (!topCard) return;
    setPassedCount((c) => c + 1);
    setHistory((h) => [...h, { card: topCard, action: "passed" }]);
    advance("left", topCard.id);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));

    if (last.action === "saved") {
      setSavedItems((s) => {
        const idx = s.map((it) => it.id).lastIndexOf(last.card.id);
        if (idx === -1) return s;
        return [...s.slice(0, idx), ...s.slice(idx + 1)];
      });
    } else {
      setPassedCount((c) => Math.max(0, c - 1));
    }

    setSwipedIds((ids) => ids.filter((id) => id !== last.card.id));
    // If the undone card belonged to a different category than the one
    // currently active, switch back to it so the card is visible again.
    if (last.card.category !== activeCategory) {
      setActiveCategory(last.card.category);
    }
    setExitDirection(null);
    setDrag({ x: 0, y: 0, active: false });
    showToastMsg(last.action === "saved" ? "Removed from saved" : "Brought card back");

    if (last.action === "saved" && customerId) {
      supabase
        .from("saved_items")
        .delete()
        .eq("customer_id", customerId)
        .eq("product_id", last.card.id)
        .then(({ error }) => {
          if (error) console.error("Failed to unsave item:", error.message);
        });
    }
  };

  const handleCategorySwitch = (cat) => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);
    setExitDirection(null);
    setDrag({ x: 0, y: 0, active: false });
  };

  const handlePointerDown = (e) => {
    const point = e.touches ? e.touches[0] : e;
    startPos.current = { x: point.clientX, y: point.clientY };
    setDrag((d) => ({ ...d, active: true }));
  };

  const handlePointerMove = (e) => {
    if (!drag.active) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startPos.current.x;
    const dy = point.clientY - startPos.current.y;
    setDrag({ x: dx, y: dy, active: true });
  };

  const handlePointerUp = () => {
    if (!drag.active) return;
    const threshold = 100;
    if (drag.x > threshold) {
      handleLike();
    } else if (drag.x < -threshold) {
      handlePass();
    } else {
      setDrag({ x: 0, y: 0, active: false });
    }
  };

  const rotation = drag.x / 18;
  const likeOpacity = Math.min(Math.max(drag.x / 100, 0), 1);
  const passOpacity = Math.min(Math.max(-drag.x / 100, 0), 1);

  const cardTransform =
    exitDirection === "right"
      ? "translate(120%, -20px) rotate(20deg)"
      : exitDirection === "left"
      ? "translate(-120%, -20px) rotate(-20deg)"
      : `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${rotation}deg)`;

  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "background 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>Gift Deck Pro</span>
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: tokens.gold,
              background: "rgba(185,129,40,0.12)",
              padding: "5px 10px",
              borderRadius: 6,
            }}
          >
            {savedItems.length} saved
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
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      {/* Category switcher — available at any point in the engagement, per
          the standing "switch anytime" promise made on the Category Selector
          screen. Switching does not clear saved items or undo history.
          A single dropdown, not a pill row, to stay compact and keep the
          deck above the fold. */}
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          marginBottom: 14,
        }}
      >
        <select
          value={activeCategory}
          onChange={(e) => handleCategorySwitch(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'Roboto', sans-serif",
            color: tokens.gold,
            background: t.surface,
            border: `1px solid ${tokens.gold}`,
            borderRadius: 10,
            padding: "9px 12px",
            cursor: "pointer",
            outline: "none",
            appearance: "none",
            WebkitAppearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M0 0L5 6L10 0' fill='%23B98128'/></svg>\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat} style={{ background: t.surface, color: t.textPrimary }}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Card stack */}
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          height: 520,
          position: "relative",
        }}
      >
        {isLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px dashed ${t.border}`,
              borderRadius: 18,
              fontSize: 13,
              color: t.textSecondary,
            }}
          >
            Loading deck…
          </div>
        )}

        {!isLoading && loadError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              border: `1px dashed ${t.border}`,
              borderRadius: 18,
              fontSize: 13,
              color: "#E27A7A",
              padding: 24,
            }}
          >
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && cards.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              border: `1px dashed ${t.border}`,
              borderRadius: 18,
            }}
          >
            <div
              style={{
                width: 28,
                height: 3,
                background: tokens.gold,
                borderRadius: 2,
                marginBottom: 14,
              }}
            />
            <p style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
              That's everything in {activeCategory} for now
            </p>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, maxWidth: 260 }}>
              You've saved {savedItems.length} total across categories. Try another category
              above, or check back later for more here.
            </p>
          </div>
        )}

        {!isLoading &&
          cards
            .slice(0, 3)
            .reverse()
            .map((card, idx, arr) => {
            const isTop = idx === arr.length - 1;
            const stackOffset = arr.length - 1 - idx;
            const priceLabel =
              card.itemType === "purchase"
                ? formatPrice(card.price, card.currency)
                : null;
            const availableSizes = card.variants.filter(
              (v) => card.isMadeToOrder || v.stockQuantity > 0 || v.stockQuantity === null
            );

            return (
              <div
                key={card.id}
                onMouseDown={isTop ? handlePointerDown : undefined}
                onMouseMove={isTop ? handlePointerMove : undefined}
                onMouseUp={isTop ? handlePointerUp : undefined}
                onMouseLeave={isTop ? handlePointerUp : undefined}
                onTouchStart={isTop ? handlePointerDown : undefined}
                onTouchMove={isTop ? handlePointerMove : undefined}
                onTouchEnd={isTop ? handlePointerUp : undefined}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 18,
                  overflow: "hidden",
                  cursor: isTop ? (drag.active ? "grabbing" : "grab") : "default",
                  transform: isTop
                    ? cardTransform
                    : `translateY(${stackOffset * 8}px) scale(${1 - stackOffset * 0.03})`,
                  transition:
                    isTop && drag.active ? "none" : "transform 0.25s ease, opacity 0.25s ease",
                  zIndex: idx,
                  userSelect: "none",
                  touchAction: "none",
                }}
              >
                {/* Image area */}
                <div
                  style={{
                    height: "62%",
                    background: t.surfaceRaised,
                    backgroundImage: card.heroImage ? `url(${card.heroImage})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {!card.heroImage && <span style={{ fontSize: 12, color: t.textSecondary }}>IMAGE</span>}

                  {/* Item type icon */}
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      fontSize: 11,
                      fontWeight: 500,
                      color: card.itemType === "gift" ? tokens.gold : t.textPrimary,
                      background: card.itemType === "gift" ? "rgba(185,129,40,0.18)" : "rgba(0,0,0,0.5)",
                      padding: "5px 10px",
                      borderRadius: 6,
                    }}
                  >
                    {card.itemType === "gift" ? "🎁 Gift" : "🛍 Purchase"}
                  </div>

                  {/* Made to order watermark — applied at presentation time, per Decision 6 */}
                  {card.isMadeToOrder && (
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        fontSize: 10.5,
                        fontWeight: 500,
                        color: "#fff",
                        background: "rgba(0,0,0,0.55)",
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      Made to Order
                    </div>
                  )}

                  {/* Like/Pass overlay indicators while dragging */}
                  {isTop && (
                    <>
                      <div
                        style={{
                          position: "absolute",
                          top: 50,
                          left: 50,
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#8FBF5A",
                          border: "3px solid #8FBF5A",
                          borderRadius: 8,
                          padding: "4px 12px",
                          transform: "rotate(-18deg)",
                          opacity: likeOpacity,
                        }}
                      >
                        SAVE
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          top: 50,
                          right: 50,
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#E27A7A",
                          border: "3px solid #E27A7A",
                          borderRadius: 8,
                          padding: "4px 12px",
                          transform: "rotate(18deg)",
                          opacity: passOpacity,
                        }}
                      >
                        PASS
                      </div>
                    </>
                  )}
                </div>

                {/* Info area */}
                <div style={{ padding: "16px 18px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: t.textPrimary,
                          margin: "0 0 2px 0",
                        }}
                      >
                        {card.name}
                      </p>
                      <p style={{ fontSize: 12.5, color: t.textSecondary, margin: 0 }}>
                        {card.brandName} · {card.category}
                      </p>
                    </div>
                    {priceLabel && (
                      <span style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
                        {priceLabel}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: 12.5,
                      color: t.textSecondary,
                      margin: "8px 0 10px 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {card.description}
                  </p>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {availableSizes.map((v) => (
                      <span
                        key={v.size}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: t.textSecondary,
                          background: t.surfaceRaised,
                          border: `1px solid ${t.border}`,
                          padding: "3px 9px",
                          borderRadius: 6,
                        }}
                      >
                        {v.size}
                      </span>
                    ))}
                  </div>

                  {card.isMadeToOrder && (
                    <p style={{ fontSize: 11, color: t.textSecondary, margin: "8px 0 0 0" }}>
                      Delivery: {card.deliveryWindow}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Action buttons */}
      {(cards.length > 0 || history.length > 0) && (
        <div style={{ display: "flex", gap: 18, marginTop: 22, alignItems: "center" }}>
          <button
            onClick={handlePass}
            disabled={cards.length === 0}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: `1px solid ${t.border}`,
              background: t.surface,
              color: "#E27A7A",
              fontSize: 22,
              cursor: cards.length === 0 ? "not-allowed" : "pointer",
              opacity: cards.length === 0 ? 0.4 : 1,
            }}
            aria-label="Pass"
          >
            ✕
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: `1px solid ${t.border}`,
              background: t.surface,
              color: history.length === 0 ? t.textSecondary : tokens.gold,
              fontSize: 17,
              cursor: history.length === 0 ? "not-allowed" : "pointer",
              opacity: history.length === 0 ? 0.4 : 1,
              fontFamily: "'Roboto', sans-serif",
            }}
            aria-label="Undo"
            title="Undo last action"
          >
            ↺
          </button>
          <button
            onClick={handleLike}
            disabled={cards.length === 0}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "none",
              background: tokens.gold,
              color: "#0F0F0F",
              fontSize: 22,
              cursor: cards.length === 0 ? "not-allowed" : "pointer",
              opacity: cards.length === 0 ? 0.4 : 1,
            }}
            aria-label="Save"
          >
            ♥
          </button>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: t.surfaceRaised,
            border: `1px solid ${tokens.gold}`,
            color: t.textPrimary,
            fontSize: 13,
            fontWeight: 500,
            padding: "10px 18px",
            borderRadius: 8,
            zIndex: 50,
          }}
        >
          {showToast}
        </div>
      )}

      <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 18, opacity: 0.7, textAlign: "center" }}>
        Drag the card, or use the buttons below.
      </p>
    </div>
  );
}
