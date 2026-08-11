-- 0009: brand self-registration RPC + approval-gating fix
--
-- Two things this closes, surfaced while wiring real auth for
-- BrandPortalAuthFlow.jsx:
--
-- 1. handle_new_auth_user() (0004) hardcodes role='customer' for every new
--    signup. There was no controlled path to become a brand_user. A
--    SECURITY DEFINER RPC is used instead of a permissive UPDATE policy on
--    profiles.role, so a client can never set their own role to anything
--    the function doesn't explicitly allow (in particular, never
--    'platform_admin' - that's provisioned manually, outside the app).
--
-- 2. The brand_user RLS policies from 0005/0006/0007 only ever checked
--    brand_id = auth_brand_id(), never brands.status. That means a brand
--    mid-review (or rejected) already had full read/write on their own
--    products, customer access grants, gifting allowances, requisitions,
--    and order documents - despite "a platform admin reviews every
--    application before your portal access is activated" being the
--    explicit promise made on the registration screen. Gating those
--    policies on approval status now.

create or replace function auth_brand_is_approved()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from brands b
    join profiles p on p.brand_id = b.id
    where p.id = auth.uid() and b.status = 'approved'
  );
$$;

-- Brand self-registration. Runs as SECURITY DEFINER so it can insert into
-- brands and update the caller's own profile without needing broad RLS
-- grants on either table - the guard clause below is the only thing
-- deciding whether that's allowed, not a table-level policy.
create or replace function register_brand(
  p_brand_name text,
  p_contact_first_name text,
  p_contact_last_name text,
  p_phone_number text,
  p_website text,
  p_fulfilment_email text,
  p_category product_category
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand_id uuid;
  v_current_role user_role;
  v_email text;
begin
  select role into v_current_role from profiles where id = auth.uid();

  -- Only a plain, freshly-signed-up account can register a brand. Blocks
  -- an existing brand_user from spinning up a second brand through this
  -- function, and - more importantly - there is no branch here that can
  -- ever produce role = 'platform_admin'.
  if v_current_role is distinct from 'customer' then
    raise exception 'Only accounts without an existing brand or admin role can register a brand.';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into brands (
    brand_name, email, contact_first_name, contact_last_name,
    phone_number, website, fulfilment_email, category, status
  ) values (
    p_brand_name, v_email, p_contact_first_name, p_contact_last_name,
    p_phone_number, p_website, p_fulfilment_email, p_category, 'pending'
  )
  returning id into v_brand_id;

  update profiles set role = 'brand_user', brand_id = v_brand_id where id = auth.uid();

  return v_brand_id;
end;
$$;

grant execute on function register_brand(text, text, text, text, text, text, product_category) to authenticated;

-- ── Re-gate brand_user operational policies on brands.status = 'approved' ──

drop policy if exists products_brand_self_all on products;
create policy products_brand_self_all on products
  for all using (
    auth_role() = 'brand_user' and brand_id = auth_brand_id() and auth_brand_is_approved()
  );

drop policy if exists product_variants_brand_self_all on product_variants;
create policy product_variants_brand_self_all on product_variants
  for all using (
    auth_role() = 'brand_user'
    and auth_brand_is_approved()
    and exists (select 1 from products p where p.id = product_id and p.brand_id = auth_brand_id())
  );

drop policy if exists access_brand_all on customer_brand_access;
create policy access_brand_all on customer_brand_access
  for all using (
    auth_role() = 'brand_user' and brand_id = auth_brand_id() and auth_brand_is_approved()
  );

drop policy if exists allowances_brand_all on gifting_allowances;
create policy allowances_brand_all on gifting_allowances
  for all using (
    auth_role() = 'brand_user' and brand_id = auth_brand_id() and auth_brand_is_approved()
  );

drop policy if exists requisitions_brand_all on requisitions;
create policy requisitions_brand_all on requisitions
  for all using (
    auth_role() = 'brand_user' and brand_id = auth_brand_id() and auth_brand_is_approved()
  );

drop policy if exists order_documents_brand_all on order_documents;
create policy order_documents_brand_all on order_documents
  for all using (
    auth_role() = 'brand_user'
    and auth_brand_is_approved()
    and exists (
      select 1 from requisitions r
      where r.id = requisition_id and r.brand_id = auth_brand_id()
    )
  );

-- brands_self_select / brands_self_update are intentionally left as-is -
-- a pending or rejected brand still needs to see and edit their own
-- application (that's how they'd notice/fix a rejection reason), just not
-- operate the rest of the portal.
