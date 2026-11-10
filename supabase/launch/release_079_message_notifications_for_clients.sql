-- 079: a message from the workshop shows up in the client's notifications (and the list updates by itself).
--  * Every new message from the workshop to a client (in the app or by email) adds a "New message" line to that client's notifications.
--  * Tapping it in the app opens the conversation.
-- Safe to run more than once.

create or replace function public._notify_client_of_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'outbound' and coalesce(new.status, 'sent') <> 'draft' then
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (new.client_id, new.hunt_id, 'update', 'message', 'New message from Apex Trophy Solutions',
            left(trim(coalesce(nullif(new.subject, '') || ': ', '') || new.body), 160)
              || case when jsonb_array_length(coalesce(to_jsonb(new)->'attachments', '[]'::jsonb)) > 0 then ' (with a photo)' else '' end);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_client_of_message on client_messages;
create trigger trg_notify_client_of_message after insert on client_messages
  for each row execute function public._notify_client_of_message();

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  if to_regclass('public.client_notifications') is not null
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'client_notifications') then
    alter publication supabase_realtime add table public.client_notifications;
  end if;
end $$;

select count(*) = 1 as message_notifications_ready from pg_trigger where tgname = 'trg_notify_client_of_message';
