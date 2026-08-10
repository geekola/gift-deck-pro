-- 0008: Row Level Security
--
-- Scope note: this covers tenant isolation (platform_admin sees
-- everything; brand_user sees only their own brand's rows; customer sees
-- only their own rows) plus the visibility rules that map cleanly onto
-- row-level checks (approved access, active restrictions, VIP unlock).
--
-- A few rules from the mocks are *field-level* disclosure timing, not
-- row-level, and don't fit RLS well — these need a view or a
-- security-definer RPC instead, called out inline where relevant and
-- listed in "[C] Schema Decisions.md":
--   - address-withholding on requisitions (city/state only until
--     'dispatched')
--   - decline_reason hidden from the customer role entirely
--
-- Helper functions ---------------------------------------------------

create or replace function auth_role()
returns user_role
language sql stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_brand_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select brand_id from profiles where id = auth.uid();
$$;

create or replace function customer_has_active_restriction(p_customer_id uuid, p_brand_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from restrictions r
    where r.customer_id = p_customer_id
      and r.brand_id = p_brand_id
      and r.removed_at is null
      and (r.is_permanent or r.expires_at > now())
  );
$$;

-- Enable RLS everywhere -----------------------------------------------

alter table brands enable row level security;
alter table brand_application_notes enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table shipping_addresses enable row level security;
alter table customer_contacts enable row level security;
alter table measurement_profiles enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table customer_brand_access enable row level security;
alter table gifting_allowances enable row level security;
alter table restrictions enable row level security;
alter table brand_talent_contracts enable row level security;
alter table requisitions enable row level security;
alter table requisition_items enable row level security;
alter table order_documents enable row level security;
alter table saved_items enable row level security;

-- profiles ---------------------------------------------------------------

create policy profiles_self_select on profiles
  for select using (id = auth.uid());

create policy profiles_admin_all on profiles
  for all using (auth_role() = 'platform_admin');

-- brands -------------------------------------------------------------

create policy brands_admin_all on brands
  for all using (auth_role() = 'platform_admin');

create policy brands_self_select on brands
  for select using (auth_role() = 'brand_user' and id = auth_brand_id());

create policy brands_self_update on brands
  for update using (auth_role() = 'brand_user' and id = auth_brand_id());

-- Customers can browse approved brands only.
create policy brands_customer_select_approved on brands
  for select using (auth_role() = 'customer' and status = 'approved');

create policy brand_application_notes_admin_all on brand_application_notes
  for all using (auth_role() = 'platform_admin');

-- customers / addresses / contacts / measurements ---------------------

create policy customers_self_all on customers
  for all using (id = auth.uid());

create policy customers_admin_select on customers
  for select using (auth_role() = 'platform_admin');

-- Brand users can see basic customer rows only through an approved
-- access grant (needed to render names in the access manager / catalogue
-- audience, not for browsing all customers).
create policy customers_brand_select_if_access on customers
  for select using (
    auth_role() = 'brand_user'
    and exists (
      select 1 from customer_brand_access a
      where a.customer_id = customers.id
        and a.brand_id = auth_brand_id()
    )
  );

create policy shipping_addresses_self_all on shipping_addresses
  for all using (customer_id = auth.uid());

create policy customer_contacts_self_all on customer_contacts
  for all using (customer_id = auth.uid());

create policy measurement_profiles_self_all on measurement_profiles
  for all using (customer_id = auth.uid());

-- products / variants --------------------------------------------------

create policy products_admin_all on products
  for all using (auth_role() = 'platform_admin');

create policy products_brand_self_all on products
  for all using (auth_role() = 'brand_user' and brand_id = auth_brand_id());

-- Customer can see a brand's products only if: brand is approved, the
-- customer has approved access to that brand, and there's no active
-- restriction blocking them. VIP-only inventory gating (brand_talent_contracts)
-- is intentionally left to the app layer — it's presentation logic
-- ("watermark at presentation time") more than a hard visibility rule per
-- the mocks, and folding it in here would make this policy unreadable.
create policy products_customer_select on products
  for select using (
    auth_role() = 'customer'
    and exists (
      select 1 from brands b
      join customer_brand_access a
        on a.brand_id = b.id and a.customer_id = auth.uid()
      where b.id = products.brand_id
        and b.status = 'approved'
        and a.status = 'approved'
    )
    and not customer_has_active_restriction(auth.uid(), products.brand_id)
  );

create policy product_variants_admin_all on product_variants
  for all using (auth_role() = 'platform_admin');

create policy product_variants_brand_self_all on product_variants
  for all using (
    auth_role() = 'brand_user'
    and exists (select 1 from products p where p.id = product_id and p.brand_id = auth_brand_id())
  );

create policy product_variants_customer_select on product_variants
  for select using (
    auth_role() = 'customer'
    and exists (select 1 from products p where p.id = product_id)
  );

-- customer_brand_access --------------------------------------------------

create policy access_admin_all on customer_brand_access
  for all using (auth_role() = 'platform_admin');

create policy access_brand_all on customer_brand_access
  for all using (auth_role() = 'brand_user' and brand_id = auth_brand_id());

create policy access_customer_select on customer_brand_access
  for select using (auth_role() = 'customer' and customer_id = auth.uid());

-- Customer can request access (insert their own unactioned row) but not
-- approve/deny themselves.
create policy access_customer_insert on customer_brand_access
  for insert with check (
    auth_role() = 'customer' and customer_id = auth.uid() and status = 'unactioned'
  );

-- gifting_allowances -------------------------------------------------

create policy allowances_admin_all on gifting_allowances
  for all using (auth_role() = 'platform_admin');

create policy allowances_brand_all on gifting_allowances
  for all using (auth_role() = 'brand_user' and brand_id = auth_brand_id());

create policy allowances_customer_select on gifting_allowances
  for select using (auth_role() = 'customer' and customer_id = auth.uid());

-- restrictions: platform_admin only. Neither brand nor customer should
-- ever see these exist, per the mocks.
create policy restrictions_admin_all on restrictions
  for all using (auth_role() = 'platform_admin');

-- brand_talent_contracts: platform_admin only. Managed entirely from the
-- Platform Admin Dashboard per the build summary ("agency-driven only").
create policy talent_contracts_admin_all on brand_talent_contracts
  for all using (auth_role() = 'platform_admin');

-- requisitions / items / documents -------------------------------------

create policy requisitions_admin_all on requisitions
  for all using (auth_role() = 'platform_admin');

create policy requisitions_brand_all on requisitions
  for all using (auth_role() = 'brand_user' and brand_id = auth_brand_id());

create policy requisitions_customer_select on requisitions
  for select using (auth_role() = 'customer' and customer_id = auth.uid());

create policy requisitions_customer_insert on requisitions
  for insert with check (auth_role() = 'customer' and customer_id = auth.uid());

create policy requisition_items_admin_all on requisition_items
  for all using (auth_role() = 'platform_admin');

create policy requisition_items_brand_select on requisition_items
  for select using (
    auth_role() = 'brand_user'
    and exists (
      select 1 from requisitions r
      where r.id = requisition_id and r.brand_id = auth_brand_id()
    )
  );

create policy requisition_items_customer_all on requisition_items
  for all using (
    exists (
      select 1 from requisitions r
      where r.id = requisition_id and r.customer_id = auth.uid()
    )
  );

create policy order_documents_admin_all on order_documents
  for all using (auth_role() = 'platform_admin');

create policy order_documents_brand_all on order_documents
  for all using (
    auth_role() = 'brand_user'
    and exists (
      select 1 from requisitions r
      where r.id = requisition_id and r.brand_id = auth_brand_id()
    )
  );

create policy order_documents_customer_select on order_documents
  for select using (
    exists (
      select 1 from requisitions r
      where r.id = requisition_id and r.customer_id = auth.uid()
    )
  );

-- saved_items ---------------------------------------------------------

create policy saved_items_self_all on saved_items
  for all using (customer_id = auth.uid());

create policy saved_items_admin_select on saved_items
  for select using (auth_role() = 'platform_admin');
