-- Migration 072: what a hunter has typed but not sent yet is kept on the server too (not only on their phone), so it survives a
-- change of phone or browser, and the workshop can see it ("still being filled in") in the client's profile.

create table if not exists client_drafts (
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (client_id, name)
);
alter table client_drafts enable row level security;

drop policy if exists "client_own_drafts" on client_drafts;
create policy "client_own_drafts" on client_drafts for all to authenticated
  using (exists (select 1 from clients c where c.id = client_id and c.auth_user_id = auth.uid()))
  with check (exists (select 1 from clients c where c.id = client_id and c.auth_user_id = auth.uid()));

drop policy if exists "staff_read_client_drafts" on client_drafts;
create policy "staff_read_client_drafts" on client_drafts for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

grant select, insert, update, delete on client_drafts to authenticated;

-- Check (should say true):
select count(*) = 1 as drafts_ready from information_schema.tables where table_name = 'client_drafts';
