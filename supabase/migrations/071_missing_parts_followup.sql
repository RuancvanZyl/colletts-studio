-- Migration 071: parts that did not arrive. When an animal is received with parts missing, the outfitter is told in the hunt's
-- conversation (topic "A trophy"), gives a plan (the date they will arrive), is reminded every 3 days, and the workshop sees it in
-- red until the parts are received (the follow-up closes by itself when the animal moves on from Receiving). Needs migration 064.

create table if not exists part_followups (
  id                uuid primary key default gen_random_uuid(),
  hunt_id           uuid not null references client_hunts(id) on delete cascade,
  doc_id            uuid not null references hunt_documents(id) on delete cascade,
  outfitter_id      uuid references outfitters(id) on delete set null,
  parts             text[] not null,
  opened_at         timestamptz not null default now(),
  opened_by_name    text,
  plan_date         date,
  plan_note         text,
  plan_at           timestamptz,
  last_reminded_at  timestamptz,
  reminder_count    integer not null default 0,
  resolved_at       timestamptz,
  resolved_reason   text check (resolved_reason in ('received', 'never_sent', 'cancelled'))
);
create unique index if not exists uq_part_followups_open on part_followups (doc_id) where resolved_at is null;
create index if not exists idx_part_followups_hunt on part_followups (hunt_id);
alter table part_followups enable row level security;
drop policy if exists "staff_read_part_followups" on part_followups;
create policy "staff_read_part_followups" on part_followups for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
grant select on part_followups to authenticated;

create or replace function public._part_label(c text) returns text language sql immutable as $$
  select case c when 'SKULL' then 'Skull' when 'CAPE' then 'Cape' when 'BSKIN' then 'Back skin' when 'FLATSKIN' then 'Flat skin'
    when 'FSKIN' then 'Full skin' when 'FEET' then 'Feet' when 'LEGBONES' then 'Leg bones' when 'SCROTUM' then 'Scrotum'
    when 'TAIL' then 'Tail' when 'TUSKS' then 'Tusks' when 'PANEL' then 'Panel' else c end
$$;
create or replace function public._part_labels(p text[]) returns text language sql immutable as $$
  select string_agg(public._part_label(x), ', ' order by ord) from unnest(p) with ordinality as t(x, ord)
$$;
grant execute on function public._part_label(text), public._part_labels(text[]) to authenticated;

-- in-app message to the outfitter about a trophy (from the workshop or, for a plan, from the outfitter)
create or replace function public._followup_message(p_hunt uuid, p_doc uuid, p_sender text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_out uuid; v_name text;
begin
  select outfitter_id into v_out from client_hunts where id = p_hunt;
  if v_out is null then return; end if;
  if p_sender = 'outfitter' then select name into v_name from outfitters where id = v_out;
  else v_name := coalesce((select full_name from staff_profiles where id = auth.uid()), 'The workshop'); end if;
  insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, topic, job_doc_id)
  values (p_hunt, v_out, p_sender, auth.uid(), v_name, p_body, 'job_card', p_doc);
end;
$$;
revoke all on function public._followup_message(uuid, uuid, text, text) from public, anon, authenticated;

-- staff: parts did not arrive for this animal. Opens (or updates) the follow-up and tells the outfitter.
create or replace function public.staff_open_part_followup(p_doc uuid, p_parts text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare d record; v_name text; v_id uuid; v_old text[]; v_species text; v_client text;
begin
  if not exists (select 1 from staff_profiles where id = auth.uid() and is_active) then raise exception 'Only staff can do this'; end if;
  if coalesce(cardinality(p_parts), 0) = 0 then raise exception 'Say which parts are missing'; end if;
  select hd.id, hd.hunt_id, hd.form_data, h.outfitter_id, c.full_name into d
    from hunt_documents hd join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id where hd.id = p_doc;
  if not found then raise exception 'That animal was not found'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  v_species := coalesce(d.form_data->>'species', 'trophy'); v_client := d.full_name;
  select id, parts into v_id, v_old from part_followups where doc_id = p_doc and resolved_at is null;
  if v_id is null then
    insert into part_followups (hunt_id, doc_id, outfitter_id, parts, opened_by_name) values (d.hunt_id, p_doc, d.outfitter_id, p_parts, v_name) returning id into v_id;
  elsif v_old is distinct from p_parts then
    update part_followups set parts = p_parts where id = v_id;
  else
    return v_id;   -- nothing new to say
  end if;
  perform public._followup_message(d.hunt_id, p_doc, 'workshop',
    'Part of the ' || v_species || ' for ' || v_client || ' did not arrive: ' || public._part_labels(p_parts) ||
    '. Please tell us when it will arrive: open "Parts missing" on your home screen and give us the date. We will remind you every few days until it is here.');
  return v_id;
end;
$$;
revoke all on function public.staff_open_part_followup(uuid, text[]) from public, anon;
grant execute on function public.staff_open_part_followup(uuid, text[]) to authenticated;

-- staff: close it (the rest arrived, or it was never sent)
create or replace function public.staff_close_part_followup(p_doc uuid, p_reason text default 'received') returns void
language plpgsql security definer set search_path = public as $$
declare f record; v_species text; v_client text;
begin
  if not exists (select 1 from staff_profiles where id = auth.uid() and is_active) then raise exception 'Only staff can do this'; end if;
  if p_reason not in ('received', 'never_sent', 'cancelled') then raise exception 'Unknown reason'; end if;
  select * into f from part_followups where doc_id = p_doc and resolved_at is null;
  if not found then return; end if;
  update part_followups set resolved_at = now(), resolved_reason = p_reason where id = f.id;
  select hd.form_data->>'species', c.full_name into v_species, v_client from hunt_documents hd join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id where hd.id = p_doc;
  perform public._followup_message(f.hunt_id, p_doc, 'workshop', case p_reason
    when 'received' then 'Thank you: the ' || coalesce(v_species, 'trophy') || ' for ' || v_client || ' has now arrived complete.'
    else 'The missing parts of the ' || coalesce(v_species, 'trophy') || ' for ' || v_client || ' are closed: they were not expected after all.' end);
end;
$$;
revoke all on function public.staff_close_part_followup(uuid, text) from public, anon;
grant execute on function public.staff_close_part_followup(uuid, text) to authenticated;

-- when the animal moves on from Receiving, the missing parts have arrived: close it by itself
create or replace function public._followup_received() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record; v_client text;
begin
  if old.current_department = 'receiving' and new.current_department is distinct from 'receiving' then
    select * into f from part_followups where doc_id = new.id and resolved_at is null;
    if found then
      update part_followups set resolved_at = now(), resolved_reason = 'received' where id = f.id;
      select c.full_name into v_client from client_hunts h join clients c on c.id = h.client_id where h.id = f.hunt_id;
      perform public._followup_message(f.hunt_id, new.id, 'workshop', 'Thank you: the ' || coalesce(new.form_data->>'species', 'trophy') || ' for ' || coalesce(v_client, 'the hunter') || ' has now arrived complete.');
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_followup_received on hunt_documents;
create trigger trg_followup_received after update of current_department on hunt_documents for each row execute function public._followup_received();

-- the outfitter's list: what is still missing on their hunts, with their plan
create or replace function public.outfitter_part_followups() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; o record;
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  if not found then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id, 'hunt_id', f.hunt_id, 'doc_id', f.doc_id, 'client', c.full_name, 'species', d.form_data->>'species',
      'parts', public._part_labels(f.parts), 'opened_at', f.opened_at, 'plan_date', f.plan_date, 'plan_note', f.plan_note, 'plan_at', f.plan_at,
      'reminders', f.reminder_count, 'last_reminded_at', f.last_reminded_at) order by f.opened_at), '[]'::jsonb) into v
  from part_followups f join hunt_documents d on d.id = f.doc_id join client_hunts h on h.id = f.hunt_id join clients c on c.id = h.client_id
  where f.outfitter_id = o.id and f.resolved_at is null;
  return v;
end;
$$;
revoke all on function public.outfitter_part_followups() from public, anon;
grant execute on function public.outfitter_part_followups() to authenticated;

-- the outfitter's plan: the date the missing parts will arrive (written into the conversation too)
create or replace function public.outfitter_set_part_plan(p_followup uuid, p_date date, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare f record; o record; v_species text; v_client text;
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  select * into f from part_followups where id = p_followup and resolved_at is null;
  if not found or o.id is null or f.outfitter_id is distinct from o.id then raise exception 'That is not yours'; end if;
  if p_date is null then raise exception 'Choose the date the parts will arrive'; end if;
  update part_followups set plan_date = p_date, plan_note = nullif(trim(coalesce(p_note, '')), ''), plan_at = now() where id = f.id;
  select d.form_data->>'species', c.full_name into v_species, v_client from hunt_documents d join client_hunts h on h.id = d.hunt_id join clients c on c.id = h.client_id where d.id = f.doc_id;
  perform public._followup_message(f.hunt_id, f.doc_id, 'outfitter',
    'Plan for the ' || coalesce(v_species, 'trophy') || ' for ' || v_client || ' (' || public._part_labels(f.parts) || '): it will arrive by ' || to_char(p_date, 'DD Mon YYYY') ||
    coalesce('. ' || nullif(trim(coalesce(p_note, '')), ''), '') || '.');
end;
$$;
revoke all on function public.outfitter_set_part_plan(uuid, date, text) from public, anon;
grant execute on function public.outfitter_set_part_plan(uuid, date, text) to authenticated;

-- reminders: every 3 days until the parts are received (run daily by the schedule below, or by staff with the button)
create or replace function public._remind_one(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare f record; v_species text; v_client text;
begin
  select * into f from part_followups where id = p_id and resolved_at is null;
  if not found or f.outfitter_id is null then return; end if;
  select d.form_data->>'species', c.full_name into v_species, v_client from hunt_documents d join client_hunts h on h.id = d.hunt_id join clients c on c.id = h.client_id where d.id = f.doc_id;
  insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, topic, job_doc_id)
  values (f.hunt_id, f.outfitter_id, 'workshop', auth.uid(), coalesce((select full_name from staff_profiles where id = auth.uid()), 'The workshop'),
    'Reminder: the ' || public._part_labels(f.parts) || ' of the ' || coalesce(v_species, 'trophy') || ' for ' || v_client || ' has still not arrived.' ||
    case when f.plan_date is not null and f.plan_date < current_date then ' You told us it would come by ' || to_char(f.plan_date, 'DD Mon YYYY') || '. That date has passed: please give us a new date.'
         when f.plan_date is not null then ' You told us it will come by ' || to_char(f.plan_date, 'DD Mon YYYY') || '.'
         else ' Please open "Parts missing" on your home screen and tell us when it will arrive.' end,
    'job_card', f.doc_id);
  update part_followups set last_reminded_at = now(), reminder_count = reminder_count + 1 where id = f.id;
end;
$$;
revoke all on function public._remind_one(uuid) from public, anon, authenticated;

create or replace function public.remind_part_followups() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  if auth.uid() is not null and not exists (select 1 from staff_profiles where id = auth.uid() and is_active) then raise exception 'Only staff can do this'; end if;
  for r in select id from part_followups where resolved_at is null and outfitter_id is not null and coalesce(last_reminded_at, opened_at) <= now() - interval '3 days' loop
    perform public._remind_one(r.id); n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.remind_part_followups() from public, anon;
grant execute on function public.remind_part_followups() to authenticated;

-- staff: remind this outfitter now
create or replace function public.staff_remind_part_followup(p_followup uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from staff_profiles where id = auth.uid() and is_active) then raise exception 'Only staff can do this'; end if;
  perform public._remind_one(p_followup);
end;
$$;
revoke all on function public.staff_remind_part_followup(uuid) from public, anon;
grant execute on function public.staff_remind_part_followup(uuid) to authenticated;

-- run the reminders every morning (06:00 server time) when the database has the scheduler; skipped quietly when it does not
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'remind-missing-parts';
    perform cron.schedule('remind-missing-parts', '0 6 * * *', 'select public.remind_part_followups()');
  end if;
exception when others then
  raise notice 'The daily reminder could not be scheduled: %', sqlerrm;
end;
$$;

-- Check (should say true, and show the daily schedule if it could be set up):
select count(*) = 1 as followups_ready from information_schema.tables where table_name = 'part_followups';
