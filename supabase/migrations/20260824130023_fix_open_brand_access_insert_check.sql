-- 0023: fix RLS check blocking open-brand access requests
--
-- Real bug, caught by an actual customer test: requesting access to an
-- "open" brand from BrowseBrands.jsx failed with "new row violates
-- row-level security policy for table customer_brand_access".
--
-- Root cause is a mismatch between two migrations that were each correct
-- on their own but never tested together against live RLS enforcement:
--   - access_customer_insert (migration 0008) only allows a customer to
--     insert a row with status = 'unactioned' - by design, so a customer
--     can't self-approve.
--   - auto_approve_open_brand_access (migration 0012) is a BEFORE INSERT
--     trigger that flips status to 'approved' for open-policy brands.
-- Postgres evaluates a row's RLS WITH CHECK against its state *after*
-- BEFORE triggers run - so for an open brand, the trigger rewrites
-- status to 'approved' and the insert then fails the very check that
-- was supposed to let it through.
--
-- Fix: teach the WITH CHECK the same trust rule the trigger already
-- enforces server-side - 'approved' is only valid at insert time when
-- the target brand is actually access_policy = 'open' (re-checked
-- against the brands table, not trusted from client input). A customer
-- still can't submit status = 'approved' for a selective/invite_only
-- brand and self-approve; the trigger only ever promotes 'unactioned' to
-- 'approved' for real open brands, and this check now allows exactly
-- that outcome and nothing more.

drop policy access_customer_insert on customer_brand_access;

create policy access_customer_insert on customer_brand_access
  for insert with check (
    auth_role() = 'customer'
    and customer_id = auth.uid()
    and (
      status = 'unactioned'
      or (
        status = 'approved'
        and exists (
          select 1 from brands b
          where b.id = brand_id and b.access_policy = 'open'
        )
      )
    )
  );
