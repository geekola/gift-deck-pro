import React, { useState } from "react";

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

const SEED_ADDRESSES = [
  {
    id: "addr_001",
    label: "Home",
    line1: "118 Ocean Ave, Apt 4B",
    line2: "",
    city: "Los Angeles",
    state: "CA",
    zip: "90291",
    country: "United States",
    isDefault: true,
    careOfContactId: null,
  },
  {
    id: "addr_002",
    label: "On location — Atlanta shoot",
    line1: "1100 Peachtree St NE, Suite 900",
    line2: "",
    city: "Atlanta",
    state: "GA",
    zip: "30309",
    country: "United States",
    isDefault: false,
    careOfContactId: "contact_001",
  },
];

const CONTACT_ROLES = ["Manager", "Agent", "Assistant", "Other"];

function newContactDraft() {
  return {
    role: "Manager",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    isAuthorizedPersonnel: false,
    isApprovedForBrandView: false,
  };
}

// New entity: CustomerContact. Flexible list, tagged by role — not fixed
// slots. isAuthorizedPersonnel and isApprovedForBrandView are independent
// flags, not implied by role.
const SEED_CONTACTS = [
  {
    id: "contact_001",
    role: "Manager",
    firstName: "Dana",
    lastName: "Whitfield",
    phone: "+1 (310) 555-0142",
    email: "dana@whitfieldmgmt.com",
    isAuthorizedPersonnel: true,
    isApprovedForBrandView: true,
  },
  {
    id: "contact_002",
    role: "Assistant",
    firstName: "Theo",
    lastName: "Park",
    phone: "+1 (213) 555-0188",
    email: "theo.park@gmail.com",
    isAuthorizedPersonnel: true,
    isApprovedForBrandView: false,
  },
];

function newAddressDraft() {
  return { label: "", line1: "", line2: "", city: "", state: "", zip: "", country: "United States" };
}

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

// Seeded as if the customer partially completed the measurement screen
// earlier in this build sequence — gives the editor something real to show.
const SEED_MEASUREMENTS = {
  gender: "female",
  unit: "in",
  vals: { bust: "34", waist: "26", hips: "37", inseam: "30" },
};

function convert(value, fromUnit, toUnit) {
  if (value === "" || value == null || isNaN(Number(value))) return value;
  const num = Number(value);
  if (fromUnit === toUnit) return value;
  const converted = fromUnit === "in" ? num * 2.54 : num / 2.54;
  return Math.round(converted * 10) / 10;
}

const SECTIONS = [
  { key: "appearance", label: "Appearance" },
  { key: "contacts", label: "Contacts" },
  { key: "addresses", label: "Shipping addresses" },
  { key: "measurements", label: "Measurements" },
];

export default function CustomerSettings() {
  const [theme, setTheme] = useState("dark");
  const [activeSection, setActiveSection] = useState("appearance");

  // Address book state
  const [addresses, setAddresses] = useState(SEED_ADDRESSES);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressDraft, setAddressDraft] = useState(newAddressDraft());

  // Contacts state
  const [contacts, setContacts] = useState(SEED_CONTACTS);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactDraft, setContactDraft] = useState(newContactDraft());

  // Measurements state
  const [gender, setGender] = useState(SEED_MEASUREMENTS.gender);
  const [unit, setUnit] = useState(SEED_MEASUREMENTS.unit);
  const [vals, setVals] = useState(SEED_MEASUREMENTS.vals);
  const [savedMeasurements, setSavedMeasurements] = useState(false);

  const t = tokens[theme];
  const fields = gender === "male" ? MALE_FIELDS : FEMALE_FIELDS;

  // ── Address handlers ──
  const openAddAddress = () => {
    setAddressDraft(newAddressDraft());
    setEditingAddressId("new");
  };
  const openEditAddress = (addr) => {
    setAddressDraft({ ...addr });
    setEditingAddressId(addr.id);
  };
  const saveAddressDraft = () => {
    if (!addressDraft.label.trim() || !addressDraft.line1.trim() || !addressDraft.city.trim()) return;
    if (editingAddressId === "new") {
      setAddresses((a) => [
        ...a,
        { id: `addr_${Date.now()}`, ...addressDraft, isDefault: a.length === 0 },
      ]);
    } else {
      setAddresses((a) =>
        a.map((addr) =>
          addr.id === editingAddressId
            ? { ...addressDraft, id: addr.id, isDefault: addr.isDefault }
            : addr
        )
      );
    }
    setEditingAddressId(null);
  };
  const deleteAddress = (id) => {
    setAddresses((a) => {
      const remaining = a.filter((addr) => addr.id !== id);
      if (a.find((addr) => addr.id === id)?.isDefault && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return remaining;
    });
  };
  const makeDefault = (id) => {
    setAddresses((a) => a.map((addr) => ({ ...addr, isDefault: addr.id === id })));
  };

  // ── Contact handlers ──
  const openAddContact = () => {
    setContactDraft(newContactDraft());
    setEditingContactId("new");
  };
  const openEditContact = (c) => {
    setContactDraft({ ...c });
    setEditingContactId(c.id);
  };
  const saveContactDraft = () => {
    if (!contactDraft.firstName.trim() || !contactDraft.lastName.trim()) return;
    if (editingContactId === "new") {
      setContacts((cs) => [...cs, { id: `contact_${Date.now()}`, ...contactDraft }]);
    } else {
      setContacts((cs) =>
        cs.map((c) => (c.id === editingContactId ? { ...contactDraft, id: c.id } : c))
      );
    }
    setEditingContactId(null);
  };
  const deleteContact = (id) => {
    setContacts((cs) => cs.filter((c) => c.id !== id));
    // Clear any address that had this contact as its C/O.
    setAddresses((a) =>
      a.map((addr) => (addr.careOfContactId === id ? { ...addr, careOfContactId: null } : addr))
    );
  };
  const setAddressCareOf = (addressId, contactId) => {
    setAddresses((a) =>
      a.map((addr) =>
        addr.id === addressId ? { ...addr, careOfContactId: contactId || null } : addr
      )
    );
  };

  // ── Measurement handlers ──
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
    setSavedMeasurements(false);
  };
  const handleGenderSwitch = (g) => {
    if (g === gender) return;
    setGender(g);
    setVals({});
    setSavedMeasurements(false);
  };
  const setField = (id, value) => {
    setVals((v) => ({ ...v, [id]: value }));
    setSavedMeasurements(false);
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
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "background 0.2s ease",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
      />

      <div style={{ width: "100%", maxWidth: 440 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>Gift Deck Pro</span>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            Settings
          </h1>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {SECTIONS.map((s) => {
            const active = activeSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  padding: "7px 14px",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                  border: active ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                  background: active ? "rgba(185,129,40,0.12)" : "transparent",
                  color: active ? tokens.gold : t.textSecondary,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* ── Appearance ── */}
        {activeSection === "appearance" && (
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "18px 20px",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 4px 0" }}>
              Theme
            </p>
            <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 14px 0", lineHeight: 1.5 }}>
              Dark is the default across Gift Deck Pro. This is the only place to change it.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {["dark", "light"].map((mode) => {
                const active = theme === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setTheme(mode)}
                    style={{
                      flex: 1,
                      padding: "11px 0",
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "'Roboto', sans-serif",
                      border: active ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                      background: active ? "rgba(185,129,40,0.12)" : "transparent",
                      color: active ? tokens.gold : t.textPrimary,
                      textTransform: "capitalize",
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Addresses ── */}
        {activeSection === "addresses" && (
          <div>
            <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 14px 0", lineHeight: 1.5 }}>
              Saved addresses you can choose from per brand when submitting a request — useful if
              you're shipping somewhere other than home.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {addresses.map((addr) => {
                const careOfContact = contacts.find((c) => c.id === addr.careOfContactId);
                return (
                  <div
                    key={addr.id}
                    style={{
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      borderRadius: 10,
                      padding: "12px 14px",
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
                        <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 2px 0" }}>
                          {addr.label}{" "}
                          {addr.isDefault && (
                            <span style={{ fontSize: 10.5, color: tokens.gold, fontWeight: 500 }}>
                              · Default
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0 }}>
                          {addr.line1}, {addr.city}, {addr.state} {addr.zip}
                        </p>
                      </div>
                      <button
                        onClick={() => openEditAddress(addr)}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 500,
                          color: tokens.gold,
                          background: "transparent",
                          border: `1px solid ${tokens.gold}`,
                          borderRadius: 6,
                          padding: "5px 10px",
                          cursor: "pointer",
                          fontFamily: "'Roboto', sans-serif",
                          flexShrink: 0,
                          marginLeft: 10,
                        }}
                      >
                        Edit
                      </button>
                    </div>

                    <div
                      style={{
                        borderTop: `1px solid ${t.border}`,
                        paddingTop: 10,
                      }}
                    >
                      <label style={{ ...labelStyle, marginBottom: 4 }}>
                        Care of (C/O) on shipping label
                      </label>
                      <select
                        value={addr.careOfContactId || ""}
                        onChange={(e) => setAddressCareOf(addr.id, e.target.value)}
                        style={{
                          ...inputStyle,
                          padding: "7px 10px",
                          fontSize: 12.5,
                        }}
                      >
                        <option value="">None — ship to customer's name only</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName} ({c.role})
                          </option>
                        ))}
                      </select>
                      {careOfContact && (
                        <p style={{ fontSize: 11, color: t.textSecondary, margin: "5px 0 0 0" }}>
                          Label will read: C/O {careOfContact.firstName} {careOfContact.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={openAddAddress}
              style={{
                width: "100%",
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 500,
                color: tokens.gold,
                background: "transparent",
                border: `1px solid ${tokens.gold}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              + Add new address
            </button>
          </div>
        )}

        {/* ── Contacts ── */}
        {activeSection === "contacts" && (
          <div>
            <p style={{ fontSize: 12, color: t.textSecondary, margin: "0 0 14px 0", lineHeight: 1.5 }}>
              People who can act on your behalf — receive deliveries, be named "care of" on a
              shipping label, or be viewable by a brand's manager for this purpose. Add as many
              as you need; roles are tags, not fixed slots.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {contacts.length === 0 && (
                <div
                  style={{
                    border: `1px dashed ${t.border}`,
                    borderRadius: 10,
                    padding: "20px 14px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: 12.5, color: t.textSecondary, margin: 0 }}>
                    No contacts added yet.
                  </p>
                </div>
              )}
              {contacts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
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
                      <p style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, margin: "0 0 2px 0" }}>
                        {c.firstName} {c.lastName}
                      </p>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 500,
                          color: tokens.gold,
                          background: "rgba(185,129,40,0.14)",
                          padding: "2px 8px",
                          borderRadius: 5,
                        }}
                      >
                        {c.role}
                      </span>
                    </div>
                    <button
                      onClick={() => openEditContact(c)}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: tokens.gold,
                        background: "transparent",
                        border: `1px solid ${tokens.gold}`,
                        borderRadius: 6,
                        padding: "5px 10px",
                        cursor: "pointer",
                        fontFamily: "'Roboto', sans-serif",
                        flexShrink: 0,
                        marginLeft: 10,
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "0 0 8px 0" }}>
                    {c.phone} · {c.email}
                  </p>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {c.isAuthorizedPersonnel && (
                      <span style={{ fontSize: 10.5, color: "#8FBF5A", background: "rgba(99,153,34,0.14)", padding: "2px 8px", borderRadius: 5 }}>
                        Authorized personnel
                      </span>
                    )}
                    {c.isApprovedForBrandView && (
                      <span style={{ fontSize: 10.5, color: t.textPrimary, background: t.surfaceRaised, border: `1px solid ${t.border}`, padding: "2px 8px", borderRadius: 5 }}>
                        Visible to brand managers
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={openAddContact}
              style={{
                width: "100%",
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 500,
                color: tokens.gold,
                background: "transparent",
                border: `1px solid ${tokens.gold}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              + Add contact
            </button>
          </div>
        )}

        {/* ── Measurements ── */}
        {activeSection === "measurements" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                {["male", "female"].map((g) => {
                  const active = gender === g;
                  return (
                    <button
                      key={g}
                      onClick={() => handleGenderSwitch(g)}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "6px 13px",
                        borderRadius: 7,
                        cursor: "pointer",
                        fontFamily: "'Roboto', sans-serif",
                        border: active ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                        background: active ? "rgba(185,129,40,0.12)" : "transparent",
                        color: active ? tokens.gold : t.textPrimary,
                      }}
                    >
                      {g === "male" ? "Men's" : "Women's"}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["in", "cm"].map((u) => {
                  const active = unit === u;
                  return (
                    <button
                      key={u}
                      onClick={() => handleUnitChange(u)}
                      style={{
                        padding: "6px 12px",
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
                      {u}
                    </button>
                  );
                })}
              </div>
            </div>

            {gender === "female" && (
              <p style={{ fontSize: 11, color: t.textSecondary, margin: "-8px 0 14px 0" }}>
                Switching charts clears unsaved values for the previous one.
              </p>
            )}

            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "16px 18px",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 14px" }}>
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
                      placeholder="—"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSavedMeasurements(true)}
              style={{
                width: "100%",
                padding: "12px 0",
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
              Save measurements
            </button>

            {savedMeasurements && (
              <div
                style={{
                  marginTop: 12,
                  background: "rgba(99,153,34,0.1)",
                  border: "1px solid rgba(99,153,34,0.3)",
                  borderRadius: 8,
                  padding: "9px 14px",
                  fontSize: 12.5,
                  color: "#8FBF5A",
                  textAlign: "center",
                }}
              >
                Saved
              </div>
            )}

            <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 14, lineHeight: 1.5 }}>
              PDF export of this chart is planned but not built yet.
            </p>
          </div>
        )}
      </div>

      {/* Address edit/add modal */}
      {editingAddressId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
          onClick={() => setEditingAddressId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 380,
              background: t.surface,
              border: `1px solid ${tokens.gold}`,
              borderRadius: 14,
              padding: "20px 22px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: "0 0 14px 0" }}>
              {editingAddressId === "new" ? "Add address" : "Edit address"}
            </p>

            {[
              { key: "label", placeholder: "Label — e.g. Home, On location" },
              { key: "line1", placeholder: "Street address" },
              { key: "line2", placeholder: "Apt, suite, etc. (optional)" },
              { key: "city", placeholder: "City" },
              { key: "state", placeholder: "State" },
              { key: "zip", placeholder: "ZIP" },
            ].map((f) => (
              <input
                key={f.key}
                type="text"
                value={addressDraft[f.key] || ""}
                onChange={(e) => setAddressDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "'Roboto', sans-serif",
                  color: t.textPrimary,
                  background: t.surfaceRaised,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  outline: "none",
                  marginBottom: 8,
                }}
              />
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                onClick={saveAddressDraft}
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
                Save
              </button>
              <button
                onClick={() => setEditingAddressId(null)}
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

            {editingAddressId !== "new" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${t.border}`,
                }}
              >
                <button
                  onClick={() => {
                    makeDefault(editingAddressId);
                    setEditingAddressId(null);
                  }}
                  style={{
                    fontSize: 11.5,
                    color: tokens.gold,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Roboto', sans-serif",
                  }}
                >
                  Make default
                </button>
                <button
                  onClick={() => {
                    deleteAddress(editingAddressId);
                    setEditingAddressId(null);
                  }}
                  style={{
                    fontSize: 11.5,
                    color: "#E27A7A",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Roboto', sans-serif",
                  }}
                >
                  Delete address
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact add/edit modal */}
      {editingContactId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
          onClick={() => setEditingContactId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 380,
              background: t.surface,
              border: `1px solid ${tokens.gold}`,
              borderRadius: 14,
              padding: "20px 22px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: "0 0 14px 0" }}>
              {editingContactId === "new" ? "Add contact" : "Edit contact"}
            </p>

            <label style={{ ...labelStyle, marginBottom: 5 }}>Role</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {CONTACT_ROLES.map((role) => {
                const selected = contactDraft.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setContactDraft((d) => ({ ...d, role }))}
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "6px 12px",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: "'Roboto', sans-serif",
                      border: selected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                      background: selected ? "rgba(185,129,40,0.12)" : "transparent",
                      color: selected ? tokens.gold : t.textPrimary,
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={contactDraft.firstName}
                onChange={(e) => setContactDraft((d) => ({ ...d, firstName: e.target.value }))}
                placeholder="First name"
                style={{
                  flex: 1,
                  boxSizing: "border-box",
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "'Roboto', sans-serif",
                  color: t.textPrimary,
                  background: t.surfaceRaised,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  outline: "none",
                  marginBottom: 8,
                }}
              />
              <input
                type="text"
                value={contactDraft.lastName}
                onChange={(e) => setContactDraft((d) => ({ ...d, lastName: e.target.value }))}
                placeholder="Last name"
                style={{
                  flex: 1,
                  boxSizing: "border-box",
                  padding: "9px 12px",
                  fontSize: 13,
                  fontFamily: "'Roboto', sans-serif",
                  color: t.textPrimary,
                  background: t.surfaceRaised,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  outline: "none",
                  marginBottom: 8,
                }}
              />
            </div>

            <input
              type="tel"
              value={contactDraft.phone}
              onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="Phone number"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px",
                fontSize: 13,
                fontFamily: "'Roboto', sans-serif",
                color: t.textPrimary,
                background: t.surfaceRaised,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                outline: "none",
                marginBottom: 8,
              }}
            />
            <input
              type="email"
              value={contactDraft.email}
              onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="Email"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px",
                fontSize: 13,
                fontFamily: "'Roboto', sans-serif",
                color: t.textPrimary,
                background: t.surfaceRaised,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                outline: "none",
                marginBottom: 12,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderTop: `1px solid ${t.border}`,
              }}
            >
              <span style={{ fontSize: 12.5, color: t.textPrimary }}>Authorized personnel</span>
              <button
                type="button"
                onClick={() =>
                  setContactDraft((d) => ({ ...d, isAuthorizedPersonnel: !d.isAuthorizedPersonnel }))
                }
                style={{
                  width: 38,
                  height: 21,
                  borderRadius: 11,
                  border: "none",
                  cursor: "pointer",
                  background: contactDraft.isAuthorizedPersonnel ? tokens.gold : t.border,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: contactDraft.isAuthorizedPersonnel ? 20 : 3,
                    transition: "left 0.15s ease",
                  }}
                />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderTop: `1px solid ${t.border}`,
                marginBottom: 14,
              }}
            >
              <div>
                <span style={{ fontSize: 12.5, color: t.textPrimary, display: "block" }}>
                  Visible to brand managers
                </span>
                <span style={{ fontSize: 10.5, color: t.textSecondary }}>
                  Shown as an "Approved Contact" in the brand's customer access view
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setContactDraft((d) => ({ ...d, isApprovedForBrandView: !d.isApprovedForBrandView }))
                }
                style={{
                  width: 38,
                  height: 21,
                  borderRadius: 11,
                  border: "none",
                  cursor: "pointer",
                  background: contactDraft.isApprovedForBrandView ? tokens.gold : t.border,
                  position: "relative",
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                <div
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: contactDraft.isApprovedForBrandView ? 20 : 3,
                    transition: "left 0.15s ease",
                  }}
                />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveContactDraft}
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
                Save
              </button>
              <button
                onClick={() => setEditingContactId(null)}
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

            {editingContactId !== "new" && (
              <button
                onClick={() => {
                  deleteContact(editingContactId);
                  setEditingContactId(null);
                }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  fontSize: 11.5,
                  color: "#E27A7A",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                  padding: "6px 0",
                }}
              >
                Delete contact
              </button>
            )}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 18, opacity: 0.7, textAlign: "center" }}>
        Prototype preview — mock data only, no live backend connection.
      </p>
    </div>
  );
}
