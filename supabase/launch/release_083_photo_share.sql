-- 083: a hunter can let the workshop collect their hunt photos from ONE album, as safely as possible.
--  * The hunter makes a view-only share link for a single album (iCloud, Google Photos, Dropbox, OneDrive, WeTransfer) and gives us only that link.
--    We never ask for a password or a login, and the link only reaches the workshop's managers.
--  * Only links from those known photo services are accepted, over https, and the hunter must tick that they agree.
--  * The hunter can take the link back at any time. When the workshop has copied the photos the link is deleted from the database;
--    what is kept is who asked, when, from which service, who copied the photos and when (in the history too).
-- Safe to run more than once.

create table if not exists photo_shares (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  hunt_id       uuid references client_hunts(id) on delete set null,
  link          text,                       -- removed as soon as the photos are copied or the hunter takes it back
  link_host     text not null,
  note          text,
  consent_at    timestamptz not null default now(),
  status        text not null default 'waiting' check (status in ('waiting', 'done', 'withdrawn')),
  done_at       timestamptz,
  done_by       uuid,
  done_note     text,
  created_at    timestamptz not null default now()
);
alter table photo_shares enable row level security;
drop policy if exists "hunter_read_own_photo_shares" on photo_shares;
create policy "hunter_read_own_photo_shares" on photo_shares for select to authenticated
  using (client_id in (select id from clients where auth_user_id = auth.uid()));
drop policy if exists "staff_read_photo_shares" on photo_shares;
create policy "staff_read_photo_shares" on photo_shares for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop trigger if exists trg_audit on photo_shares;
create trigger trg_audit after insert or update or delete on photo_shares for each row execute function public._audit_row();

create or replace function public.hunter_share_photos(p_hunt uuid, p_link text, p_consent boolean, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_link text := trim(coalesce(p_link, '')); v_host text; v_id uuid;
begin
  select h.client_id into v_client from client_hunts h join clients c on c.id = h.client_id where h.id = p_hunt and c.auth_user_id = auth.uid();
  if v_client is null then raise exception 'That hunt is not on your profile'; end if;
  if p_consent is not true then raise exception 'Please tick the box to say you agree'; end if;
  if length(v_link) > 600 then raise exception 'That link is too long'; end if;
  if lower(v_link) !~ '^https://([a-z0-9-]+\.)*(icloud\.com|photos\.app\.goo\.gl|photos\.google\.com|drive\.google\.com|dropbox\.com|wetransfer\.com|we\.tl|1drv\.ms|onedrive\.live\.com)(/|\?|$)' then
    raise exception 'That link is not from iCloud, Google Photos, Dropbox, OneDrive or WeTransfer. Please share a single album with one of those';
  end if;
  v_host := substring(lower(v_link) from '^https://([^/?]+)');
  select id into v_id from photo_shares where hunt_id = p_hunt and status = 'waiting';
  if v_id is null then
    insert into photo_shares (client_id, hunt_id, link, link_host, note) values (v_client, p_hunt, v_link, v_host, nullif(trim(coalesce(p_note, '')), '')) returning id into v_id;
  else
    update photo_shares set link = v_link, link_host = v_host, note = nullif(trim(coalesce(p_note, '')), ''), consent_at = now() where id = v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.hunter_share_photos(uuid, text, boolean, text) from public, anon;
grant execute on function public.hunter_share_photos(uuid, text, boolean, text) to authenticated;

-- the hunter takes the link back: it is deleted
create or replace function public.hunter_withdraw_photo_share(p_share uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update photo_shares s set status = 'withdrawn', link = null, done_at = now()
   where s.id = p_share and s.status = 'waiting' and s.client_id in (select id from clients where auth_user_id = auth.uid());
  if not found then raise exception 'Nothing to take back here'; end if;
end;
$$;
revoke all on function public.hunter_withdraw_photo_share(uuid) from public, anon;
grant execute on function public.hunter_withdraw_photo_share(uuid) to authenticated;

-- the workshop has copied the photos: the link is deleted and the hunter is told
create or replace function public.staff_finish_photo_share(p_share uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if not exists (select 1 from staff_profiles where id = auth.uid() and is_active) then raise exception 'Only the workshop can do this'; end if;
  select * into s from photo_shares where id = p_share;
  if not found then raise exception 'That request does not exist'; end if;
  if s.status <> 'waiting' then return; end if;
  update photo_shares set status = 'done', link = null, done_at = now(), done_by = auth.uid(), done_note = nullif(trim(coalesce(p_note, '')), '') where id = p_share;
  insert into client_notifications (client_id, hunt_id, type, stage, title, body)
  values (s.client_id, s.hunt_id, 'update', 'video', 'Your photos are ready', 'We copied your photos. Open Your hunt film to watch the free preview. Your link has been deleted.');
end;
$$;
revoke all on function public.staff_finish_photo_share(uuid, text) from public, anon;
grant execute on function public.staff_finish_photo_share(uuid, text) to authenticated;

select to_regclass('public.photo_shares') is not null and exists (select 1 from pg_proc where proname = 'hunter_share_photos') as photo_share_ready;
