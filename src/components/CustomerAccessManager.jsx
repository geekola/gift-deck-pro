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

const INDUSTRIES = ["Film", "Music", "Sports", "Fashion", "Business", "Media", "Technology", "Other"];
const PERIOD_TYPES = [
  { key: "rolling_30", label: "Rolling 30 days" },
  { key: "rolling_60", label: "Rolling 60 days" },
  { key: "rolling_90", label: "Rolling 90 days" },
  { key: "calendar_quarter", label: "Calendar quarter" },
  { key: "calendar_year", label: "Calendar year" },
];
const CURRENCIES = ["USD", "EUR"];

function formatCurrency(amount, currency) {
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toLocaleString()}`;
}

// customer_access_status enum values are 'unactioned'/'approved'/'denied' -
// same strings the mock already used, no mapping needed there. Same for
// allowance_period_type ('calendar_quarter' etc.) matching PERIOD_TYPES keys.
function mapCustomer(row, allowanceByCustomerId) {
  const allowance = allowanceByCustomerId[row.customer_id];
  return {
    id: row.customer_id,
    name: row.customers?.name ?? "",
    industry: row.customers?.industry ?? "",
    status: row.status,
    allowance: allowance
      ? {
          limit: Number(allowance.limit_amount),
          currency: allowance.currency,
          periodType: allowance.period_type,
          consumed: Number(allowance.consumed),
        }
      : null,
    approvedContacts: [],
  };
}

export default function CustomerAccessManager() {
  const supabase = createClient();

  const [brandId, setBrandId] = useState(null);
  const [accessPolicy, setAccessPolicy] = useState("selective"); // open | selective | invite_only
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [allowanceDraft, setAllowanceDraft] = useState(null);
  const [allowanceError, setAllowanceError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const loadData = async (bId) => {
    const [accessResult, allowanceResult] = await Promise.all([
      supabase
        .from("customer_brand_access")
        .select("customer_id, status, customers(name, industry)")
        .eq("brand_id", bId),
      supabase.from("gifting_allowances").select("*").eq("brand_id", bId),
    ]);

    if (accessResult.error) {
      setLoadError(accessResult.error.message);
      setIsLoading(false);
      return;
    }

    const allowanceByCustomerId = {};
    for (const row of allowanceResult.data || []) {
      allowanceByCustomerId[row.customer_id] = row;
    }

    const mapped = (accessResult.data || []).map((row) => mapCustomer(row, allowanceByCustomerId));
    setCustomers(mapped);
    setSelectedId((current) => current ?? mapped[0]?.id ?? null);
    setIsLoading(false);
  };

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

      setBrandId(profile.brand_id);

      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("access_policy")
        .eq("id", profile.brand_id)
        .single();

      if (!brandError && brand) setAccessPolicy(brand.access_policy);

      await loadData(profile.brand_id);
    })();
  }, []);

  // Dark only, matching BrandNav.jsx's sidebar - see ProductCatalogue.jsx
  // for why the per-page theme toggle was removed.
  const t = tokens.dark;
  const selected = customers.find((c) => c.id === selectedId) || null;

  const visibleCustomers = customers.filter((c) => {
    const statusOk = filter === "all" ? true : c.status === filter;
    const industryOk = industryFilter === "all" ? true : c.industry === industryFilter;
    return statusOk && industryOk;
  });

  const unactionedCount = customers.filter((c) => c.status === "unactioned").length;

  const handleAccessPolicyChange = async (policy) => {
    setAccessPolicy(policy);
    if (!brandId) return;
    const { error } = await supabase.from("brands").update({ access_policy: policy }).eq("id", brandId);
    if (error) setActionError(error.message);
  };

  const handleApprove = async (id) => {
    setActionError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("customer_brand_access")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: user?.id ?? null })
      .eq("customer_id", id)
      .eq("brand_id", brandId);

    if (error) {
      setActionError(error.message);
      return;
    }
    setCustomers((cs) => cs.map((c) => (c.id === id ? { ...c, status: "approved" } : c)));
  };

  const handleDeny = async (id) => {
    setActionError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("customer_brand_access")
      .update({ status: "denied", decided_at: new Date().toISOString(), decided_by: user?.id ?? null })
      .eq("customer_id", id)
      .eq("brand_id", brandId);

    if (error) {
      setActionError(error.message);
      return;
    }
    setCustomers((cs) => cs.map((c) => (c.id === id ? { ...c, status: "denied" } : c)));
  };

  const openAllowanceEditor = () => {
    setAllowanceDraft(
      selected.allowance
        ? { ...selected.allowance, limit: String(selected.allowance.limit) }
        : { limit: "", currency: "USD", periodType: "calendar_quarter", consumed: 0 }
    );
    setAllowanceError("");
  };

  const saveAllowance = async () => {
    const limitNum = Number(allowanceDraft.limit);
    if (!allowanceDraft.limit || isNaN(limitNum) || limitNum <= 0) {
      setAllowanceError("Enter a limit greater than zero.");
      return;
    }

    const hadAllowance = !!selected.allowance;
    const { error } = hadAllowance
      ? await supabase
          .from("gifting_allowances")
          .update({
            limit_amount: limitNum,
            currency: allowanceDraft.currency,
            period_type: allowanceDraft.periodType,
          })
          .eq("customer_id", selected.id)
          .eq("brand_id", brandId)
      : await supabase.from("gifting_allowances").insert({
          customer_id: selected.id,
          brand_id: brandId,
          limit_amount: limitNum,
          currency: allowanceDraft.currency,
          period_type: allowanceDraft.periodType,
        });

    if (error) {
      setAllowanceError(error.message);
      return;
    }

    setCustomers((cs) =>
      cs.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              allowance: {
                limit: limitNum,
                currency: allowanceDraft.currency,
                periodType: allowanceDraft.periodType,
                consumed: c.allowance ? c.allowance.consumed : 0,
              },
            }
          : c
      )
    );
    setAllowanceDraft(null);
  };

  // Approved contacts are only ever fetched for the currently-selected
  // approved customer (RLS - customer_contacts_brand_select_if_access,
  // migration 0012 - only allows this for customers with an approved
  // access row with this brand anyway).
  const loadApprovedContacts = async (customerId) => {
    setIsLoadingContacts(true);
    const { data, error } = await supabase
      .from("customer_contacts")
      .select("*")
      .eq("customer_id", customerId)
      .eq("is_approved_for_brand_view", true);

    setIsLoadingContacts(false);
    if (error) return;

    setCustomers((cs) =>
      cs.map((c) =>
        c.id === customerId
          ? {
              ...c,
              approvedContacts: (data || []).map((row) => ({
                id: row.id,
                role: row.role,
                firstName: row.first_name,
                lastName: row.last_name,
                phone: row.phone,
                email: row.email,
                isAuthorizedPersonnel: row.is_authorized_personnel,
              })),
            }
          : c
      )
    );
  };

  useEffect(() => {
    if (selected && selected.status === "approved") {
      loadApprovedContacts(selected.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 4,
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

  const statusBadge = (status) => {
    const map = {
      unactioned: { bg: "rgba(185,129,40,0.14)", color: tokens.gold, label: "Awaiting Decision" },
      approved: { bg: "rgba(99,153,34,0.16)", color: "#8FBF5A", label: "Approved" },
      denied: { bg: "rgba(194,71,71,0.14)", color: "#E27A7A", label: "Denied" },
    };
    const s = map[status] || map.unactioned;
    return (
      <span
        style={{
          fontSize: 11.5,
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

      <div style={{ maxWidth: 980, margin: "0 auto" }}>
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
            Customer Access
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
            {unactionedCount} {unactionedCount === 1 ? "customer" : "customers"} awaiting your decision
          </p>
        </div>

        {(loadError || actionError) && (
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
            {loadError || actionError}
          </div>
        )}

        {/* Access policy selector */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 18,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 4px 0" }}>
            Access Policy
          </p>
          <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 12px 0", maxWidth: 560 }}>
            Controls who can see your catalogue. Selective and Invite-only enforce identically —
            the only difference is how it's framed to customers.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "open", label: "Open", desc: "All customers, no approval" },
              { key: "selective", label: "Selective", desc: "Customer must be approved" },
              // DB enum is invite_only (underscore) - see migration 0001's note
              // that the UI's "invite-only" hyphenated key gets normalized.
              { key: "invite_only", label: "Invite-only", desc: "Same as Selective, framed as exclusive" },
            ].map((opt) => {
              const active = accessPolicy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleAccessPolicyChange(opt.key)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "'Roboto', sans-serif",
                    border: active ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                    background: active ? "rgba(185,129,40,0.1)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      color: active ? tokens.gold : t.textPrimary,
                      marginBottom: 2,
                    }}
                  >
                    {opt.label}
                  </span>
                  <span style={{ fontSize: 11, color: t.textSecondary }}>{opt.desc}</span>
                </button>
              );
            })}
          </div>
          {accessPolicy === "open" && (
            <p
              style={{
                fontSize: 11.5,
                color: t.textSecondary,
                margin: "12px 0 0 0",
                lineHeight: 1.5,
              }}
            >
              With Open access, the list below becomes informational only — every customer with
              any PSF account can already see your catalogue without your approval.
            </p>
          )}
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "all", label: "All" },
              { key: "unactioned", label: "Awaiting Decision" },
              { key: "approved", label: "Approved" },
              { key: "denied", label: "Denied" },
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

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            style={{
              fontSize: 12.5,
              fontFamily: "'Roboto', sans-serif",
              color: t.textPrimary,
              background: t.inputBg,
              border: `1px solid ${t.border}`,
              borderRadius: 7,
              padding: "7px 10px",
            }}
          >
            <option value="all">All Industries</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {/* List */}
          <div
            style={{
              flex: "0 0 320px",
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {isLoading && (
              <div style={{ padding: "24px 18px", fontSize: 13, color: t.textSecondary }}>
                Loading customers…
              </div>
            )}
            {!isLoading && visibleCustomers.length === 0 && (
              <div style={{ padding: "24px 18px", fontSize: 13, color: t.textSecondary }}>
                No customers match this filter.
              </div>
            )}
            {!isLoading && visibleCustomers.map((c, idx) => {
              const isSelected = c.id === selectedId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setAllowanceDraft(null);
                    setAllowanceError("");
                  }}
                  style={{
                    padding: "13px 16px",
                    cursor: "pointer",
                    borderBottom:
                      idx < visibleCustomers.length - 1 ? `1px solid ${t.border}` : "none",
                    background: isSelected ? t.surfaceRaised : "transparent",
                    borderLeft: isSelected ? `2px solid ${tokens.gold}` : "2px solid transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
                      {c.name}
                    </span>
                    {statusBadge(c.status)}
                  </div>
                  <span style={{ fontSize: 12, color: t.textSecondary }}>{c.industry}</span>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div
            style={{
              flex: 1,
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "22px 24px",
            }}
          >
            {!selected && (
              <p style={{ fontSize: 13, color: t.textSecondary }}>
                Select a customer from the list.
              </p>
            )}

            {selected && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: t.textPrimary,
                        margin: "0 0 4px 0",
                      }}
                    >
                      {selected.name}
                    </h2>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: t.textSecondary,
                        background: t.surfaceRaised,
                        padding: "2px 9px",
                        borderRadius: 6,
                      }}
                    >
                      {selected.industry}
                    </span>
                  </div>
                  {statusBadge(selected.status)}
                </div>

                {selected.status === "unactioned" && (
                  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    <button
                      onClick={() => handleApprove(selected.id)}
                      style={{
                        flex: 1,
                        padding: "11px 0",
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: "#0F0F0F",
                        background: tokens.gold,
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(selected.id)}
                      style={{
                        flex: 1,
                        padding: "11px 0",
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: "#E27A7A",
                        background: "transparent",
                        border: "1px solid rgba(194,71,71,0.4)",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    >
                      Deny
                    </button>
                  </div>
                )}

                {selected.status === "denied" && (
                  <p style={{ fontSize: 12.5, color: t.textSecondary, marginBottom: 20 }}>
                    This customer cannot see your catalogue.{" "}
                    <span
                      onClick={() => handleApprove(selected.id)}
                      style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}
                    >
                      Reconsider and approve
                    </span>
                  </p>
                )}

                {selected.status === "approved" && (
                  <div
                    style={{
                      borderTop: `1px solid ${t.border}`,
                      paddingTop: 18,
                    }}
                  >
                    {/* Approved Contacts — customer-controlled visibility.
                        Only contacts the customer has explicitly marked
                        "visible to brand managers" appear here; this is a
                        filtered, read-only view, not the customer's full
                        contact list. */}
                    <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 4px 0" }}>
                      Approved Contacts
                    </p>
                    <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "0 0 12px 0", lineHeight: 1.5 }}>
                      Shared by the customer for shipment coordination only — not all of their
                      contacts, just the ones they've chosen to make visible to you.
                    </p>

                    {isLoadingContacts ? (
                      <p style={{ fontSize: 12.5, color: t.textSecondary, margin: "0 0 18px 0" }}>
                        Loading contacts…
                      </p>
                    ) : (!selected.approvedContacts || selected.approvedContacts.length === 0) ? (
                      <p style={{ fontSize: 12.5, color: t.textSecondary, margin: "0 0 18px 0" }}>
                        This customer hasn't shared any contacts with brand managers.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                        {selected.approvedContacts.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              background: t.surfaceRaised,
                              border: `1px solid ${t.border}`,
                              borderRadius: 8,
                              padding: "10px 14px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: 0 }}>
                                {c.firstName} {c.lastName}
                              </p>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 500,
                                  color: tokens.gold,
                                  background: "rgba(185,129,40,0.14)",
                                  padding: "2px 7px",
                                  borderRadius: 5,
                                }}
                              >
                                {c.role}
                              </span>
                              {c.isAuthorizedPersonnel && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 500,
                                    color: "#8FBF5A",
                                    background: "rgba(99,153,34,0.14)",
                                    padding: "2px 7px",
                                    borderRadius: 5,
                                  }}
                                >
                                  Authorized
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>
                              {c.phone} · {c.email}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: 0 }}>
                        Gifting Allowance
                      </p>
                      {!allowanceDraft && (
                        <button
                          onClick={openAllowanceEditor}
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: tokens.gold,
                            background: "transparent",
                            border: `1px solid ${tokens.gold}`,
                            borderRadius: 7,
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontFamily: "'Roboto', sans-serif",
                          }}
                        >
                          {selected.allowance ? "Edit" : "Set Allowance"}
                        </button>
                      )}
                    </div>

                    {!allowanceDraft && !selected.allowance && (
                      <p style={{ fontSize: 12.5, color: t.textSecondary }}>
                        No allowance set — this customer can't draw gifted merchandise from your
                        catalogue until a limit is configured.
                      </p>
                    )}

                    {!allowanceDraft && selected.allowance && (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                            color: t.textPrimary,
                            marginBottom: 8,
                          }}
                        >
                          <span>
                            {formatCurrency(selected.allowance.consumed, selected.allowance.currency)}{" "}
                            used of{" "}
                            {formatCurrency(selected.allowance.limit, selected.allowance.currency)}
                          </span>
                          <span style={{ color: t.textSecondary }}>
                            {PERIOD_TYPES.find((p) => p.key === selected.allowance.periodType)?.label}
                          </span>
                        </div>
                        <div
                          style={{
                            width: "100%",
                            height: 6,
                            borderRadius: 3,
                            background: t.surfaceRaised,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(
                                100,
                                (selected.allowance.consumed / selected.allowance.limit) * 100
                              )}%`,
                              background:
                                selected.allowance.consumed / selected.allowance.limit >= 0.9
                                  ? "#E2A23A"
                                  : tokens.gold,
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <p
                          style={{
                            fontSize: 11.5,
                            color: t.textSecondary,
                            margin: "8px 0 0 0",
                            lineHeight: 1.4,
                          }}
                        >
                          Tracked in your cost-basis currency. The customer never sees these
                          figures — only an exhaustion/reset notification when relevant.
                        </p>
                      </div>
                    )}

                    {allowanceDraft && (
                      <div>
                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                          <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Limit (cost-basis)</label>
                            <input
                              type="number"
                              value={allowanceDraft.limit}
                              onChange={(e) =>
                                setAllowanceDraft((d) => ({ ...d, limit: e.target.value }))
                              }
                              placeholder="e.g. 5000"
                              style={inputStyle(!!allowanceError)}
                            />
                          </div>
                          <div style={{ flex: "0 0 90px" }}>
                            <label style={labelStyle}>Currency</label>
                            <select
                              value={allowanceDraft.currency}
                              onChange={(e) =>
                                setAllowanceDraft((d) => ({ ...d, currency: e.target.value }))
                              }
                              style={inputStyle(false)}
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={labelStyle}>Period Type</label>
                          <select
                            value={allowanceDraft.periodType}
                            onChange={(e) =>
                              setAllowanceDraft((d) => ({ ...d, periodType: e.target.value }))
                            }
                            style={inputStyle(false)}
                          >
                            {PERIOD_TYPES.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {allowanceError && (
                          <p style={{ fontSize: 12, color: "#E27A7A", margin: "0 0 10px 0" }}>
                            {allowanceError}
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            onClick={saveAllowance}
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
                            Save Allowance
                          </button>
                          <button
                            onClick={() => {
                              setAllowanceDraft(null);
                              setAllowanceError("");
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
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
