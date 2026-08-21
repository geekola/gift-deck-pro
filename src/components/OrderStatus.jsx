"use client";

import React, { useEffect, useState } from "react";
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

// Maps a requisitions row (joined with brand, shipping address, and line
// items) onto the shape the render logic below expects. decline_reason is
// deliberately never in the select() this comes from - per migration
// 0007's own comment, that's "enforced by RLS/API layer selecting this
// column out", i.e. by never fetching it here, not by a DB-level lock.
//
// is_made_to_order / delivery_window aren't part of requisition_items'
// snapshot columns (only price/cost/currency/size/item_type are), so
// those two come from the live product row instead of a point-in-time
// snapshot - fine for descriptive/logistics fields, unlike price.
function mapRequisition(row) {
  return {
    id: row.id,
    brandName: row.brands?.brand_name ?? "",
    state: row.state,
    submittedAt: row.submitted_at,
    trackingNumber: row.tracking_number,
    shippingCity: row.shipping_addresses?.city ?? "",
    shippingState: row.shipping_addresses?.state ?? "",
    fullAddress: row.shipping_addresses
      ? [
          row.shipping_addresses.line1,
          row.shipping_addresses.line2,
          row.shipping_addresses.city,
          row.shipping_addresses.state,
          row.shipping_addresses.zip,
        ]
          .filter(Boolean)
          .join(", ")
      : null,
    items: (row.requisition_items || []).map((it) => ({
      id: it.id,
      name: it.products?.name ?? "",
      size: it.size_snapshot,
      itemType: it.item_type_snapshot,
      isMadeToOrder: it.products?.is_made_to_order ?? false,
      deliveryWindow: it.products?.delivery_window ?? null,
    })),
  };
}

const STATE_ORDER = ["submitted", "invoiced", "confirmed", "dispatched"];
const STATE_LABELS = {
  submitted: "Submitted",
  invoiced: "Sent to Brand",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StateProgress({ state, t }) {
  const currentIdx = STATE_ORDER.indexOf(state);
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
      {STATE_ORDER.map((s, idx) => {
        const reached = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <React.Fragment key={s}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: reached ? tokens.gold : t.border,
                border: isCurrent ? `2px solid ${tokens.gold}` : "none",
                boxShadow: isCurrent ? "0 0 0 2px rgba(185,129,40,0.2)" : "none",
                flexShrink: 0,
              }}
            />
            {idx < STATE_ORDER.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: idx < currentIdx ? tokens.gold : t.border,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function OrderStatus() {
  const supabase = createClient();

  const [theme, setTheme] = useState("dark");
  const [filter, setFilter] = useState("active");
  const [expandedId, setExpandedId] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("requisitions")
        .select(
          `id, state, submitted_at, tracking_number,
           brands(brand_name),
           shipping_addresses(line1, line2, city, state, zip),
           requisition_items(id, size_snapshot, item_type_snapshot,
             products(name, is_made_to_order, delivery_window))`
        )
        .eq("customer_id", user.id)
        .order("submitted_at", { ascending: false });

      if (error) {
        setLoadError(error.message);
      } else {
        setRequisitions((data || []).map(mapRequisition));
      }
      setIsLoading(false);
    })();
  }, []);

  const t = tokens[theme];

  const visible = requisitions.filter((r) => {
    if (filter === "active") return r.state !== "declined";
    if (filter === "declined") return r.state === "declined";
    return true;
  });

  const labelStyle = { fontSize: 11, fontWeight: 500, color: t.textSecondary };

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
        <div style={{ marginBottom: 16 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            In Progress
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            Everything you've submitted, tracked from request to delivery.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { key: "active", label: "Active" },
            { key: "declined", label: "Declined" },
            { key: "all", label: "All" },
          ].map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "6px 13px",
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

        {loadError && (
          <div
            style={{
              background: "rgba(194,71,71,0.12)",
              border: "1px solid rgba(194,71,71,0.4)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12.5,
              color: "#E27A7A",
              marginBottom: 16,
            }}
          >
            {loadError}
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: t.textSecondary }}>
            Loading…
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <div
            style={{
              border: `1px dashed ${t.border}`,
              borderRadius: 14,
              padding: "36px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>Nothing here yet.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!isLoading && visible.map((req) => {
            const isExpanded = expandedId === req.id;
            const isDeclined = req.state === "declined";
            const isDispatched = req.state === "dispatched";

            return (
              <div
                key={req.id}
                style={{
                  background: t.surface,
                  border: `1px solid ${isDeclined ? "rgba(194,71,71,0.3)" : t.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  style={{ padding: "14px 16px", cursor: "pointer" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: "0 0 2px 0" }}>
                        {req.brandName}
                      </p>
                      <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>
                        {req.items.map((i) => i.name).join(", ")}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        color: isDeclined ? "#E27A7A" : tokens.gold,
                        background: isDeclined ? "rgba(194,71,71,0.14)" : "rgba(185,129,40,0.14)",
                        padding: "3px 9px",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isDeclined ? "No Longer Available" : STATE_LABELS[req.state]}
                    </span>
                  </div>

                  {!isDeclined && <StateProgress state={req.state} t={t} />}

                  <p style={{ fontSize: 11, color: t.textSecondary, margin: 0 }}>
                    Submitted {formatDate(req.submittedAt)}
                  </p>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${t.border}`,
                      padding: "14px 16px",
                      background: t.surfaceRaised,
                    }}
                  >
                    {req.items.map((i, idx) => (
                      <p key={idx} style={{ fontSize: 12.5, color: t.textPrimary, margin: "0 0 8px 0" }}>
                        {i.name} · size {i.size}
                      </p>
                    ))}

                    {isDeclined ? (
                      <p style={{ fontSize: 12, color: t.textSecondary, margin: 0, lineHeight: 1.6 }}>
                        This item is no longer available from {req.brandName}. It's been returned
                        to your saved gallery — feel free to look for something else in the
                        meantime.
                      </p>
                    ) : (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <span style={labelStyle}>Shipping To</span>
                          <p style={{ fontSize: 12.5, color: t.textPrimary, margin: "3px 0 0 0" }}>
                            {isDispatched && req.fullAddress
                              ? req.fullAddress
                              : `${req.shippingCity}, ${req.shippingState}`}
                          </p>
                          {!isDispatched && (
                            <p style={{ fontSize: 11, color: t.textSecondary, margin: "4px 0 0 0" }}>
                              Full address is shared with {req.brandName} once this dispatches.
                            </p>
                          )}
                        </div>

                        {isDispatched && req.trackingNumber && (
                          <div style={{ marginBottom: 10 }}>
                            <span style={labelStyle}>Tracking</span>
                            <p style={{ fontSize: 12.5, color: t.textPrimary, margin: "3px 0 0 0" }}>
                              {req.trackingNumber}
                            </p>
                          </div>
                        )}

                        {/* Delivery window is per-item (a requisition can mix
                            made-to-order and in-stock pieces) rather than
                            assumed uniform across the whole requisition. */}
                        {req.items
                          .filter((i) => i.isMadeToOrder)
                          .map((i, idx) => (
                            <div key={idx} style={{ marginBottom: 10 }}>
                              <span style={labelStyle}>
                                Delivery Window {req.items.length > 1 ? `— ${i.name}` : ""}
                              </span>
                              {i.itemType === "purchase" || req.state === "confirmed" || isDispatched ? (
                                <p style={{ fontSize: 12.5, color: t.textPrimary, margin: "3px 0 0 0" }}>
                                  {i.deliveryWindow}
                                </p>
                              ) : (
                                <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "3px 0 0 0" }}>
                                  Shared once {req.brandName} confirms.
                                </p>
                              )}
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
