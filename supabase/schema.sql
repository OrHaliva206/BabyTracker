-- ============================================================
-- Baby Tracker — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Families
create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Family',
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

-- 2. Profiles (one per auth user)
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  family_id    uuid references families(id) on delete set null,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- 3. Entries (feedings + diaper changes)
create table if not exists entries (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families(id) on delete cascade,
  type           text not null check (type in ('bottle', 'diaper')),
  bottle_ml      integer,
  diaper_type    text check (diaper_type in ('poop', 'pee', 'both')),
  logged_by      uuid references profiles(id) on delete set null,
  logged_by_name text,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- 4. Family settings
create table if not exists family_settings (
  family_id    uuid primary key references families(id) on delete cascade,
  bottle_sizes integer[] not null default '{30,60,90}',
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table families       enable row level security;
alter table profiles       enable row level security;
alter table entries        enable row level security;
alter table family_settings enable row level security;

-- Helper: get current user's family_id
create or replace function get_my_family_id()
returns uuid language sql security definer as $$
  select family_id from profiles where id = auth.uid()
$$;

-- families: read/update own family
create policy "families: read own" on families
  for select using (id = get_my_family_id());

create policy "families: update own" on families
  for update using (id = get_my_family_id());

create policy "families: insert" on families
  for insert with check (true);

-- profiles: read family members, insert/update own
create policy "profiles: read family" on profiles
  for select using (family_id = get_my_family_id());

create policy "profiles: insert own" on profiles
  for insert with check (id = auth.uid());

create policy "profiles: update own" on profiles
  for update using (id = auth.uid());

-- entries: full access within own family
create policy "entries: read family" on entries
  for select using (family_id = get_my_family_id());

create policy "entries: insert family" on entries
  for insert with check (family_id = get_my_family_id());

create policy "entries: update family" on entries
  for update using (family_id = get_my_family_id());

-- family_settings: read/write own family
create policy "settings: read family" on family_settings
  for select using (family_id = get_my_family_id());

create policy "settings: insert family" on family_settings
  for insert with check (family_id = get_my_family_id());

create policy "settings: update family" on family_settings
  for update using (family_id = get_my_family_id());

-- ============================================================
-- Enable Realtime on entries table
-- ============================================================
alter publication supabase_realtime add table entries;
alter publication supabase_realtime add table family_settings;
