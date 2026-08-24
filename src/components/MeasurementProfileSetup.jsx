"use client";

import React, { useEffect, useState } from "react";
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

// Scoped via AskUserQuestion: wire real data only, leave unlinked from any
// onboarding flow for now (nothing redirects a new customer here today -
// it's reachable by direct URL only). CustomerSettings.jsx's Measurements
// tab already does the real read/write this screen now mirrors; field ids
// are a shared, stable key set between the two (see CustomerSettings.jsx's
// own comment referencing this file).
const MALE_FIELDS = [
  { id: "neck", label: "Neck" },
  { id: "chest", label: "Chest" },
  { id: "waist", label: "Waist" },
  { id: "hips", label: "Hips" },
  { id: "shoulder_width", label: "Shoulder Width" },
  { id: "sleeve_length", label: "Sleeve Length" },
  { id: "jacket_length", label: "Jacket Length" },
  { id: "inseam", label: "Inseam" },
  { id: "outseam", label: "Outseam" },
  { id: "thigh", label: "Thigh" },
  { id: "shoe_size", label: "Shoe Size" },
];

const FEMALE_FIELDS = [
  { id: "bust", label: "Bust" },
  { id: "underbust", label: "Underbust" },
  { id: "waist", label: "Waist" },
  { id: "hips", label: "Hips" },
  { id: "shoulder_width", label: "Shoulder Width" },
  { id: "sleeve_length", label: "Sleeve Length" },
  { id: "dress_length", label: "Dress / Garment Length" },
  { id: "inseam", label: "Inseam" },
  { id: "high_hip", label: "High Hip" },
  { id: "shoe_size", label: "Shoe Size" },
];

// gender_set on measurement_profiles (migration 0003) is 'mens'/'womens';
// this screen's own toggle uses 'male'/'female' - same mapping
// CustomerSettings.jsx uses. values_cm is always canonical cm regardless of
// preferred_unit - convert to preferred_unit on load, back to cm on save.
const GENDER_SET_TO_UI = { mens: "male", womens: "female" };
const UI_TO_GENDER_SET = { male: "mens", female: "womens" };

function convert(value, fromUnit, toUnit) {
  if (value === "" || value == null || isNaN(Number(value))) return value;
  const num = Number(value);
  if (fromUnit === toUnit) return value;
  const converted = fromUnit === "in" ? num * 2.54 : num / 2.54;
  return Math.round(converted * 10) / 10;
}

export default function MeasurementProfileSetup() {
  const supabase = createClient();

  const [customerId, setCustomerId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [gender, setGender] = useState(null); // male | female
  const [unit, setUnit] = useState("in"); // cm | in
  const [vals, setVals] = useState({});
  const [touched, setTouched] = useState({});
  const [saved, setSaved] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dark only, matching CustomerNav.jsx's top bar - see
  // ProductCatalogue.jsx (brand side) for why the per-page theme toggle
  // was removed.
  const t = tokens.dark;
  const fields = gender === "male" ? MALE_FIELDS : gender === "female" ? FEMALE_FIELDS : [];

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      setCustomerId(user.id);

      const { data: profile, error } = await supabase
        .from("measurement_profiles")
        .select("*")
        .eq("customer_id", user.id)
        .maybeSingle();

      if (error) {
        setLoadError(error.message);
        setIsLoading(false);
        return;
      }

      if (profile) {
        const uiGender = GENDER_SET_TO_UI[profile.gender_set] || "female";
        const displayUnit = profile.preferred_unit || "in";
        const displayVals = {};
        for (const [fieldId, cmValue] of Object.entries(profile.values_cm || {})) {
          displayVals[fieldId] = fieldId === "shoe_size" ? cmValue : convert(cmValue, "cm", displayUnit);
        }
        setGender(uiGender);
        setUnit(displayUnit);
        setVals(displayVals);
      }

      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnitChange = (newUnit) => {
    if (newUnit === unit) return;
    setVals((v) => {
      const next = {};
      for (const f of fields) {
        next[f.id] = f.id === "shoe_size" ? v[f.id] : convert(v[f.id], unit, newUnit);
      }
      return next;
    });
    setUnit(newUnit);
  };

  const setField = (id, value) => {
    setVals((v) => ({ ...v, [id]: value }));
    setSaved(false);
    setSkipped(false);
  };

  const markTouched = (id) => setTouched((tt) => ({ ...tt, [id]: true }));

  const filledCount = fields.filter((f) => vals[f.id] !== undefined && vals[f.id] !== "").length;

  const handleSave = async (e) => {
    e.preventDefault();
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f.id]: true }), {}));
    setActionError("");

    if (!customerId) {
      setActionError("Couldn't load your account. Try refreshing.");
      return;
    }

    setIsSaving(true);
    const valuesCm = {};
    for (const f of fields) {
      valuesCm[f.id] = f.id === "shoe_size" ? vals[f.id] ?? null : convert(vals[f.id], unit, "cm") ?? null;
    }

    const { error } = await supabase.from("measurement_profiles").upsert(
      {
        customer_id: customerId,
        gender_set: UI_TO_GENDER_SET[gender],
        preferred_unit: unit,
        values_cm: valuesCm,
      },
      { onConflict: "customer_id" }
    );

    setIsSaving(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setSkipped(false);
    setSaved(true);
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: t.textSecondary,
    marginBottom: 5,
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    fontSize: 13.5,
    fontFamily: "'Roboto', sans-serif",
    color: t.textPrimary,
    background: t.inputBg,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    outline: "none",
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
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            Your Measurements
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            One quick profile so anything you're sent fits. You can update this anytime from
            Settings.
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

        {isLoading && (
          <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: t.textSecondary }}>
            Loading…
          </div>
        )}

        {!isLoading && !gender && (
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "22px",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 14px 0" }}>
              Which Measurement Chart Fits You Best?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setGender("male")}
                style={{
                  flex: 1,
                  padding: "16px 0",
                  borderRadius: 10,
                  cursor: "pointer",
                  border: `1px solid ${t.border}`,
                  background: t.surfaceRaised,
                  color: t.textPrimary,
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                Men's
              </button>
              <button
                onClick={() => setGender("female")}
                style={{
                  flex: 1,
                  padding: "16px 0",
                  borderRadius: 10,
                  cursor: "pointer",
                  border: `1px solid ${t.border}`,
                  background: t.surfaceRaised,
                  color: t.textPrimary,
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                Women's
              </button>
            </div>
          </div>
        )}

        {!isLoading && gender && (
          <form onSubmit={handleSave}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <button
                type="button"
                onClick={() => setGender(null)}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.textSecondary,
                  background: "transparent",
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                  padding: "6px 12px",
                }}
              >
                ← {gender === "male" ? "Men's" : "Women's"} Chart
              </button>

              <div style={{ display: "flex", gap: 6 }}>
                {["in", "cm"].map((u) => {
                  const active = unit === u;
                  return (
                    <button
                      type="button"
                      key={u}
                      onClick={() => handleUnitChange(u)}
                      style={{
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 6,
                        cursor: "pointer",
                        fontFamily: "'Roboto', sans-serif",
                        border: active ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                        background: active ? "rgba(185,129,40,0.12)" : "transparent",
                        color: active ? tokens.gold : t.textSecondary,
                      }}
                    >
                      {u === "in" ? "in" : "cm"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "18px 20px",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px 14px",
                }}
              >
                {fields.map((f) => (
                  <div key={f.id}>
                    <label style={labelStyle}>
                      {f.label} {f.id !== "shoe_size" && `(${unit})`}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={vals[f.id] ?? ""}
                      onChange={(e) => setField(f.id, e.target.value)}
                      onBlur={() => markTouched(f.id)}
                      placeholder="—"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              <p
                style={{
                  fontSize: 11.5,
                  color: t.textSecondary,
                  margin: "16px 0 0 0",
                  lineHeight: 1.4,
                }}
              >
                {filledCount} of {fields.length} fields entered. Nothing here is required to
                save — fill in what you know now and add the rest later from Settings.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: "100%",
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Roboto', sans-serif",
                color: "#0F0F0F",
                background: tokens.gold,
                border: "none",
                borderRadius: 8,
                cursor: isSaving ? "default" : "pointer",
                opacity: isSaving ? 0.7 : 1,
                marginBottom: 10,
              }}
            >
              {isSaving ? "Saving…" : "Save Measurements"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setSkipped(true);
              }}
              style={{
                width: "100%",
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "'Roboto', sans-serif",
                color: t.textSecondary,
                background: "transparent",
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Skip for Now
            </button>

            {saved && (
              <div
                style={{
                  marginTop: 16,
                  background: "rgba(99,153,34,0.1)",
                  border: "1px solid rgba(99,153,34,0.3)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  color: "#8FBF5A",
                  textAlign: "center",
                }}
              >
                Saved — you can update this anytime from Settings.
              </div>
            )}

            {skipped && (
              <div
                style={{
                  marginTop: 16,
                  background: t.surfaceRaised,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  color: t.textSecondary,
                  textAlign: "center",
                }}
              >
                No problem — nothing was saved. Add this anytime from Settings.
              </div>
            )}
          </form>
        )}
      </div>

      <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 18, opacity: 0.7, textAlign: "center" }}>
        PDF export of this chart is planned but not built in this screen yet.
      </p>
    </div>
  );
}
