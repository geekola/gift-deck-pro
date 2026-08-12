-- 0013: care-of contact link on shipping addresses
--
-- Gap surfaced while wiring CustomerSettings to real data. The mock's
-- address book has always let a customer designate a saved contact as
-- "care of" on a given address's shipping label (SEED_ADDRESSES
-- careOfContactId), but shipping_addresses (migration 0003) never got a
-- column for it - a straightforward miss in the original
-- reverse-engineering pass, not a design choice. Adding it now rather
-- than dropping the feature or making it a non-persisted, reload-losing
-- local-only field.

alter table shipping_addresses
  add column care_of_contact_id uuid references customer_contacts(id) on delete set null;
