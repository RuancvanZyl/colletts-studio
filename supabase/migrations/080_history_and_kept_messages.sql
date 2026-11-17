-- 080: every change is written down with who and when, and messages can never be deleted or edited.
--  * audit_log: one line for every change to an order, quote, payment, credit, job card, photo and so on: who, when, what it was and what it became.
--    Nobody can edit or delete these lines. Admins, studio managers and bookkeepers can read them.
--  * Messages (to clients, with outfitters, between the team) are kept for good: no delete, and nothing but "read" can change after sending.
--  * Photos can be sent in the chat with an outfitter.
--  * Staff can write down a phone call, WhatsApp or visit with a client, or what the client and the outfitter said to each other.
-- Safe to run more than once.

-- ───────────── the history ─────────────
create table if not exists audit_log (
  id               uuid primary key default gen_random_uuid(),
  at               timestamptz not null default now(),
  table_name       text not null,
  row_id           uuid,
  action           text not null check (action in ('insert', 'update', 'delete')),
  hunt_id          uuid,
  client_id        uuid,
  changed_by       uuid,
  changed_by_name  text,
  changed_by_role  text,
  changes          jsonb not null default '{}'::jsonb
);
create index if not exists idx_audit_log_hunt   on audit_log (hunt_id, at desc);
create index if not exists idx_audit_log_client on audit_log (client_id, at desc);
create index if not exists idx_audit_log_row    on audit_log (table_name, row_id);
alter table audit_log enable row level security;
drop policy if exists "managers_read_audit_log" on audit_log;
create policy "managers_read_audit_log" on audit_log for select to authenticated using (public.is_quote_staff());

create or replace function public._audit_log_is_kept() returns trigger language plpgsql as $$
begin
  raise exception 'The history cannot be changed or removed';
end;
$$;
drop trigger if exists trg_audit_log_is_kept on audit_log;
create trigger trg_audit_log_is_kept before update or delete on audit_log for each row execute function public._audit_log_is_kept();

create or replace function public._jsonb_changes(p_old jsonb, p_new jsonb, p_prefix text default '') returns jsonb
language plpgsql immutable as $$
declare k text; r jsonb := '{}'::jsonb;
begin
  for k in select jsonb_object_keys(coalesce(p_old, '{}'::jsonb) || coalesce(p_new, '{}'::jsonb)) loop
    if k in ('updated_at', 'created_at', 'push_sent') then continue; end if;
    if (p_old -> k) is distinct from (p_new -> k) then
      if p_prefix = '' and k = 'form_data' and jsonb_typeof(p_old -> k) = 'object' and jsonb_typeof(p_new -> k) = 'object' then
        r := r || public._jsonb_changes(p_old -> k, p_new -> k, 'form_data.');
      else
        r := r || jsonb_build_object(p_prefix || k, jsonb_build_object('from', p_old -> k, 'to', p_new -> k));
      end if;
    end if;
  end loop;
  return r;
end;
$$;

create or replace function public._audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; ch jsonb; v_row uuid; v_hunt uuid; v_client uuid; v_name text; v_role text; v_q uuid;
begin
  if tg_op = 'DELETE' then o := to_jsonb(old); v_row := nullif(o ->> 'id', '')::uuid; ch := jsonb_build_object('row', o);
  elsif tg_op = 'INSERT' then n := to_jsonb(new); v_row := nullif(n ->> 'id', '')::uuid; ch := jsonb_build_object('row', n);
  else
    o := to_jsonb(old); n := to_jsonb(new); v_row := nullif(n ->> 'id', '')::uuid;
    ch := public._jsonb_changes(o, n);
    if ch = '{}'::jsonb then return new; end if;     -- nothing that matters changed
  end if;

  v_hunt := nullif(coalesce(n, o) ->> 'hunt_id', '')::uuid;
  v_client := nullif(coalesce(n, o) ->> 'client_id', '')::uuid;
  if tg_table_name = 'client_hunts' then v_hunt := v_row; end if;
  if tg_table_name in ('quote_lines', 'quote_payments') then
    v_q := nullif(coalesce(n, o) ->> 'quote_id', '')::uuid;
    select q.hunt_id, q.client_id into v_hunt, v_client from quotes q where q.id = v_q;
  end if;
  if v_client is null and v_hunt is not null then select h.client_id into v_client from client_hunts h where h.id = v_hunt; end if;

  select s.full_name, s.role into v_name, v_role from staff_profiles s where s.id = auth.uid();
  if v_name is null and auth.uid() is not null then select c.full_name, 'hunter' into v_name, v_role from clients c where c.auth_user_id = auth.uid() limit 1; end if;
  if v_name is null and auth.uid() is not null then select o2.name, 'outfitter' into v_name, v_role from outfitters o2 where o2.auth_user_id = auth.uid() limit 1; end if;

  insert into audit_log (table_name, row_id, action, hunt_id, client_id, changed_by, changed_by_name, changed_by_role, changes)
  values (tg_table_name, v_row, lower(tg_op), v_hunt, v_client, auth.uid(), coalesce(v_name, case when auth.uid() is null then 'The system' else 'Someone' end), v_role, ch);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public._audit_row() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['quotes', 'quote_lines', 'quote_payments', 'quote_amendments', 'client_credits', 'client_hunts', 'hunt_documents',
                           'hunt_receivings', 'quality_cases', 'soak_reports', 'part_followups', 'hunt_requirements', 'trophy_photos', 'job_card_legs'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_audit on public.%I', t);
      execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public._audit_row()', t);
    end if;
  end loop;
end $$;

-- ───────────── messages are kept for good ─────────────
create or replace function public._messages_are_kept() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then return old; end if;      -- removing a whole client or hunt removes its messages with it
    raise exception 'A message cannot be deleted. Messages are kept as a record';
  end if;
  if (to_jsonb(new) - 'read_at' - 'status' - 'push_sent' - 'read' - 'updated_at') is distinct from (to_jsonb(old) - 'read_at' - 'status' - 'push_sent' - 'read' - 'updated_at') then
    raise exception 'A message cannot be changed after it was sent. Messages are kept as a record';
  end if;
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['client_messages', 'outfitter_messages', 'staff_messages'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_messages_are_kept on public.%I', t);
      execute format('create trigger trg_messages_are_kept before update or delete on public.%I for each row execute function public._messages_are_kept()', t);
    end if;
  end loop;
end $$;

-- ───────────── photos in the outfitter chat ─────────────
alter table outfitter_messages add column if not exists attachments text[] not null default '{}';
drop function if exists public.send_outfitter_message(uuid, text, uuid, uuid, text, uuid);
create or replace function public.send_outfitter_message(p_hunt uuid, p_body text, p_requirement uuid default null, p_case uuid default null, p_topic text default null, p_doc uuid default null, p_files text[] default '{}') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_out uuid; v_sender text; v_name text; v_id uuid; v_topic text;
begin
  if coalesce(trim(p_body), '') = '' and coalesce(array_length(p_files, 1), 0) = 0 then raise exception 'Write a message first'; end if;
  select outfitter_id into v_out from client_hunts where id = p_hunt;
  if v_out is null then raise exception 'This hunt has no outfitter'; end if;
  if p_case is not null and not exists (select 1 from quality_cases where id = p_case and hunt_id = p_hunt) then raise exception 'That case is not on this hunt'; end if;
  if p_doc is not null and not exists (select 1 from hunt_documents where id = p_doc and hunt_id = p_hunt) then raise exception 'That animal is not on this hunt'; end if;
  v_topic := coalesce(nullif(trim(p_topic), ''), case when p_case is not null then 'rejected_skin' when p_requirement is not null then 'documents' else 'general' end);
  if v_topic not in ('general', 'documents', 'rejected_skin', 'quote', 'job_card') then raise exception 'That topic does not exist'; end if;
  if public._my_outfitter_hunt(p_hunt) then
    v_sender := 'outfitter'; select name into v_name from outfitters where id = v_out;
  elsif public._apex_can_message_clients() then
    v_sender := 'workshop'; select full_name into v_name from staff_profiles where id = auth.uid();
  else
    raise exception 'Only managers can message outfitters';
  end if;
  insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, requirement_id, case_id, topic, job_doc_id, attachments)
  values (p_hunt, v_out, v_sender, auth.uid(), v_name, coalesce(nullif(trim(p_body), ''), '(photo)'), p_requirement, p_case, v_topic, p_doc, coalesce(p_files, '{}'))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.send_outfitter_message(uuid, text, uuid, uuid, text, uuid, text[]) from public, anon;
grant execute on function public.send_outfitter_message(uuid, text, uuid, uuid, text, uuid, text[]) to authenticated;

-- ───────────── writing down a conversation with a client ─────────────
alter table client_messages drop constraint if exists client_messages_channel_check;
alter table client_messages add constraint client_messages_channel_check check (channel in ('email', 'in_app', 'whatsapp', 'sms', 'phone', 'in_person'));

-- p_with: 'client' (the client and us) or 'outfitter' (the client and the outfitter, as it was told to us)
create or replace function public.log_client_conversation(p_client uuid, p_with text, p_channel text, p_body text, p_when timestamptz default null, p_hunt uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text; v_how text;
begin
  if not public._apex_can_message_clients() then raise exception 'Only managers can write down a conversation'; end if;
  if p_with not in ('client', 'outfitter') then raise exception 'Say who the conversation was with'; end if;
  if p_channel not in ('phone', 'whatsapp', 'in_person') then raise exception 'Say whether it was a phone call, WhatsApp or in person'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Write what was said'; end if;
  if p_when is not null and p_when > now() + interval '5 minutes' then raise exception 'The conversation cannot be in the future'; end if;
  if not exists (select 1 from clients where id = p_client) then raise exception 'That client does not exist'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  v_how := case p_channel when 'phone' then 'Phone call' when 'whatsapp' then 'WhatsApp' else 'In person' end;
  insert into client_messages (client_id, hunt_id, direction, channel, subject, body, sent_by, status, sent_at)
  values (p_client, p_hunt, 'inbound', p_channel,
          v_how || case when p_with = 'outfitter' then ' between the client and the outfitter' else ' with the client' end || ', written down by ' || coalesce(v_name, 'staff'),
          trim(p_body), auth.uid(), 'sent', coalesce(p_when, now()));
end;
$$;
revoke all on function public.log_client_conversation(uuid, text, text, text, timestamptz, uuid) from public, anon;
grant execute on function public.log_client_conversation(uuid, text, text, text, timestamptz, uuid) to authenticated;

select to_regclass('public.audit_log') is not null
   and exists (select 1 from pg_proc where proname = 'log_client_conversation')
   and exists (select 1 from pg_trigger where tgname = 'trg_messages_are_kept') as history_and_kept_messages_ready;
