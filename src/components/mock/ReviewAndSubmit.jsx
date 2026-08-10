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

// Mock items carried over from "Move to Review & Submit" — same pool as the
// Saved gallery, here representing the items the customer selected and is
// now moving into the `selected` state (an active shipment request, not a
// purchase cart). Two brands deliberately included so the brand-split
// behavior at submission is visible, not just claimed.
const SEED_REVIEW_ITEMS = [
  {
    id: "p_001",
    name: "Peak Lapel Tuxedo",
    brandName: "Atelier Noir",
    itemType: "gift",
    costPrice: 4800,
    price: null,
    currency: "USD",
    isMadeToOrder: false,
    deliveryWindow: null,
    variants: [
      { size: "40R", stockQuantity: 6 },
      { size: "42R", stockQuantity: 2 },
    ],
  },
  {
    id: "p_006",
    name: "One-of-One Embroidered Jacket",
    brandName: "Atelier Noir",
    itemType: "gift",
    costPrice: 1200,
    price: null,
    currency: "USD",
    isMadeToOrder: true,
    deliveryWindow: "3–4 weeks",
    variants: [{ size: "One size, tailored to fit", stockQuantity: null }],
  },
  {
    id: "p_002",
    name: "Wool Travel Blazer",
    brandName: "Halden & Vance",
    itemType: "purchase",
    costPrice: 310,
    price: 890,
    currency: "USD",
    isMadeToOrder: false,
    deliveryWindow: null,
    variants: [
      { size: "S", stockQuantity: 14 },
      { size: "M", stockQuantity: 9 },
    ],
  },
];

// Mock gifting allowance state — per brand. Atelier Noir is deliberately
// seeded close to its limit so the allowance-check-at-submission behavior
// (Section 4.1) has a real failure case to demonstrate, not just a pass.
const MOCK_ALLOWANCES = {
  "Atelier Noir": { limit: 5000, consumed: 4600, currency: "USD", resetDate: "2026-09-30" },
  "Halden & Vance": { limit: 2000, consumed: 300, currency: "USD", resetDate: "2026-09-30" },
};

// New entity: ShippingAddress. Multiple per customer, full CRUD, one marked
// default. Confirmed per brand group at submission — VIP talent in
// particular travel for work and may need delivery at an on-site location
// rather than always their home address.
const SEED_ADDRESSES = [
  {
    id: "addr_001",
    label: "Home",
    line1: "118 Ocean Ave, Apt 4B",
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
    city: "Atlanta",
    state: "GA",
    zip: "30309",
    country: "United States",
    isDefault: false,
    careOfContactId: "contact_001",
  },
];

// Mock contact roster — same shape/source as Settings → Contacts. Shown
// here read-only, resolved per the chosen address's careOfContactId.
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

function formatPrice(amount, currency) {
  if (amount == null) return null;
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toLocaleString()}`;
}

function groupByBrand(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.brandName]) groups[item.brandName] = [];
    groups[item.brandName].push(item);
  }
  return groups;
}

export default function ReviewAndSubmit() {
  const [theme, setTheme] = useState("dark");
  const [items, setItems] = useState(SEED_REVIEW_ITEMS);
  const [sizeChoices, setSizeChoices] = useState({});
  const [addresses, setAddresses] = useState(SEED_ADDRESSES);
  const [contacts] = useState(SEED_CONTACTS); // read-only here; managed in Settings
  const [addressChoices, setAddressChoices] = useState({}); // brand -> addressId
  const [pickerOpenForBrand, setPickerOpenForBrand] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null); // null = not editing; "new" = adding
  const [addressDraft, setAddressDraft] = useState(newAddressDraft());
  const [stage, setStage] = useState("review");
  const [submissionResults, setSubmissionResults] = useState(null);

  const t = tokens[theme];
  const grouped = groupByBrand(items);
  const brandNames = Object.keys(grouped);

  const removeItem = (id) => {
    setItems((it) => it.filter((i) => i.id !== id));
  };

  const setSize = (id, size) => {
    setSizeChoices((s) => ({ ...s, [id]: size }));
  };

  const allSizesChosen = items.every((i) => sizeChoices[i.id]);

  const getAddressForBrand = (brand) => {
    const chosenId = addressChoices[brand];
    if (chosenId) return addresses.find((a) => a.id === chosenId) || null;
    return addresses.find((a) => a.isDefault) || addresses[0] || null;
  };

  const allAddressesConfirmed = brandNames.every((b) => getAddressForBrand(b));

  const selectAddressForBrand = (brand, addressId) => {
    setAddressChoices((c) => ({ ...c, [brand]: addressId }));
    setPickerOpenForBrand(null);
  };

  const openAddAddress = () => {
    setAddressDraft(newAddressDraft());
    setEditingAddressId("new");
  };

  const openEditAddress = (addr) => {
    setAddressDraft({ ...addr });
    setEditingAddressId(addr.id);
  };

  const saveAddressDraft = () => {
    if (!addressDraft.label.trim() || !addressDraft.line1.trim() || !addressDraft.city.trim()) {
      return; // minimal guard; full validation matches the Brand return-address pattern
    }
    if (editingAddressId === "new") {
      const newAddr = {
        id: `addr_${Date.now()}`,
        ...addressDraft,
        isDefault: addresses.length === 0,
      };
      setAddresses((a) => [...a, newAddr]);
    } else {
      setAddresses((a) =>
        a.map((addr) => (addr.id === editingAddressId ? { ...addressDraft, id: addr.id, isDefault: addr.isDefault } : addr))
      );
    }
    setEditingAddressId(null);
  };

  const deleteAddress = (id) => {
    setAddresses((a) => {
      const remaining = a.filter((addr) => addr.id !== id);
      // If the deleted address was default, promote the first remaining one.
      if (a.find((addr) => addr.id === id)?.isDefault && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return remaining;
    });
    setAddressChoices((c) => {
      const next = { ...c };
      for (const brand of Object.keys(next)) {
        if (next[brand] === id) delete next[brand];
      }
      return next;
    });
  };

  const makeDefault = (id) => {
    setAddresses((a) => a.map((addr) => ({ ...addr, isDefault: addr.id === id })));
  };

  const brandSubtotal = (brand) =>
    grouped[brand].reduce((sum, i) => sum + i.costPrice, 0);

  const handleSubmit = () => {
    const results = brandNames.map((brand) => {
      const allowance = MOCK_ALLOWANCES[brand];
      const subtotal = brandSubtotal(brand);
      const wouldConsume = allowance.consumed + subtotal;
      const passes = wouldConsume <= allowance.limit;
      return {
        brand,
        items: grouped[brand],
        subtotal,
        allowance,
        passes,
        address: getAddressForBrand(brand),
      };
    });
    setSubmissionResults(results);
    setStage("submitted_results");
  };

  const labelStyle = {
    fontSize: 11.5,
    fontWeight: 500,
    color: t.textSecondary,
  };

  if (stage === "submitted_results" && submissionResults) {
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
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 14 }}
          />
          <h1 style={{ fontSize: 19, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            Submission results
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: "0 0 20px 0", lineHeight: 1.6 }}>
            Each brand's request is evaluated on its own — one brand passing or failing has no
            effect on another.
          </p>

          {submissionResults.map((r) => (
            <div
              key={r.brand}
              style={{
                background: t.surface,
                border: `1px solid ${r.passes ? "rgba(99,153,34,0.4)" : "rgba(194,71,71,0.4)"}`,
                borderRadius: 12,
                padding: "16px 18px",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                  {r.brand}
                </p>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: r.passes ? "#8FBF5A" : "#E27A7A",
                    background: r.passes ? "rgba(99,153,34,0.14)" : "rgba(194,71,71,0.14)",
                    padding: "3px 9px",
                    borderRadius: 6,
                  }}
                >
                  {r.passes ? "Submitted → Invoiced" : "Couldn't go through"}
                </span>
              </div>

              {r.items.map((i) => (
                <p key={i.id} style={{ fontSize: 12.5, color: t.textSecondary, margin: "2px 0" }}>
                  {i.name} · {sizeChoices[i.id]}
                </p>
              ))}

              {r.passes && r.address && (
                <>
                  <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "8px 0 0 0" }}>
                    Shipping to {r.address.label} ({r.address.city}, {r.address.state}) — the
                    full address is shared with {r.brand} once dispatched.
                  </p>
                  {(() => {
                    const careOf = contacts.find((c) => c.id === r.address.careOfContactId);
                    return careOf ? (
                      <p style={{ fontSize: 11.5, color: tokens.gold, margin: "4px 0 0 0" }}>
                        C/O {careOf.firstName} {careOf.lastName} ({careOf.role})
                      </p>
                    ) : null;
                  })()}
                </>
              )}

              {r.passes ? (
                <p style={{ fontSize: 12, color: t.textSecondary, margin: "10px 0 0 0", lineHeight: 1.5 }}>
                  An invoice has been generated and sent to {r.brand}'s fulfilment team. You'll see
                  this move to "In Progress" once they confirm.
                </p>
              ) : (
                <p style={{ fontSize: 12, color: t.textSecondary, margin: "10px 0 0 0", lineHeight: 1.5 }}>
                  This brand's gifting allowance resets {r.allowance.resetDate}. These items have
                  been returned to your saved gallery — nothing was lost.
                </p>
              )}
            </div>
          ))}

          <button
            onClick={() => {
              setStage("review");
              setItems(SEED_REVIEW_ITEMS);
              setSizeChoices({});
            }}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "11px 0",
              fontSize: 13,
              fontWeight: 500,
              color: t.textSecondary,
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "'Raleway', sans-serif",
            }}
          >
            Back to start (preview reset)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Raleway', sans-serif",
        background: t.bgBase,
        minHeight: 640,
        padding: "24px 16px 110px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        transition: "background 0.2s ease",
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>Gift Deck Pro</span>
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
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{ width: 28, height: 3, background: tokens.gold, borderRadius: 2, marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, margin: "0 0 6px 0" }}>
            Review & Submit
          </h1>
          <p style={{ fontSize: 13, color: t.textSecondary, margin: 0, lineHeight: 1.5 }}>
            Confirm a size for each piece. Multiple brands submit as separate requests — one
            doesn't affect another.
          </p>
        </div>

        {items.length === 0 && (
          <div
            style={{
              border: `1px dashed ${t.border}`,
              borderRadius: 14,
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
              Nothing left to review. Removed items return to your saved gallery.
            </p>
          </div>
        )}

        {brandNames.map((brand) => (
          <div key={brand} style={{ marginBottom: 22 }}>
            <p
              style={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary, margin: "0 0 10px 0" }}
            >
              {brand}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grouped[brand].map((item) => {
                const priceLabel =
                  item.itemType === "purchase" ? formatPrice(item.price, item.currency) : null;
                const chosenSize = sizeChoices[item.id];

                return (
                  <div
                    key={item.id}
                    style={{
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      borderRadius: 12,
                      padding: "14px 16px",
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
                      <div style={{ display: "flex", gap: 10 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            background: t.surfaceRaised,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            color: t.textSecondary,
                          }}
                        >
                          IMG
                        </div>
                        <div>
                          <p style={{ fontSize: 13.5, fontWeight: 500, color: t.textPrimary, margin: "0 0 2px 0" }}>
                            {item.name}
                          </p>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 500,
                              color: item.itemType === "gift" ? tokens.gold : t.textSecondary,
                            }}
                          >
                            {item.itemType === "gift" ? "🎁 Gift" : "🛍 Purchase"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {priceLabel && (
                          <span style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>
                            {priceLabel}
                          </span>
                        )}
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            fontSize: 14,
                            color: t.textSecondary,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 4px",
                          }}
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <p style={labelStyle}>Size</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                      {item.variants.map((v) => {
                        const disabled = !item.isMadeToOrder && v.stockQuantity === 0;
                        const selected = chosenSize === v.size;
                        return (
                          <button
                            key={v.size}
                            disabled={disabled}
                            onClick={() => setSize(item.id, v.size)}
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              padding: "6px 12px",
                              borderRadius: 7,
                              cursor: disabled ? "not-allowed" : "pointer",
                              fontFamily: "'Raleway', sans-serif",
                              border: selected ? `1px solid ${tokens.gold}` : `1px solid ${t.border}`,
                              background: selected ? "rgba(185,129,40,0.14)" : "transparent",
                              color: disabled ? t.textSecondary : selected ? tokens.gold : t.textPrimary,
                              opacity: disabled ? 0.4 : 1,
                            }}
                          >
                            {v.size}
                          </button>
                        );
                      })}
                    </div>

                    {item.isMadeToOrder && item.itemType === "purchase" && (
                      <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "10px 0 0 0" }}>
                        Delivery: {item.deliveryWindow} — shown now since this is a purchase item.
                      </p>
                    )}
                    {item.isMadeToOrder && item.itemType === "gift" && (
                      <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "10px 0 0 0" }}>
                        Made to order. Delivery timing is shared once {brand} confirms.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Shipping address confirmation — required per brand group, even
                with only one address on file. VIP talent in particular may
                need delivery at a work location rather than always home. */}
            {(() => {
              const chosenAddress = getAddressForBrand(brand);
              return (
                <div
                  style={{
                    marginTop: 10,
                    background: t.surfaceRaised,
                    border: `1px solid ${t.border}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <p style={labelStyle}>Shipping address</p>
                  {chosenAddress ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginTop: 5,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 12.5, fontWeight: 500, color: t.textPrimary, margin: "0 0 2px 0" }}>
                          {chosenAddress.label}
                        </p>
                        <p style={{ fontSize: 11.5, color: t.textSecondary, margin: 0 }}>
                          {chosenAddress.line1}, {chosenAddress.city}, {chosenAddress.state}{" "}
                          {chosenAddress.zip}
                        </p>
                        {(() => {
                          const careOf = contacts.find(
                            (c) => c.id === chosenAddress.careOfContactId
                          );
                          return careOf ? (
                            <p style={{ fontSize: 11, color: tokens.gold, margin: "4px 0 0 0" }}>
                              C/O {careOf.firstName} {careOf.lastName} ({careOf.role})
                            </p>
                          ) : null;
                        })()}
                      </div>
                      <button
                        onClick={() => setPickerOpenForBrand(brand)}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 500,
                          color: tokens.gold,
                          background: "transparent",
                          border: `1px solid ${tokens.gold}`,
                          borderRadius: 6,
                          padding: "5px 10px",
                          cursor: "pointer",
                          fontFamily: "'Raleway', sans-serif",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          marginLeft: 10,
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPickerOpenForBrand(brand)}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: tokens.gold,
                        background: "transparent",
                        border: `1px solid ${tokens.gold}`,
                        borderRadius: 7,
                        padding: "7px 12px",
                        cursor: "pointer",
                        fontFamily: "'Raleway', sans-serif",
                        marginTop: 6,
                      }}
                    >
                      Select an address
                    </button>
                  )}

                  {pickerOpenForBrand === brand && (
                    <div
                      style={{
                        marginTop: 10,
                        borderTop: `1px solid ${t.border}`,
                        paddingTop: 10,
                      }}
                    >
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 0",
                          }}
                        >
                          <div
                            onClick={() => selectAddressForBrand(brand, addr.id)}
                            style={{ cursor: "pointer", flex: 1 }}
                          >
                            <p
                              style={{
                                fontSize: 12.5,
                                fontWeight: 500,
                                color:
                                  chosenAddress?.id === addr.id ? tokens.gold : t.textPrimary,
                                margin: "0 0 2px 0",
                              }}
                            >
                              {addr.label} {addr.isDefault && "· Default"}
                            </p>
                            <p style={{ fontSize: 11, color: t.textSecondary, margin: 0 }}>
                              {addr.city}, {addr.state}
                            </p>
                          </div>
                          <button
                            onClick={() => openEditAddress(addr)}
                            style={{
                              fontSize: 11,
                              color: t.textSecondary,
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: "'Raleway', sans-serif",
                              padding: "4px 6px",
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={openAddAddress}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: tokens.gold,
                          background: "transparent",
                          border: `1px solid ${tokens.gold}`,
                          borderRadius: 7,
                          padding: "7px 12px",
                          cursor: "pointer",
                          fontFamily: "'Raleway', sans-serif",
                          marginTop: 6,
                          width: "100%",
                        }}
                      >
                        + Add new address
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {grouped[brand].some((i) => i.itemType === "gift") && (
              <p style={{ fontSize: 11, color: t.textSecondary, margin: "10px 0 0 0" }}>
                Gifted pieces from {brand} draw from your allowance with them — you won't see the
                number, only a note if it's ever fully used.
              </p>
            )}
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            padding: "16px",
            background: `linear-gradient(to top, ${t.bgBase} 65%, transparent)`,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: t.surface,
              border: `1px solid ${tokens.gold}`,
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: t.textSecondary }}>
              {!allSizesChosen
                ? "Pick a size for each piece"
                : !allAddressesConfirmed
                ? "Confirm a shipping address for each brand"
                : `${brandNames.length} request${brandNames.length === 1 ? "" : "s"} ready`}
            </span>
            <button
              disabled={!allSizesChosen || !allAddressesConfirmed}
              onClick={handleSubmit}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: allSizesChosen && allAddressesConfirmed ? "#0F0F0F" : t.textSecondary,
                background: allSizesChosen && allAddressesConfirmed ? tokens.gold : t.surfaceRaised,
                border: allSizesChosen && allAddressesConfirmed ? "none" : `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "9px 18px",
                cursor: allSizesChosen && allAddressesConfirmed ? "pointer" : "not-allowed",
                fontFamily: "'Raleway', sans-serif",
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Add/edit address panel */}
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
                  fontFamily: "'Raleway', sans-serif",
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
                  fontFamily: "'Raleway', sans-serif",
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
                  fontFamily: "'Raleway', sans-serif",
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
                    fontFamily: "'Raleway', sans-serif",
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
                    fontFamily: "'Raleway', sans-serif",
                  }}
                >
                  Delete address
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 14, opacity: 0.7, textAlign: "center" }}>
        Prototype preview — mock data only. If left here unsubmitted, this request would expire
        back to Saved after 7 days, with a reminder on day 5 — no allowance impact either way.
      </p>
    </div>
  );
}
