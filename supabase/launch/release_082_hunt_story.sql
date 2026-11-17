-- 082: the hunter's hunt story: their own hunt photos, and the little film made from them.
--  * Hunters add their own hunt photos (kind 'hunt', each with the part of the story it belongs to: the land, the camp, the team ...).
--    The workshop sees them at check-in next to its own photos.
--  * memory_videos: one row per hunt. A hunter can always watch a short preview; the full film can only be saved once it is unlocked.
--    Unlocking is free until a price is set (app_settings), after that only a confirmed payment (or staff) unlocks it.
-- Safe to run more than once.

alter table trophy_photos add column if not exists story_part text;
alter table trophy_photos drop constraint if exists trophy_photos_kind_check;
alter table trophy_photos add constraint trophy_photos_kind_check check (kind in ('arrival', 'progress', 'finished', 'reference', 'hunt'));

drop policy if exists "hunter_add_reference_photos" on trophy_photos;
create policy "hunter_add_reference_photos" on trophy_photos for insert to authenticated
  with check (kind in ('reference', 'hunt') and client_id in (select id from clients where auth_user_id = auth.uid()));
drop policy if exists "hunter_update_reference_photos" on trophy_photos;
create policy "hunter_update_reference_photos" on trophy_photos for update to authenticated
  using (kind in ('reference', 'hunt') and client_id in (select id from clients where auth_user_id = auth.uid()))
  with check (kind in ('reference', 'hunt') and client_id in (select id from clients where auth_user_id = auth.uid()));
-- a hunter can take a photo out of their story (the file itself stays on record)
drop policy if exists "hunter_delete_own_hunt_photos" on trophy_photos;
create policy "hunter_delete_own_hunt_photos" on trophy_photos for delete to authenticated
  using (kind = 'hunt' and client_id in (select id from clients where auth_user_id = auth.uid()));

-- ───────────── settings (the price of the film is one of them) ─────────────
create table if not exists app_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
alter table app_settings enable row level security;
drop policy if exists "everyone_reads_settings" on app_settings;
create policy "everyone_reads_settings" on app_settings for select to authenticated using (true);
drop policy if exists "admins_write_settings" on app_settings;
create policy "admins_write_settings" on app_settings for all to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')))
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));
drop trigger if exists trg_audit on app_settings;
create trigger trg_audit after insert or update or delete on app_settings for each row execute function public._audit_row();

-- the price of the full film in the client's money, or null while it is free
create or replace function public._video_price(p_currency text) returns numeric
language sql stable security definer set search_path = public as $$
  select nullif(nullif(trim(value), '')::numeric, 0) from app_settings where key = case when p_currency = 'ZAR' then 'video_price_zar' else 'video_price_usd' end
$$;
revoke all on function public._video_price(text) from public, anon;
grant execute on function public._video_price(text) to authenticated;

-- ───────────── the film ─────────────
create table if not exists memory_videos (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references clients(id) on delete cascade,
  hunt_id           uuid unique references client_hunts(id) on delete cascade,
  status            text not null default 'preview' check (status in ('preview', 'unlocked')),
  unlocked_at       timestamptz,
  unlocked_how      text check (unlocked_how in ('free', 'paid', 'staff')),
  unlocked_by       uuid,
  payment_reference text,
  created_at        timestamptz not null default now()
);
alter table memory_videos enable row level security;
drop policy if exists "hunter_read_own_videos" on memory_videos;
create policy "hunter_read_own_videos" on memory_videos for select to authenticated
  using (client_id in (select id from clients where auth_user_id = auth.uid()));
drop policy if exists "staff_read_videos" on memory_videos;
create policy "staff_read_videos" on memory_videos for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop trigger if exists trg_audit on memory_videos;
create trigger trg_audit after insert or update or delete on memory_videos for each row execute function public._audit_row();

create or replace function public.hunter_start_video(p_hunt uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_id uuid;
begin
  select h.client_id into v_client from client_hunts h join clients c on c.id = h.client_id where h.id = p_hunt and c.auth_user_id = auth.uid();
  if v_client is null then raise exception 'That hunt is not on your profile'; end if;
  insert into memory_videos (client_id, hunt_id) values (v_client, p_hunt) on conflict (hunt_id) do nothing;
  select id into v_id from memory_videos where hunt_id = p_hunt;
  return v_id;
end;
$$;
revoke all on function public.hunter_start_video(uuid) from public, anon;
grant execute on function public.hunter_start_video(uuid) to authenticated;

create or replace function public.hunter_unlock_video(p_video uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v record; v_type text;
begin
  select m.*, c.client_type into v from memory_videos m join clients c on c.id = m.client_id where m.id = p_video and c.auth_user_id = auth.uid();
  if not found then raise exception 'That film is not on your profile'; end if;
  if v.status = 'unlocked' then return; end if;
  v_type := case when v.client_type = 'local' then 'ZAR' else 'USD' end;
  if public._video_price(v_type) is not null then raise exception 'This film has to be paid for before it can be saved'; end if;
  update memory_videos set status = 'unlocked', unlocked_at = now(), unlocked_how = 'free', unlocked_by = auth.uid() where id = p_video;
end;
$$;
revoke all on function public.hunter_unlock_video(uuid) from public, anon;
grant execute on function public.hunter_unlock_video(uuid) to authenticated;

create or replace function public.staff_unlock_video(p_video uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if not public.is_quote_staff() then raise exception 'Only managers can unlock a film'; end if;
  select * into v from memory_videos where id = p_video;
  if not found then raise exception 'That film does not exist'; end if;
  if v.status = 'unlocked' then return; end if;
  update memory_videos set status = 'unlocked', unlocked_at = now(), unlocked_how = 'staff', unlocked_by = auth.uid(), payment_reference = nullif(trim(coalesce(p_note, '')), '') where id = p_video;
  insert into client_notifications (client_id, hunt_id, type, stage, title, body)
  values (v.client_id, v.hunt_id, 'update', 'video', 'Your hunt film is ready to save', 'Open My trophies, then Your hunt film, to save it and share it with family and friends.');
end;
$$;
revoke all on function public.staff_unlock_video(uuid, text) from public, anon;
grant execute on function public.staff_unlock_video(uuid, text) to authenticated;

-- for the payment account later: a confirmed card or Apple Pay payment calls this (with the server's own key, never from the app)
create or replace function public.unlock_video_paid(p_video uuid, p_reference text) returns void
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select * into v from memory_videos where id = p_video;
  if not found then raise exception 'That film does not exist'; end if;
  if v.status = 'unlocked' then return; end if;
  update memory_videos set status = 'unlocked', unlocked_at = now(), unlocked_how = 'paid', payment_reference = p_reference where id = p_video;
  insert into client_notifications (client_id, hunt_id, type, stage, title, body)
  values (v.client_id, v.hunt_id, 'update', 'video', 'Your hunt film is ready to save', 'Thank you. Open My trophies, then Your hunt film, to save it and share it.');
end;
$$;
revoke all on function public.unlock_video_paid(uuid, text) from public, anon, authenticated;

select to_regclass('public.memory_videos') is not null
   and exists (select 1 from pg_proc where proname = 'hunter_unlock_video')
   and exists (select 1 from information_schema.columns where table_name = 'trophy_photos' and column_name = 'story_part') as hunt_story_ready;
