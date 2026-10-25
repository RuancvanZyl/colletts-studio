-- Migration 047: the animal guide shown to hunters (facts, hunting notes, Roland Ward record, real photos, tracks).
-- The workshop fills it in from Setup → Animal guide whenever they have the content. Hunters can only read it.

create table if not exists species_guide (
  species      text primary key,                        -- the catalogue name, e.g. 'Kudu'
  summary      text,
  facts        jsonb not null default '[]'::jsonb,      -- [{ "kind": "fact" | "hunting" | "cool", "text": "…" }]
  record_label text,                                    -- Roland Ward: what is measured, e.g. 'Horn length'
  record_value text,                                    -- e.g. '73 1/2 in (186.7 cm)'
  record_note  text,                                    -- where / who / year
  tracks_note  text,                                    -- how to recognise the tracks
  updated_by   uuid references staff_profiles(id),
  updated_at   timestamptz not null default now()
);

create table if not exists species_photos (
  id           uuid primary key default gen_random_uuid(),
  species      text not null,
  kind         text not null check (kind in ('animal', 'tracks', 'trophy', 'habitat')),
  storage_path text not null unique,
  caption      text,
  credit       text,                                    -- photographer / licence — real photos need one
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_species_photos_species on species_photos(species, sort_order);

alter table species_guide  enable row level security;
alter table species_photos enable row level security;

drop policy if exists "everyone_reads_species_guide" on species_guide;
create policy "everyone_reads_species_guide" on species_guide for select to authenticated using (true);
drop policy if exists "admins_write_species_guide" on species_guide;
create policy "admins_write_species_guide" on species_guide for all to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')))
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));

drop policy if exists "everyone_reads_species_photos" on species_photos;
create policy "everyone_reads_species_photos" on species_photos for select to authenticated using (true);
drop policy if exists "admins_write_species_photos" on species_photos;
create policy "admins_write_species_photos" on species_photos for all to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')))
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));

-- public bucket for the guide photos (nothing private in them); only admins may add or remove files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('species-guide', 'species-guide', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "admins_upload_species_files" on storage.objects;
create policy "admins_upload_species_files" on storage.objects for insert to authenticated
  with check (bucket_id = 'species-guide' and exists (select 1 from public.staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));
drop policy if exists "admins_change_species_files" on storage.objects;
create policy "admins_change_species_files" on storage.objects for update to authenticated
  using (bucket_id = 'species-guide' and exists (select 1 from public.staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));
drop policy if exists "admins_delete_species_files" on storage.objects;
create policy "admins_delete_species_files" on storage.objects for delete to authenticated
  using (bucket_id = 'species-guide' and exists (select 1 from public.staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));
