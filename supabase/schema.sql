-- ============================================================
-- Baby Tracker — Supabase Schema (no auth version)
-- Run this in your Supabase SQL editor
-- ============================================================

-- Clean up old tables if they exist
drop table if exists entries cascade;
drop table if exists family_settings cascade;
drop table if exists profiles cascade;
drop table if exists families cascade;
drop function if exists get_my_family_id cascade;

-- Entries (feedings + diaper changes)
create table entries (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null,
  type           text not null check (type in ('bottle', 'diaper')),
  bottle_ml      integer,
  diaper_type    text check (diaper_type in ('poop', 'pee', 'both')),
  logged_by_name text,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- Family settings
create table family_settings (
  family_id    uuid primary key,
  bottle_sizes integer[] not null default '{30,60,90}',
  updated_at   timestamptz not null default now()
);

-- Allow open access (anon key is the only protection needed for a private family app)
alter table entries         enable row level security;
alter table family_settings enable row level security;

create policy "open entries"   on entries         for all using (true) with check (true);
create policy "open settings"  on family_settings for all using (true) with check (true);

-- Enable Realtime
alter publication supabase_realtime add table entries;
alter publication supabase_realtime add table family_settings;
