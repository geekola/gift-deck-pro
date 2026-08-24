"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens (shared system, dark-default) ────────────────────────────
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

// New screen — none of the 18 original mocks covered how a customer
// originates a customer_brand_access request in the first place.
// CustomerAccessManager (brand side) can approve/deny/manage rows, and
// the auto-approve-on-open-policy trigger (migration 0012) fires on
// insert, but nothing ever created that first row. Scoped via
// AskUserQuestion: a dedicated browse screen, reachable from
// CategorySelector, listing approved brands the customer doesn't have
// access to yet.
//
// invite_only brands are deliberately excluded from this list - by
// definition they aren't self-serve (the brand invites the customer,
// not the other way around), and there's no invite-acceptance flow
// built yet either. That's a separate gap, not this screen's job.
const POLICY_LABELS = {
  open: "Open — instant access",
  selective: "By request — the brand reviews",
};

export default function BrowseBrands() {
  const router = useRouter();
  const supabase = createClient();

  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [requestingId, setRequestingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState(null);

  const loadBrands = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const [{ data: brandRows, error: brandsError }, { data: accessRows, error: accessError }] =
      await Promise.all([
        supabase
          .from("brands")
          .select("id, brand_name, category, access_policy")
          .eq("status", "approved")
          .in("access_policy", ["open", "selective"])
          .order("brand_name"),
        supabase.from("customer_brand_access").select("brand_id, status").eq("customer_id", user.id),
      ]);

    if (brandsError || accessError) {
      setLoadError((brandsError || accessError).message);
      setIsLoading(false);
      return;
    }

    const statusByBrand = new Map((accessRows || []).map((r) => [r.brand_id, r.status]));
    const merged = (brandRows || []).map((b) => ({
      id: b.id,
      brandName: b.brand_name,
      category: b.category,
      accessPolicy: b.access_policy,
      status: statusByBrand.get(b.id) || "none",
    }));

    setLoadError("");
    setBrands(merged);
    setIsLoading(false);
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dark only, matching CustomerNav.jsx's top bar - see
  // ProductCatalogue.jsx (brand side) for why the per-page theme toggle
  // was removed.
  const t = tokens.dark;

  const handleRequest = async (brand) => {
    setRequestingId(brand.id);
    setActionError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("customer_brand_access")
      .insert({ customer_id: user.id, brand_id: brand.id, status: "unactioned" })
      .select("status")
      .single();

    if (error) {
      setActionError(error.message);
      setRequestingId(null);
      return;
    }

    // Open-policy brands flip to 'approved' via the auto-approve trigger
    // before the row lands - use whatever actually got written rather
    // than assuming.
    setBrands((bs) => bs.map((b) => (b.id === brand.id ? { ...b, status: data.status } : b)));
    setToast(
      data.status === "approved"
        ? `You're in — ${brand.brandName} approved instantly.`
        : `Requested access to ${brand.brandName}.`
    );
    setTimeout(() => setToast(null), 2200);
    setRequestingId(null);
  };

  const statusDisplay = (brand) => {
    switch (brand.status) {
      case "approved":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: "#8FBF5A", background: "rgba(99,153,34,0.16)", padding: "4px 10px", borderRadius: 6 }}>
              Access Granted
            </span>
            <button
              onClick={() => router.push("/customer/categories")}
              style={{ fontSize: 11.5, fontWeight: 500, color: tokens.gold, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Roboto', sans-serif", padding: 0 }}
            >
              Browse Catalogue →
            </button>
          </div>
        );
      case "unactioned":
        return (
          <span style={{ fontSize: 11.5, fontWeight: 500, color: tokens.gold, background: "rgba(185,129,40,0.14)", padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>
            Requested — Pending Review
          </span>
        );
      case "denied":
        return (
          <span style={{ fontSize: 11.5, fontWeight: 500, color: "#E27A7A", background: "rgba(194,71,71,0.14)", padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>
            Access Denied
          </span>
        );
      default:
        return (
          <button
            onClick={() => handleRequest(brand)}
            disabled={requestingId === brand.id}
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "#0F0F0F",
              background: tokens.gold,
              border: "none",
              borderRadius: 7,
              padding: "7px 14px",
              cursor: "pointer",
              fontFamily: "'Roboto', sans-serif",
              whiteSpace: "nowrap",
              opacity: requestingId === brand.id ? 0.6 : 1,
            }}
          >
            {requestingId === brand.id ? "Requesting…" : "Request Access"}
          </button>
        );
    }
  };

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
        transition: "background 0.2s ease",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            Browse Brands
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            Request access to a brand's catalogue. Open brands approve instantly; others review your
            request first.
          </p>
        </div>

        {(loadError || actionError) && (
          <div style={{ background: "rgba(194,71,71,0.12)", border: "1px solid rgba(194,71,71,0.4)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#E27A7A", marginBottom: 16 }}>
            {loadError || actionError}
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: t.textSecondary }}>
            Loading…
          </div>
        )}

        {!isLoading && brands.length === 0 && (
          <div style={{ border: `1px dashed ${t.border}`, borderRadius: 14, padding: "36px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
              No brands available to browse right now.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!isLoading &&
            brands.map((brand) => (
              <div
                key={brand.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 18px",
                  borderRadius: 12,
                  border: `1px solid ${t.border}`,
                  background: t.surface,
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary, margin: "0 0 3px 0" }}>
                    {brand.brandName}
                  </p>
                  <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>
                    {brand.category} · {POLICY_LABELS[brand.accessPolicy]}
                  </p>
                </div>
                <div style={{ flexShrink: 0 }}>{statusDisplay(brand)}</div>
              </div>
            ))}
        </div>
      </div>

      {toast && (
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
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
