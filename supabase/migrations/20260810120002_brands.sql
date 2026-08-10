-- 0002: brands + brand application review notes
--
-- Fields sourced from BrandCompanySettings.jsx (registration/settings form
-- + validate()) and PlatformAdminReviewQueue.jsx (SEED_APPLICATIONS,
-- status transitions, rejection reason, notes log).

create table brands (
  id uuid primary key default gen_random_uuid(),

  brand_name text not null,
  email text not null,
  contact_first_name text not null,
  contact_last_name text not null,
  phone_number text not null,
  website text not null,
  fulfilment_email text not null,

  -- Brand's primary catalogue category. Determines which of the 5
  -- category-specific bulk upload templates applies. Same taxonomy as
  -- products.category by design.
  category product_category not null,

  status brand_status not null default 'pending',
  rejection_reason text,

  access_policy brand_access_policy not null default 'selective',

  -- Structured, required post-approval (Decision: return address must be
  -- filled in before a brand can go live, but shouldn't block the initial
  -- application). Enforced below via check constraint rather than at
  -- application time.
  return_line1 text,
  return_line2 text,
  return_city text,
  return_state text,
  return_zip text,
  return_country text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,

  constraint brands_rejection_reason_required check (
    status <> 'rejected' or rejection_reason is not null
  ),
  constraint brands_return_address_required_once_approved check (
    status <> 'approved'
    or (return_line1 is not null and return_city is not null
        and return_state is not null and return_zip is not null
        and return_country is not null)
  )
);

create trigger brands_set_updated_at
  before update on brands
  for each row execute function set_updated_at();

-- Timestamped notes log on a brand application, e.g. reconsideration notes
-- after a rejection. One-to-many rather than a JSON array so entries are
-- individually queryable/auditable.
create table brand_application_notes (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  created_by uuid -- references profiles(id); FK added in 0004 after profiles exists
);

create index brand_application_notes_brand_id_idx on brand_application_notes(brand_id);
