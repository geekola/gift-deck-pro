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

// Maps a Supabase brands row (joined with brand_application_notes) onto
// the camelCase shape the render logic below already expects. Notes
// don't carry a resolved admin display name - created_by is a profile
// id with no name/email on profiles itself (see migration 0004), and
// resolving it would need a security-definer lookup into auth.users.
// Not worth it for what's currently a single-admin workflow.
function mapApplication(row) {
  return {
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
  };
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PlatformAdminReviewQueue() {
  const supabase = createClient();

  const [theme, setTheme] = useState("dark");
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
  }, []);

  const t = tokens[theme];
  const selected = applications.find((a) => a.id === selectedId) || null;

  const visibleApplications = applications.filter((a) =>
    filter === "all" ? true : a.status === filter
  );

  const pendingCount = applications.filter((a) => a.status === "pending").length;

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
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  };

  const statusBadge = (status) => {
    const map = {
      pending: { bg: "rgba(185,129,40,0.14)", color: tokens.gold, label: "Pending review" },
      approved: { bg: "rgba(99,153,34,0.16)", color: "#8FBF5A", label: "Approved" },
      rejected: { bg: "rgba(194,71,71,0.14)", color: "#E27A7A", label: "Rejected" },
    };
    const s = map[status] || map.pending;
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

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 4,
    letterSpacing: "0.01em",
  };

  const valueStyle = {
    fontSize: 14,
    fontWeight: 400,
    color: t.textPrimary,
    margin: "0 0 14px 0",
    wordBreak: "break-word",
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
          maxWidth: 920,
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
          title="In the real app this lives in Settings only — exposed here for preview convenience"
        >
          {theme === "dark" ? "Preview: light" : "Preview: dark"}
        </button>
      </div>

      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
        }}
      >
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
            Brand applications
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
            {pendingCount} {pendingCount === 1 ? "application" : "applications"} awaiting review
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
              marginBottom: 16,
            }}
          >
            {loadError || actionError}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { key: "pending", label: "Pending" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
            { key: "all", label: "All" },
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
                Loading applications…
              </div>
            )}
            {!isLoading && visibleApplications.length === 0 && (
              <div style={{ padding: "24px 18px", fontSize: 13, color: t.textSecondary }}>
                No applications in this view.
              </div>
            )}
            {!isLoading && visibleApplications.map((app, idx) => {
              const isSelected = app.id === selectedId;
              return (
                <div
                  key={app.id}
                  onClick={() => {
                    setSelectedId(app.id);
                    setRejectMode(false);
                    setRejectReason("");
                    setRejectError("");
                    setNewNote("");
                    setNoteError("");
                  }}
                  style={{
                    padding: "14px 16px",
                    cursor: "pointer",
                    borderBottom:
                      idx < visibleApplications.length - 1 ? `1px solid ${t.border}` : "none",
                    background: isSelected ? t.surfaceRaised : "transparent",
                    borderLeft: isSelected
                      ? `2px solid ${tokens.gold}`
                      : "2px solid transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
                      {app.brandName}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, color: t.textSecondary }}>
                      {formatDate(app.registeredAt)}
                    </span>
                    {statusBadge(app.status)}
                  </div>
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
                Select an application from the list.
              </p>
            )}

            {selected && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 20,
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
                      {selected.brandName}
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
                      {selected.category}
                    </span>
                  </div>
                  {statusBadge(selected.status)}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0 20px",
                    marginBottom: 4,
                  }}
                >
                  <div>
                    <span style={labelStyle}>Primary contact</span>
                    <p style={valueStyle}>
                      {selected.contactFirstName} {selected.contactLastName}
                    </p>
                  </div>
                  <div>
                    <span style={labelStyle}>Phone number</span>
                    <p style={valueStyle}>{selected.phoneNumber}</p>
                  </div>
                  <div>
                    <span style={labelStyle}>Admin login email</span>
                    <p style={valueStyle}>{selected.email}</p>
                  </div>
                  <div>
                    <span style={labelStyle}>Fulfilment email</span>
                    <p style={valueStyle}>{selected.fulfilmentEmail}</p>
                  </div>
                  <div>
                    <span style={labelStyle}>Website</span>
                    <p style={valueStyle}>
                      <a
                        href={selected.website}
                        style={{ color: tokens.gold, textDecoration: "none" }}
                      >
                        {selected.website}
                      </a>
                    </p>
                  </div>
                  <div>
                    <span style={labelStyle}>Submitted</span>
                    <p style={valueStyle}>{formatDate(selected.registeredAt)}</p>
                  </div>
                </div>

                {selected.status === "rejected" && selected.rejectionReason && (
                  <div
                    style={{
                      background: "rgba(194,71,71,0.08)",
                      border: "1px solid rgba(194,71,71,0.25)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#E27A7A" }}>
                      Rejection reason
                    </span>
                    <p style={{ fontSize: 13, color: t.textPrimary, margin: "4px 0 0 0" }}>
                      {selected.rejectionReason}
                    </p>
                  </div>
                )}

                {selected.status === "rejected" && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={labelStyle}>
                      Notes{" "}
                      <span style={{ color: t.textSecondary, fontWeight: 400 }}>
                        — decision context, e.g. reconsideration requests
                      </span>
                    </span>

                    {(selected.notes || []).length === 0 && (
                      <p style={{ fontSize: 12.5, color: t.textSecondary, margin: "6px 0 10px 0" }}>
                        No notes yet.
                      </p>
                    )}

                    {(selected.notes || []).length > 0 && (
                      <div style={{ marginTop: 8, marginBottom: 12 }}>
                        {selected.notes
                          .slice()
                          .reverse()
                          .map((note) => (
                            <div
                              key={note.id}
                              style={{
                                background: t.surfaceRaised,
                                border: `1px solid ${t.border}`,
                                borderRadius: 8,
                                padding: "9px 12px",
                                marginBottom: 8,
                              }}
                            >
                              <p
                                style={{
                                  fontSize: 13,
                                  color: t.textPrimary,
                                  margin: "0 0 4px 0",
                                  lineHeight: 1.5,
                                }}
                              >
                                {note.text}
                              </p>
                              <span style={{ fontSize: 11, color: t.textSecondary }}>
                                {formatDateTime(note.at)}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                    <textarea
                      value={newNote}
                      onChange={(e) => {
                        setNewNote(e.target.value);
                        if (noteError) setNoteError("");
                      }}
                      placeholder="e.g. Brand emailed requesting reconsideration on 6/24 — asked to resubmit with updated return policy."
                      rows={2}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "9px 12px",
                        fontSize: 13,
                        fontFamily: "'Roboto', sans-serif",
                        color: t.textPrimary,
                        background: t.inputBg,
                        border: `1px solid ${noteError ? "#C24747" : t.border}`,
                        borderRadius: 8,
                        outline: "none",
                        resize: "vertical",
                        marginBottom: 6,
                      }}
                    />
                    {noteError && (
                      <p style={{ fontSize: 12, color: "#E27A7A", margin: "0 0 8px 0" }}>
                        {noteError}
                      </p>
                    )}
                    <button
                      onClick={handleAddNote}
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: tokens.gold,
                        background: "transparent",
                        border: `1px solid ${tokens.gold}`,
                        borderRadius: 7,
                        padding: "7px 14px",
                        cursor: "pointer",
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    >
                      Add note
                    </button>
                  </div>
                )}

                {selected.status === "pending" && !rejectMode && (
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button
                      onClick={handleApprove}
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
                      onClick={() => setRejectMode(true)}
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
                      Reject
                    </button>
                  </div>
                )}

                {selected.status === "pending" && rejectMode && (
                  <div style={{ marginTop: 8 }}>
                    <label style={labelStyle}>Rejection reason (required)</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => {
                        setRejectReason(e.target.value);
                        if (rejectError) setRejectError("");
                      }}
                      placeholder="Internal note — not shown to the brand verbatim"
                      rows={3}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        fontSize: 13.5,
                        fontFamily: "'Roboto', sans-serif",
                        color: t.textPrimary,
                        background: t.inputBg,
                        border: `1px solid ${
                          rejectError ? "#C24747" : t.border
                        }`,
                        borderRadius: 8,
                        outline: "none",
                        resize: "vertical",
                        marginBottom: 6,
                      }}
                    />
                    {rejectError && (
                      <p style={{ fontSize: 12, color: "#E27A7A", margin: "0 0 10px 0" }}>
                        {rejectError}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={handleRejectConfirm}
                        style={{
                          flex: 1,
                          padding: "11px 0",
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: "#FFFFFF",
                          background: "#C24747",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontFamily: "'Roboto', sans-serif",
                        }}
                      >
                        Confirm rejection
                      </button>
                      <button
                        onClick={() => {
                          setRejectMode(false);
                          setRejectReason("");
                          setRejectError("");
                        }}
                        style={{
                          flex: 1,
                          padding: "11px 0",
                          fontSize: 13.5,
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

                {selected.status === "approved" && (
                  <p style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 4 }}>
                    Reviewed {selected.reviewedAt ? formatDate(selected.reviewedAt) : ""}. This
                    brand can now log in and access the portal.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
