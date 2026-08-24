"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

// Maps a saved_items row (joined with its product, the product's brand,
// and the product's variants) onto the shape the render logic below
// expects. Unlike SavedGallery, this screen needs product_variants (for
// the per-item size picker) and brand id (not just name - needed for the
// submit_requisition RPC call).
function mapReviewItem(row) {
  const p = row.products;
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    brandId: p.brands?.id ?? null,
    brandName: p.brands?.brand_name ?? "",
    itemType: p.item_type,
    costPrice: p.cost_price,
    price: p.price,
    currency: p.currency,
    isMadeToOrder: p.is_made_to_order,
    deliveryWindow: p.delivery_window,
    variants: (p.product_variants || []).map((v) => ({
      id: v.id,
      size: v.size,
      stockQuantity: v.stock_quantity,
    })),
  };
}

function mapAddress(row) {
  return {
    id: row.id,
    label: row.label,
    line1: row.line1,
    line2: row.line2 || "",
    city: row.city,
    state: row.state,
    zip: row.zip,
    country: row.country,
    isDefault: row.is_default,
    careOfContactId: row.care_of_contact_id,
  };
}

function mapContact(row) {
  return {
    id: row.id,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone || "",
    email: row.email || "",
    isAuthorizedPersonnel: row.is_authorized_personnel,
    isApprovedForBrandView: row.is_approved_for_brand_view,
  };
}

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
  const supabase = createClient();

  const [customerId, setCustomerId] = useState(null);
  const [items, setItems] = useState([]);
  const [sizeChoices, setSizeChoices] = useState({}); // itemId -> product_variant_id
  const [addresses, setAddresses] = useState([]);
  const [contacts, setContacts] = useState([]); // read-only here; managed in Settings
  const [addressChoices, setAddressChoices] = useState({}); // brand -> addressId
  const [pickerOpenForBrand, setPickerOpenForBrand] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null); // null = not editing; "new" = adding
  const [addressDraft, setAddressDraft] = useState(newAddressDraft());
  const [stage, setStage] = useState("review");
  const [submissionResults, setSubmissionResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReviewItems = async (uid, onlyIds) => {
    const { data, error } = await supabase
      .from("saved_items")
      .select("id, products(*, brands(id, brand_name), product_variants(*))")
      .eq("customer_id", uid)
      .order("liked_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
      return;
    }
    let mapped = (data || []).map(mapReviewItem).filter(Boolean);
    if (onlyIds) mapped = mapped.filter((item) => onlyIds.has(item.id));
    setItems(mapped);
  };

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

      const [addressResult, contactResult] = await Promise.all([
        supabase.from("shipping_addresses").select("*").eq("customer_id", user.id).order("created_at"),
        supabase.from("customer_contacts").select("*").eq("customer_id", user.id).order("created_at"),
      ]);

      if (addressResult.error || contactResult.error) {
        setLoadError((addressResult.error || contactResult.error).message);
        setIsLoading(false);
        return;
      }

      setAddresses((addressResult.data || []).map(mapAddress));
      setContacts((contactResult.data || []).map(mapContact));

      // SavedGallery.jsx's "Move to Review & Submit" passes the items the
      // customer actually checked as ?items=id1,id2 - read directly off
      // window.location (rather than next/navigation's useSearchParams)
      // so this doesn't need a Suspense boundary, matching SwipeDeck's
      // established pattern for the same tradeoff. No/empty param (e.g.
      // a direct visit to this URL) falls back to reviewing everything
      // saved, same as before this existed.
      const itemsParam = new URLSearchParams(window.location.search).get("items");
      const onlyIds = itemsParam ? new Set(itemsParam.split(",").filter(Boolean)) : null;

      await loadReviewItems(user.id, onlyIds);
      setIsLoading(false);
    })();
  }, []);

  // Dark only, matching CustomerNav.jsx's top bar - see
  // ProductCatalogue.jsx (brand side) for why the per-page theme toggle
  // was removed.
  const t = tokens.dark;
  const grouped = groupByBrand(items);
  const brandNames = Object.keys(grouped);

  const removeItem = (id) => {
    setItems((it) => it.filter((i) => i.id !== id));
    // Doesn't touch saved_items - removing from this screen just means
    // "not part of this submission", the item stays saved for later.
  };

  const setSize = (id, variantId) => {
    setSizeChoices((s) => ({ ...s, [id]: variantId }));
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

  const saveAddressDraft = async () => {
    if (!addressDraft.label.trim() || !addressDraft.line1.trim() || !addressDraft.city.trim()) {
      return; // minimal guard; full validation matches the Brand return-address pattern
    }
    setActionError("");

    const payload = {
      label: addressDraft.label,
      line1: addressDraft.line1,
      line2: addressDraft.line2 || null,
      city: addressDraft.city,
      state: addressDraft.state,
      zip: addressDraft.zip,
      country: addressDraft.country,
      care_of_contact_id: addressDraft.careOfContactId || null,
    };

    if (editingAddressId === "new") {
      const { data, error } = await supabase
        .from("shipping_addresses")
        .insert({ ...payload, customer_id: customerId, is_default: addresses.length === 0 })
        .select()
        .single();
      if (error) {
        setActionError(error.message);
        return;
      }
      setAddresses((a) => [...a, mapAddress(data)]);
    } else {
      const { error } = await supabase
        .from("shipping_addresses")
        .update(payload)
        .eq("id", editingAddressId);
      if (error) {
        setActionError(error.message);
        return;
      }
      setAddresses((a) =>
        a.map((addr) => (addr.id === editingAddressId ? { ...addr, ...addressDraft } : addr))
      );
    }
    setEditingAddressId(null);
  };

  const deleteAddress = async (id) => {
    setActionError("");
    const wasDefault = addresses.find((addr) => addr.id === id)?.isDefault;
    const { error } = await supabase.from("shipping_addresses").delete().eq("id", id);
    if (error) {
      setActionError(error.message);
      return;
    }
    const remaining = addresses.filter((addr) => addr.id !== id);
    setAddressChoices((c) => {
      const next = { ...c };
      for (const brand of Object.keys(next)) {
        if (next[brand] === id) delete next[brand];
      }
      return next;
    });
    if (wasDefault && remaining.length > 0) {
      await makeDefault(remaining[0].id);
      return;
    }
    setAddresses(remaining);
  };

  const makeDefault = async (id) => {
    setActionError("");
    const { error: clearError } = await supabase
      .from("shipping_addresses")
      .update({ is_default: false })
      .eq("customer_id", customerId);
    if (clearError) {
      setActionError(clearError.message);
      return;
    }
    const { error } = await supabase.from("shipping_addresses").update({ is_default: true }).eq("id", id);
    if (error) {
      setActionError(error.message);
      return;
    }
    setAddresses((a) => a.map((addr) => ({ ...addr, isDefault: addr.id === id })));
  };

  const handleSubmit = async () => {
    setActionError("");
    setIsSubmitting(true);

    const results = [];
    for (const brand of brandNames) {
      const brandItems = grouped[brand];
      const address = getAddressForBrand(brand);
      const payload = brandItems.map((i) => ({
        product_id: i.id,
        product_variant_id: sizeChoices[i.id],
      }));

      const { data, error } = await supabase.rpc("submit_requisition", {
        p_brand_id: brandItems[0].brandId,
        p_items: payload,
        p_shipping_address_id: address.id,
        p_care_of_contact_id: address.careOfContactId || null,
      });

      if (error) {
        results.push({ brand, items: brandItems, passed: false, error: error.message });
      } else {
        results.push({ brand, items: brandItems, address, ...data });
      }
    }

    setSubmissionResults(results);
    setStage("submitted_results");
    setIsSubmitting(false);
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
          fontFamily: "'Roboto', sans-serif",
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
            Submission Results
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
                border: `1px solid ${r.passed ? "rgba(99,153,34,0.4)" : "rgba(194,71,71,0.4)"}`,
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
                    color: r.passed ? "#8FBF5A" : "#E27A7A",
                    background: r.passed ? "rgba(99,153,34,0.14)" : "rgba(194,71,71,0.14)",
                    padding: "3px 9px",
                    borderRadius: 6,
                  }}
                >
                  {r.passed ? "Submitted → Invoiced" : "Couldn't Go Through"}
                </span>
              </div>

              {r.passed && (
                <p style={{ fontSize: 11.5, color: t.textSecondary, margin: "0 0 6px 0" }}>
                  Invoice {r.invoice_id}
                </p>
              )}

              {r.items.map((i) => {
                const sizeLabel = i.variants.find((v) => v.id === sizeChoices[i.id])?.size;
                return (
                  <p key={i.id} style={{ fontSize: 12.5, color: t.textSecondary, margin: "2px 0" }}>
                    {i.name} · {sizeLabel}
                  </p>
                );
              })}

              {r.passed && r.address && (
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

              {r.passed ? (
                <p style={{ fontSize: 12, color: t.textSecondary, margin: "10px 0 0 0", lineHeight: 1.5 }}>
                  An invoice has been generated and sent to {r.brand}'s fulfilment team. You'll see
                  this move to "In Progress" once they confirm.
                </p>
              ) : r.error ? (
                <p style={{ fontSize: 12, color: "#E27A7A", margin: "10px 0 0 0", lineHeight: 1.5 }}>
                  {r.error}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: t.textSecondary, margin: "10px 0 0 0", lineHeight: 1.5 }}>
                  {r.reset_date
                    ? `This brand's gifting allowance resets ${r.reset_date}.`
                    : "This brand doesn't have a gifting allowance configured yet."}{" "}
                  These items have been returned to your saved gallery — nothing was lost.
                </p>
              )}
            </div>
          ))}

          <button
            onClick={async () => {
              setStage("review");
              setSizeChoices({});
              if (customerId) await loadReviewItems(customerId);
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
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Back to Saved
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
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

        {!isLoading && items.length === 0 && (
          <div
            style={{
              border: `1px dashed ${t.border}`,
              borderRadius: 14,
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, color: t.textSecondary, margin: 0 }}>
              Nothing to review yet. Save pieces from the deck to bring them here.
            </p>
          </div>
        )}

        {!isLoading && brandNames.map((brand) => (
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
                        const selected = chosenSize === v.id;
                        return (
                          <button
                            key={v.id}
                            disabled={disabled}
                            onClick={() => setSize(item.id, v.id)}
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              padding: "6px 12px",
                              borderRadius: 7,
                              cursor: disabled ? "not-allowed" : "pointer",
                              fontFamily: "'Roboto', sans-serif",
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
                  <p style={labelStyle}>Shipping Address</p>
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
                          fontFamily: "'Roboto', sans-serif",
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
                        fontFamily: "'Roboto', sans-serif",
                        marginTop: 6,
                      }}
                    >
                      Select an Address
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
                              fontFamily: "'Roboto', sans-serif",
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
                          fontFamily: "'Roboto', sans-serif",
                          marginTop: 6,
                          width: "100%",
                        }}
                      >
                        + Add New Address
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

      {!isLoading && items.length > 0 && (
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
              {isSubmitting
                ? "Submitting…"
                : !allSizesChosen
                ? "Pick a size for each piece"
                : !allAddressesConfirmed
                ? "Confirm a shipping address for each brand"
                : `${brandNames.length} request${brandNames.length === 1 ? "" : "s"} ready`}
            </span>
            <button
              disabled={!allSizesChosen || !allAddressesConfirmed || isSubmitting}
              onClick={handleSubmit}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: allSizesChosen && allAddressesConfirmed && !isSubmitting ? "#0F0F0F" : t.textSecondary,
                background: allSizesChosen && allAddressesConfirmed && !isSubmitting ? tokens.gold : t.surfaceRaised,
                border: allSizesChosen && allAddressesConfirmed && !isSubmitting ? "none" : `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "9px 18px",
                cursor: allSizesChosen && allAddressesConfirmed && !isSubmitting ? "pointer" : "not-allowed",
                fontFamily: "'Roboto', sans-serif",
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
              {editingAddressId === "new" ? "Add Address" : "Edit Address"}
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
                  Make Default
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
                  Delete Address
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: t.textSecondary, marginTop: 14, opacity: 0.7, textAlign: "center" }}>
        If left here unsubmitted, this request would expire back to Saved after 7 days, with a
        reminder on day 5 — no allowance impact either way. (Expiry isn't built yet — items just
        stay here until you submit or remove them.)
      </p>
    </div>
  );
}
