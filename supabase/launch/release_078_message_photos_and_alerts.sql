-- 078: photos in messages to a client, and a phone alert for every new message that opens the conversation.
--  * A message can carry photos or PDFs (stored in a private folder named after the client, so only that client and the workshop can open them).
--  * The server remembers which incoming messages (from a hunter, from an outfitter) have already been announced to the phones, so each is announced once.
-- Safe to run more than once.

alter table client_messages add column if not exists attachments text[] not null default '{}';
alter table client_messages add column if not exists push_sent boolean not null default false;
update client_messages set push_sent = true where not push_sent;
alter table outfitter_messages add column if not exists push_sent boolean not null default false;
update outfitter_messages set push_sent = true where not push_sent;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-files', 'message-files', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- the workshop's managers can add and open files in every client's folder
drop policy if exists "msgfiles_staff_all" on storage.objects;
create policy "msgfiles_staff_all" on storage.objects for all to authenticated
  using (bucket_id = 'message-files' and public._apex_can_message_clients())
  with check (bucket_id = 'message-files' and public._apex_can_message_clients());
-- a client can open (and add to) only the folder with their own id
drop policy if exists "msgfiles_client_own" on storage.objects;
create policy "msgfiles_client_own" on storage.objects for all to authenticated
  using (bucket_id = 'message-files' and exists (select 1 from public.clients c where c.id::text = (storage.foldername(name))[1] and c.auth_user_id = auth.uid()))
  with check (bucket_id = 'message-files' and exists (select 1 from public.clients c where c.id::text = (storage.foldername(name))[1] and c.auth_user_id = auth.uid()));

select (select count(*) from information_schema.columns where table_name = 'client_messages' and column_name in ('attachments', 'push_sent')) = 2
   and (select count(*) from storage.buckets where id = 'message-files') = 1 as message_photos_ready;
