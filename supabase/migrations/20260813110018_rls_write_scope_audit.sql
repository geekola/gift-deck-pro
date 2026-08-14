-- 0018: audit pass for the missing-WITH-CHECK / overbroad-"for all" pattern
-- that produced the brands_self_update gap fixed in migration 0017.
--
-- Same root cause, checked against every self-service policy in 0008/0009:
-- a `for all`/`for update` policy with no WITH CHECK lets the actor freely
-- rewrite any column on a row they own, not just the ones the app UI
-- exposes. Two more real instances found, plus one that's a "for all"
-- grant nobody actually needs anymore now that the requisition-fulfillment
-- RPCs (migration 0016) own every legitimate write.
--
-- Everything else was checked and left alone deliberately:
--   - customer_contacts.is_approved_for_brand_view, gifting_allowances.*,
--     customer_brand_access.status are all *intentionally* self/brand
--     writable per their own features (CustomerAccessManager, the
--     allowance editor) - not gaps.
--   - requisition_items_brand_select, order_documents_customer_select were
--     already select-only.
--   - admin policies stay `for all` with no restriction - platform_admin
--     is the trusted role throughout this schema, same as brands_admin_all.

-- ── 1. customers.tier is a platform-admin classification ──────────────────
--
-- PlatformAdminDashboard.jsx's VIP Talent Contracts section treats
-- customers.tier = 'VIP' as an admin-assigned designation (unlocks the VIP
-- roster / brand_talent_contracts workflow, gated admin-only in RLS). But
-- customers_self_all (migration 0008) is `for all using (id = auth.uid())`
-- with no WITH CHECK, so a customer's own client could set their own
-- tier to 'VIP' directly. Nothing currently *consumes* tier for a real
-- privilege decision (PlatformAdminDashboard isn't wired yet), so this
-- isn't exploitable today, but it will be the moment that screen is wired
-- - closing it now rather than leaving a landmine. name/industry/
-- profile_complete stay freely self-editable; that's genuinely the
-- customer's own data (profile_complete in particular is set by the
-- customer's own client per ensure-customer.ts).
create or replace function lock_customer_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth_role() <> 'platform_admin' then
    new.tier := old.tier;
  end if;
  return new;
end;
$$;

create trigger customers_lock_admin_columns
  before update on customers
  for each row execute function lock_customer_admin_columns();

-- ── 2. requisitions / requisition_items: drop client write paths the RPCs
--    already made obsolete ──────────────────────────────────────────────
--
-- requisitions_brand_all and requisitions_customer_insert (migrations
-- 0008/0009) grant direct client writes on requisitions - but
-- submit_requisition, advance_requisition_state, and decline_requisition
-- are all SECURITY DEFINER and bypass RLS entirely, so no legitimate
-- client code needs these grants (confirmed: grep shows only .select()
-- calls against requisitions from the client). Left in place, they mean:
--   - a customer could insert a fabricated requisition directly -
--     arbitrary subtotal/state/invoice_id, skipping the allowance check
--     and access check submit_requisition performs
--   - a brand could set state = 'dispatched' directly, skipping the
--     tracking-number requirement and document generation, or set
--     state = 'declined' without triggering the allowance refund
-- Narrowing both sides to select-only closes this without touching any
-- RPC (SECURITY DEFINER functions aren't subject to the caller's RLS
-- grants at all).
drop policy if exists requisitions_brand_all on requisitions;
create policy requisitions_brand_select on requisitions
  for select using (
    auth_role() = 'brand_user' and brand_id = auth_brand_id() and auth_brand_is_approved()
  );

drop policy if exists requisitions_customer_insert on requisitions;

-- Same reasoning for requisition_items: nothing writes to it directly from
-- the client (submit_requisition inserts the snapshotted rows as
-- SECURITY DEFINER); requisition_items_customer_all's `for all` let a
-- customer edit price_snapshot/cost_price_snapshot after the fact, or add
-- items to an already-submitted requisition.
drop policy if exists requisition_items_customer_all on requisition_items;
create policy requisition_items_customer_select on requisition_items
  for select using (
    exists (
      select 1 from requisitions r
      where r.id = requisition_id and r.customer_id = auth.uid()
    )
  );

-- ── 3. order_documents: brand keeps read + a column-locked update, loses
--    direct insert/delete ─────────────────────────────────────────────────
--
-- BrandDocumentNotifications.jsx's only real write is marking its own
-- read_by_brand/downloaded_at on a document it can already see (confirmed
-- via grep - no .insert()/.delete() calls against order_documents from the
-- client). order_documents_brand_all's `for all` currently lets a brand
-- fabricate a doc_type row that was never actually generated (e.g. insert
-- a 'return_info' row before dispatch, which order_documents_customer_select
-- would then surface to the customer as real), or delete a generated one
-- outright. Document creation stays exclusively RPC-owned (INSERT inside
-- advance_requisition_state is SECURITY DEFINER, unaffected by dropping
-- the client's insert grant here). The lock trigger only guards UPDATE, so
-- it doesn't interfere with that INSERT path.
drop policy if exists order_documents_brand_all on order_documents;

create policy order_documents_brand_select on order_documents
  for select using (
    auth_role() = 'brand_user'
    and auth_brand_is_approved()
    and exists (
      select 1 from requisitions r
      where r.id = requisition_id and r.brand_id = auth_brand_id()
    )
  );

create policy order_documents_brand_update on order_documents
  for update using (
    auth_role() = 'brand_user'
    and auth_brand_is_approved()
    and exists (
      select 1 from requisitions r
      where r.id = requisition_id and r.brand_id = auth_brand_id()
    )
  );

create or replace function lock_order_document_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth_role() <> 'platform_admin' then
    new.requisition_id := old.requisition_id;
    new.doc_type := old.doc_type;
    new.generated_at := old.generated_at;
    new.email_sent := old.email_sent;
  end if;
  return new;
end;
$$;

create trigger order_documents_lock_admin_columns
  before update on order_documents
  for each row execute function lock_order_document_columns();
