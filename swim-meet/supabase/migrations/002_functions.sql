-- Transactional registration + race-number assignment.
-- Locks the race_categories row so concurrent sign-ups can never collide
-- on the same bib number or oversell a capped category.
create or replace function register_swimmer(
  p_event_id uuid,
  p_category_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_date_of_birth date,
  p_gender text,
  p_club text,
  p_emergency_contact_name text,
  p_emergency_contact_phone text,
  p_medical_notes text,
  p_waiver_signed boolean
)
returns table (
  registration_id uuid,
  race_number int,
  swimmer_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_category race_categories%rowtype;
  v_swimmer_id uuid;
  v_registration_id uuid;
  v_race_number int;
  v_age int;
  v_current_count int;
begin
  if not p_waiver_signed then
    raise exception 'Waiver must be signed to register';
  end if;

  select * into v_event from events where id = p_event_id for update;
  if not found then
    raise exception 'Event not found';
  end if;
  if v_event.status <> 'registration_open' then
    raise exception 'Registration is not open for this event';
  end if;
  if v_event.registration_close_at is not null and now() > v_event.registration_close_at then
    raise exception 'Registration has closed for this event';
  end if;

  -- lock the category row: this is what makes bib-number assignment safe
  -- under concurrent requests.
  select * into v_category from race_categories where id = p_category_id and event_id = p_event_id for update;
  if not found then
    raise exception 'Race category not found for this event';
  end if;

  v_age := extract(year from age(v_event.event_date, p_date_of_birth));

  if v_category.gender_restriction is not null and v_category.gender_restriction <> p_gender then
    raise exception 'This race is restricted to % swimmers', v_category.gender_restriction;
  end if;
  if v_category.min_age is not null and v_age < v_category.min_age then
    raise exception 'Minimum age for this race is %', v_category.min_age;
  end if;
  if v_category.max_age is not null and v_age > v_category.max_age then
    raise exception 'Maximum age for this race is %', v_category.max_age;
  end if;

  if v_category.max_participants is not null then
    select count(*) into v_current_count
    from registrations
    where category_id = p_category_id and status <> 'cancelled';
    if v_current_count >= v_category.max_participants then
      raise exception 'This race is full';
    end if;
  end if;

  -- find-or-create swimmer (same person = same email + dob + name)
  select id into v_swimmer_id
  from swimmers
  where lower(email) = lower(p_email)
    and date_of_birth = p_date_of_birth
    and lower(full_name) = lower(p_full_name)
  limit 1;

  if v_swimmer_id is null then
    insert into swimmers (
      full_name, email, phone, date_of_birth, gender, club,
      emergency_contact_name, emergency_contact_phone, medical_notes
    ) values (
      p_full_name, p_email, p_phone, p_date_of_birth, p_gender, p_club,
      p_emergency_contact_name, p_emergency_contact_phone, p_medical_notes
    )
    returning id into v_swimmer_id;
  end if;

  if exists (
    select 1 from registrations
    where swimmer_id = v_swimmer_id and category_id = p_category_id and status <> 'cancelled'
  ) then
    raise exception 'This swimmer is already registered for this race';
  end if;

  v_race_number := v_category.next_race_number;
  update race_categories set next_race_number = next_race_number + 1 where id = p_category_id;

  insert into registrations (swimmer_id, event_id, category_id, race_number, status, waiver_signed, confirmed_at)
  values (v_swimmer_id, p_event_id, p_category_id, v_race_number, 'confirmed', true, now())
  returning id into v_registration_id;

  return query select v_registration_id, v_race_number, v_swimmer_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Chip assignment — one chip <-> one registration, enforced by the unique
-- constraint on timing_chips.registration_id.
-- ---------------------------------------------------------------------------
create or replace function assign_timing_chip(p_chip_code text, p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

-- ---------------------------------------------------------------------------
-- Race control: countdown + gun. Server clock is authoritative so every
-- scanning station and display agree on the exact same start time.
-- ---------------------------------------------------------------------------
create or replace function start_countdown(p_session_id uuid, p_seconds int)
returns race_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session race_sessions%rowtype;
begin
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
  update race_sessions
  set status = 'live', gun_time = now()
  where id = p_session_id
  returning * into v_session;
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
  update race_sessions
  set status = 'finished', finished_at = now()
  where id = p_session_id
  returning * into v_session;
  return v_session;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_scan — the only way scan_events rows get written. Resolves the
-- chip to a registration, detects duplicate scans, and never overwrites
-- a swimmer's first recorded check-in/finish time.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Results view — elapsed time from gun to first valid finish scan.
-- ---------------------------------------------------------------------------
create or replace view v_results as
select
  r.id as registration_id,
  r.event_id,
  r.category_id,
  rc.name as category_name,
  r.race_number,
  s.full_name,
  s.gender,
  s.club,
  extract(year from age(e.event_date, s.date_of_birth))::int as age_at_event,
  rs.status as session_status,
  rs.gun_time,
  fin.scanned_at as finish_time,
  case when fin.scanned_at is not null and rs.gun_time is not null
    then fin.scanned_at - rs.gun_time
  end as elapsed,
  checkin.scanned_at as checked_in_at
from registrations r
join swimmers s on s.id = r.swimmer_id
join events e on e.id = r.event_id
join race_categories rc on rc.id = r.category_id
join race_sessions rs on rs.category_id = r.category_id
left join lateral (
  select scanned_at from scan_events
  where registration_id = r.id and scan_type = 'finish' and is_duplicate = false
  order by scanned_at asc limit 1
) fin on true
left join lateral (
  select scanned_at from scan_events
  where registration_id = r.id and scan_type = 'checkin' and is_duplicate = false
  order by scanned_at asc limit 1
) checkin on true
where r.status = 'confirmed';

-- ---------------------------------------------------------------------------
-- Age-group medal placement, computed per category / gender / age bracket.
-- ---------------------------------------------------------------------------
create or replace view v_medal_results as
select
  v.*,
  ag.id as age_group_id,
  ag.label as age_group_label,
  rank() over (
    partition by v.category_id, v.gender, ag.id
    order by v.elapsed asc nulls last
  ) as age_group_rank,
  rank() over (
    partition by v.category_id
    order by v.elapsed asc nulls last
  ) as overall_rank
from v_results v
left join age_groups ag
  on ag.event_id = v.event_id
  and v.age_at_event between ag.min_age and ag.max_age;
