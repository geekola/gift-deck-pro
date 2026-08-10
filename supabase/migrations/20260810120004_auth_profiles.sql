-- 0004: profiles — links auth.users to a role + tenant
--
-- Decision: single Supabase Auth instance for all three actor types
-- (platform_admin, brand_user, customer), distinguished by profiles.role.
-- customers/brands hold role-specific data; profiles is just the auth
-- link + role + tenant pointer, per your answer on the auth model
-- question.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,

  -- Populated only when role = 'brand_user'. Assumes one login per brand
  -- company for now (that's all the mocks show) — extend to a
  -- brand_id + multiple profiles per brand if you need multi-seat brand
  -- accounts later; the FK already supports many profiles per brand_id.
  brand_id uuid references brands(id) on delete set null,

  created_at timestamptz not null default now(),

  constraint profiles_brand_id_only_for_brand_user check (
    (role = 'brand_user' and brand_id is not null)
    or (role <> 'brand_user' and brand_id is null)
  )
);

create index profiles_brand_id_idx on profiles(brand_id) where brand_id is not null;

alter table brand_application_notes
  add constraint brand_application_notes_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- Auto-create a profile row whenever a new auth.users row appears, so app
-- code never has to remember to do it. Defaults new signups to 'customer'
-- since that's the only self-serve signup path (brand_user / platform_admin
-- profiles get their role set explicitly by an admin after the row exists).
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, role) values (new.id, 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
