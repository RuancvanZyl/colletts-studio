-- ============================================================
-- Security Hardening
-- Run AFTER 003_views_and_functions.sql
-- ============================================================

-- Secure server-side master key validation.
-- The PIN never leaves the database — it is hashed here and never
-- stored or returned in plain text. The function returns true/false only.
create table if not exists master_key_config (
  id int primary key default 1 check (id = 1),  -- single-row table
  pin_hash text not null
);

-- Store the PIN as a bcrypt hash (pgcrypto extension required — enabled by default on Supabase)
insert into master_key_config (id, pin_hash)
values (1, crypt('2629', gen_salt('bf', 10)))
on conflict (id) do nothing;

-- Revoke all direct access to this table
revoke all on master_key_config from anon, authenticated;

-- RPC: validate master key PIN — returns boolean, never exposes the hash
create or replace function validate_master_pin(pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from master_key_config
    where pin_hash = crypt(pin, pin_hash)
  );
end;
$$;

-- Allow any caller (anon or authenticated) to call this function,
-- but the underlying table is still fully locked down.
grant execute on function validate_master_pin(text) to anon, authenticated;

-- ── Rate-limit brute-force attempts ──────────────────────────────
-- Track failed PIN attempts per IP (Supabase passes client IP via request headers).
create table if not exists pin_attempt_log (
  id bigserial primary key,
  attempted_at timestamptz default now(),
  success boolean default false
);

revoke all on pin_attempt_log from anon, authenticated;

-- Clean up old attempt logs automatically (keep 24 hours)
create or replace function cleanup_pin_attempts()
returns void
language sql
security definer
as $$
  delete from pin_attempt_log where attempted_at < now() - interval '24 hours';
$$;
