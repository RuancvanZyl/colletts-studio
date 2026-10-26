-- Migration 054: permit numbers belong to the outfitter and PH profiles, and the AI reader.
-- Outfitters add and update their own permit number and their professional hunters' numbers (per year) in their portal.
-- A number an outfitter enters or changes is "not verified" until the workshop confirms it against the permit itself, and the
-- register cannot be approved until it is. Every change is logged. Also stores what the AI reader found on a scan. Needs 053.

alter table registered_numbers add column if not exists outfitter_id uuid references outfitters(id) on delete set null;
alter table registered_numbers add column if not exists verified_at timestamptz;
alter table registered_numbers add column if not exists verified_by uuid;
alter table registered_numbers add column if not exists updated_at timestamptz not null default now();
alter table registered_numbers add column if not exists updated_by_name text;
update registered_numbers set verified_at = coalesce(verified_at, created_at) where verified_at is null and outfitter_id is null;

alter table hunt_requirements add column if not exists ai_extracted jsonb;
alter table hunt_requirements add column if not exists ai_read_at timestamptz;

create table if not exists registered_number_history (
  id              uuid primary key default gen_random_uuid(),
  number_id       uuid not null,
  old_number      text,
  new_number      text,
  changed_by_name text,
  changed_at      timestamptz not null default now()
);
alter table registered_number_history enable row level security;
drop policy if exists "staff_read_number_history" on registered_number_history;
create policy "staff_read_number_history" on registered_number_history for select to authenticated using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

-- outfitters manage their own numbers (their own permit and the professional hunters they work with)
drop policy if exists "outfitter_own_numbers" on registered_numbers;
drop policy if exists "outfitter_read_own_numbers" on registered_numbers;
drop policy if exists "outfitter_add_own_numbers" on registered_numbers;
drop policy if exists "outfitter_change_own_numbers" on registered_numbers;
create policy "outfitter_read_own_numbers" on registered_numbers for select to authenticated
  using (outfitter_id is not null and exists (select 1 from outfitters o where o.id = outfitter_id and o.auth_user_id = auth.uid()));
create policy "outfitter_add_own_numbers" on registered_numbers for insert to authenticated
  with check (outfitter_id is not null and exists (select 1 from outfitters o where o.id = outfitter_id and o.auth_user_id = auth.uid()
                and (kind = 'ph_permit' or lower(trim(holder_name)) = lower(trim(o.name)))));
create policy "outfitter_change_own_numbers" on registered_numbers for update to authenticated
  using (outfitter_id is not null and exists (select 1 from outfitters o where o.id = outfitter_id and o.auth_user_id = auth.uid()))
  with check (outfitter_id is not null and exists (select 1 from outfitters o where o.id = outfitter_id and o.auth_user_id = auth.uid()
                and (kind = 'ph_permit' or lower(trim(holder_name)) = lower(trim(o.name)))));

create or replace function public._registered_number_touch() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select coalesce(sp.full_name, o.name, 'Someone') into v_name
    from (select 1) x left join staff_profiles sp on sp.id = auth.uid() left join outfitters o on o.auth_user_id = auth.uid() limit 1;
  if public._doc_is_staff() then
    if tg_op = 'INSERT' then
      new.verified_at := coalesce(new.verified_at, now()); new.verified_by := coalesce(new.verified_by, auth.uid());
    elsif new.number is distinct from old.number or lower(trim(new.holder_name)) is distinct from lower(trim(old.holder_name)) then
      new.verified_at := now(); new.verified_by := auth.uid();
    end if;
  else
    if tg_op = 'INSERT' or new.number is distinct from old.number or lower(trim(new.holder_name)) is distinct from lower(trim(old.holder_name)) or new.year is distinct from old.year then
      new.verified_at := null; new.verified_by := null;
    end if;
  end if;
  new.updated_at := now(); new.updated_by_name := v_name;
  return new;
end;
$$;
drop trigger if exists trg_registered_number_touch on registered_numbers;
create trigger trg_registered_number_touch before insert or update on registered_numbers for each row execute function public._registered_number_touch();

create or replace function public._registered_number_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.number is distinct from old.number then
    insert into registered_number_history (number_id, old_number, new_number, changed_by_name) values (new.id, old.number, new.number, new.updated_by_name);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_registered_number_log on registered_numbers;
create trigger trg_registered_number_log after update on registered_numbers for each row execute function public._registered_number_log();

create or replace function public.staff_verify_number(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._doc_is_staff() then raise exception 'Only managers can verify a permit number'; end if;
  update registered_numbers set verified_at = now(), verified_by = auth.uid() where id = p_id;
end;
$$;
revoke all on function public.staff_verify_number(uuid) from public, anon;
grant execute on function public.staff_verify_number(uuid) to authenticated;

-- what the AI reader found on a scan (the workshop still confirms every field)
create or replace function public.staff_save_ai_reading(p_req uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._doc_is_staff() then raise exception 'Only managers can use the AI reader'; end if;
  update hunt_requirements set ai_extracted = p_data, ai_read_at = now() where id = p_req;
end;
$$;
revoke all on function public.staff_save_ai_reading(uuid, jsonb) from public, anon;
grant execute on function public.staff_save_ai_reading(uuid, jsonb) to authenticated;

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
    select number, verified_at into rn from registered_numbers where kind = 'ph_permit' and year = yr and lower(trim(holder_name)) = lower(trim(coalesce(r.ph_name, ''))) limit 1;
    if found then
      if public._norm_num(rn.number) <> public._norm_num(r.ph_permit_no) then
        v := v || public._finding('header:ph_permit_no', 'error', 'Professional hunter', 'ph_permit_no', format('PH permit number %s does not match %s, the number on file for %s in %s', r.ph_permit_no, rn.number, r.ph_name, yr));
      elsif rn.verified_at is null then
        v := v || public._finding('header:ph_permit_no', 'error', 'Professional hunter', 'ph_permit_no', format('PH permit number %s was entered by the outfitter and the workshop has not verified it against the permit yet', r.ph_permit_no));
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
    select number, verified_at into rn from registered_numbers where kind = 'ho_permit' and year = yr and lower(trim(holder_name)) = lower(trim(coalesce(r.ho_name, ''))) limit 1;
    if found then
      if public._norm_num(rn.number) <> public._norm_num(r.ho_permit_no) then
        v := v || public._finding('header:ho_permit_no', 'error', 'Hunting outfitter', 'ho_permit_no', format('Outfitter permit number %s does not match %s, the number on file for %s in %s', r.ho_permit_no, rn.number, r.ho_name, yr));
      elsif rn.verified_at is null then
        v := v || public._finding('header:ho_permit_no', 'error', 'Hunting outfitter', 'ho_permit_no', format('Outfitter permit number %s was entered by the outfitter and the workshop has not verified it against the permit yet', r.ho_permit_no));
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

  -- what the AI reader noticed on the scans (stamp faint, crossed out, unclear digits and so on)
  for s in select id, name, ai_extracted->'flags' as flags from hunt_requirements where hunt_id = p_hunt and jsonb_typeof(ai_extracted->'flags') = 'array' loop
    for n in 0 .. jsonb_array_length(s.flags) - 1 loop
      v := v || public._finding('ai:' || s.id || ':' || n, 'warn', 'Noticed by the AI reader', null, format('%s: %s', s.name, s.flags->>n));
    end loop;
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
