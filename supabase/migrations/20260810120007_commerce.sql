-- 0007: requisitions (orders), line items, fulfillment documents, saved items
--
-- Sourced from ReviewAndSubmit.jsx (SEED_REVIEW_ITEMS, allowance check at
-- submission, C/O contact, per-brand shipping address), OrderStatus.jsx
-- (state machine, STATE_ORDER), BrandDocumentNotifications.jsx
-- (SEED_NOTIFICATIONS: invoice_id format, documents[], email_sent, read).

create table requisitions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  brand_id uuid not null references brands(id) on delete restrict,

  -- e.g. "PSF-2026-00841" in the mocks. Generate in app/DB function at
  -- submission time; stored as text since the format is display-facing.
  invoice_id text not null unique,

  state requisition_state not null default 'submitted',

  shipping_address_id uuid not null references shipping_addresses(id),
  -- "C/O" contact — who to address the shipment to, resolved from the
  -- customer's contacts list. Nullable: not every requisition has one.
  care_of_contact_id uuid references customer_contacts(id),

  subtotal numeric(10, 2) not null default 0,
  currency currency_code not null default 'USD',

  -- Never disclosed to the customer (per OrderStatus.jsx: "no brand reason
  -- disclosed on decline") — that's enforced by RLS / the API layer
  -- selecting this column out for customer-role reads, not by the DB
  -- refusing to store it.
  decline_reason text,

  submitted_at timestamptz not null default now(),
  invoiced_at timestamptz,
  confirmed_at timestamptz,
  dispatched_at timestamptz,
  declined_at timestamptz
);

create index requisitions_customer_id_idx on requisitions(customer_id);
create index requisitions_brand_id_idx on requisitions(brand_id);
create index requisitions_state_idx on requisitions(state);

create table requisition_items (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  product_id uuid not null references products(id),
  product_variant_id uuid not null references product_variants(id),

  -- Snapshotted at submission time so later edits to the product don't
  -- rewrite history on a placed order.
  size_snapshot text not null,
  item_type_snapshot item_type not null,
  cost_price_snapshot numeric(10, 2) not null,
  price_snapshot numeric(10, 2),
  currency_snapshot currency_code not null,
  -- True when this item draws from the customer's gifting allowance with
  -- the brand rather than being a paid purchase.
  is_gift boolean not null
);

create index requisition_items_requisition_id_idx on requisition_items(requisition_id);

create table order_documents (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,

  doc_type order_document_type not null,
  -- Actual PDF file lives in Supabase Storage; this points at it.
  storage_path text,

  generated_at timestamptz not null default now(),
  downloaded_at timestamptz,
  email_sent boolean not null default false,
  -- Unread flag on the brand-side notifications screen.
  read_by_brand boolean not null default false,

  unique (requisition_id, doc_type)
);

create index order_documents_requisition_id_idx on order_documents(requisition_id);

-- Swipe deck likes that made it to the Saved Gallery / Review & Submit
-- pipeline. Passes/undo history is treated as ephemeral client-side state
-- (per the mocks, undo is unlimited-depth but session-scoped) and
-- deliberately not persisted here — flag this in the decisions doc if you
-- want cross-session pass history later.
create table saved_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,

  liked_at timestamptz not null default now(),
  moved_to_review_at timestamptz,

  unique (customer_id, product_id)
);

create index saved_items_customer_id_idx on saved_items(customer_id);
