-- 0012: three correctness gaps surfaced while wiring CustomerAccessManager
-- to real data
--
-- 1. customer_contacts (migration 0003) never got phone/email columns,
--    even though CustomerAccessManager.jsx's "Approved contacts" panel
--    has always shown both ("Shared by the customer for shipment
--    coordination only") - a straightforward miss in the original
--    reverse-engineering pass, not a design choice. Adding them now
--    rather than dropping the fields from the real UI.
--
-- 2. No RLS policy ever let a brand_user read customer_contacts, even
--    for a customer who has explicitly approved an access request and
--    marked a contact is_approved_for_brand_view = true. The "Approved
--    contacts" panel has always been mock data with nowhere real to
--    read from.
--
-- 3. Migration 0006's own comment on customer_brand_access says "open =
--    auto-approved" for brands.access_policy = 'open', but nothing
--    enforced that - a customer requesting access to an Open brand
--    still landed in 'unactioned' just like Selective/Invite-only.
--    Trigger closes that gap at insert time.

alter table customer_contacts
  add column phone text,
  add column email text;

create policy customer_contacts_brand_select_if_access on customer_contacts
  for select using (
    auth_role() = 'brand_user'
    and is_approved_for_brand_view
    and exists (
      select 1 from customer_brand_access a
      where a.customer_id = customer_contacts.customer_id
        and a.brand_id = auth_brand_id()
        and a.status = 'approved'
    )
  );

create or replace function auto_approve_open_brand_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy brand_access_policy;
begin
  select access_policy into v_policy from brands where id = new.brand_id;
  if v_policy = 'open' and new.status = 'unactioned' then
    new.status := 'approved';
    new.decided_at := now();
  end if;
  return new;
end;
$$;

create trigger customer_brand_access_auto_approve_open
  before insert on customer_brand_access
  for each row execute function auto_approve_open_brand_access();
