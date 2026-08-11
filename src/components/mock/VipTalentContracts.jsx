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

// Mock data — illustrative only, not real customer/brand data.
// Continuity note: same customer/brand pool used in the Customer Access
// Manager and Restriction Manager screens built earlier this session.
// Priya K. and Jonah R. are marked VIP here; the rest remain general roster.
const MOCK_CUSTOMERS = [
  { id: "cust_001", name: "Alex M.", tier: "general" },
  { id: "cust_002", name: "Priya K.", tier: "VIP" },
  { id: "cust_003", name: "Jonah R.", tier: "VIP" },
  { id: "cust_004", name: "Sofia L.", tier: "general" },
  { id: "cust_005", name: "Devon T.", tier: "general" },
];

const MOCK_BRANDS = [
  { id: "brand_001", name: "Atelier Noir" },
  { id: "brand_002", name: "Halden & Vance" },
  { id: "brand_003", name: "Roux Studio" },
];

const CONTRACT_STATUSES = [
  { key: "none", label: "No contract on file" },
  { key: "pending", label: "Pending" },
  { key: "executed", label: "Executed" },
  { key: "expired", label: "Expired" },
  { key: "terminated", label: "Terminated" },
];

// One seeded contract+unlock, and one seeded "unlocked with no contract yet"
// case, to show both real states this design explicitly allows.
const SEED_CONTRACTS = [
  {
    id: "contract_001",
    customerId: "cust_002", // Priya K.
    brandId: "brand_001", // Atelier Noir
    contractStatus: "executed",
    contractTerms: "12-month formalwear gifting and appearance agreement, executed 5/14/2026. Full terms held by legal, outside PSF.",
    unlocked: true,
    unlockedAt: "2026-05-15T10:00:00Z",
    unlockedBy: "platform_admin_preview",
    notes: "Negotiated directly with Priya's agent. No financial terms are tracked in PSF.",
    createdAt: "2026-05-10T09:00:00Z",
    updatedAt: "2026-05-15T10:00:00Z",
  },
  {
    id: "contract_002",
    customerId: "cust_003", // Jonah R.
    brandId: "brand_002", // Halden & Vance
    contractStatus: "pending",
    contractTerms: "",
    unlocked: true,
    unlockedAt: "2026-06-20T14:30:00Z",
    unlockedBy: "platform_admin_preview",
    notes: "Brand relationship approved verbally pending signed paperwork — admin judgment call to unlock ahead of contract completion.",
    createdAt: "2026-06-20T14:30:00Z",
    updatedAt: "2026-06-20T14:30:00Z",
  },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function VipTalentContracts() {
  const [theme, setTheme] = useState("dark");
  const [contracts, setContracts] = useState(SEED_CONTRACTS);
  const [selectedVipId, setSelectedVipId] = useState("cust_002");
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({
    brandId: "",
    contractStatus: "none",
    contractTerms: "",
    notes: "",
    unlocked: false,
  });
  const [draftErrors, setDraftErrors] = useState({});

  const t = tokens[theme];

  const vipCustomers = MOCK_CUSTOMERS.filter((c) => c.tier === "VIP");
  const selectedVip = vipCustomers.find((c) => c.id === selectedVipId);

  const vipContracts = contracts.filter((c) => c.customerId === selectedVipId);
  const contractedBrandIds = vipContracts.map((c) => c.brandId);
  const availableBrands = MOCK_BRANDS.filter((b) => !contractedBrandIds.includes(b.id));

  const brandName = (id) => MOCK_BRANDS.find((b) => b.id === id)?.name || "Unknown brand";

  const statusBadge = (status) => {
    const map = {
      none: { bg: t.surfaceRaised, color: t.textSecondary, label: "No contract on file" },
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

  const resetDraft = () => {
    setDraft({ brandId: "", contractStatus: "none", contractTerms: "", notes: "", unlocked: false });
    setDraftErrors({});
  };

  const openNewForm = () => {
    resetDraft();
    setShowNewForm(true);
    setEditingId(null);
  };

  const openEdit = (contract) => {
    setDraft({
      brandId: contract.brandId,
      contractStatus: contract.contractStatus,
      contractTerms: contract.contractTerms,
      notes: contract.notes,
      unlocked: contract.unlocked,
    });
    setEditingId(contract.id);
    setShowNewForm(false);
    setDraftErrors({});
  };

  const handleSaveNew = (e) => {
    e.preventDefault();
    const errs = {};
    if (!draft.brandId) errs.brandId = "Select a brand.";
    setDraftErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setContracts((cs) => [
      ...cs,
      {
        id: `contract_${Date.now()}`,
        customerId: selectedVipId,
        brandId: draft.brandId,
        contractStatus: draft.contractStatus,
        contractTerms: draft.contractTerms.trim(),
        unlocked: draft.unlocked,
        unlockedAt: draft.unlocked ? new Date().toISOString() : null,
        unlockedBy: draft.unlocked ? "platform_admin_preview" : null,
        notes: draft.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    resetDraft();
    setShowNewForm(false);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setContracts((cs) =>
      cs.map((c) =>
        c.id === editingId
          ? {
              ...c,
              contractStatus: draft.contractStatus,
              contractTerms: draft.contractTerms.trim(),
              notes: draft.notes.trim(),
              unlocked: draft.unlocked,
              unlockedAt: draft.unlocked ? c.unlockedAt || new Date().toISOString() : null,
              unlockedBy: draft.unlocked ? c.unlockedBy || "platform_admin_preview" : null,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
    setEditingId(null);
    resetDraft();
  };

  const toggleUnlock = (contractId) => {
    setContracts((cs) =>
      cs.map((c) =>
        c.id === contractId
          ? {
              ...c,
              unlocked: !c.unlocked,
              unlockedAt: !c.unlocked ? new Date().toISOString() : c.unlockedAt,
              unlockedBy: !c.unlocked ? "platform_admin_preview" : c.unlockedBy,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 5,
    letterSpacing: "0.01em",
  };

  const inputStyle = (hasError) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    fontSize: 13.5,
    fontFamily: "'Roboto', sans-serif",
    color: t.textPrimary,
    background: t.inputBg,
    border: `1px solid ${hasError ? "#C24747" : t.border}`,
    borderRadius: 8,
    outline: "none",
  });

  const renderForm = (onSubmit, isEdit) => (
    <form
      onSubmit={onSubmit}
      style={{
        background: t.surface,
        border: `1px solid ${tokens.gold}`,
        borderRadius: 12,
        padding: "18px 20px",
        marginBottom: 14,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 14px 0" }}>
        {isEdit ? `Edit ${brandName(draft.brandId)} contract` : "New brand \u00d7 VIP contract record"}
      </p>

      {!isEdit && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Brand</label>
          <select
            value={draft.brandId}
            onChange={(e) => setDraft((d) => ({ ...d, brandId: e.target.value }))}
            style={inputStyle(draftErrors.brandId)}
          >
            <option value="">Select brand\u2026</option>
            {availableBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {draftErrors.brandId && (
            <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "5px 0 0 0" }}>
              {draftErrors.brandId}
            </p>
          )}
          {availableBrands.length === 0 && (
            <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "5px 0 0 0" }}>
              Every brand already has a contract record for this VIP.
            </p>
          )}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Contract status</label>
        <select
          value={draft.contractStatus}
          onChange={(e) => setDraft((d) => ({ ...d, contractStatus: e.target.value }))}
          style={inputStyle(false)}
        >
          {CONTRACT_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Contract terms{" "}
          <span style={{ color: t.textSecondary, fontWeight: 400 }}>
            — descriptive reference only, no financial figures tracked here
          </span>
        </label>
        <textarea
          value={draft.contractTerms}
          onChange={(e) => setDraft((d) => ({ ...d, contractTerms: e.target.value }))}
          rows={2}
          placeholder="e.g. 12-month gifting agreement, executed 5/14/2026. Full terms held by legal."
          style={{ ...inputStyle(false), resize: "vertical" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Internal notes</label>
        <textarea
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          rows={2}
          placeholder="Any context for other platform admins."
          style={{ ...inputStyle(false), resize: "vertical" }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: t.surfaceRaised,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 2px 0" }}>
            Unlock this brand for this VIP
          </p>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0, maxWidth: 380 }}>
            This is the actual switch controlling access \u2014 independent of contract status.
            The admin's real-world judgment governs this, not PSF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, unlocked: !d.unlocked }))}
          style={{
            flexShrink: 0,
            width: 44,
            height: 24,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            background: draft.unlocked ? tokens.gold : t.border,
            position: "relative",
            marginLeft: 16,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
              position: "absolute",
              top: 3,
              left: draft.unlocked ? 23 : 3,
              transition: "left 0.15s ease",
            }}
          />
        </button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: "10px 0",
            fontSize: 13,
            fontWeight: 500,
            color: "#0F0F0F",
            background: tokens.gold,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          {isEdit ? "Save changes" : "Create record"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowNewForm(false);
            setEditingId(null);
            resetDraft();
          }}
          style={{
            flex: 1,
            padding: "10px 0",
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
          Cancel
        </button>
      </div>
    </form>
  );

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
          maxWidth: 900,
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
            PLATFORM ADMIN
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
          <h1
            style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}
          >
            VIP talent contracts
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, maxWidth: 560 }}>
            Governs which brands can see and engage your VIP-tier roster. A VIP customer is
            invisible to a brand until explicitly unlocked here \u2014 contract status is tracked
            for reference only and does not gate the unlock switch.
          </p>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {/* VIP roster list */}
          <div
            style={{
              flex: "0 0 240px",
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              overflow: "hidden",
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
              VIP roster ({vipCustomers.length})
            </div>
            {vipCustomers.map((c, idx) => {
              const isSelected = c.id === selectedVipId;
              const activeUnlocks = contracts.filter(
                (ct) => ct.customerId === c.id && ct.unlocked
              ).length;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedVipId(c.id);
                    setShowNewForm(false);
                    setEditingId(null);
                  }}
                  style={{
                    padding: "13px 16px",
                    cursor: "pointer",
                    borderBottom:
                      idx < vipCustomers.length - 1 ? `1px solid ${t.border}` : "none",
                    background: isSelected ? t.surfaceRaised : "transparent",
                    borderLeft: isSelected ? `2px solid ${tokens.gold}` : "2px solid transparent",
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, margin: "0 0 3px 0" }}>
                    {c.name}
                  </p>
                  <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0 }}>
                    {activeUnlocks} brand{activeUnlocks === 1 ? "" : "s"} unlocked
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div style={{ flex: 1 }}>
            {selectedVip && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <div>
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
                  {!showNewForm && !editingId && availableBrands.length > 0 && (
                    <button
                      onClick={openNewForm}
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: "#0F0F0F",
                        background: tokens.gold,
                        border: "none",
                        borderRadius: 7,
                        padding: "8px 14px",
                        cursor: "pointer",
                        fontFamily: "'Roboto', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + New contract record
                    </button>
                  )}
                </div>

                {showNewForm && renderForm(handleSaveNew, false)}
                {editingId && renderForm(handleSaveEdit, true)}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {vipContracts.length === 0 && !showNewForm && (
                    <div
                      style={{
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        borderRadius: 12,
                        padding: "22px 18px",
                        textAlign: "center",
                        fontSize: 13,
                        color: t.textSecondary,
                      }}
                    >
                      No brand records yet for this VIP. Every brand is currently blocked from
                      seeing them.
                    </div>
                  )}

                  {vipContracts.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: t.surface,
                        border: `1px solid ${t.border}`,
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
                          <p style={{ fontSize: 14.5, fontWeight: 500, color: t.textPrimary, margin: "0 0 4px 0" }}>
                            {brandName(c.brandId)}
                          </p>
                          {statusBadge(c.contractStatus)}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: c.unlocked ? "#8FBF5A" : t.textSecondary,
                            }}
                          >
                            {c.unlocked ? "Unlocked" : "Blocked"}
                          </span>
                          <button
                            onClick={() => toggleUnlock(c.id)}
                            style={{
                              width: 40,
                              height: 22,
                              borderRadius: 11,
                              border: "none",
                              cursor: "pointer",
                              background: c.unlocked ? tokens.gold : t.border,
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "#fff",
                                position: "absolute",
                                top: 3,
                                left: c.unlocked ? 21 : 3,
                                transition: "left 0.15s ease",
                              }}
                            />
                          </button>
                        </div>
                      </div>

                      {c.contractTerms && (
                        <p style={{ fontSize: 12.5, color: t.textPrimary, margin: "0 0 6px 0", lineHeight: 1.5 }}>
                          {c.contractTerms}
                        </p>
                      )}
                      {!c.contractTerms && c.contractStatus === "none" && (
                        <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 6px 0", lineHeight: 1.5 }}>
                          No contract on file. Unlocked at the admin's discretion \u2014 the
                          contract process happens outside PSF.
                        </p>
                      )}
                      {c.notes && (
                        <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "0 0 8px 0" }}>
                          Notes: {c.notes}
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTop: `1px solid ${t.border}`,
                          paddingTop: 10,
                        }}
                      >
                        <span style={{ fontSize: 11, color: t.textSecondary }}>
                          {c.unlocked
                            ? `Unlocked ${formatDate(c.unlockedAt)}`
                            : `Last updated ${formatDate(c.updatedAt)}`}
                        </span>
                        <button
                          onClick={() => openEdit(c)}
                          style={{
                            fontSize: 11.5,
                            fontWeight: 500,
                            color: tokens.gold,
                            background: "transparent",
                            border: `1px solid ${tokens.gold}`,
                            borderRadius: 6,
                            padding: "5px 11px",
                            cursor: "pointer",
                            fontFamily: "'Roboto', sans-serif",
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
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
