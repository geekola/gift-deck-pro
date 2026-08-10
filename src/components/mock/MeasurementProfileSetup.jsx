"use client";

import React, { useState } from "react";

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

// Full tailor's measurement field sets, by gender. Field ids are stable keys
// (MeasurementProfile.vals is keyed by these), labels are display-only.
const MALE_FIELDS = [
  { id: "neck", label: "Neck" },
  { id: "chest", label: "Chest" },
  { id: "waist", label: "Waist" },
  { id: "hips", label: "Hips" },
  { id: "shoulder_width", label: "Shoulder width" },
  { id: "sleeve_length", label: "Sleeve length" },
  { id: "jacket_length", label: "Jacket length" },
  { id: "inseam", label: "Inseam" },
  { id: "outseam", label: "Outseam" },
  { id: "thigh", label: "Thigh" },
  { id: "shoe_size", label: "Shoe size" },
];

const FEMALE_FIELDS = [
  { id: "bust", label: "Bust" },
  { id: "underbust", label: "Underbust" },
  { id: "waist", label: "Waist" },
  { id: "hips", label: "Hips" },
  { id: "shoulder_width", label: "Shoulder width" },
  { id: "sleeve_length", label: "Sleeve length" },
  { id: "dress_length", label: "Dress / garment length" },
  { id: "inseam", label: "Inseam" },
  { id: "high_hip", label: "High hip" },
  { id: "shoe_size", label: "Shoe size" },
];

function convert(value, fromUnit, toUnit) {
  if (value === "" || value == null || isNaN(Number(value))) return value;
  const num = Number(value);
  if (fromUnit === toUnit) return value;
  const converted = fromUnit === "in" ? num * 2.54 : num / 2.54;
  return Math.round(converted * 10) / 10;
}

export default function MeasurementProfileSetup() {
  const [theme, setTheme] = useState("dark");
  const [gender, setGender] = useState(null); // male | female
  const [unit, setUnit] = useState("in"); // cm | in
  const [vals, setVals] = useState({});
  const [touched, setTouched] = useState({});
  const [saved, setSaved] = useState(false);

  const t = tokens[theme];
  const fields = gender === "male" ? MALE_FIELDS : gender === "female" ? FEMALE_FIELDS : [];

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
  };

  const markTouched = (id) => setTouched((tt) => ({ ...tt, [id]: true }));

  const filledCount = fields.filter((f) => vals[f.id] !== undefined && vals[f.id] !== "").length;

  const handleSave = (e) => {
    e.preventDefault();
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f.id]: true }), {}));
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
    fontFamily: "'Raleway', sans-serif",
    color: t.textPrimary,
    background: t.inputBg,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    outline: "none",
  };

  return (
    <div
      style={{
        fontFamily: "'Raleway', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        padding: "28px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "background 0.2s ease",
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Gift Deck Pro</span>
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
            fontFamily: "'Raleway', sans-serif",
          }}
        >
          {theme === "dark" ? "Preview: light" : "Preview: dark"}
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            Your measurements
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            One quick profile so anything you're sent fits. You can update this anytime from
            Settings.
          </p>
        </div>

        {!gender && (
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "22px",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 14px 0" }}>
              Which measurement chart fits you best?
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
                  fontFamily: "'Raleway', sans-serif",
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
                  fontFamily: "'Raleway', sans-serif",
                }}
              >
                Women's
              </button>
            </div>
          </div>
        )}

        {gender && (
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
                  fontFamily: "'Raleway', sans-serif",
                  padding: "6px 12px",
                }}
              >
                ← {gender === "male" ? "Men's" : "Women's"} chart
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
                        fontFamily: "'Raleway', sans-serif",
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
                continue — fill in what you know now and add the rest later from Settings.
              </p>
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Raleway', sans-serif",
                color: "#0F0F0F",
                background: tokens.gold,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                marginBottom: 10,
              }}
            >
              Save and continue
            </button>

            <button
              type="button"
              onClick={() => setSaved(true)}
              style={{
                width: "100%",
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "'Raleway', sans-serif",
                color: t.textSecondary,
                background: "transparent",
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Skip for now
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
                Saved — next stop is the deck.
              </div>
            )}
          </form>
        )}
      </div>

      <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 18, opacity: 0.7, textAlign: "center" }}>
        Prototype preview — mock data only, no live backend connection. PDF export of this chart
        is planned but not built in this screen yet.
      </p>
    </div>
  );
}
