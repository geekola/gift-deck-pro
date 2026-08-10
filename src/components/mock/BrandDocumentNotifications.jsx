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

// Mock document-ready notifications — continuity with the Order Status
// screen's requisitions and the PDF documents just generated.
const SEED_NOTIFICATIONS = [
  {
    id: "doc_001",
    invoiceId: "PSF-2026-00841",
    customerDisplayName: "Alex M.",
    itemName: "Wool Travel Blazer",
    state: "invoiced",
    generatedAt: "2026-06-24T10:02:00Z",
    read: false,
    emailSent: true,
    documents: ["packing_slip", "order_form_invoice"],
  },
  {
    id: "doc_002",
    invoiceId: "PSF-2026-00781",
    customerDisplayName: "Priya K.",
    itemName: "Bespoke Evening Gown",
    state: "confirmed",
    generatedAt: "2026-06-18T14:05:00Z",
    read: true,
    emailSent: true,
    documents: ["packing_slip", "order_form_invoice"],
  },
  {
    id: "doc_003",
    invoiceId: "PSF-2026-00702",
    customerDisplayName: "Jonah R.",
    itemName: "Suede Chelsea Boot",
    state: "dispatched",
    generatedAt: "2026-06-10T09:10:00Z",
    read: true,
    emailSent: true,
    documents: ["packing_slip", "order_form_invoice", "return_info"],
  },
];

const DOC_LABELS = {
  packing_slip: "Packing slip",
  order_form_invoice: "Order form / invoice",
  return_info: "Return info",
};

const STATE_LABELS = {
  invoiced: "Sent to you",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
};

function formatDateTime(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

export default function BrandDocumentNotifications() {
  const [theme, setTheme] = useState("dark");
  const [notifications, setNotifications] = useState(SEED_NOTIFICATIONS);
  const [downloadToast, setDownloadToast] = useState(null);

  const t = tokens[theme];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleDownload = (docKey, notif) => {
    markRead(notif.id);
    setDownloadToast(`${DOC_LABELS[docKey]} downloaded — ${notif.invoiceId}`);
    setTimeout(() => setDownloadToast(null), 1800);
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
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          maxWidth: 760,
          margin: "0 auto 24px auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            Gift Deck Pro
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textSecondary, letterSpacing: "0.03em" }}>
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
        >
          {theme === "dark" ? "Preview: light" : "Preview: dark"}
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: 0 }}>
              Order documents
            </h1>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#0F0F0F",
                  background: tokens.gold,
                  padding: "2px 9px",
                  borderRadius: 10,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: "6px 0 0 0", maxWidth: 540 }}>
            Packing slips, order forms, and return info sheets generated for your orders. Each is
            also emailed to your fulfilment address when it's first ready.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                background: t.surface,
                border: n.read ? `1px solid ${t.border}` : `1px solid ${tokens.gold}`,
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    {!n.read && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: tokens.gold,
                          display: "inline-block",
                        }}
                      />
                    )}
                    <p style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, margin: 0 }}>
                      {n.itemName}
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>
                    {n.invoiceId} · {n.customerDisplayName} · {formatDateTime(n.generatedAt)}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: tokens.gold,
                    background: "rgba(185,129,40,0.14)",
                    padding: "3px 9px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {STATE_LABELS[n.state]}
                </span>
              </div>

              {n.emailSent && (
                <p style={{ fontSize: 11, color: t.textSecondary, margin: "0 0 10px 0" }}>
                  ✉ Also emailed to your fulfilment address when generated
                </p>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {n.documents.map((docKey) => (
                  <button
                    key={docKey}
                    onClick={() => handleDownload(docKey, n)}
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: tokens.gold,
                      background: "transparent",
                      border: `1px solid ${tokens.gold}`,
                      borderRadius: 7,
                      padding: "7px 13px",
                      cursor: "pointer",
                      fontFamily: "'Roboto', sans-serif",
                    }}
                  >
                    ↓ {DOC_LABELS[docKey]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {downloadToast && (
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
          {downloadToast}
        </div>
      )}

      <p
        style={{
          fontSize: 11,
          color: t.textSecondary,
          marginTop: 18,
          opacity: 0.7,
          textAlign: "center",
        }}
      >
        Prototype preview — mock data only. Downloads here would serve the actual generated PDF
        in the real build; email sending is simulated, not live.
      </p>
    </div>
  );
}
