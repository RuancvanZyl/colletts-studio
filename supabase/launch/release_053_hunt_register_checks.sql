-- Migration 053: the hunt register is captured per hunt and cross-checked.
-- The register (the form every professional hunter fills in) is typed in once; the system checks it against
--   * the permit numbers on file for that year (professional hunter and outfitter),
--   * the permits that were handed in,
--   * the hunt itself (province, dates, outfitter, hunter),
--   * and the receiving sheet (animals and parts that actually arrived).
-- Every mistake is listed; a problem can only be set aside with a recorded reason. The register document cannot be
-- approved while problems are open. Needs migration 051 (and 052).

alter table document_types add column if not exists check_kind text;
alter table hunt_requirements add column if not exists check_kind text;
alter table hunt_requirements add column if not exists reference_numbers text[] not null default '{}';
-- what must be on each kind of document (staff tick each one while checking), and the numbers a document shows
alter table document_types add column if not exists must_show text[] not null default '{}';
alter table hunt_requirements add column if not exists must_show text[] not null default '{}';
alter table hunt_requirements add column if not exists shown_ok text[] not null default '{}';
alter table hunt_requirements add column if not exists ph_permit_seen text;
alter table hunt_requirements add column if not exists ho_permit_seen text;
update document_types set check_kind = 'register' where name = 'PH Register' and check_kind is null;
update hunt_requirements set check_kind = 'register' where name = 'PH Register' and check_kind is null;

-- ── permit numbers on file: the PH gets a new one every year, the outfitter has theirs ──
create table if not exists registered_numbers (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('ph_permit', 'ho_permit')),
  holder_name text not null,
  year        int not null,
  number      text not null,
  created_at  timestamptz not null default now()
);
create unique index if not exists registered_numbers_one_per_year on registered_numbers (kind, lower(trim(holder_name)), year);
alter table registered_numbers enable row level security;
drop policy if exists "staff_read_registered_numbers" on registered_numbers;
create policy "staff_read_registered_numbers" on registered_numbers for select to authenticated using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop policy if exists "admins_write_registered_numbers" on registered_numbers;
create policy "admins_write_registered_numbers" on registered_numbers for all to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')))
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));

-- ── the register of one hunt ──────────────────────────────────────────────────
create table if not exists hunt_registers (
  id                 uuid primary key default gen_random_uuid(),
  hunt_id            uuid not null unique references client_hunts(id) on delete cascade,
  register_no        text,
  province           text,
  commenced          date,
  terminated         date,
  ph_name            text,
  ph_permit_no       text,
  ph_signed          boolean not null default false,
  client_name        text,
  client_passport_no text,
  client_signed      boolean not null default false,
  ho_name            text,
  ho_permit_no       text,
  ho_signed          boolean not null default false,
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);
create table if not exists hunt_register_lines (
  id          uuid primary key default gen_random_uuid(),
  register_id uuid not null references hunt_registers(id) on delete cascade,
  line_no     int not null,
  farm_name   text,
  farm_reg_no text,
  district    text,
  landowner   text,
  permit_no   text,
  date_killed date,
  species     text,
  quantity    int,
  sex         text,
  parts       text[] not null default '{}',
  unique (register_id, line_no)
);
create table if not exists register_overrides (
  hunt_id       uuid not null references client_hunts(id) on delete cascade,
  check_key     text not null,
  reason        text not null,
  overridden_by uuid,
  created_at    timestamptz not null default now(),
  primary key (hunt_id, check_key)
);
alter table hunt_registers enable row level security;
alter table hunt_register_lines enable row level security;
alter table register_overrides enable row level security;
drop policy if exists "staff_read_registers" on hunt_registers;
create policy "staff_read_registers" on hunt_registers for select to authenticated using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop policy if exists "staff_read_register_lines" on hunt_register_lines;
create policy "staff_read_register_lines" on hunt_register_lines for select to authenticated using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop policy if exists "staff_read_register_overrides" on register_overrides;
create policy "staff_read_register_overrides" on register_overrides for select to authenticated using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

-- ── small helpers ─────────────────────────────────────────────────────────────
create or replace function public._norm_num(t text) returns text language sql immutable as $$
  select lower(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- "Cape Kudu", "Kudu" and "Kudu (Southern)" are the same animal; "Roan Antelope" is "roan"
create or replace function public._species_key(t text) returns text language sql immutable as $$
  select case when x = '' then lower(trim(coalesce(t, ''))) else x end from (
    select trim(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(t, '')), '\([^)]*\)', ' ', 'g'),
      '\m(cape|common|southern|greater|lesser|golden|king|black|white|blue|red|copper|giant|mountain|plains|antelope)\M', ' ', 'g'), '[^a-z ]', '', 'g')) as x
  ) s
$$;

create or replace function public._part_label(c text) returns text language sql immutable as $$
  select case c when 'SKULL' then 'Skull' when 'CAPE' then 'Cape' when 'BSKIN' then 'Back skin' when 'FLATSKIN' then 'Flat skin'
                when 'FSKIN' then 'Full skin' when 'FEET' then 'Feet' when 'LEGBONES' then 'Leg bones' when 'SCROTUM' then 'Scrotum'
                when 'TAIL' then 'Tail' when 'TUSKS' then 'Tusks' when 'PANEL' then 'Panel' else c end
$$;

create or replace function public._finding(p_key text, p_level text, p_where text, p_field text, p_msg text) returns jsonb
language sql immutable as $$ select jsonb_build_object('key', p_key, 'level', p_level, 'where', p_where, 'field', p_field, 'message', p_msg) $$;

-- ── the checks ────────────────────────────────────────────────────────────────
create or replace function public._register_findings(p_hunt uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  h record; r record; l record; s record; rn record;
  v jsonb := '[]'::jsonb; yr int; n int; ref_count int; w text;
  q int; shown text; rp text[]; cp text[]; got int; total int; rshown text; pc text; lbl text;
begin
  select ch.province, ch.start_date, ch.end_date, o.name as outfitter_name, c.full_name as hunter_name
    into h from client_hunts ch join clients c on c.id = ch.client_id left join outfitters o on o.id = ch.outfitter_id where ch.id = p_hunt;
  if not found then return v; end if;
  select * into r from hunt_registers where hunt_id = p_hunt;
  if not found then
    return jsonb_build_array(public._finding('register:missing', 'error', 'register', null, 'The hunt register has not been captured yet'));
  end if;
  v := jsonb_build_array();

  -- the top of the register
  if coalesce(trim(r.register_no), '') = '' then v := v || public._finding('header:register_no', 'error', 'Register', 'register_no', 'The register number (No.) is missing');
  elsif exists (select 1 from hunt_registers x where x.hunt_id <> p_hunt and public._norm_num(x.register_no) = public._norm_num(r.register_no)) then
    v := v || public._finding('header:register_no', 'error', 'Register', 'register_no', format('Register number %s is already used on another hunt', r.register_no));
  end if;
  if r.province is null then v := v || public._finding('header:province', 'error', 'Register', 'province', 'No province is ticked on the register');
  elsif h.province is not null and r.province <> h.province then
    v := v || public._finding('header:province', 'error', 'Register', 'province', format('The register says %s but this hunt is set to %s', r.province, h.province));
  end if;
  if r.commenced is null then v := v || public._finding('header:commenced', 'error', 'Register', 'commenced', 'The date the hunt commenced is missing'); end if;
  if r.terminated is null then v := v || public._finding('header:terminated', 'error', 'Register', 'terminated', 'The date the hunt terminated is missing'); end if;
  if r.commenced is not null and r.terminated is not null and r.terminated < r.commenced then
    v := v || public._finding('header:terminated', 'error', 'Register', 'terminated', 'The hunt terminated before it commenced');
  end if;
  if h.start_date is not null and r.commenced is not null and h.start_date <> r.commenced then
    v := v || public._finding('header:commenced_hunt', 'warn', 'Register', 'commenced', format('Commenced %s on the register, %s on the hunt', r.commenced, h.start_date));
  end if;
  if h.end_date is not null and r.terminated is not null and h.end_date <> r.terminated then
    v := v || public._finding('header:terminated_hunt', 'warn', 'Register', 'terminated', format('Terminated %s on the register, %s on the hunt', r.terminated, h.end_date));
  end if;
  yr := extract(year from coalesce(r.terminated, r.commenced, h.end_date, current_date))::int;

  -- professional hunter
  if coalesce(trim(r.ph_name), '') = '' then v := v || public._finding('header:ph_name', 'error', 'Professional hunter', 'ph_name', 'The professional hunter''s name is missing'); end if;
  if coalesce(trim(r.ph_permit_no), '') = '' then v := v || public._finding('header:ph_permit_no', 'error', 'Professional hunter', 'ph_permit_no', 'The PH permit number is missing');
  else
    select number into rn from registered_numbers where kind = 'ph_permit' and year = yr and lower(trim(holder_name)) = lower(trim(coalesce(r.ph_name, ''))) limit 1;
    if found then
      if public._norm_num(rn.number) <> public._norm_num(r.ph_permit_no) then
        v := v || public._finding('header:ph_permit_no', 'error', 'Professional hunter', 'ph_permit_no', format('PH permit number %s does not match %s, the number on file for %s in %s', r.ph_permit_no, rn.number, r.ph_name, yr));
      end if;
    elsif exists (select 1 from registered_numbers where kind = 'ph_permit' and year = yr and public._norm_num(number) = public._norm_num(r.ph_permit_no)) then
      v := v || public._finding('header:ph_permit_no', 'error', 'Professional hunter', 'ph_permit_no', format('PH permit number %s is on file for a different professional hunter in %s', r.ph_permit_no, yr));
    else
      v := v || public._finding('header:ph_permit_no', 'warn', 'Professional hunter', 'ph_permit_no', format('No %s permit number is on file for %s yet, so it cannot be checked. Add it under Setup', yr, coalesce(r.ph_name, 'this professional hunter')));
    end if;
  end if;
  if not r.ph_signed then v := v || public._finding('header:ph_signed', 'error', 'Professional hunter', 'ph_signed', 'The professional hunter has not signed'); end if;

  -- hunting outfitter (the owner of the land)
  if coalesce(trim(r.ho_name), '') = '' then v := v || public._finding('header:ho_name', 'error', 'Hunting outfitter', 'ho_name', 'The hunting outfitter''s name is missing');
  elsif h.outfitter_name is not null and not (lower(r.ho_name) like '%' || lower(trim(h.outfitter_name)) || '%' or lower(h.outfitter_name) like '%' || lower(trim(r.ho_name)) || '%') then
    v := v || public._finding('header:ho_name', 'warn', 'Hunting outfitter', 'ho_name', format('The register says %s but this hunt belongs to %s', r.ho_name, h.outfitter_name));
  end if;
  if coalesce(trim(r.ho_permit_no), '') = '' then v := v || public._finding('header:ho_permit_no', 'error', 'Hunting outfitter', 'ho_permit_no', 'The outfitter''s permit number is missing');
  else
    select number into rn from registered_numbers where kind = 'ho_permit' and year = yr and lower(trim(holder_name)) = lower(trim(coalesce(r.ho_name, ''))) limit 1;
    if found then
      if public._norm_num(rn.number) <> public._norm_num(r.ho_permit_no) then
        v := v || public._finding('header:ho_permit_no', 'error', 'Hunting outfitter', 'ho_permit_no', format('Outfitter permit number %s does not match %s, the number on file for %s in %s', r.ho_permit_no, rn.number, r.ho_name, yr));
      end if;
    elsif exists (select 1 from registered_numbers where kind = 'ho_permit' and year = yr and public._norm_num(number) = public._norm_num(r.ho_permit_no)) then
      v := v || public._finding('header:ho_permit_no', 'error', 'Hunting outfitter', 'ho_permit_no', format('Outfitter permit number %s is on file for a different outfitter in %s', r.ho_permit_no, yr));
    else
      v := v || public._finding('header:ho_permit_no', 'warn', 'Hunting outfitter', 'ho_permit_no', format('No %s permit number is on file for %s yet, so it cannot be checked. Add it under Setup', yr, coalesce(r.ho_name, 'this outfitter')));
    end if;
  end if;
  if not r.ho_signed then v := v || public._finding('header:ho_signed', 'error', 'Hunting outfitter', 'ho_signed', 'The hunting outfitter has not signed'); end if;

  -- the client
  if coalesce(trim(r.client_name), '') = '' then v := v || public._finding('header:client_name', 'error', 'Client', 'client_name', 'The client''s name is missing');
  elsif not (lower(r.client_name) like '%' || lower(trim(h.hunter_name)) || '%' or lower(h.hunter_name) like '%' || lower(trim(r.client_name)) || '%') then
    v := v || public._finding('header:client_name', 'warn', 'Client', 'client_name', format('The register says %s but the hunter on file is %s', r.client_name, h.hunter_name));
  end if;
  if coalesce(trim(r.client_passport_no), '') = '' then v := v || public._finding('header:client_passport_no', 'warn', 'Client', 'client_passport_no', 'The client''s passport number is missing'); end if;
  if not r.client_signed then v := v || public._finding('header:client_signed', 'error', 'Client', 'client_signed', 'The client has not signed'); end if;

  -- every document must carry the same PH and outfitter permit numbers as the register
  for s in select name, ph_permit_seen, ho_permit_seen, id from hunt_requirements where hunt_id = p_hunt and check_kind is distinct from 'register' and (ph_permit_seen is not null or ho_permit_seen is not null) loop
    if s.ph_permit_seen is not null and coalesce(trim(r.ph_permit_no), '') <> '' and public._norm_num(s.ph_permit_seen) <> public._norm_num(r.ph_permit_no) then
      v := v || public._finding('doc:ph:' || s.id, 'error', 'Other documents', null, format('"%s" shows PH permit number %s, but the register says %s', s.name, s.ph_permit_seen, r.ph_permit_no));
    end if;
    if s.ho_permit_seen is not null and coalesce(trim(r.ho_permit_no), '') <> '' and public._norm_num(s.ho_permit_seen) <> public._norm_num(r.ho_permit_no) then
      v := v || public._finding('doc:ho:' || s.id, 'error', 'Other documents', null, format('"%s" shows outfitter permit number %s, but the register says %s', s.name, s.ho_permit_seen, r.ho_permit_no));
    end if;
  end loop;

  -- the animals, line by line
  select count(*) into n from hunt_register_lines where register_id = r.id;
  if n = 0 then v := v || public._finding('lines:none', 'error', 'Animals', null, 'No animals are listed on the register'); end if;
  select count(*) into ref_count from hunt_requirements where hunt_id = p_hunt and cardinality(reference_numbers) > 0;
  for l in select * from hunt_register_lines where register_id = r.id order by line_no loop
    w := 'Line ' || l.line_no || coalesce(' (' || nullif(trim(l.species), '') || ')', '');
    if coalesce(trim(l.species), '') = '' then v := v || public._finding('line:' || l.line_no || ':species', 'error', w, 'species', 'The species is missing'); end if;
    if coalesce(trim(l.farm_name), '') = '' and coalesce(trim(l.farm_reg_no), '') = '' then v := v || public._finding('line:' || l.line_no || ':farm', 'error', w, 'farm', 'The farm name or registration number is missing'); end if;
    if coalesce(trim(l.district), '') = '' then v := v || public._finding('line:' || l.line_no || ':district', 'error', w, 'district', 'The magisterial district is missing'); end if;
    if coalesce(trim(l.landowner), '') = '' then v := v || public._finding('line:' || l.line_no || ':landowner', 'error', w, 'landowner', 'The land owner''s name and address is missing'); end if;
    if coalesce(trim(l.permit_no), '') = '' then v := v || public._finding('line:' || l.line_no || ':permit_no', 'error', w, 'permit_no', 'The hunting permit number is missing');
    elsif ref_count > 0 and not exists (select 1 from hunt_requirements q, unnest(q.reference_numbers) x where q.hunt_id = p_hunt and public._norm_num(x) = public._norm_num(l.permit_no)) then
      v := v || public._finding('line:' || l.line_no || ':permit_no', 'error', w, 'permit_no', format('Permit %s is not on any permit that was handed in', l.permit_no));
    end if;
    if l.date_killed is null then v := v || public._finding('line:' || l.line_no || ':date_killed', 'error', w, 'date_killed', 'The date killed is missing');
    elsif r.commenced is not null and r.terminated is not null and (l.date_killed < r.commenced or l.date_killed > r.terminated) then
      v := v || public._finding('line:' || l.line_no || ':date_killed', 'error', w, 'date_killed', format('Killed on %s, outside the hunt (%s to %s)', l.date_killed, r.commenced, r.terminated));
    end if;
    if coalesce(l.quantity, 0) < 1 then v := v || public._finding('line:' || l.line_no || ':quantity', 'error', w, 'quantity', 'The number killed is missing'); end if;
    if coalesce(trim(l.sex), '') = '' then v := v || public._finding('line:' || l.line_no || ':sex', 'warn', w, 'sex', 'The sex is not filled in'); end if;
    if cardinality(l.parts) = 0 then v := v || public._finding('line:' || l.line_no || ':parts', 'error', w, 'parts', 'The parts of the trophy to be exported are missing'); end if;
  end loop;
  if ref_count = 0 and exists (select 1 from hunt_register_lines where register_id = r.id and coalesce(trim(permit_no), '') <> '') then
    v := v || public._finding('permits:none_captured', 'warn', 'Permits', null, 'The numbers on the permit documents have not been entered yet, so the permit numbers on the register cannot be checked');
  end if;
  for pc in select distinct x from hunt_requirements q, unnest(q.reference_numbers) x where q.hunt_id = p_hunt loop
    if not exists (select 1 from hunt_register_lines where register_id = r.id and public._norm_num(permit_no) = public._norm_num(pc)) then
      v := v || public._finding('permit:unused:' || public._norm_num(pc), 'warn', 'Permits', null, format('Permit %s was handed in but is not used on the register', pc));
    end if;
  end loop;

  -- the register against the receiving sheet
  for s in select distinct public._species_key(species) as k from hunt_register_lines where register_id = r.id and coalesce(trim(species), '') <> '' loop
    select min(species), coalesce(sum(quantity), 0)::int into shown, q from hunt_register_lines where register_id = r.id and public._species_key(species) = s.k;
    select coalesce(array_agg(distinct p), '{}') into rp from hunt_register_lines l2, unnest(l2.parts) p where l2.register_id = r.id and public._species_key(l2.species) = s.k and p <> 'OTHER';
    select count(*) filter (where status <> 'awaiting_arrival'), count(*), min(form_data->>'species') into got, total, rshown
      from hunt_documents where hunt_id = p_hunt and doc_type = 'job_card' and public._species_key(form_data->>'species') = s.k;
    select coalesce(array_agg(distinct x->>'code'), '{}') into cp
      from hunt_documents d, jsonb_array_elements(coalesce(d.form_data->'received_parts', '[]'::jsonb)) x
     where d.hunt_id = p_hunt and d.doc_type = 'job_card' and d.status <> 'awaiting_arrival' and public._species_key(d.form_data->>'species') = s.k and x->>'code' <> 'OTHER';
    if total = 0 then
      v := v || public._finding('recv:missing:' || s.k, 'error', 'Receiving sheet', 'species', format('The register lists %s x %s, but there is nothing for it on the receiving sheet', q, shown));
    else
      if total <> q then v := v || public._finding('recv:count:' || s.k, 'error', 'Receiving sheet', 'quantity', format('The register lists %s x %s, but the receiving sheet has %s', q, shown, total)); end if;
      if got < total then v := v || public._finding('recv:pending:' || s.k, 'warn', 'Receiving sheet', 'species', format('%s of %s %s have not arrived yet, so the parts cannot be compared', total - got, total, rshown));
      else
        for pc in select x from unnest(rp) x where not (x = any(cp)) loop
          v := v || public._finding('recv:part_missing:' || s.k || ':' || pc, 'error', 'Receiving sheet', 'parts', format('The register lists %s for %s, but it was not received', public._part_label(pc), shown));
        end loop;
        for pc in select x from unnest(cp) x where not (x = any(rp)) loop
          v := v || public._finding('recv:part_extra:' || s.k || ':' || pc, 'error', 'Receiving sheet', 'parts', format('%s was received for %s but is not on the register, so it cannot be exported', public._part_label(pc), rshown));
        end loop;
      end if;
    end if;
  end loop;
  for s in select distinct public._species_key(form_data->>'species') as k, min(form_data->>'species') as shown from hunt_documents d
           where d.hunt_id = p_hunt and d.doc_type = 'job_card' and coalesce(trim(form_data->>'species'), '') <> ''
             and not exists (select 1 from hunt_register_lines l3 where l3.register_id = r.id and public._species_key(l3.species) = public._species_key(d.form_data->>'species'))
           group by 1 loop
    v := v || public._finding('recv:not_on_register:' || s.k, 'error', 'Receiving sheet', 'species', format('%s is on the receiving sheet but not on the register', s.shown));
  end loop;
  return v;
end;
$$;
revoke all on function public._register_findings(uuid) from public, anon, authenticated;

-- with the overrides applied; staff and the hunt's outfitter may read it
create or replace function public.check_hunt_register(p_hunt uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not (public._doc_is_staff() or public._my_outfitter_hunt(p_hunt)) then raise exception 'You cannot see this register'; end if;
  select coalesce(jsonb_agg(f.j || jsonb_build_object('overridden', o.hunt_id is not null, 'override_reason', o.reason) order by f.ord), '[]'::jsonb) into v
    from jsonb_array_elements(public._register_findings(p_hunt)) with ordinality f(j, ord)
    left join register_overrides o on o.hunt_id = p_hunt and o.check_key = f.j->>'key';
  return v;
end;
$$;
revoke all on function public.check_hunt_register(uuid) from public, anon;
grant execute on function public.check_hunt_register(uuid) to authenticated;

create or replace function public._register_unresolved(p_hunt uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from jsonb_array_elements(public._register_findings(p_hunt)) f(j)
   where f.j->>'level' = 'error' and not exists (select 1 from register_overrides o where o.hunt_id = p_hunt and o.check_key = f.j->>'key')
$$;
revoke all on function public._register_unresolved(uuid) from public, anon, authenticated;

-- ── capturing the register, setting a problem aside, noting the numbers on a document ──
create or replace function public.staff_save_register(p_hunt uuid, p_header jsonb, p_lines jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid; a jsonb; i int := 0;
begin
  if not public._doc_is_staff() then raise exception 'Only managers can capture the register'; end if;
  if not exists (select 1 from client_hunts where id = p_hunt) then raise exception 'That hunt does not exist'; end if;
  insert into hunt_registers (hunt_id, register_no, province, commenced, terminated, ph_name, ph_permit_no, ph_signed, client_name, client_passport_no, client_signed, ho_name, ho_permit_no, ho_signed, updated_at, updated_by)
  values (p_hunt, nullif(trim(p_header->>'register_no'), ''), nullif(p_header->>'province', ''), nullif(p_header->>'commenced', '')::date, nullif(p_header->>'terminated', '')::date,
          nullif(trim(p_header->>'ph_name'), ''), nullif(trim(p_header->>'ph_permit_no'), ''), coalesce((p_header->>'ph_signed')::boolean, false),
          nullif(trim(p_header->>'client_name'), ''), nullif(trim(p_header->>'client_passport_no'), ''), coalesce((p_header->>'client_signed')::boolean, false),
          nullif(trim(p_header->>'ho_name'), ''), nullif(trim(p_header->>'ho_permit_no'), ''), coalesce((p_header->>'ho_signed')::boolean, false), now(), auth.uid())
  on conflict (hunt_id) do update set register_no = excluded.register_no, province = excluded.province, commenced = excluded.commenced, terminated = excluded.terminated,
    ph_name = excluded.ph_name, ph_permit_no = excluded.ph_permit_no, ph_signed = excluded.ph_signed, client_name = excluded.client_name,
    client_passport_no = excluded.client_passport_no, client_signed = excluded.client_signed, ho_name = excluded.ho_name, ho_permit_no = excluded.ho_permit_no,
    ho_signed = excluded.ho_signed, updated_at = now(), updated_by = auth.uid()
  returning id into v_id;
  delete from hunt_register_lines where register_id = v_id;
  for a in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    i := i + 1;
    insert into hunt_register_lines (register_id, line_no, farm_name, farm_reg_no, district, landowner, permit_no, date_killed, species, quantity, sex, parts)
    values (v_id, i, nullif(trim(a->>'farm_name'), ''), nullif(trim(a->>'farm_reg_no'), ''), nullif(trim(a->>'district'), ''), nullif(trim(a->>'landowner'), ''),
            nullif(trim(a->>'permit_no'), ''), nullif(a->>'date_killed', '')::date, nullif(trim(a->>'species'), ''), nullif(a->>'quantity', '')::int, nullif(trim(a->>'sex'), ''),
            coalesce(array(select jsonb_array_elements_text(coalesce(a->'parts', '[]'::jsonb))), '{}'));
  end loop;
end;
$$;
revoke all on function public.staff_save_register(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.staff_save_register(uuid, jsonb, jsonb) to authenticated;

create or replace function public.staff_override_check(p_hunt uuid, p_key text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._doc_is_staff() then raise exception 'Only managers can set a problem aside'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Say why this is acceptable'; end if;
  insert into register_overrides (hunt_id, check_key, reason, overridden_by) values (p_hunt, p_key, trim(p_reason), auth.uid())
  on conflict (hunt_id, check_key) do update set reason = excluded.reason, overridden_by = auth.uid(), created_at = now();
end;
$$;
revoke all on function public.staff_override_check(uuid, text, text) from public, anon;
grant execute on function public.staff_override_check(uuid, text, text) to authenticated;

create or replace function public.staff_clear_override(p_hunt uuid, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._doc_is_staff() then raise exception 'Only managers can change this'; end if;
  delete from register_overrides where hunt_id = p_hunt and check_key = p_key;
end;
$$;
revoke all on function public.staff_clear_override(uuid, text) from public, anon;
grant execute on function public.staff_clear_override(uuid, text) to authenticated;

drop function if exists public.staff_set_reference_numbers(uuid, text[]);
create or replace function public.staff_set_reference_numbers(p_req uuid, p_numbers text[], p_ph text default null, p_ho text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._doc_is_staff() then raise exception 'Only managers can change this'; end if;
  update hunt_requirements set reference_numbers = coalesce(array(select distinct trim(x) from unnest(coalesce(p_numbers, '{}')) x where trim(x) <> ''), '{}'),
         ph_permit_seen = nullif(trim(coalesce(p_ph, '')), ''), ho_permit_seen = nullif(trim(coalesce(p_ho, '')), '') where id = p_req;
end;
$$;
revoke all on function public.staff_set_reference_numbers(uuid, text[], text, text) from public, anon;
grant execute on function public.staff_set_reference_numbers(uuid, text[], text, text) to authenticated;

-- new checklists carry the register mark too
create or replace function public.generate_hunt_requirements(p_hunt uuid) returns int
language plpgsql security definer set search_path = public as $$
declare h record; n int;
begin
  select id, client_type, outfitter_id, province into h from client_hunts where id = p_hunt;
  if not found then return 0; end if;
  insert into hunt_requirements (hunt_id, document_type_id, name, responsible, needs_signature, needs_stamp, check_kind, must_show)
  select p_hunt, t.id, t.name,
         case when t.responsible = 'outfitter' and h.outfitter_id is null then 'hunter' else t.responsible end,
         t.needs_signature, t.needs_stamp, t.check_kind, t.must_show
    from document_types t
   where t.is_active
     and (t.applies_to = 'all' or t.applies_to = coalesce(h.client_type, 'export'))
     and (cardinality(t.provinces) = 0 or (h.province is not null and h.province = any(t.provinces)))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.generate_hunt_requirements(uuid) from public, anon;
grant execute on function public.generate_hunt_requirements(uuid) to authenticated;

-- checking a document: the four checks, everything that must be on it, and (for the register) no open problems
drop function if exists public.staff_review_requirement(uuid, boolean, boolean, boolean, boolean, boolean, text);
create or replace function public.staff_review_requirement(p_req uuid, p_approve boolean, p_correct boolean, p_complete boolean, p_signed boolean, p_stamped boolean, p_reason text default null, p_shown text[] default null) returns void
language plpgsql security definer set search_path = public as $$
declare r record; v_open int;
begin
  if not public._doc_is_staff() then raise exception 'Only managers can check documents'; end if;
  select * into r from hunt_requirements where id = p_req;
  if not found then raise exception 'That document is not on the list'; end if;
  if r.status not in ('received', 'approved', 'rejected') then raise exception 'There is nothing to check yet'; end if;
  if p_approve then
    if not (coalesce(p_correct, false) and coalesce(p_complete, false)) then raise exception 'A document must be correct and complete to be approved'; end if;
    if r.needs_signature and not coalesce(p_signed, false) then raise exception 'This document must be signed'; end if;
    if r.needs_stamp and not coalesce(p_stamped, false) then raise exception 'This document must be stamped'; end if;
    if not (r.must_show <@ coalesce(p_shown, '{}')) then raise exception 'Tick everything that must be on this document before approving it'; end if;
    if r.check_kind = 'register' then
      v_open := public._register_unresolved(r.hunt_id);
      if v_open > 0 then raise exception 'The hunt register still has % open problem(s). Fix them, or record why each is acceptable', v_open; end if;
    end if;
    update hunt_requirements set status = 'approved', checked_correct = true, checked_complete = true,
           checked_signed = coalesce(p_signed, false), checked_stamped = coalesce(p_stamped, false), shown_ok = coalesce(p_shown, '{}'),
           reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = null where id = p_req;
  else
    if coalesce(trim(p_reason), '') = '' then raise exception 'Tell them what is wrong so it can be fixed'; end if;
    update hunt_requirements set status = 'rejected', checked_correct = coalesce(p_correct, false), checked_complete = coalesce(p_complete, false),
           checked_signed = coalesce(p_signed, false), checked_stamped = coalesce(p_stamped, false), shown_ok = coalesce(p_shown, '{}'),
           reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = trim(p_reason) where id = p_req;
  end if;
end;
$$;
revoke all on function public.staff_review_requirement(uuid, boolean, boolean, boolean, boolean, boolean, text, text[]) from public, anon;
grant execute on function public.staff_review_requirement(uuid, boolean, boolean, boolean, boolean, boolean, text, text[]) to authenticated;

-- the signed copy of the receiving sheet is kept with the hunt (switch it off under Setup if you do not want it required)
insert into document_types (name, responsible, applies_to, provinces, needs_signature, needs_stamp, sort_order)
select 'Receiving sheet (signed copy)', 'workshop', 'all', '{}', true, false, 5
where not exists (select 1 from document_types t where t.name = 'Receiving sheet (signed copy)');
