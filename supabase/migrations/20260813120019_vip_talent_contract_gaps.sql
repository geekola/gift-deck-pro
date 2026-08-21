-- 0019: brand_talent_contracts schema gaps surfaced wiring VIP Talent
-- Contracts (admin side) to real data
--
-- Two straightforward misses from the original reverse-engineering pass
-- (migration 0006), same category as the customer_contacts.phone/email
-- gap fixed in migration 0012 - not design decisions, just missed fields.

-- 1. The mock's CONTRACT_STATUSES offers 5 options (none/pending/executed/
--    expired/terminated) but the enum only ever got 3. Without this, an
--    admin couldn't record a contract as expired or terminated at all.
alter type talent_contract_status add value 'expired';
alter type talent_contract_status add value 'terminated';

-- 2. No created_at/updated_at - the mock always showed "Last updated"
--    on every contract card, but there was no column to back it. Same
--    set_updated_at() trigger used on brands/customers/gifting_allowances.
alter table brand_talent_contracts add column created_at timestamptz not null default now();
alter table brand_talent_contracts add column updated_at timestamptz not null default now();

create trigger brand_talent_contracts_set_updated_at
  before update on brand_talent_contracts
  for each row execute function set_updated_at();
