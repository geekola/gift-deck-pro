-- 0017: close a brand self-update privilege-escalation gap
--
-- Surfaced wiring BrandCompanySettings.jsx to a real supabase.from("brands")
-- .update(...) call. brands_self_update (migration 0008) is
-- `for update using (auth_role() = 'brand_user' and id = auth_brand_id())`
-- with no WITH CHECK clause -- Postgres defaults WITH CHECK to the same
-- expression as USING when omitted, which only re-checks the row is still
-- theirs, not which columns changed. That means a brand_user's direct client
-- update can currently set ANY column on their own row, including status,
-- rejection_reason, and approved_at -- a brand could self-approve.
--
-- RLS is row-level only (no column-level policy predicate in Postgres), so
-- this closes it with a BEFORE UPDATE trigger instead of rewriting
-- brands_self_update -- same approach as auto_approve_open_brand_access
-- (migration 0012). PlatformAdminReviewQueue's direct update() calls
-- (status/approved_at/rejection_reason) are unaffected since they run as
-- platform_admin, which the guard clause exempts.
create or replace function lock_brand_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if auth_role() <> 'platform_admin' then
    new.status := old.status;
    new.rejection_reason := old.rejection_reason;
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$;

create trigger brands_lock_admin_columns
  before update on brands
  for each row execute function lock_brand_admin_columns();
