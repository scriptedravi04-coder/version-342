-- v349 (Session 62, Ravi approved "Haan, kar do"): hide a creator from Explore without ban / delete,
-- and real Instagram data (username fetch via Business Discovery, verify by DM code or Instagram Login).
alter table public.creator_profiles add column if not exists hidden_from_explore boolean not null default false;
alter table public.creator_profiles add column if not exists instagram_verified_at timestamptz;
alter table public.creator_profiles add column if not exists instagram_verify_method text;
alter table public.creator_profiles add column if not exists instagram_synced_at timestamptz;
alter table public.creator_profiles add column if not exists instagram_stats jsonb;

-- Instagram Login tokens (server only — never readable from the browser).
create table if not exists public.instagram_connections (
  user_id text primary key,
  ig_user_id text,
  username text,
  method text not null default 'oauth',
  access_token_enc text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.instagram_connections enable row level security;
revoke all on public.instagram_connections from anon, authenticated;
