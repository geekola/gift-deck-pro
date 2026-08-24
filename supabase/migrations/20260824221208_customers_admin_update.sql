-- 0024: platform_admin can update customers (needed for the new Customers
-- admin screen's tier toggle)
--
-- Gap flagged when the user asked "how does a customer become a VIP?":
-- customers.tier was locked to admin-only writes by the
-- customers_lock_admin_columns trigger (migration 0018), but no RLS policy
-- ever actually granted platform_admin UPDATE on customers at all -
-- customers_admin_select (migration 0008) is select-only. So even the
-- trigger's own allowance for platform_admin was dead code; there was no
-- write path to reach it from, admin or otherwise. The only way to set
-- tier = 'VIP' today is a manual SQL update in Supabase.
--
-- Consistent with the trusted-role pattern used everywhere else in this
-- schema (brands_admin_all, restrictions/brand_talent_contracts/
-- brand_application_notes admin policies all "for all" with no column
-- restriction) - platform_admin gets a real for-all-columns UPDATE here,
-- and customers_lock_admin_columns keeps doing its job of stopping a
-- customer's own client from touching tier via customers_self_all.
create policy customers_admin_update on customers
  for update using (auth_role() = 'platform_admin');
