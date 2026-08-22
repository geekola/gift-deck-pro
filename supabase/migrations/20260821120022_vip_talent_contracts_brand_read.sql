-- 0022: brand-side read access for VIP Talent Contracts
--
-- VipTalentContracts.jsx at /brand/vip-talent was still the mock file
-- verbatim (full admin-style create/edit/unlock UI reused on the brand
-- route) - Tasks.md flagged this as the last still-mock brand screen.
-- Wiring it for real means a read-only view: brand_talent_contracts
-- (migration 0006/0019) is admin-managed ("agency-driven only", per
-- talent_contracts_admin_all in migration 0008) and had no brand-facing
-- policy at all, so brand_user currently can't read it - a straight
-- read wire needs new RLS, not just a component swap.
--
-- Two additive SELECT policies, nothing removed or narrowed:

-- 1. Brand can see its own contract records, but only once unlocked -
--    an un-unlocked record is exactly the "this VIP doesn't exist for
--    you yet" case (per the component's own copy), so it stays hidden.
create policy talent_contracts_brand_select on brand_talent_contracts
  for select using (
    auth_role() = 'brand_user'
    and brand_id = auth_brand_id()
    and unlocked = true
  );

-- 2. Brand can see the customer's basic row (name/tier) once unlocked
--    for them. Deliberately independent of customer_brand_access
--    (migration 0012's customers_brand_select_if_access) - VIP unlock
--    is its own channel, per the admin-side build summary a VIP talent
--    contract has no dependency on ordinary catalogue access, and a VIP
--    may never have gone through (or even want) that flow.
create policy customers_brand_select_if_vip_unlocked on customers
  for select using (
    auth_role() = 'brand_user'
    and exists (
      select 1 from brand_talent_contracts btc
      where btc.customer_id = customers.id
        and btc.brand_id = auth_brand_id()
        and btc.unlocked = true
    )
  );
