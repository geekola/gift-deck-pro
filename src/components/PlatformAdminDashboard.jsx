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

const CONTRACT_STATUSES = [
  { key: "none", label: "No contract on file" },
  { key: "pending", label: "Pending" },
  { key: "executed", label: "Executed" },
  { key: "expired", label: "Expired" },
  { key: "terminated", label: "Terminated" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isExpired(restriction) {
  if (!restriction.expiresAt) return false;
  // Was hardcoded to a fixed preview date ("2026-06-25") in the mock;
  // real data needs an actual current-time comparison.
  return new Date(restriction.expiresAt) < new Date();
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: Review Queue
// ═══════════════════════════════════════════════════════════════════════
//
// MVP step 1: this used to be local mock state (SEED_APPLICATIONS) that
// reset on every refresh, while a separate, fully-wired real component
// (PlatformAdminReviewQueue.jsx) sat at an unlinked standalone route
// nothing in this sidebar pointed to. Ported that component's real
// Supabase logic in here instead of the other way around, since this
// dashboard's sidebar-tab shell is the actual intended layout (matches
// how Restrictions/VIP Contracts below are structured) — the standalone
// route's own page-chrome/header made it unsuitable to embed as-is.
// PlatformAdminReviewQueue.jsx and its route are removed as part of this
// same change; this section is now the only real implementation.
function ReviewQueueSection({ t }) {
  const supabase = createClient();

  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [filter, setFilter] = useState("pending");
  const [newNote, setNewNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  // Maps a Supabase brands row (joined with brand_application_notes) onto
  // the camelCase shape the render logic below expects.
  const mapApplication = (row) => ({
    id: row.id,
    brandName: row.brand_name,
    email: row.email,
    contactFirstName: row.contact_first_name,
    contactLastName: row.contact_last_name,
    phoneNumber: row.phone_number,
    website: row.website,
    fulfilmentEmail: row.fulfilment_email,
    category: row.category,
    registeredAt: row.created_at,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedAt: row.status === "pending" ? null : row.updated_at,
    notes: (row.brand_application_notes || [])
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((n) => ({ id: n.id, text: n.note, at: n.created_at })),
  });

  const loadApplications = async () => {
    const { data, error } = await supabase
      .from("brands")
      .select("*, brand_application_notes(*)")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
    } else {
      const mapped = (data || []).map(mapApplication);
      setApplications(mapped);
      setSelectedId((current) => current ?? mapped[0]?.id ?? null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = applications.find((a) => a.id === selectedId) || null;
  const visibleApplications = applications.filter((a) =>
    filter === "all" ? true : a.status === filter
  );
  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 4,
  };
  const valueStyle = { fontSize: 14, color: t.textPrimary, margin: "0 0 14px 0", wordBreak: "break-word" };

  const handleApprove = async () => {
    if (!selected) return;
    setActionError("");
    const { error } = await supabase
      .from("brands")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", selected.id);

    if (error) {
      setActionError(error.message);
      return;
    }
    setRejectMode(false);
    setRejectReason("");
    await loadApplications();
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      setRejectError("A rejection reason is required before this can be submitted.");
      return;
    }
    setActionError("");
    const { error } = await supabase
      .from("brands")
      .update({ status: "rejected", rejection_reason: rejectReason.trim() })
      .eq("id", selected.id);

    if (error) {
      setRejectError(error.message);
      return;
    }
    setRejectMode(false);
    setRejectReason("");
    setRejectError("");
    await loadApplications();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      setNoteError("Enter a note before adding it.");
      return;
    }
    setActionError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("brand_application_notes").insert({
      brand_id: selected.id,
      note: newNote.trim(),
      created_by: user?.id ?? null,
    });

    if (error) {
      setNoteError(error.message);
      return;
    }
    setNewNote("");
    setNoteError("");
    await loadApplications();
  };

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const statusBadge = (status) => {
    const map = {
      pending: { bg: "rgba(185,129,40,0.14)", color: tokens.gold, label: "Pending review" },
      approved: { bg: "rgba(99,153,34,0.16)", color: "#8FBF5A", label: "Approved" },
      rejected: { bg: "rgba(194,71,71,0.14)", color: "#E27A7A", label: "Rejected" },
    };
    const s = map[status] || map.pending;
    return (
      <span style={{ fontSize: 11.5, fontWeight: 500, color: s.color, background: s.bg, padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>
        {s.label}
      </span>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}>Brand applications</h1>
        <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
          {pendingCount} {pendingCount === 1 ? "application" : "applications"} awaiting review
        </p>
      </div>

      {(loadError || actionError) && (
        <div style={{ background: "rgba(194,71,71,0.12)", border: "1px solid rgba(194,71,71,0.4)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#E27A7A", marginBottom: 16 }}>
          {loadError || actionError}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[{ key: "pending", label: "Pending" }, { key: "approved", label: "Approved" }, { key: "rejected", label: "Rejected" }, { key: "all", label: "All" }].map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ fontSize: 12.5, fontWeight: 500, padding: "7px 13px", borderRadius: 7, cursor: "pointer", fontFamily: "'Roboto', sans-serif", border: active ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`, background: active ? "rgba(185,129,40,0.12)" : "transparent", color: active ? tokens.gold : t.textSecondary }}>
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: "0 0 300px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
          {isLoading && <div style={{ padding: "24px 18px", fontSize: 13, color: t.textSecondary }}>Loading applications…</div>}
          {!isLoading && visibleApplications.length === 0 && <div style={{ padding: "24px 18px", fontSize: 13, color: t.textSecondary }}>No applications in this view.</div>}
          {!isLoading && visibleApplications.map((app, idx) => {
            const isSelected = app.id === selectedId;
            return (
              <div key={app.id} onClick={() => { setSelectedId(app.id); setRejectMode(false); setRejectReason(""); setRejectError(""); setNewNote(""); setNoteError(""); }}
                style={{ padding: "14px 16px", cursor: "pointer", borderBottom: idx < visibleApplications.length - 1 ? `1px solid ${t.border}` : "none", background: isSelected ? t.surfaceRaised : "transparent", borderLeft: isSelected ? `2px solid ${tokens.gold}` : "2px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>{app.brandName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: t.textSecondary }}>{formatDate(app.registeredAt)}</span>
                  {statusBadge(app.status)}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "22px 24px" }}>
          {!selected && <p style={{ fontSize: 13, color: t.textSecondary }}>Select an application from the list.</p>}
          {selected && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}>{selected.brandName}</h2>
                  <span style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary, background: t.surfaceRaised, padding: "2px 9px", borderRadius: 6 }}>{selected.category}</span>
                </div>
                {statusBadge(selected.status)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", marginBottom: 4 }}>
                <div><span style={labelStyle}>Primary contact</span><p style={valueStyle}>{selected.contactFirstName} {selected.contactLastName}</p></div>
                <div><span style={labelStyle}>Phone number</span><p style={valueStyle}>{selected.phoneNumber}</p></div>
                <div><span style={labelStyle}>Admin login email</span><p style={valueStyle}>{selected.email}</p></div>
                <div><span style={labelStyle}>Fulfilment email</span><p style={valueStyle}>{selected.fulfilmentEmail}</p></div>
                <div><span style={labelStyle}>Website</span><p style={valueStyle}><a href={selected.website} style={{ color: tokens.gold, textDecoration: "none" }}>{selected.website}</a></p></div>
                <div><span style={labelStyle}>Submitted</span><p style={valueStyle}>{formatDate(selected.registeredAt)}</p></div>
              </div>

              {selected.status === "rejected" && selected.rejectionReason && (
                <div style={{ background: "rgba(194,71,71,0.08)", border: "1px solid rgba(194,71,71,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#E27A7A" }}>Rejection reason</span>
                  <p style={{ fontSize: 13, color: t.textPrimary, margin: "4px 0 0 0" }}>{selected.rejectionReason}</p>
                </div>
              )}

              {selected.status === "rejected" && (
                <div style={{ marginBottom: 16 }}>
                  <span style={labelStyle}>Notes <span style={{ color: t.textSecondary, fontWeight: 400 }}>— decision context, e.g. reconsideration requests</span></span>
                  {(selected.notes || []).length === 0 && <p style={{ fontSize: 12.5, color: t.textSecondary, margin: "6px 0 10px 0" }}>No notes yet.</p>}
                  {(selected.notes || []).length > 0 && (
                    <div style={{ marginTop: 8, marginBottom: 12 }}>
                      {selected.notes.slice().reverse().map((note) => (
                        <div key={note.id} style={{ background: t.surfaceRaised, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", marginBottom: 8 }}>
                          <p style={{ fontSize: 13, color: t.textPrimary, margin: "0 0 4px 0", lineHeight: 1.5 }}>{note.text}</p>
                          <span style={{ fontSize: 11, color: t.textSecondary }}>{formatDateTime(note.at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea value={newNote} onChange={(e) => { setNewNote(e.target.value); if (noteError) setNoteError(""); }} placeholder="e.g. Brand emailed requesting reconsideration..." rows={2}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, fontFamily: "'Roboto', sans-serif", color: t.textPrimary, background: t.inputBg, border: `1px solid ${noteError ? "#C24747" : t.border}`, borderRadius: 8, outline: "none", resize: "vertical", marginBottom: 6 }} />
                  {noteError && <p style={{ fontSize: 12, color: "#E27A7A", margin: "0 0 8px 0" }}>{noteError}</p>}
                  <button onClick={handleAddNote} style={{ fontSize: 12.5, fontWeight: 500, color: tokens.gold, background: "transparent", border: `1px solid ${tokens.gold}`, borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Add note</button>
                </div>
              )}

              {selected.status === "pending" && !rejectMode && (
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button onClick={handleApprove} style={{ flex: 1, padding: "11px 0", fontSize: 13.5, fontWeight: 500, color: "#0F0F0F", background: tokens.gold, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Approve</button>
                  <button onClick={() => setRejectMode(true)} style={{ flex: 1, padding: "11px 0", fontSize: 13.5, fontWeight: 500, color: "#E27A7A", background: "transparent", border: "1px solid rgba(194,71,71,0.4)", borderRadius: 8, cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Reject</button>
                </div>
              )}

              {selected.status === "pending" && rejectMode && (
                <div style={{ marginTop: 8 }}>
                  <label style={labelStyle}>Rejection reason (required)</label>
                  <textarea value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); if (rejectError) setRejectError(""); }} rows={3}
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13.5, fontFamily: "'Roboto', sans-serif", color: t.textPrimary, background: t.inputBg, border: `1px solid ${rejectError ? "#C24747" : t.border}`, borderRadius: 8, outline: "none", resize: "vertical", marginBottom: 6 }} />
                  {rejectError && <p style={{ fontSize: 12, color: "#E27A7A", margin: "0 0 10px 0" }}>{rejectError}</p>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleRejectConfirm} style={{ flex: 1, padding: "11px 0", fontSize: 13.5, fontWeight: 500, color: "#FFFFFF", background: "#C24747", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Confirm rejection</button>
                    <button onClick={() => { setRejectMode(false); setRejectReason(""); setRejectError(""); }} style={{ flex: 1, padding: "11px 0", fontSize: 13.5, fontWeight: 500, color: t.textSecondary, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Cancel</button>
                  </div>
                </div>
              )}

              {selected.status === "approved" && (
                <p style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 4 }}>
                  Reviewed {selected.reviewedAt ? formatDate(selected.reviewedAt) : ""}. This brand can now log in and access the portal.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: Restriction Manager (with tab-out button to VIP Contracts)
// ═══════════════════════════════════════════════════════════════════════
function RestrictionManagerSection({ t, onGoToVip }) {
  const supabase = createClient();

  const [restrictions, setRestrictions] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("active");
  const [showNewForm, setShowNewForm] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [draft, setDraft] = useState({ customerId: "", brandId: "", reason: "", notes: "", isPermanent: true, expiresAt: "" });
  const [draftErrors, setDraftErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Maps a Supabase restrictions row (joined with customer/brand names)
  // onto the camelCase shape the render logic below already expects.
  // frozen_allowance_snapshot keeps the same limit/currency/periodType/
  // consumed keys it's written with in handleCreate below.
  const mapRestriction = (row) => ({
    id: row.id,
    customerId: row.customer_id,
    brandId: row.brand_id,
    customerName: row.customers?.name || "Unknown customer",
    brandName: row.brands?.brand_name || "Unknown brand",
    reason: row.reason,
    notes: row.notes,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    removedAt: row.removed_at,
    removedBy: row.removed_by,
    removalReason: row.removal_reason,
    frozenAllowanceSnapshot: row.frozen_allowance_snapshot,
  });

  const loadRestrictions = async () => {
    const { data, error } = await supabase
      .from("restrictions")
      .select("*, customers(name), brands(brand_name)")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
    } else {
      setLoadError("");
      setRestrictions((data || []).map(mapRestriction));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRestrictions();
    (async () => {
      const [{ data: customers }, { data: brands }] = await Promise.all([
        supabase.from("customers").select("id, name").order("name"),
        supabase.from("brands").select("id, brand_name").order("brand_name"),
      ]);
      setAllCustomers(customers || []);
      setAllBrands(brands || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRestrictions = restrictions.filter((r) => {
    const removed = !!r.removedAt;
    const expired = isExpired(r);
    if (filter === "active") return !removed && !expired;
    if (filter === "expired") return !removed && expired;
    if (filter === "removed") return removed;
    return true;
  });

  const activeCount = restrictions.filter((r) => !r.removedAt && !isExpired(r)).length;

  const duplicateExists = (customerId, brandId) =>
    restrictions.some((r) => r.customerId === customerId && r.brandId === brandId && !r.removedAt && !isExpired(r));

  const validateDraft = () => {
    const errs = {};
    if (!draft.customerId) errs.customerId = "Select a customer.";
    if (!draft.brandId) errs.brandId = "Select a brand.";
    if (!draft.reason.trim()) errs.reason = "A reason is required — internal only, never shown to the brand or customer.";
    if (!draft.isPermanent && !draft.expiresAt) errs.expiresAt = "Set an expiry date, or mark this restriction as permanent.";
    if (draft.customerId && draft.brandId && duplicateExists(draft.customerId, draft.brandId)) {
      errs.duplicate = "An active restriction already exists for this customer \u00d7 brand pair.";
    }
    return errs;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = validateDraft();
    setDraftErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSaving(true);
    setActionError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Per the schema comment on restrictions.frozen_allowance_snapshot: if
    // the customer has an active, unconsumed allowance with this brand,
    // it's frozen (not forfeited) - snapshotted here rather than deleting
    // or altering the real gifting_allowances row, which is left as-is.
    const { data: allowance } = await supabase
      .from("gifting_allowances")
      .select("limit_amount, currency, period_type, consumed")
      .eq("customer_id", draft.customerId)
      .eq("brand_id", draft.brandId)
      .maybeSingle();

    const frozenSnapshot = allowance
      ? {
          limit: allowance.limit_amount,
          currency: allowance.currency,
          periodType: allowance.period_type,
          consumed: allowance.consumed,
        }
      : null;

    const { error } = await supabase.from("restrictions").insert({
      customer_id: draft.customerId,
      brand_id: draft.brandId,
      reason: draft.reason.trim(),
      notes: draft.notes.trim() || null,
      is_permanent: draft.isPermanent,
      expires_at: draft.isPermanent ? null : new Date(draft.expiresAt).toISOString(),
      created_by: user?.id ?? null,
      frozen_allowance_snapshot: frozenSnapshot,
    });

    if (error) {
      setActionError(error.message);
      setIsSaving(false);
      return;
    }

    setDraft({ customerId: "", brandId: "", reason: "", notes: "", isPermanent: true, expiresAt: "" });
    setDraftErrors({});
    setShowNewForm(false);
    setIsSaving(false);
    await loadRestrictions();
  };

  const openRemoval = (id) => { setRemovingId(id); setRemovalReason(""); setRemovalError(""); };
  const confirmRemoval = async () => {
    if (!removalReason.trim()) { setRemovalError("A removal reason is required for the audit trail."); return; }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("restrictions")
      .update({
        removed_at: new Date().toISOString(),
        removed_by: user?.id ?? null,
        removal_reason: removalReason.trim(),
      })
      .eq("id", removingId);

    if (error) {
      setRemovalError(error.message);
      return;
    }

    setRemovingId(null); setRemovalReason(""); setRemovalError("");
    await loadRestrictions();
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 500, color: t.textSecondary, marginBottom: 5 };
  const inputStyle = (hasError) => ({ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13.5, fontFamily: "'Roboto', sans-serif", color: t.textPrimary, background: t.inputBg, border: `1px solid ${hasError ? "#C24747" : t.border}`, borderRadius: 8, outline: "none" });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}>Restriction manager</h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, maxWidth: 480 }}>
            {activeCount} active restriction{activeCount === 1 ? "" : "s"}. Neither the brand nor the customer is ever notified that a restriction exists.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onGoToVip} style={{ fontSize: 13, fontWeight: 500, color: tokens.gold, background: "transparent", border: `1px solid ${tokens.gold}`, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontFamily: "'Roboto', sans-serif", whiteSpace: "nowrap" }}>
            VIP talent contracts \u2192
          </button>
          <button onClick={() => setShowNewForm((v) => !v)} style={{ fontSize: 13, fontWeight: 500, color: "#0F0F0F", background: tokens.gold, border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontFamily: "'Roboto', sans-serif", whiteSpace: "nowrap" }}>
            {showNewForm ? "Cancel" : "+ New restriction"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: "rgba(185,129,40,0.08)",
          border: `1px solid rgba(185,129,40,0.25)`,
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 12,
          color: t.textSecondary,
          lineHeight: 1.5,
        }}
      >
        Restrictions block a customer from a brand. For VIP-tier talent, brand access works the
        opposite way — blocked by default until explicitly unlocked. See{" "}
        <span onClick={onGoToVip} style={{ color: tokens.gold, cursor: "pointer", fontWeight: 500 }}>
          VIP talent contracts
        </span>{" "}
        for that.
      </div>

      {(loadError || actionError) && (
        <div style={{ background: "rgba(194,71,71,0.12)", border: "1px solid rgba(194,71,71,0.4)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#E27A7A", marginBottom: 16 }}>
          {loadError || actionError}
        </div>
      )}

      {showNewForm && (
        <form onSubmit={handleCreate} style={{ background: t.surface, border: `1px solid ${tokens.gold}`, borderRadius: 12, padding: "20px 22px", marginBottom: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 14px 0" }}>New restriction</p>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Customer</label>
              <select value={draft.customerId} onChange={(e) => setDraft((d) => ({ ...d, customerId: e.target.value }))} style={inputStyle(draftErrors.customerId)}>
                <option value="">Select customer…</option>
                {allCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {draftErrors.customerId && <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "5px 0 0 0" }}>{draftErrors.customerId}</p>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Brand</label>
              <select value={draft.brandId} onChange={(e) => setDraft((d) => ({ ...d, brandId: e.target.value }))} style={inputStyle(draftErrors.brandId)}>
                <option value="">Select brand…</option>
                {allBrands.map((b) => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
              </select>
              {draftErrors.brandId && <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "5px 0 0 0" }}>{draftErrors.brandId}</p>}
            </div>
          </div>
          {draftErrors.duplicate && <p style={{ fontSize: 12.5, color: "#E27A7A", background: "rgba(194,71,71,0.08)", border: "1px solid rgba(194,71,71,0.25)", borderRadius: 8, padding: "9px 12px", margin: "0 0 14px 0" }}>{draftErrors.duplicate}</p>}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Reason <span style={{ color: t.textSecondary, fontWeight: 400 }}>— internal only, never shown to the brand or customer</span></label>
            <textarea value={draft.reason} onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))} rows={2} placeholder="e.g. Sponsorship exclusivity conflict with a competing brand." style={{ ...inputStyle(draftErrors.reason), resize: "vertical" }} />
            {draftErrors.reason && <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "5px 0 0 0" }}>{draftErrors.reason}</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Internal notes (optional)</label>
            <textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} rows={2} placeholder="Any additional context for other platform admins." style={{ ...inputStyle(false), resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Duration</label>
            <div style={{ display: "flex", gap: 8, marginBottom: draft.isPermanent ? 0 : 10 }}>
              <button type="button" onClick={() => setDraft((d) => ({ ...d, isPermanent: true }))} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 500, borderRadius: 7, cursor: "pointer", fontFamily: "'Roboto', sans-serif", border: draft.isPermanent ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`, background: draft.isPermanent ? "rgba(185,129,40,0.12)" : "transparent", color: draft.isPermanent ? tokens.gold : t.textPrimary }}>Permanent</button>
              <button type="button" onClick={() => setDraft((d) => ({ ...d, isPermanent: false }))} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 500, borderRadius: 7, cursor: "pointer", fontFamily: "'Roboto', sans-serif", border: !draft.isPermanent ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`, background: !draft.isPermanent ? "rgba(185,129,40,0.12)" : "transparent", color: !draft.isPermanent ? tokens.gold : t.textPrimary }}>Expires on a date</button>
            </div>
            {!draft.isPermanent && <input type="date" value={draft.expiresAt} onChange={(e) => setDraft((d) => ({ ...d, expiresAt: e.target.value }))} style={inputStyle(draftErrors.expiresAt)} />}
            {draftErrors.expiresAt && <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "5px 0 0 0" }}>{draftErrors.expiresAt}</p>}
          </div>
          <div style={{ background: "rgba(185,129,40,0.08)", border: "1px solid rgba(185,129,40,0.25)", borderRadius: 8, padding: "9px 12px", marginBottom: 16, fontSize: 11.5, color: t.textSecondary, lineHeight: 1.5 }}>
            If this customer has an active, unconsumed gifting allowance with this brand, it will be frozen (not forfeited) at the moment this restriction is created.
          </div>
          <button type="submit" disabled={isSaving} style={{ width: "100%", padding: "11px 0", fontSize: 13.5, fontWeight: 500, color: "#0F0F0F", background: tokens.gold, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Roboto', sans-serif", opacity: isSaving ? 0.7 : 1 }}>{isSaving ? "Saving…" : "Create restriction"}</button>
        </form>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[{ key: "active", label: "Active" }, { key: "expired", label: "Expired" }, { key: "removed", label: "Removed" }, { key: "all", label: "All" }].map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ fontSize: 12.5, fontWeight: 500, padding: "7px 13px", borderRadius: 7, cursor: "pointer", fontFamily: "'Roboto', sans-serif", border: active ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`, background: active ? "rgba(185,129,40,0.12)" : "transparent", color: active ? tokens.gold : t.textSecondary }}>{f.label}</button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading && <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "24px 18px", textAlign: "center", fontSize: 13, color: t.textSecondary }}>Loading restrictions…</div>}
        {!isLoading && visibleRestrictions.length === 0 && <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "24px 18px", textAlign: "center", fontSize: 13, color: t.textSecondary }}>No restrictions match this filter.</div>}
        {!isLoading && visibleRestrictions.map((r) => {
          const removed = !!r.removedAt;
          const expired = isExpired(r);
          return (
            <div key={r.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14.5, fontWeight: 500, color: t.textPrimary, margin: "0 0 3px 0" }}>{r.customerName} <span style={{ color: t.textSecondary }}>×</span> {r.brandName}</p>
                  <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>Created {formatDate(r.createdAt)} · {r.expiresAt ? `Expires ${formatDate(r.expiresAt)}` : "Permanent"}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", padding: "3px 9px", borderRadius: 6, color: removed ? t.textSecondary : expired ? "#E2A23A" : "#E27A7A", background: removed ? t.surfaceRaised : expired ? "rgba(226,162,58,0.14)" : "rgba(194,71,71,0.14)" }}>
                  {removed ? "Removed" : expired ? "Expired" : "Active"}
                </span>
              </div>
              <div style={{ background: t.surfaceRaised, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: r.frozenAllowanceSnapshot ? 10 : 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: t.textSecondary }}>Reason (internal only)</span>
                <p style={{ fontSize: 13, color: t.textPrimary, margin: "4px 0 0 0" }}>{r.reason}</p>
                {r.notes && <p style={{ fontSize: 12, color: t.textSecondary, margin: "6px 0 0 0" }}>Notes: {r.notes}</p>}
              </div>
              {r.frozenAllowanceSnapshot && (
                <div style={{ background: "rgba(185,129,40,0.08)", border: "1px solid rgba(185,129,40,0.25)", borderRadius: 8, padding: "9px 14px", marginBottom: removed ? 10 : 0 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: tokens.gold }}>Frozen allowance snapshot</span>
                  <p style={{ fontSize: 12.5, color: t.textPrimary, margin: "4px 0 0 0" }}>{r.frozenAllowanceSnapshot.consumed.toLocaleString()} used of {r.frozenAllowanceSnapshot.limit.toLocaleString()} {r.frozenAllowanceSnapshot.currency} — frozen, not forfeited.</p>
                </div>
              )}
              {removed && (
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10, marginTop: 10 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: t.textSecondary }}>Removal record</span>
                  <p style={{ fontSize: 12.5, color: t.textPrimary, margin: "4px 0 0 0" }}>Removed {formatDate(r.removedAt)} — {r.removalReason}</p>
                </div>
              )}
              {!removed && removingId !== r.id && (
                <button onClick={() => openRemoval(r.id)} style={{ marginTop: 12, fontSize: 12, fontWeight: 500, color: "#E27A7A", background: "transparent", border: "1px solid rgba(194,71,71,0.4)", borderRadius: 7, padding: "7px 13px", cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Remove restriction</button>
              )}
              {removingId === r.id && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Removal reason (required for audit trail)</label>
                  <textarea value={removalReason} onChange={(e) => { setRemovalReason(e.target.value); if (removalError) setRemovalError(""); }} rows={2} placeholder="e.g. Sponsorship conflict resolved." style={{ ...inputStyle(!!removalError), resize: "vertical", marginBottom: 8 }} />
                  {removalError && <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "0 0 8px 0" }}>{removalError}</p>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={confirmRemoval} style={{ flex: 1, padding: "9px 0", fontSize: 12.5, fontWeight: 500, color: "#0F0F0F", background: tokens.gold, border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Confirm removal</button>
                    <button onClick={() => setRemovingId(null)} style={{ flex: 1, padding: "9px 0", fontSize: 12.5, fontWeight: 500, color: t.textSecondary, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: VIP Talent Contracts
// ═══════════════════════════════════════════════════════════════════════
function VipContractsSection({ t }) {
  const supabase = createClient();

  const [vipCustomers, setVipCustomers] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedVipId, setSelectedVipId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ brandId: "", contractStatus: "none", contractTerms: "", notes: "", unlocked: false });
  const [draftErrors, setDraftErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Maps a Supabase brand_talent_contracts row (joined with brand name)
  // onto the camelCase shape the render logic below already expects.
  const mapContract = (row) => ({
    id: row.id,
    customerId: row.customer_id,
    brandId: row.brand_id,
    contractStatus: row.contract_status,
    contractTerms: row.contract_terms,
    notes: row.notes,
    unlocked: row.unlocked,
    unlockedAt: row.unlocked_at,
    unlockedBy: row.unlocked_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  const loadAll = async () => {
    const [vipsRes, brandsRes, contractsRes] = await Promise.all([
      supabase.from("customers").select("id, name, tier").eq("tier", "VIP").order("name"),
      supabase.from("brands").select("id, brand_name").order("brand_name"),
      supabase.from("brand_talent_contracts").select("*").order("updated_at", { ascending: false }),
    ]);

    if (vipsRes.error || contractsRes.error) {
      setLoadError((vipsRes.error || contractsRes.error).message);
    } else {
      setLoadError("");
      setVipCustomers(vipsRes.data || []);
      setAllBrands(brandsRes.data || []);
      setContracts((contractsRes.data || []).map(mapContract));
      setSelectedVipId((current) => current ?? vipsRes.data?.[0]?.id ?? null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVip = vipCustomers.find((c) => c.id === selectedVipId);
  const vipContracts = contracts.filter((c) => c.customerId === selectedVipId);
  const contractedBrandIds = vipContracts.map((c) => c.brandId);
  const availableBrands = allBrands.filter((b) => !contractedBrandIds.includes(b.id));
  const brandName = (id) => allBrands.find((b) => b.id === id)?.brand_name || "Unknown brand";

  const statusBadge = (status) => {
    const map = {
      none: { bg: t.surfaceRaised, color: t.textSecondary, label: "No contract on file" },
      pending: { bg: "rgba(226,162,58,0.14)", color: "#E2A23A", label: "Pending" },
      executed: { bg: "rgba(99,153,34,0.16)", color: "#8FBF5A", label: "Executed" },
      expired: { bg: "rgba(185,129,40,0.14)", color: tokens.gold, label: "Expired" },
      terminated: { bg: "rgba(194,71,71,0.14)", color: "#E27A7A", label: "Terminated" },
    };
    const s = map[status] || map.none;
    return <span style={{ fontSize: 11, fontWeight: 500, color: s.color, background: s.bg, padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>{s.label}</span>;
  };

  const resetDraft = () => { setDraft({ brandId: "", contractStatus: "none", contractTerms: "", notes: "", unlocked: false }); setDraftErrors({}); };
  const openNewForm = () => { resetDraft(); setShowNewForm(true); setEditingId(null); };
  const openEdit = (contract) => {
    setDraft({ brandId: contract.brandId, contractStatus: contract.contractStatus, contractTerms: contract.contractTerms, notes: contract.notes, unlocked: contract.unlocked });
    setEditingId(contract.id); setShowNewForm(false); setDraftErrors({});
  };

  const handleSaveNew = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!draft.brandId) errs.brandId = "Select a brand.";
    setDraftErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSaving(true);
    setActionError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("brand_talent_contracts").insert({
      customer_id: selectedVipId,
      brand_id: draft.brandId,
      contract_status: draft.contractStatus,
      contract_terms: draft.contractTerms.trim(),
      notes: draft.notes.trim() || null,
      unlocked: draft.unlocked,
      unlocked_at: draft.unlocked ? new Date().toISOString() : null,
      unlocked_by: draft.unlocked ? user?.id ?? null : null,
    });

    if (error) {
      setActionError(error.message);
      setIsSaving(false);
      return;
    }

    resetDraft(); setShowNewForm(false);
    setIsSaving(false);
    await loadAll();
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setActionError("");

    const editing = contracts.find((c) => c.id === editingId);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("brand_talent_contracts")
      .update({
        contract_status: draft.contractStatus,
        contract_terms: draft.contractTerms.trim(),
        notes: draft.notes.trim() || null,
        unlocked: draft.unlocked,
        unlocked_at: draft.unlocked ? editing?.unlockedAt || new Date().toISOString() : null,
        unlocked_by: draft.unlocked ? editing?.unlockedBy || user?.id || null : null,
      })
      .eq("id", editingId);

    if (error) {
      setActionError(error.message);
      setIsSaving(false);
      return;
    }

    setEditingId(null); resetDraft();
    setIsSaving(false);
    await loadAll();
  };

  const toggleUnlock = async (contract) => {
    setActionError("");
    const nextUnlocked = !contract.unlocked;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("brand_talent_contracts")
      .update({
        unlocked: nextUnlocked,
        unlocked_at: nextUnlocked ? new Date().toISOString() : contract.unlockedAt,
        unlocked_by: nextUnlocked ? user?.id ?? null : contract.unlockedBy,
      })
      .eq("id", contract.id);

    if (error) {
      setActionError(error.message);
      return;
    }
    await loadAll();
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 500, color: t.textSecondary, marginBottom: 5 };
  const inputStyle = (hasError) => ({ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13.5, fontFamily: "'Roboto', sans-serif", color: t.textPrimary, background: t.inputBg, border: `1px solid ${hasError ? "#C24747" : t.border}`, borderRadius: 8, outline: "none" });

  const renderForm = (onSubmit, isEdit) => (
    <form onSubmit={onSubmit} style={{ background: t.surface, border: `1px solid ${tokens.gold}`, borderRadius: 12, padding: "18px 20px", marginBottom: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 14px 0" }}>{isEdit ? `Edit ${brandName(draft.brandId)} contract` : "New brand × VIP contract record"}</p>
      {!isEdit && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Brand</label>
          <select value={draft.brandId} onChange={(e) => setDraft((d) => ({ ...d, brandId: e.target.value }))} style={inputStyle(draftErrors.brandId)}>
            <option value="">Select brand…</option>
            {availableBrands.map((b) => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
          </select>
          {draftErrors.brandId && <p style={{ fontSize: 11.5, color: "#E27A7A", margin: "5px 0 0 0" }}>{draftErrors.brandId}</p>}
          {availableBrands.length === 0 && <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "5px 0 0 0" }}>Every brand already has a contract record for this VIP.</p>}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Contract status</label>
        <select value={draft.contractStatus} onChange={(e) => setDraft((d) => ({ ...d, contractStatus: e.target.value }))} style={inputStyle(false)}>
          {CONTRACT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Contract terms <span style={{ color: t.textSecondary, fontWeight: 400 }}>— descriptive reference only, no financial figures tracked here</span></label>
        <textarea value={draft.contractTerms} onChange={(e) => setDraft((d) => ({ ...d, contractTerms: e.target.value }))} rows={2} placeholder="e.g. 12-month gifting agreement, executed 5/14/2026." style={{ ...inputStyle(false), resize: "vertical" }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Internal notes</label>
        <textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} rows={2} placeholder="Any context for other platform admins." style={{ ...inputStyle(false), resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.surfaceRaised, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 2px 0" }}>Unlock this brand for this VIP</p>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0, maxWidth: 380 }}>This is the actual switch controlling access — independent of contract status.</p>
        </div>
        <button type="button" onClick={() => setDraft((d) => ({ ...d, unlocked: !d.unlocked }))} style={{ flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: draft.unlocked ? tokens.gold : t.border, position: "relative", marginLeft: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: draft.unlocked ? 23 : 3, transition: "left 0.15s ease" }} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={isSaving} style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 500, color: "#0F0F0F", background: tokens.gold, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Roboto', sans-serif", opacity: isSaving ? 0.7 : 1 }}>{isSaving ? "Saving…" : isEdit ? "Save changes" : "Create record"}</button>
        <button type="button" onClick={() => { setShowNewForm(false); setEditingId(null); resetDraft(); }} style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 500, color: t.textSecondary, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Cancel</button>
      </div>
    </form>
  );

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 4px 0" }}>VIP talent contracts</h1>
        <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, maxWidth: 560 }}>
          Governs which brands can see and engage your VIP-tier roster. A VIP customer is invisible to a brand until explicitly unlocked here.
        </p>
      </div>

      {(loadError || actionError) && (
        <div style={{ background: "rgba(194,71,71,0.12)", border: "1px solid rgba(194,71,71,0.4)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#E27A7A", marginBottom: 16 }}>
          {loadError || actionError}
        </div>
      )}

      {isLoading && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "22px 18px", textAlign: "center", fontSize: 13, color: t.textSecondary }}>
          Loading…
        </div>
      )}

      {!isLoading && vipCustomers.length === 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "22px 18px", textAlign: "center", fontSize: 13, color: t.textSecondary }}>
          No VIP-tier customers yet. A customer needs tier = 'VIP' before they can have a talent contract record.
        </div>
      )}

      {!isLoading && vipCustomers.length > 0 && (
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: "0 0 240px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, fontSize: 12, fontWeight: 500, color: t.textSecondary }}>VIP roster ({vipCustomers.length})</div>
          {vipCustomers.map((c, idx) => {
            const isSelected = c.id === selectedVipId;
            const activeUnlocks = contracts.filter((ct) => ct.customerId === c.id && ct.unlocked).length;
            return (
              <div key={c.id} onClick={() => { setSelectedVipId(c.id); setShowNewForm(false); setEditingId(null); }} style={{ padding: "13px 16px", cursor: "pointer", borderBottom: idx < vipCustomers.length - 1 ? `1px solid ${t.border}` : "none", background: isSelected ? t.surfaceRaised : "transparent", borderLeft: isSelected ? `2px solid ${tokens.gold}` : "2px solid transparent" }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, margin: "0 0 3px 0" }}>{c.name}</p>
                <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0 }}>{activeUnlocks} brand{activeUnlocks === 1 ? "" : "s"} unlocked</p>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }}>
          {selectedVip && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary, margin: "0 0 3px 0" }}>{selectedVip.name}</h2>
                  <span style={{ fontSize: 11, fontWeight: 500, color: tokens.gold, background: "rgba(185,129,40,0.14)", padding: "2px 8px", borderRadius: 5 }}>VIP</span>
                </div>
                {!showNewForm && !editingId && availableBrands.length > 0 && (
                  <button onClick={openNewForm} style={{ fontSize: 12.5, fontWeight: 500, color: "#0F0F0F", background: tokens.gold, border: "none", borderRadius: 7, padding: "8px 14px", cursor: "pointer", fontFamily: "'Roboto', sans-serif", whiteSpace: "nowrap" }}>+ New contract record</button>
                )}
              </div>
              {showNewForm && renderForm(handleSaveNew, false)}
              {editingId && renderForm(handleSaveEdit, true)}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vipContracts.length === 0 && !showNewForm && (
                  <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "22px 18px", textAlign: "center", fontSize: 13, color: t.textSecondary }}>
                    No brand records yet for this VIP. Every brand is currently blocked from seeing them.
                  </div>
                )}
                {vipContracts.map((c) => (
                  <div key={c.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <p style={{ fontSize: 14.5, fontWeight: 500, color: t.textPrimary, margin: "0 0 4px 0" }}>{brandName(c.brandId)}</p>
                        {statusBadge(c.contractStatus)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: c.unlocked ? "#8FBF5A" : t.textSecondary }}>{c.unlocked ? "Unlocked" : "Blocked"}</span>
                        <button onClick={() => toggleUnlock(c)} style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: c.unlocked ? tokens.gold : t.border, position: "relative" }}>
                          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: c.unlocked ? 21 : 3, transition: "left 0.15s ease" }} />
                        </button>
                      </div>
                    </div>
                    {c.contractTerms && <p style={{ fontSize: 12.5, color: t.textPrimary, margin: "0 0 6px 0", lineHeight: 1.5 }}>{c.contractTerms}</p>}
                    {!c.contractTerms && c.contractStatus === "none" && <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 6px 0", lineHeight: 1.5 }}>No contract on file. Unlocked at the admin's discretion.</p>}
                    {c.notes && <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "0 0 8px 0" }}>Notes: {c.notes}</p>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
                      <span style={{ fontSize: 11, color: t.textSecondary }}>{c.unlocked ? `Unlocked ${formatDate(c.unlockedAt)}` : `Last updated ${formatDate(c.updatedAt)}`}</span>
                      <button onClick={() => openEdit(c)} style={{ fontSize: 11.5, fontWeight: 500, color: tokens.gold, background: "transparent", border: `1px solid ${tokens.gold}`, borderRadius: 6, padding: "5px 11px", cursor: "pointer", fontFamily: "'Roboto', sans-serif" }}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHELL: Platform Admin Dashboard
// ═══════════════════════════════════════════════════════════════════════
export default function PlatformAdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [theme, setTheme] = useState("dark");
  const [activeSection, setActiveSection] = useState("review_queue");

  const t = tokens[theme];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/platform-admin/login");
    router.refresh();
  };

  const NAV_ITEMS = [
    { key: "review_queue", label: "Review queue" },
    { key: "restrictions", label: "Restriction manager" },
    { key: "vip_contracts", label: "VIP talent contracts" },
  ];

  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        display: "flex",
        transition: "background 0.2s ease",
      }}
    >

      {/* Sidebar */}
      <div
        style={{
          flex: "0 0 220px",
          background: t.surface,
          borderRight: `1px solid ${t.border}`,
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "0 10px", marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>Gift Deck Pro</span>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 500, color: t.textSecondary, letterSpacing: "0.04em" }}>
            PLATFORM ADMIN
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 500,
                  fontFamily: "'Roboto', sans-serif",
                  cursor: "pointer",
                  border: "none",
                  background: active ? "rgba(185,129,40,0.12)" : "transparent",
                  color: active ? tokens.gold : t.textSecondary,
                  borderLeft: active ? `2px solid ${tokens.gold}` : "2px solid transparent",
                  position: "relative",
                  left: active ? -2 : 0,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleSignOut}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: t.textSecondary,
            background: "transparent",
            border: `1px solid ${t.border}`,
            borderRadius: 6,
            padding: "7px 10px",
            cursor: "pointer",
            fontFamily: "'Roboto', sans-serif",
            marginBottom: 8,
          }}
        >
          Sign out
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: t.textSecondary,
            background: "transparent",
            border: `1px solid ${t.border}`,
            borderRadius: 6,
            padding: "7px 10px",
            cursor: "pointer",
            fontFamily: "'Roboto', sans-serif",
          }}
          title="In the real app this lives in Settings only — exposed here for preview convenience"
        >
          {theme === "dark" ? "Preview: light" : "Preview: dark"}
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "28px 32px", overflow: "auto" }}>
        <div
          style={{
            width: 28,
            height: 3,
            background: tokens.gold,
            borderRadius: 2,
            marginBottom: 18,
          }}
        />
        {activeSection === "review_queue" && <ReviewQueueSection t={t} />}
        {activeSection === "restrictions" && (
          <RestrictionManagerSection t={t} onGoToVip={() => setActiveSection("vip_contracts")} />
        )}
        {activeSection === "vip_contracts" && <VipContractsSection t={t} />}

        <p
          style={{
            fontSize: 11,
            color: t.textSecondary,
            marginTop: 24,
            opacity: 0.7,
            textAlign: "center",
          }}
        >
          Prototype preview — mock data only, no live backend connection
        </p>
      </div>
    </div>
  );
}
