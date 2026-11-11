-- Extensões funcionais do REEDS Bate-Ponto 2.
-- Execute após database/schema.sql no SQL Editor do Supabase.

create table if not exists public.justifications (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  reason text not null check (char_length(reason) between 5 and 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists justifications_guild_status_idx
  on public.justifications (guild_id, status, created_at desc);
create index if not exists justifications_user_idx
  on public.justifications (guild_id, user_id, created_at desc);

create table if not exists public.guild_whitelist (
  guild_id text not null,
  user_id text not null,
  added_by text not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);

create table if not exists public.guild_roles (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  role_id text not null,
  role_type text not null check (role_type in ('manager','reviewer','employee')),
  created_at timestamptz not null default now(),
  unique (guild_id, role_id, role_type)
);

create table if not exists public.guild_days_off (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  day date not null,
  label text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (guild_id, day)
);

create table if not exists public.overtime_entries (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  minutes integer not null check (minutes > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists overtime_guild_user_idx
  on public.overtime_entries (guild_id, user_id, created_at desc);

create table if not exists public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  created_at timestamptz not null default now(),
  check (end_time <> start_time)
);
create index if not exists work_schedules_lookup_idx
  on public.work_schedules (guild_id, user_id, weekday);
