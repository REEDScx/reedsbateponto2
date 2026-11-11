-- REEDS Bate-Ponto 2 — execute no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.guild_settings (
  guild_id text primary key,
  log_channel_id text,
  manager_role_id text,
  timezone text not null default 'America/Fortaleza',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.punch_sessions (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'open' check (status in ('open','closed')),
  duration_seconds integer,
  created_at timestamptz not null default now()
);
create index if not exists punch_sessions_guild_user_idx
  on public.punch_sessions (guild_id, user_id, started_at desc);
create unique index if not exists one_open_session_per_user
  on public.punch_sessions (guild_id, user_id) where status = 'open';

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  guild_id text not null,
  actor_id text not null,
  action text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- O bot usa a chave service_role exclusivamente no servidor; nunca a exponha no cliente.
