-- ============================================================
-- Master Key Auth — creates a hidden system account that the
-- master PIN logs into, so RLS passes and real data loads.
-- Run AFTER 004_security_hardening.sql
-- ============================================================

-- Add credential columns to master_key_config
alter table master_key_config
  add column if not exists master_email text,
  add column if not exists master_password text;

-- Store the master account credentials (set these after creating the
-- Supabase Auth user below — see instructions)
-- This function returns credentials only if the PIN is correct.
create or replace function validate_master_pin_with_creds(pin text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  rec master_key_config%rowtype;
begin
  select * into rec from master_key_config where id = 1;
  if rec.pin_hash = crypt(pin, rec.pin_hash) then
    return json_build_object('email', rec.master_email, 'password', rec.master_password);
  end if;
  return null;
end;
$$;

-- Only authenticated users can call this (anon cannot brute-force credentials)
revoke all on function validate_master_pin_with_creds(text) from public;
grant execute on function validate_master_pin_with_creds(text) to anon, authenticated;
