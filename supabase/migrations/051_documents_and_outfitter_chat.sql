-- Migration 051: the document check and the outfitter chat.
--
-- Trophies cannot be exported unless the paperwork is correct, complete, signed and stamped. Most of it is the
-- outfitter's job, but hunters blame the workshop for the wait. So every hunt has a checklist of required documents,
-- each with who is responsible, a status everybody can see, and a workshop check (correct / complete / signed / stamped)
-- before it counts as approved. Final dispatch is blocked until every required document is approved.
-- Outfitters and the workshop talk in one thread per hunt.

-- ── what documents exist (the workshop defines the list in Setup) ────────────
create table if not exists document_types (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  responsible     text not null default 'outfitter' check (responsible in ('outfitter', 'hunter', 'workshop', 'authority')),
  applies_to      text not null default 'export' check (applies_to in ('all', 'export', 'local')),
  needs_signature boolean not null default true,
  needs_stamp     boolean not null default true,
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ── the checklist of one hunt ─────────────────────────────────────────────────
create table if not exists hunt_requirements (
  id                uuid primary key default gen_random_uuid(),
  hunt_id           uuid not null references client_hunts(id) on delete cascade,
  document_type_id  uuid references document_types(id) on delete set null,
  name              text not null,
  responsible       text not null check (responsible in ('outfitter', 'hunter', 'workshop', 'authority')),
  needs_signature   boolean not null default true,
  needs_stamp       boolean not null default true,
  status            text not null default 'awaiting' check (status in ('awaiting', 'received', 'approved', 'rejected', 'not_needed')),
  file_paths        text[] not null default '{}',
  note              text,
  requested_at      timestamptz not null default now(),
  received_at       timestamptz,
  received_by_name  text,
  checked_correct   boolean not null default false,
  checked_complete  boolean not null default false,
  checked_signed    boolean not null default false,
  checked_stamped   boolean not null default false,
  reviewed_at       timestamptz,
  reviewed_by       uuid references staff_profiles(id),
  rejection_reason  text
);
create unique index if not exists hunt_requirements_one_per_type on hunt_requirements(hunt_id, document_type_id) where document_type_id is not null;
create index if not exists idx_hunt_requirements_hunt on hunt_requirements(hunt_id);

create or replace function public._doc_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager', 'bookkeeper'))
$$;
grant execute on function public._doc_is_staff() to authenticated;

create or replace function public._my_outfitter_hunt(p_hunt uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from client_hunts h join outfitters o on o.id = h.outfitter_id where h.id = p_hunt and o.auth_user_id = auth.uid())
$$;
create or replace function public._my_own_hunt(p_hunt uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from client_hunts h join clients c on c.id = h.client_id where h.id = p_hunt and c.auth_user_id = auth.uid())
$$;
grant execute on function public._my_outfitter_hunt(uuid), public._my_own_hunt(uuid) to authenticated;

alter table document_types enable row level security;
alter table hunt_requirements enable row level security;

drop policy if exists "staff_read_document_types" on document_types;
create policy "staff_read_document_types" on document_types for select to authenticated using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop policy if exists "admins_write_document_types" on document_types;
create policy "admins_write_document_types" on document_types for all to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')))
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));

drop policy if exists "staff_read_requirements" on hunt_requirements;
create policy "staff_read_requirements" on hunt_requirements for select to authenticated using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop policy if exists "outfitter_read_requirements" on hunt_requirements;
create policy "outfitter_read_requirements" on hunt_requirements for select to authenticated using (public._my_outfitter_hunt(hunt_id));
drop policy if exists "hunter_read_requirements" on hunt_requirements;
create policy "hunter_read_requirements" on hunt_requirements for select to authenticated using (public._my_own_hunt(hunt_id));

-- ── a new hunt gets its checklist automatically ──────────────────────────────
create or replace function public.generate_hunt_requirements(p_hunt uuid) returns int
language plpgsql security definer set search_path = public as $$
declare h record; n int;
begin
  select id, client_type, outfitter_id into h from client_hunts where id = p_hunt;
  if not found then return 0; end if;
  insert into hunt_requirements (hunt_id, document_type_id, name, responsible, needs_signature, needs_stamp)
  select p_hunt, t.id, t.name,
         case when t.responsible = 'outfitter' and h.outfitter_id is null then 'hunter' else t.responsible end,
         t.needs_signature, t.needs_stamp
    from document_types t
   where t.is_active and (t.applies_to = 'all' or t.applies_to = coalesce(h.client_type, 'export'))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.generate_hunt_requirements(uuid) from public, anon;
grant execute on function public.generate_hunt_requirements(uuid) to authenticated;

create or replace function public._hunt_gets_checklist() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.generate_hunt_requirements(new.id);
  return new;
end;
$$;
drop trigger if exists trg_hunt_gets_checklist on client_hunts;
create trigger trg_hunt_gets_checklist after insert on client_hunts for each row execute function public._hunt_gets_checklist();

-- ── handing a document in (outfitter, hunter or staff) ───────────────────────
create or replace function public.submit_requirement(p_req uuid, p_paths text[], p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r record; v_name text; v_ok boolean;
begin
  select * into r from hunt_requirements where id = p_req;
  if not found then raise exception 'That document is not on the list'; end if;
  v_ok := exists (select 1 from staff_profiles where id = auth.uid() and is_active)
          or public._my_outfitter_hunt(r.hunt_id)
          or (public._my_own_hunt(r.hunt_id) and r.responsible in ('hunter', 'outfitter'));
  if not v_ok then raise exception 'You cannot hand in this document'; end if;
  if r.status in ('approved', 'not_needed') then raise exception 'This document is already settled'; end if;
  if coalesce(array_length(p_paths, 1), 0) = 0 then raise exception 'Add a photo or scan of the document'; end if;
  select coalesce(sp.full_name, o.name, c.full_name, 'Someone') into v_name
    from (select 1) x left join staff_profiles sp on sp.id = auth.uid() left join outfitters o on o.auth_user_id = auth.uid() left join clients c on c.auth_user_id = auth.uid() limit 1;
  update hunt_requirements set
      file_paths = case when r.status = 'rejected' then p_paths else r.file_paths || p_paths end,
      status = 'received', received_at = now(), received_by_name = v_name, note = coalesce(nullif(trim(coalesce(p_note, '')), ''), note),
      checked_correct = false, checked_complete = false, checked_signed = false, checked_stamped = false, rejection_reason = null
    where id = p_req;
end;
$$;
revoke all on function public.submit_requirement(uuid, text[], text) from public, anon;
grant execute on function public.submit_requirement(uuid, text[], text) to authenticated;

-- ── the workshop checks it: correct, complete, signed, stamped ───────────────
create or replace function public.staff_review_requirement(p_req uuid, p_approve boolean, p_correct boolean, p_complete boolean, p_signed boolean, p_stamped boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not public._doc_is_staff() then raise exception 'Only managers can check documents'; end if;
  select * into r from hunt_requirements where id = p_req;
  if not found then raise exception 'That document is not on the list'; end if;
  if r.status not in ('received', 'approved', 'rejected') then raise exception 'There is nothing to check yet'; end if;
  if p_approve then
    if not (coalesce(p_correct, false) and coalesce(p_complete, false)) then raise exception 'A document must be correct and complete to be approved'; end if;
    if r.needs_signature and not coalesce(p_signed, false) then raise exception 'This document must be signed'; end if;
    if r.needs_stamp and not coalesce(p_stamped, false) then raise exception 'This document must be stamped'; end if;
    update hunt_requirements set status = 'approved', checked_correct = true, checked_complete = true,
           checked_signed = coalesce(p_signed, false), checked_stamped = coalesce(p_stamped, false),
           reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = null where id = p_req;
  else
    if coalesce(trim(p_reason), '') = '' then raise exception 'Tell them what is wrong so it can be fixed'; end if;
    update hunt_requirements set status = 'rejected', checked_correct = coalesce(p_correct, false), checked_complete = coalesce(p_complete, false),
           checked_signed = coalesce(p_signed, false), checked_stamped = coalesce(p_stamped, false),
           reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = trim(p_reason) where id = p_req;
  end if;
end;
$$;
revoke all on function public.staff_review_requirement(uuid, boolean, boolean, boolean, boolean, boolean, text) from public, anon;
grant execute on function public.staff_review_requirement(uuid, boolean, boolean, boolean, boolean, boolean, text) to authenticated;

create or replace function public.staff_set_requirement(p_req uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._doc_is_staff() then raise exception 'Only managers can change the document list'; end if;
  if p_status not in ('awaiting', 'not_needed') then raise exception 'Choose awaiting or not needed'; end if;
  if p_status = 'not_needed' and coalesce(trim(p_note), '') = '' then raise exception 'Say why this document is not needed'; end if;
  update hunt_requirements set status = p_status, note = coalesce(nullif(trim(coalesce(p_note, '')), ''), note),
         file_paths = case when p_status = 'awaiting' then '{}' else file_paths end,
         checked_correct = false, checked_complete = false, checked_signed = false, checked_stamped = false, rejection_reason = null where id = p_req;
end;
$$;
revoke all on function public.staff_set_requirement(uuid, text, text) from public, anon;
grant execute on function public.staff_set_requirement(uuid, text, text) to authenticated;

create or replace function public.staff_add_requirement(p_hunt uuid, p_name text, p_responsible text, p_signature boolean, p_stamp boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public._doc_is_staff() then raise exception 'Only managers can change the document list'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Give the document a name'; end if;
  insert into hunt_requirements (hunt_id, name, responsible, needs_signature, needs_stamp)
  values (p_hunt, trim(p_name), coalesce(p_responsible, 'outfitter'), coalesce(p_signature, true), coalesce(p_stamp, true)) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.staff_add_requirement(uuid, text, text, boolean, boolean) from public, anon;
grant execute on function public.staff_add_requirement(uuid, text, text, boolean, boolean) to authenticated;

-- ── is the paperwork of a hunt finished? ─────────────────────────────────────
create or replace function public.hunt_documents_complete(p_hunt uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from hunt_requirements where hunt_id = p_hunt and status not in ('approved', 'not_needed'))
$$;
grant execute on function public.hunt_documents_complete(uuid) to authenticated;

-- the last step of the job (dispatch) cannot happen while required documents are outstanding
create or replace function public.guard_dispatch() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_open int; v_names text;
begin
  if new.doc_type = 'job_card'
     and (new.current_department = 'done' or new.status in ('completed', 'complete'))
     and not (old.current_department = 'done' or old.status in ('completed', 'complete')) then
    select count(*), string_agg(name, ', ' order by name) into v_open, v_names from hunt_requirements where hunt_id = new.hunt_id and status not in ('approved', 'not_needed');
    if v_open > 0 then
      raise exception 'Cannot dispatch yet: % document(s) are not approved (%)', v_open, v_names;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_dispatch on hunt_documents;
create trigger trg_guard_dispatch before update of current_department, status on hunt_documents for each row execute function public.guard_dispatch();

-- ── where every hunt stands (managers) ───────────────────────────────────────
create or replace view v_hunt_documents with (security_invoker = true) as
select
  h.id as hunt_id, h.ref_number, h.client_id, c.full_name as client_name, h.outfitter_id, o.name as outfitter_name, h.client_type,
  count(*) filter (where r.status <> 'not_needed') as required,
  count(*) filter (where r.status = 'approved') as approved,
  count(*) filter (where r.status = 'awaiting' and r.responsible = 'outfitter') as waiting_outfitter,
  count(*) filter (where r.status = 'awaiting' and r.responsible = 'hunter') as waiting_hunter,
  count(*) filter (where r.status = 'awaiting' and r.responsible in ('workshop', 'authority')) as waiting_other,
  count(*) filter (where r.status = 'received') as to_check,
  count(*) filter (where r.status = 'rejected') as rejected,
  min(r.requested_at) filter (where r.status in ('awaiting', 'rejected')) as oldest_wait,
  bool_and(r.status in ('approved', 'not_needed')) as complete
from hunt_requirements r
join client_hunts h on h.id = r.hunt_id
join clients c on c.id = h.client_id
left join outfitters o on o.id = h.outfitter_id
where h.status = 'active'
group by h.id, h.ref_number, h.client_id, c.full_name, h.outfitter_id, o.name, h.client_type;
grant select on v_hunt_documents to authenticated;

-- ── what a hunter sees: honest about who is holding things up ────────────────
create or replace function public.hunter_documents_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  select coalesce(jsonb_agg(s.h order by s.created_at desc), '[]'::jsonb) into v from (
    select ch.created_at, jsonb_build_object(
      'hunt_id', ch.id, 'ref', ch.ref_number, 'outfitter', o.name,
      'items', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', r.id, 'name', r.name, 'responsible', r.responsible, 'status', r.status, 'reason', r.rejection_reason,
                  'requested_at', r.requested_at, 'received_at', r.received_at) order by r.name), '[]'::jsonb)
                from hunt_requirements r where r.hunt_id = ch.id and r.status <> 'not_needed')
    ) as h
    from client_hunts ch join clients c on c.id = ch.client_id left join outfitters o on o.id = ch.outfitter_id
    where c.auth_user_id = auth.uid() and ch.status = 'active'
      and exists (select 1 from hunt_requirements r where r.hunt_id = ch.id and r.status <> 'not_needed')
  ) s;
  return v;
end;
$$;
revoke all on function public.hunter_documents_overview() from public, anon;
grant execute on function public.hunter_documents_overview() to authenticated;

-- ── what an outfitter sees: every hunt of theirs with its checklist ──────────
create or replace function public.outfitter_documents_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; o record;
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  if not found then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(s.h order by s.created_at desc), '[]'::jsonb) into v from (
    select ch.created_at, jsonb_build_object(
      'hunt_id', ch.id, 'ref', ch.ref_number, 'hunter', c.full_name,
      'items', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', r.id, 'name', r.name, 'responsible', r.responsible, 'status', r.status, 'reason', r.rejection_reason,
                  'needs_signature', r.needs_signature, 'needs_stamp', r.needs_stamp, 'requested_at', r.requested_at, 'files', cardinality(r.file_paths)) order by r.name), '[]'::jsonb)
                from hunt_requirements r where r.hunt_id = ch.id and r.status <> 'not_needed')
    ) as h
    from client_hunts ch join clients c on c.id = ch.client_id
    where ch.outfitter_id = o.id and ch.status = 'active'
      and exists (select 1 from hunt_requirements r where r.hunt_id = ch.id and r.status <> 'not_needed')
  ) s;
  return v;
end;
$$;
revoke all on function public.outfitter_documents_overview() from public, anon;
grant execute on function public.outfitter_documents_overview() to authenticated;

-- ── storage for the scans and photos ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hunt-documents', 'hunt-documents', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "docs_staff_all" on storage.objects;
create policy "docs_staff_all" on storage.objects for all to authenticated
  using (bucket_id = 'hunt-documents' and exists (select 1 from public.staff_profiles where id = auth.uid() and is_active))
  with check (bucket_id = 'hunt-documents' and exists (select 1 from public.staff_profiles where id = auth.uid() and is_active));
drop policy if exists "docs_outfitter_hunter_add" on storage.objects;
create policy "docs_outfitter_hunter_add" on storage.objects for insert to authenticated
  with check (bucket_id = 'hunt-documents' and (public._my_outfitter_hunt(((storage.foldername(name))[1])::uuid) or public._my_own_hunt(((storage.foldername(name))[1])::uuid)));
drop policy if exists "docs_outfitter_hunter_read" on storage.objects;
create policy "docs_outfitter_hunter_read" on storage.objects for select to authenticated
  using (bucket_id = 'hunt-documents' and (public._my_outfitter_hunt(((storage.foldername(name))[1])::uuid) or public._my_own_hunt(((storage.foldername(name))[1])::uuid)));

-- ═══ the outfitter chat: one thread per hunt ═══════════════════════════════════
create table if not exists outfitter_messages (
  id             uuid primary key default gen_random_uuid(),
  hunt_id        uuid not null references client_hunts(id) on delete cascade,
  outfitter_id   uuid not null references outfitters(id) on delete cascade,
  sender         text not null check (sender in ('outfitter', 'workshop')),
  sender_user    uuid,
  sender_name    text,
  body           text not null check (length(trim(body)) > 0),
  requirement_id uuid references hunt_requirements(id) on delete set null,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_outfitter_messages_hunt on outfitter_messages(hunt_id, created_at);
alter table outfitter_messages enable row level security;

drop policy if exists "staff_read_outfitter_messages" on outfitter_messages;
create policy "staff_read_outfitter_messages" on outfitter_messages for select to authenticated using (public._apex_can_message_clients());
drop policy if exists "outfitter_read_own_messages" on outfitter_messages;
create policy "outfitter_read_own_messages" on outfitter_messages for select to authenticated using (public._my_outfitter_hunt(hunt_id));

create or replace function public.send_outfitter_message(p_hunt uuid, p_body text, p_requirement uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_out uuid; v_sender text; v_name text; v_id uuid;
begin
  if coalesce(trim(p_body), '') = '' then raise exception 'Write a message first'; end if;
  select outfitter_id into v_out from client_hunts where id = p_hunt;
  if v_out is null then raise exception 'This hunt has no outfitter'; end if;
  if public._my_outfitter_hunt(p_hunt) then
    v_sender := 'outfitter'; select name into v_name from outfitters where id = v_out;
  elsif public._apex_can_message_clients() then
    v_sender := 'workshop'; select full_name into v_name from staff_profiles where id = auth.uid();
  else
    raise exception 'Only managers can message outfitters';
  end if;
  insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, requirement_id)
  values (p_hunt, v_out, v_sender, auth.uid(), v_name, trim(p_body), p_requirement) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.send_outfitter_message(uuid, text, uuid) from public, anon;
grant execute on function public.send_outfitter_message(uuid, text, uuid) to authenticated;

create or replace function public.mark_outfitter_thread_read(p_hunt uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public._my_outfitter_hunt(p_hunt) then
    update outfitter_messages set read_at = now() where hunt_id = p_hunt and sender = 'workshop' and read_at is null;
  elsif public._apex_can_message_clients() then
    update outfitter_messages set read_at = now() where hunt_id = p_hunt and sender = 'outfitter' and read_at is null;
  end if;
end;
$$;
revoke all on function public.mark_outfitter_thread_read(uuid) from public, anon;
grant execute on function public.mark_outfitter_thread_read(uuid) to authenticated;
