-- 0006: brand <-> customer access control
--
-- Sourced from CustomerAccessManager.jsx (customer approve/deny + gifting
-- allowance editor), PlatformAdminDashboard.jsx restriction-manager
-- section (SEED_RESTRICTIONS), VipTalentContracts.jsx (SEED_CONTRACTS).

-- Per brand, per customer: has this customer been let in? Distinct from
-- brands.access_policy, which just controls the *default* behavior when a
-- customer first requests access (open = auto-approved, selective /
-- invite_only = starts 'unactioned').
create table customer_brand_access (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,

  status customer_access_status not null default 'unactioned',
  decided_at timestamptz,
  decided_by uuid references profiles(id),

  created_at timestamptz not null default now(),

  unique (customer_id, brand_id)
);

create index customer_brand_access_customer_id_idx on customer_brand_access(customer_id);
create index customer_brand_access_brand_id_idx on customer_brand_access(brand_id);

-- One active gifting allowance per customer x brand pair (Decision: the
-- mock only ever shows a single `allowance` object per customer-in-a-brand
-- context, so this is 1:1 rather than a history table — see decisions doc
-- if you want period-over-period history later).
create table gifting_allowances (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,

  limit_amount numeric(10, 2) not null check (limit_amount > 0),
  currency currency_code not null default 'USD',
  period_type allowance_period_type not null default 'calendar_quarter',
  consumed numeric(10, 2) not null default 0,
  reset_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (customer_id, brand_id)
);

create trigger gifting_allowances_set_updated_at
  before update on gifting_allowances
  for each row execute function set_updated_at();

-- Customer x brand override / block. "Restriction" in the UI. Neither
-- party is ever notified one exists (per PlatformAdminDashboard.jsx
-- comment) — that's an app-layer/RLS concern, not a DB constraint, but
-- worth remembering when building the API layer.
create table restrictions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,

  reason text not null,
  notes text,
  is_permanent boolean not null default true,
  expires_at timestamptz,

  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),

  removed_at timestamptz,
  removed_by uuid references profiles(id),
  removal_reason text,

  -- If the customer had an active, unconsumed gifting allowance with this
  -- brand when the restriction was created, it's frozen (not forfeited) —
  -- snapshotted here rather than deleting the gifting_allowances row.
  frozen_allowance_snapshot jsonb,

  constraint restrictions_expiry_required_unless_permanent check (
    is_permanent or expires_at is not null
  )
);

create index restrictions_customer_id_idx on restrictions(customer_id);
create index restrictions_brand_id_idx on restrictions(brand_id);

-- Only one *active* (not removed, not expired) restriction per pair.
-- Expired/removed restrictions stay as history, so this can't be a simple
-- unique(customer_id, brand_id) — partial index instead.
create unique index restrictions_one_active_per_pair
  on restrictions(customer_id, brand_id)
  where removed_at is null;

-- VIP talent contract + unlock, per brand x VIP customer. Unlock is
-- deliberately independent of contract_status (per VipTalentContracts.jsx
-- comment: "the actual switch controlling access — independent of
-- contract status"). contract_terms is descriptive only, no financial
-- figures, per the build summary.
create table brand_talent_contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,

  contract_status talent_contract_status not null default 'none',
  contract_terms text not null default '',
  notes text,

  unlocked boolean not null default false,
  unlocked_at timestamptz,
  unlocked_by uuid references profiles(id),

  unique (customer_id, brand_id)
);

create index brand_talent_contracts_customer_id_idx on brand_talent_contracts(customer_id);
