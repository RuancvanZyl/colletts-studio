-- Defense in depth: these RPCs are SECURITY DEFINER and only GRANTed to
-- 'authenticated', but that includes any logged-in swimmer, not just staff.
-- Recreate them with an explicit is_staff() guard now that is_staff() exists.

create or replace function assign_timing_chip(p_chip_code text, p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  update timing_chips
  set registration_id = null, status = 'available', assigned_at = null
  where registration_id = p_registration_id;

  update timing_chips
  set registration_id = p_registration_id, status = 'assigned', assigned_at = now()
  where chip_code = p_chip_code;

  if not found then
    insert into timing_chips (chip_code, registration_id, status, assigned_at)
    values (p_chip_code, p_registration_id, 'assigned', now());
  end if;
end;
$$;

create or replace function start_countdown(p_session_id uuid, p_seconds int)
returns race_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session race_sessions%rowtype;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  update race_sessions
  set status = 'countdown', countdown_seconds = p_seconds, countdown_started_at = now()
  where id = p_session_id
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function fire_gun(p_session_id uuid)
returns race_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session race_sessions%rowtype;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  update race_sessions
  set status = 'live', gun_time = now()
  where id = p_session_id and status in ('countdown', 'staging')
  returning * into v_session;

  if v_session.id is null then
    select * into v_session from race_sessions where id = p_session_id;
  end if;

  return v_session;
end;
$$;

create or replace function finish_session(p_session_id uuid)
returns race_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session race_sessions%rowtype;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  update race_sessions
  set status = 'finished', finished_at = now()
  where id = p_session_id
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function record_scan(
  p_session_id uuid,
  p_chip_code text,
  p_scan_type text,
  p_station_id text
)
returns table (
  scan_id uuid,
  registration_id uuid,
  race_number int,
  full_name text,
  is_duplicate boolean,
  chip_known boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_id uuid;
  v_race_number int;
  v_full_name text;
  v_is_duplicate boolean := false;
  v_scan_id uuid;
  v_chip_known boolean := true;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  if p_scan_type not in ('checkin', 'finish') then
    raise exception 'Invalid scan_type %', p_scan_type;
  end if;

  select r.id, r.race_number, s.full_name
  into v_registration_id, v_race_number, v_full_name
  from timing_chips tc
  join registrations r on r.id = tc.registration_id
  join swimmers s on s.id = r.swimmer_id
  where tc.chip_code = p_chip_code;

  if v_registration_id is null then
    v_chip_known := false;
  else
    if exists (
      select 1 from scan_events
      where session_id = p_session_id
        and registration_id = v_registration_id
        and scan_type = p_scan_type
        and is_duplicate = false
    ) then
      v_is_duplicate := true;
    end if;
  end if;

  insert into scan_events (session_id, chip_code, registration_id, scan_type, station_id, is_duplicate)
  values (p_session_id, p_chip_code, v_registration_id, p_scan_type, p_station_id, v_is_duplicate)
  returning id into v_scan_id;

  return query select v_scan_id, v_registration_id, v_race_number, v_full_name, v_is_duplicate, v_chip_known;
end;
$$;
