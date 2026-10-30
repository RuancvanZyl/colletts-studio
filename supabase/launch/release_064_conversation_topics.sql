-- 064: every outfitter conversation is saved against its topic.
--  * Each message has a topic: general, documents, rejected skin, quote and payment, or job card, and can be about one animal.
--  * Staff can write down what was said on WhatsApp or the phone, on any topic (not only rejected skins), so it is on record.
-- Safe to run more than once.

alter table outfitter_messages add column if not exists topic text not null default 'general';
alter table outfitter_messages drop constraint if exists outfitter_messages_topic_check;
alter table outfitter_messages add constraint outfitter_messages_topic_check check (topic in ('general', 'documents', 'rejected_skin', 'quote', 'job_card'));
alter table outfitter_messages add column if not exists job_doc_id uuid references hunt_documents(id) on delete set null;

-- messages that already exist: the topic they obviously had
update outfitter_messages set topic = 'rejected_skin' where case_id is not null and topic = 'general';
update outfitter_messages set topic = 'documents' where requirement_id is not null and topic = 'general';

drop function if exists public.send_outfitter_message(uuid, text, uuid, uuid);
create or replace function public.send_outfitter_message(p_hunt uuid, p_body text, p_requirement uuid default null, p_case uuid default null, p_topic text default null, p_doc uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_out uuid; v_sender text; v_name text; v_id uuid; v_topic text;
begin
  if coalesce(trim(p_body), '') = '' then raise exception 'Write a message first'; end if;
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
  insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, requirement_id, case_id, topic, job_doc_id)
  values (p_hunt, v_out, v_sender, auth.uid(), v_name, trim(p_body), p_requirement, p_case, v_topic, p_doc) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.send_outfitter_message(uuid, text, uuid, uuid, text, uuid) from public, anon;
grant execute on function public.send_outfitter_message(uuid, text, uuid, uuid, text, uuid) to authenticated;

-- what was said on WhatsApp or the phone, written into the hunt's conversation on any topic
create or replace function public.log_outfitter_conversation(p_hunt uuid, p_from text, p_channel text, p_body text, p_topic text default 'general', p_doc uuid default null, p_case uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_out uuid; v_name text; v_outname text;
begin
  if not public._apex_can_message_clients() then raise exception 'Only managers can write down a conversation'; end if;
  if p_from not in ('outfitter', 'workshop') then raise exception 'Say who said it'; end if;
  if p_channel not in ('whatsapp', 'phone') then raise exception 'Say whether it was WhatsApp or the phone'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Write what was said'; end if;
  if coalesce(p_topic, 'general') not in ('general', 'documents', 'rejected_skin', 'quote', 'job_card') then raise exception 'That topic does not exist'; end if;
  select outfitter_id into v_out from client_hunts where id = p_hunt;
  if v_out is null then raise exception 'This hunt has no outfitter'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  select name into v_outname from outfitters where id = v_out;
  insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, channel, topic, job_doc_id, case_id)
  values (p_hunt, v_out, p_from, auth.uid(),
          case when p_from = 'outfitter' then v_outname else v_name end || ' (' || case when p_channel = 'phone' then 'phone call' else 'WhatsApp' end || ', written down by ' || coalesce(v_name, 'staff') || ')',
          trim(p_body), p_channel, coalesce(p_topic, 'general'), p_doc, p_case);
end;
$$;
revoke all on function public.log_outfitter_conversation(uuid, text, text, text, text, uuid, uuid) from public, anon;
grant execute on function public.log_outfitter_conversation(uuid, text, text, text, text, uuid, uuid) to authenticated;
