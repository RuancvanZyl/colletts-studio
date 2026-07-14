-- Staff accounts (meet directors + timing operators). Created via Supabase
-- Auth, then given a row here to grant elevated access.
create table staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'timing_operator')),
  created_at timestamptz not null default now()
);

create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from staff_profiles where id = auth.uid());
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from staff_profiles where id = auth.uid() and role = 'admin');
$$;

alter table events enable row level security;
alter table age_groups enable row level security;
alter table race_categories enable row level security;
alter table swimmers enable row level security;
alter table registrations enable row level security;
alter table timing_chips enable row level security;
alter table race_sessions enable row level security;
alter table scan_events enable row level security;
alter table staff_profiles enable row level security;

-- Public can read event/race/age-group info to browse and register.
create policy "public read events" on events for select using (true);
create policy "public read age groups" on age_groups for select using (true);
create policy "public read categories" on race_categories for select using (true);

-- Staff manage meet setup.
create policy "staff write events" on events for all using (is_staff()) with check (is_staff());
create policy "staff write age groups" on age_groups for all using (is_staff()) with check (is_staff());
create policy "staff write categories" on race_categories for all using (is_staff()) with check (is_staff());

-- Swimmer / registration PII: no direct public access. All public writes go
-- through the register_swimmer() SECURITY DEFINER function; all public reads
-- of "did my registration work" go through get_registration_summary().
create policy "staff read swimmers" on swimmers for select using (is_staff());
create policy "staff write swimmers" on swimmers for all using (is_staff()) with check (is_staff());

create policy "staff read registrations" on registrations for select using (is_staff());
create policy "staff write registrations" on registrations for all using (is_staff()) with check (is_staff());

create policy "staff manage chips" on timing_chips for all using (is_staff()) with check (is_staff());

create policy "public read sessions" on race_sessions for select using (true);
create policy "staff write sessions" on race_sessions for all using (is_staff()) with check (is_staff());

create policy "staff read scans" on scan_events for select using (is_staff());
create policy "staff write scans" on scan_events for all using (is_staff()) with check (is_staff());

create policy "staff read own profile" on staff_profiles for select using (id = auth.uid());
create policy "admin manage staff" on staff_profiles for all using (is_admin()) with check (is_admin());

-- Results are public leaderboards — no PII beyond name/club, same as any
-- printed results sheet at a real meet.
grant select on v_results to anon, authenticated;
grant select on v_medal_results to anon, authenticated;

-- Anon needs execute on the registration RPC (it is SECURITY DEFINER and
-- does its own validation), plus the confirmation lookup below.
grant execute on function register_swimmer to anon, authenticated;

create or replace function get_registration_summary(p_registration_id uuid)
returns table (
  registration_id uuid,
  full_name text,
  race_number int,
  category_name text,
  event_name text,
  event_date date,
  status text,
  chip_code text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id, s.full_name, r.race_number, rc.name, e.name, e.event_date, r.status, tc.chip_code
  from registrations r
  join swimmers s on s.id = r.swimmer_id
  join race_categories rc on rc.id = r.category_id
  join events e on e.id = r.event_id
  left join timing_chips tc on tc.registration_id = r.id
  where r.id = p_registration_id;
$$;

grant execute on function get_registration_summary to anon, authenticated;

-- Timing-operator RPCs — require staff.
revoke execute on function assign_timing_chip from public;
revoke execute on function start_countdown from public;
revoke execute on function fire_gun from public;
revoke execute on function finish_session from public;
revoke execute on function record_scan from public;
grant execute on function assign_timing_chip to authenticated;
grant execute on function start_countdown to authenticated;
grant execute on function fire_gun to authenticated;
grant execute on function finish_session to authenticated;
grant execute on function record_scan to authenticated;
