-- Migration 044: photos per trophy — taken in the app when a trophy arrives, during work, and when it is finished.
-- Staff add them (works offline: the app queues them). Clients see the ones marked shared (arrival + finished by default).

create table if not exists trophy_photos (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references clients(id) on delete cascade,
  hunt_id            uuid references client_hunts(id) on delete cascade,
  hunt_doc_id        uuid references hunt_documents(id) on delete cascade,   -- null = the whole delivery / hunt
  kind               text not null check (kind in ('arrival','progress','finished')),
  storage_path       text not null unique,
  caption            text,
  shared_with_client boolean not null default true,
  taken_by           uuid references staff_profiles(id),
  taken_by_name      text,
  taken_at           timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

create index if not exists idx_trophy_photos_doc    on trophy_photos(hunt_doc_id);
create index if not exists idx_trophy_photos_hunt   on trophy_photos(hunt_id);
create index if not exists idx_trophy_photos_client on trophy_photos(client_id, kind);

alter table trophy_photos enable row level security;

drop policy if exists "staff_read_trophy_photos" on trophy_photos;
create policy "staff_read_trophy_photos" on trophy_photos for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

drop policy if exists "staff_add_trophy_photos" on trophy_photos;
create policy "staff_add_trophy_photos" on trophy_photos for insert to authenticated
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

-- retrying an upload after a dropped connection re-sends the same row
drop policy if exists "staff_update_trophy_photos" on trophy_photos;
create policy "staff_update_trophy_photos" on trophy_photos for update to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active))
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

drop policy if exists "managers_delete_trophy_photos" on trophy_photos;
create policy "managers_delete_trophy_photos" on trophy_photos for delete to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin','studio_manager')));

-- a client sees only the photos of their own trophies that staff have shared
drop policy if exists "hunter_read_shared_trophy_photos" on trophy_photos;
create policy "hunter_read_shared_trophy_photos" on trophy_photos for select to authenticated
  using (shared_with_client and client_id in (select id from clients where auth_user_id = auth.uid()));

-- ...and may download the image files behind those rows
drop policy if exists "hunter_read_shared_photo_files" on storage.objects;
create policy "hunter_read_shared_photo_files" on storage.objects for select to authenticated
  using (
    bucket_id = 'client-photos'
    and exists (
      select 1 from public.trophy_photos tp
      join public.clients c on c.id = tp.client_id
      where tp.storage_path = storage.objects.name
        and tp.shared_with_client
        and c.auth_user_id = auth.uid()
    )
  );
