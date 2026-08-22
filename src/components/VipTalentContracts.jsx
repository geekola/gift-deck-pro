"use client";

import React, { useEffect, useState } from "react";
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

// Read-only, brand-side. Unlock/contract-status/contract-terms are all
// admin-managed (per PlatformAdminDashboard's VipContractsSection and
// migration 0008's talent_contracts_admin_all: "agency-driven only") -
// this screen has no create/edit/unlock controls, deliberately. A brand
// only ever sees a VIP here once an admin has unlocked that brand x VIP
// pair; contract_terms/notes stay descriptive-only, and notes itself is
// never fetched (admin-internal, same pattern as decline_reason never
// being fetched on OrderStatus.jsx).
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function VipTalentContracts() {
  const supabase = createClient();

  const [vips, setVips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // Dark only, matching BrandNav.jsx's sidebar - see ProductCatalogue.jsx
  // for why the per-page theme toggle was removed.
  const t = tokens.dark;

  const statusBadge = (status) => {
    const map = {
      none: { bg: t.surfaceRaised, color: t.textSecondary, label: "No Contract on File" },
      pending: { bg: "rgba(226,162,58,0.14)", color: "#E2A23A", label: "Pending" },
      executed: { bg: "rgba(99,153,34,0.16)", color: "#8FBF5A", label: "Executed" },
      expired: { bg: "rgba(185,129,40,0.14)", color: tokens.gold, label: "Expired" },
      terminated: { bg: "rgba(194,71,71,0.14)", color: "#E27A7A", label: "Terminated" },
    };
    const s = map[status] || map.none;
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: s.color,
          background: s.bg,
          padding: "3px 9px",
          borderRadius: 6,
          whiteSpace: "nowrap",
        }}
      >
        {s.label}
      </span>
    );
  };

  const loadVips = async () => {
    setIsLoading(true);
    setLoadError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("brand_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.brand_id) {
      setLoadError(profileError?.message || "No brand associated with this account.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("brand_talent_contracts")
      .select("id, customer_id, contract_status, contract_terms, unlocked_at, updated_at, customers(name, tier)")
      .eq("brand_id", profile.brand_id)
      .eq("unlocked", true)
      .order("updated_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
      setIsLoading(false);
      return;
    }

    const mapped = (data || []).map((row) => ({
      contractId: row.id,
      customerId: row.customer_id,
      name: row.customers?.name || "Unknown",
      tier: row.customers?.tier || "VIP",
      contractStatus: row.contract_status,
      contractTerms: row.contract_terms,
      unlockedAt: row.unlocked_at,
      updatedAt: row.updated_at,
    }));

    setVips(mapped);
    setSelectedId((current) => current ?? mapped[0]?.customerId ?? null);
    setIsLoading(false);
  };

  useEffect(() => {
    loadVips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVip = vips.find((v) => v.customerId === selectedId);

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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              width: 28,
              height: 3,
              background: tokens.gold,
              borderRadius: 2,
              marginBottom: 12,
            }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}>
            VIP Talent Contracts
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, maxWidth: 560 }}>
            VIP customers your agency contact has unlocked you for. Contract status and unlock
            access are managed by the platform on the agency's behalf — this view is read-only.
          </p>
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

        {!isLoading && !loadError && vips.length === 0 && (
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "36px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
              No VIP customers have been unlocked for you yet. Your agency contact controls this.
            </p>
          </div>
        )}

        {!isLoading && vips.length > 0 && (
          <div style={{ display: "flex", gap: 16 }}>
            {/* VIP roster list */}
            <div
              style={{
                flex: "0 0 240px",
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                overflow: "hidden",
                alignSelf: "flex-start",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${t.border}`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.textSecondary,
                }}
              >
                VIP Roster ({vips.length})
              </div>
              {vips.map((v, idx) => {
                const isSelected = v.customerId === selectedId;
                return (
                  <div
                    key={v.customerId}
                    onClick={() => setSelectedId(v.customerId)}
                    style={{
                      padding: "13px 16px",
                      cursor: "pointer",
                      borderBottom: idx < vips.length - 1 ? `1px solid ${t.border}` : "none",
                      background: isSelected ? t.surfaceRaised : "transparent",
                      borderLeft: isSelected ? `2px solid ${tokens.gold}` : "2px solid transparent",
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, margin: "0 0 3px 0" }}>
                      {v.name}
                    </p>
                    <div>{statusBadge(v.contractStatus)}</div>
                  </div>
                );
              })}
            </div>

            {/* Detail panel */}
            <div style={{ flex: 1 }}>
              {selectedVip && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary, margin: "0 0 3px 0" }}>
                      {selectedVip.name}
                    </h2>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: tokens.gold,
                        background: "rgba(185,129,40,0.14)",
                        padding: "2px 8px",
                        borderRadius: 5,
                      }}
                    >
                      VIP
                    </span>
                  </div>

                  <div
                    style={{
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      borderRadius: 12,
                      padding: "16px 18px",
                    }}
                  >
                    <div style={{ marginBottom: 10 }}>{statusBadge(selectedVip.contractStatus)}</div>

                    {selectedVip.contractTerms && (
                      <p style={{ fontSize: 12.5, color: t.textPrimary, margin: "0 0 6px 0", lineHeight: 1.5 }}>
                        {selectedVip.contractTerms}
                      </p>
                    )}
                    {!selectedVip.contractTerms && selectedVip.contractStatus === "none" && (
                      <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 6px 0", lineHeight: 1.5 }}>
                        No contract on file. You've been unlocked for this VIP at your agency
                        contact's discretion.
                      </p>
                    )}

                    <div
                      style={{
                        borderTop: `1px solid ${t.border}`,
                        paddingTop: 10,
                        marginTop: 8,
                      }}
                    >
                      <span style={{ fontSize: 11, color: t.textSecondary }}>
                        Unlocked {formatDate(selectedVip.unlockedAt)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
