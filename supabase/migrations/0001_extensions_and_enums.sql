-- Gift Deck Pro (PSF) — schema handoff migrations
-- 0001: extensions, shared helper function, and enum types
--
-- Field-level detail in these migrations was reverse-engineered from the
-- mock UI components in source/Gift Deck Pro (validation rules, seed data,
-- filter options) plus the build summary doc. Anywhere a value set wasn't
-- fully visible in the mocks, that's called out in a comment. See
-- "[C] Schema Decisions.md" in the project root for the full list of
-- assumptions to confirm with Christine before this goes live.

create extension if not exists pgcrypto;

-- Generic updated_at trigger, reused by every table below.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Who's signed in and what can they do.
create type user_role as enum ('platform_admin', 'brand_user', 'customer');

-- Brand application lifecycle (Platform Admin review queue).
create type brand_status as enum ('pending', 'approved', 'rejected');

-- How a brand admits customers (Customer Access Manager > access policy selector).
-- Source UI key is "invite-only" (hyphen); normalized to invite_only here.
create type brand_access_policy as enum ('open', 'selective', 'invite_only');

-- Per-customer decision on a given brand.
create type customer_access_status as enum ('unactioned', 'approved', 'denied');

create type customer_tier as enum ('general', 'VIP');

-- The 5 categories confirmed by both the swipe deck / catalogue mocks and
-- the 5 bulk-upload template files (Casual, Business, Formal, Footwear, Custom).
create type product_category as enum ('Formal', 'Business', 'Casual', 'Footwear', 'Custom');

create type item_type as enum ('gift', 'purchase');

create type currency_code as enum ('USD', 'EUR');

-- Gifting allowance reset window (Customer Access Manager > PERIOD_TYPES).
create type allowance_period_type as enum
  ('rolling_30', 'rolling_60', 'rolling_90', 'calendar_quarter', 'calendar_year');

create type talent_contract_status as enum ('none', 'pending', 'executed');

create type requisition_state as enum
  ('submitted', 'invoiced', 'confirmed', 'dispatched', 'declined');

create type order_document_type as enum
  ('packing_slip', 'order_form_invoice', 'return_info');
