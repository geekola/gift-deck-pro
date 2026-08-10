-- 0003: customers + their profile data (addresses, contacts, measurements)
--
-- customers.id intentionally equals auth.users.id (1:1) rather than having
-- its own surrogate key — see profiles table in 0004 for why. Fields
-- sourced from CustomerSignIn.jsx, CustomerSettings.jsx (SEED_ADDRESSES /
-- SEED_CONTACTS / MEASUREMENT_FIELDS), MeasurementProfileSetup.jsx.

create table customers (
  id uuid primary key references auth.users(id) on delete cascade,

  name text not null,
  -- auth provider (google vs. password) lives on auth.identities natively;
  -- not duplicated here.
  industry text,
  profile_complete boolean not null default false,
  tier customer_tier not null default 'general',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

create table shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,

  label text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  zip text not null,
  country text not null default 'United States',
  is_default boolean not null default false,

  created_at timestamptz not null default now()
);

create index shipping_addresses_customer_id_idx on shipping_addresses(customer_id);

-- Only one default address per customer. Enforced with a partial unique
-- index rather than app logic alone.
create unique index shipping_addresses_one_default_per_customer
  on shipping_addresses(customer_id) where is_default;

-- Flexible role-tagged contact list. role is free text by design (per
-- CustomerSettings.jsx comment: "roles are tags, not fixed slots"), not an
-- enum. is_authorized_personnel / is_approved_for_brand_view are
-- independent flags (global, not per-brand — settled per the build
-- summary), not implied by role.
create table customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,

  first_name text not null,
  last_name text not null,
  role text not null,
  is_authorized_personnel boolean not null default false,
  is_approved_for_brand_view boolean not null default false,

  created_at timestamptz not null default now()
);

create index customer_contacts_customer_id_idx on customer_contacts(customer_id);

-- One measurement profile per customer. Field sets differ for men's vs.
-- women's (see MeasurementProfileSetup.jsx MENS_FIELDS / WOMENS_FIELDS),
-- so values are stored as a field-id -> value JSONB map rather than fixed
-- columns. Canonical unit is cm; preferred_unit only affects display.
create table measurement_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references customers(id) on delete cascade,

  gender_set text not null check (gender_set in ('mens', 'womens')),
  preferred_unit text not null default 'in' check (preferred_unit in ('in', 'cm')),
  values_cm jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

create trigger measurement_profiles_set_updated_at
  before update on measurement_profiles
  for each row execute function set_updated_at();
