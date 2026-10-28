-- Migration 058: the tannery soak report, its accept / reject, and what happens when a skin is rejected.
-- At the tannery a soak report is done for every skin: in-house (a checklist) or by a third-party tannery (their report). The
-- tannery lead (or management) accepts it or rejects it with reasons. A tracked card cannot leave the tannery until its soak
-- report is accepted. A rejection opens a case: the outfitter is notified with the reasons and must acknowledge it (recorded),
-- the outfitter and the workshop talk in the case thread (in the app or logged from WhatsApp), and the outcome is one of
-- three: replaced by the outfitter, replaced from the workshop's stock, or a decision by the client. Needs 057 and 051.

create table if not exists soak_reports (
  id                uuid primary key default gen_random_uuid(),
  job_doc_id        uuid not null references hunt_documents(id) on delete cascade,
  tannery_type      text not null check (tannery_type in ('in_house', 'third_party')),
  tannery_name      text,
  findings          jsonb not null default '{}'::jsonb,
  holes             int,
  file_paths        text[] not null default '{}',
  notes             text,
  status            text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected')),
  submitted_by      uuid,
  submitted_by_name text,
  submitted_at      timestamptz not null default now(),
  reviewed_by       uuid,
  reviewed_by_name  text,
  reviewed_at       timestamptz,
  rejection_reasons text[] not null default '{}',
  rejection_note    text
);
create index if not exists idx_soak_reports_doc on soak_reports (job_doc_id, submitted_at desc);
alter table soak_reports enable row level security;
drop policy if exists "staff_read_soak_reports" on soak_reports;
create policy "staff_read_soak_reports" on soak_reports for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

create table if not exists quality_cases (
  id                   uuid primary key default gen_random_uuid(),
  hunt_id              uuid not null references client_hunts(id) on delete cascade,
  job_doc_id           uuid not null references hunt_documents(id) on delete cascade,
  soak_report_id       uuid references soak_reports(id) on delete set null,
  outfitter_id         uuid references outfitters(id) on delete set null,
  status               text not null default 'open' check (status in ('open', 'outcome_set', 'resolved')),
  reasons              text[] not null default '{}',
  note                 text,
  created_at           timestamptz not null default now(),
  created_by_name      text,
  outfitter_notified_at timestamptz,
  outfitter_ack_at     timestamptz,
  outfitter_ack_by_name text,
  ai_recommendation    jsonb,
  ai_recommended_at    timestamptz,
  outcome              text check (outcome in ('outfitter_replacement', 'stock_replacement', 'client_decision')),
  outcome_note         text,
  stock_reference      text,
  outcome_by_name      text,
  outcome_at           timestamptz,
  client_informed_by   text check (client_informed_by in ('outfitter', 'workshop')),
  client_informed_at   timestamptz,
  client_decision      text check (client_decision in ('change_order', 'scrap')),
  client_decision_note text,
  needs_job_card_change boolean not null default false,
  needs_quote_change   boolean not null default false,
  resolved_at          timestamptz,
  resolved_by_name     text,
  resolution_note      text
);
create index if not exists idx_quality_cases_hunt on quality_cases (hunt_id, created_at desc);
alter table quality_cases enable row level security;
drop policy if exists "staff_read_quality_cases" on quality_cases;
create policy "staff_read_quality_cases" on quality_cases for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

-- case conversations live with the outfitter chat
alter table outfitter_messages add column if not exists case_id uuid references quality_cases(id) on delete set null;
alter table outfitter_messages add column if not exists channel text not null default 'app';

-- ── the soak report ─────────────────────────────────────────────────────────────
create or replace function public.soak_submit(p_doc uuid, p_type text, p_name text, p_findings jsonb, p_holes int, p_files text[], p_notes text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_dept text; v_leg text; v_name text; v_id uuid; k text;
begin
  if public._apex_staff_role() is null then raise exception 'Staff only'; end if;
  select current_department into v_dept from hunt_documents where id = p_doc and doc_type = 'job_card';
  if not found then raise exception 'Job card not found'; end if;
  if v_dept <> 'tannery' then raise exception 'A soak report is done while the card is at the tannery'; end if;
  v_leg := public._open_leg_state(p_doc, 'tannery');
  if v_leg = 'waiting' then raise exception 'The tannery lead must accept this card first'; end if;
  if exists (select 1 from soak_reports where job_doc_id = p_doc and status = 'submitted') then raise exception 'A soak report is already waiting to be accepted or rejected'; end if;
  if p_type = 'in_house' then
    if coalesce(p_findings->>'ears', '') not in ('turned', 'not_turned', 'damaged') then raise exception 'Record the ears: turned, not turned or damaged'; end if;
    foreach k in array array['eyes', 'lips', 'nose'] loop
      if coalesce(p_findings->>k, '') not in ('good', 'cut') then raise exception 'Record the %: good or cut', k; end if;
    end loop;
    foreach k in array array['bullet_damage', 'hair_slip', 'bug_damage', 'rubbery'] loop
      if jsonb_typeof(p_findings->k) is distinct from 'boolean' then raise exception 'Answer yes or no for %', replace(k, '_', ' '); end if;
    end loop;
    if p_holes is null or p_holes < 0 then raise exception 'Record the number of holes in the skin'; end if;
  elsif p_type = 'third_party' then
    if coalesce(trim(p_name), '') = '' then raise exception 'Say which tannery did the soak'; end if;
    if coalesce(array_length(p_files, 1), 0) = 0 and coalesce(trim(p_notes), '') = '' then raise exception 'Attach the tannery''s soak report or write what it says'; end if;
  else
    raise exception 'Choose in-house or third-party';
  end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  insert into soak_reports (job_doc_id, tannery_type, tannery_name, findings, holes, file_paths, notes, submitted_by, submitted_by_name)
  values (p_doc, p_type, nullif(trim(coalesce(p_name, '')), ''), coalesce(p_findings, '{}'::jsonb), p_holes, coalesce(p_files, '{}'), nullif(trim(coalesce(p_notes, '')), ''), auth.uid(), v_name)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.soak_submit(uuid, text, text, jsonb, int, text[], text) from public, anon;
grant execute on function public.soak_submit(uuid, text, text, jsonb, int, text[], text) to authenticated;

create or replace function public._soak_accepted(p_doc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'accepted' from soak_reports where job_doc_id = p_doc order by submitted_at desc limit 1), false)
$$;
revoke all on function public._soak_accepted(uuid) from public, anon, authenticated;

-- accept, or reject with reasons (a rejection opens a case and tells the outfitter)
create or replace function public.soak_review(p_report uuid, p_accept boolean, p_reasons text[] default null, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare r soak_reports%rowtype; v_name text; v_hunt uuid; v_out uuid; v_case uuid; v_species text; v_body text;
begin
  if public._apex_staff_role() is null then raise exception 'Staff only'; end if;
  if not public._can_accept('tannery') then raise exception 'Only the tannery lead or management can accept or reject a soak report'; end if;
  select * into r from soak_reports where id = p_report;
  if not found then raise exception 'That soak report does not exist'; end if;
  if r.status <> 'submitted' then raise exception 'This soak report has already been reviewed'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  if p_accept then
    update soak_reports set status = 'accepted', reviewed_by = auth.uid(), reviewed_by_name = v_name, reviewed_at = now() where id = p_report;
    return null;
  end if;
  if coalesce(array_length(p_reasons, 1), 0) = 0 then raise exception 'Give at least one reason for rejecting it'; end if;
  update soak_reports set status = 'rejected', reviewed_by = auth.uid(), reviewed_by_name = v_name, reviewed_at = now(),
         rejection_reasons = p_reasons, rejection_note = nullif(trim(coalesce(p_note, '')), '') where id = p_report;
  select d.hunt_id, d.form_data->>'species', h.outfitter_id into v_hunt, v_species, v_out
    from hunt_documents d join client_hunts h on h.id = d.hunt_id where d.id = r.job_doc_id;
  insert into quality_cases (hunt_id, job_doc_id, soak_report_id, outfitter_id, reasons, note, created_by_name, outfitter_notified_at)
  values (v_hunt, r.job_doc_id, p_report, v_out, p_reasons, nullif(trim(coalesce(p_note, '')), ''), v_name, case when v_out is not null then now() end)
  returning id into v_case;
  if v_out is not null then
    v_body := 'The ' || coalesce(v_species, 'skin') || ' was rejected at the soak. Reasons: ' || array_to_string(p_reasons, ', ') || coalesce('. ' || nullif(trim(coalesce(p_note, '')), ''), '') || '. Please acknowledge this and tell us how you want to proceed.';
    insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, case_id, channel)
    values (v_hunt, v_out, 'workshop', auth.uid(), v_name, v_body, v_case, 'system');
  end if;
  return v_case;
end;
$$;
revoke all on function public.soak_review(uuid, boolean, text[], text) from public, anon;
grant execute on function public.soak_review(uuid, boolean, text[], text) to authenticated;

-- reports waiting for the tannery lead
create or replace function public.my_soak_reviews() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if public._apex_staff_role() is null or not public._can_accept('tannery') then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.j order by x.submitted_at), '[]'::jsonb) into v from (
    select s.submitted_at, jsonb_build_object(
      'id', s.id, 'doc_id', s.job_doc_id, 'client', c.full_name, 'species', d.form_data->>'species', 'mount', d.form_data->>'mount_type',
      'type', s.tannery_type, 'tannery_name', s.tannery_name, 'findings', s.findings, 'holes', s.holes, 'files', s.file_paths, 'notes', s.notes,
      'by', s.submitted_by_name, 'submitted_at', s.submitted_at, 'hunt_id', d.hunt_id) as j
    from soak_reports s join hunt_documents d on d.id = s.job_doc_id
    left join client_hunts h on h.id = d.hunt_id left join clients c on c.id = h.client_id
    where s.status = 'submitted'
  ) x;
  return v;
end;
$$;
revoke all on function public.my_soak_reviews() from public, anon;
grant execute on function public.my_soak_reviews() to authenticated;

-- ── the outfitter's side of a case ───────────────────────────────────────────────
create or replace function public.outfitter_cases() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; o record;
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  if not found then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) into v from (
    select q.created_at, jsonb_build_object(
      'id', q.id, 'hunt_id', q.hunt_id, 'status', q.status, 'client', c.full_name, 'species', d.form_data->>'species',
      'reasons', q.reasons, 'note', q.note, 'created_at', q.created_at, 'ack_at', q.outfitter_ack_at, 'outcome', q.outcome, 'resolved_at', q.resolved_at) as j
    from quality_cases q
    join hunt_documents d on d.id = q.job_doc_id
    join client_hunts h on h.id = q.hunt_id join clients c on c.id = h.client_id
    where q.outfitter_id = o.id
  ) x;
  return v;
end;
$$;
revoke all on function public.outfitter_cases() from public, anon;
grant execute on function public.outfitter_cases() to authenticated;

create or replace function public.outfitter_ack_case(p_case uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o record;
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  if not found then raise exception 'This account is not an outfitter'; end if;
  update quality_cases set outfitter_ack_at = coalesce(outfitter_ack_at, now()), outfitter_ack_by_name = coalesce(outfitter_ack_by_name, o.name)
   where id = p_case and outfitter_id = o.id;
  if not found then raise exception 'That case is not yours'; end if;
end;
$$;
revoke all on function public.outfitter_ack_case(uuid) from public, anon;
grant execute on function public.outfitter_ack_case(uuid) to authenticated;

-- messages in a case (replaces the earlier version; the case is optional)
drop function if exists public.send_outfitter_message(uuid, text, uuid);
create or replace function public.send_outfitter_message(p_hunt uuid, p_body text, p_requirement uuid default null, p_case uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_out uuid; v_sender text; v_name text; v_id uuid;
begin
  if coalesce(trim(p_body), '') = '' then raise exception 'Write a message first'; end if;
  select outfitter_id into v_out from client_hunts where id = p_hunt;
  if v_out is null then raise exception 'This hunt has no outfitter'; end if;
  if p_case is not null and not exists (select 1 from quality_cases where id = p_case and hunt_id = p_hunt) then raise exception 'That case is not on this hunt'; end if;
  if public._my_outfitter_hunt(p_hunt) then
    v_sender := 'outfitter'; select name into v_name from outfitters where id = v_out;
  elsif public._apex_can_message_clients() then
    v_sender := 'workshop'; select full_name into v_name from staff_profiles where id = auth.uid();
  else
    raise exception 'Only managers can message outfitters';
  end if;
  insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, requirement_id, case_id)
  values (p_hunt, v_out, v_sender, auth.uid(), v_name, trim(p_body), p_requirement, p_case) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.send_outfitter_message(uuid, text, uuid, uuid) from public, anon;
grant execute on function public.send_outfitter_message(uuid, text, uuid, uuid) to authenticated;

-- what was said on WhatsApp, written into the case so it is on record (and can be read for a recommendation)
create or replace function public.log_case_whatsapp(p_case uuid, p_from text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare q quality_cases%rowtype; v_name text; v_out text;
begin
  if not public._apex_can_message_clients() then raise exception 'Only managers can log a conversation'; end if;
  if p_from not in ('outfitter', 'workshop') then raise exception 'Say who said it'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Write what was said'; end if;
  select * into q from quality_cases where id = p_case;
  if not found then raise exception 'That case does not exist'; end if;
  if q.outfitter_id is null then raise exception 'This case has no outfitter'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  select name into v_out from outfitters where id = q.outfitter_id;
  insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, case_id, channel)
  values (q.hunt_id, q.outfitter_id, p_from, auth.uid(), case when p_from = 'outfitter' then v_out else v_name end || ' (WhatsApp, logged by ' || coalesce(v_name, 'staff') || ')', trim(p_body), p_case, 'whatsapp');
end;
$$;
revoke all on function public.log_case_whatsapp(uuid, text, text) from public, anon;
grant execute on function public.log_case_whatsapp(uuid, text, text) to authenticated;

-- ── the outcome: one of three ───────────────────────────────────────────────────
create or replace function public.case_set_outcome(p_case uuid, p_outcome text, p_note text default null, p_stock_ref text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public._can_accept('tannery') then raise exception 'Only the tannery lead or management can set the outcome'; end if;
  if p_outcome not in ('outfitter_replacement', 'stock_replacement', 'client_decision') then raise exception 'Choose one of the three outcomes'; end if;
  if p_outcome = 'stock_replacement' and coalesce(trim(p_stock_ref), '') = '' then raise exception 'Say which skin from stock replaces it'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  update quality_cases set outcome = p_outcome, outcome_note = nullif(trim(coalesce(p_note, '')), ''), stock_reference = nullif(trim(coalesce(p_stock_ref, '')), ''),
         outcome_by_name = v_name, outcome_at = now(), status = 'outcome_set',
         needs_quote_change = (p_outcome = 'stock_replacement')
   where id = p_case and status <> 'resolved';
  if not found then raise exception 'That case does not exist or is already resolved'; end if;
end;
$$;
revoke all on function public.case_set_outcome(uuid, text, text, text) from public, anon;
grant execute on function public.case_set_outcome(uuid, text, text, text) to authenticated;

-- the client's side: who told them, and what they decided
create or replace function public.case_record_client(p_case uuid, p_informed_by text, p_decision text default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._can_accept('tannery') then raise exception 'Only the tannery lead or management can record this'; end if;
  if p_informed_by not in ('outfitter', 'workshop') then raise exception 'Say who informed the client'; end if;
  if p_decision is not null and p_decision not in ('change_order', 'scrap') then raise exception 'The client decides to change the order or scrap it'; end if;
  update quality_cases set client_informed_by = p_informed_by, client_informed_at = coalesce(client_informed_at, now()),
         client_decision = p_decision, client_decision_note = nullif(trim(coalesce(p_note, '')), ''),
         needs_job_card_change = (p_decision is not null), needs_quote_change = (p_decision is not null) or needs_quote_change
   where id = p_case and outcome = 'client_decision' and status <> 'resolved';
  if not found then raise exception 'This case is not waiting for a client decision'; end if;
end;
$$;
revoke all on function public.case_record_client(uuid, text, text, text) from public, anon;
grant execute on function public.case_record_client(uuid, text, text, text) to authenticated;

create or replace function public.case_resolve(p_case uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public._can_accept('tannery') then raise exception 'Only the tannery lead or management can close a case'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  update quality_cases set status = 'resolved', resolved_at = now(), resolved_by_name = v_name, resolution_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_case and outcome is not null and status <> 'resolved';
  if not found then raise exception 'Set the outcome before closing the case'; end if;
end;
$$;
revoke all on function public.case_resolve(uuid, text) from public, anon;
grant execute on function public.case_resolve(uuid, text) to authenticated;

-- a card cannot leave the tannery until its soak report is accepted
create or replace function public._job_card_protocol() returns trigger
language plpgsql as $$
declare v_open integer; v_total integer; v_leg text;
begin
  if new.doc_type <> 'job_card' then return new; end if;
  if new.current_department is distinct from old.current_department and old.current_department is not null then
    if auth.uid() is not null and coalesce(current_setting('apex.override', true), '') <> 'on' then
      select count(*) filter (where not exists (
               select 1 from job_checklist_progress p where p.job_doc_id = old.id and p.item_id = i.id and p.done)),
             count(*)
        into v_open, v_total
      from department_checklist_items i
      where i.dept_key = old.current_department and i.is_active;
      if v_open > 0 then
        raise exception 'Checklist incomplete: % of % steps still to be ticked. Tick them in My Tasks or the department station first.', v_open, v_total
          using errcode = 'P0001';
      end if;
      v_leg := public._open_leg_state(old.id, old.current_department);
      if v_leg = 'waiting' then
        raise exception 'Not accepted yet: the % lead must accept this card before it can be completed.', old.current_department using errcode = 'P0001';
      end if;
      if v_leg <> 'none' and old.current_department in ('mounting', 'finishing') and cardinality(coalesce(new.completion_photo_paths, '{}')) = 0 then
        raise exception 'A time-stamped photo is required before this card can leave %.', old.current_department using errcode = 'P0001';
      end if;
      if v_leg <> 'none' and old.current_department = 'tannery' and not public._soak_accepted(old.id) then
        raise exception 'The soak report must be done and accepted before this card can leave the tannery.' using errcode = 'P0001';
      end if;
    end if;
    new.opened_at := null; new.started_at := null; new.started_by := null;
    new.assigned_to := null; new.assigned_at := null; new.assigned_by := null;
  end if;
  return new;
end;
$$;
