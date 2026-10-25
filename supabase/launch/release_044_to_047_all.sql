-- Apex: photos (044) + hunter onboarding (045) + pre-register / custom mounts (046) + animal guide (047). Safe to run more than once.

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


-- Migration 045: hunter onboarding and mount choice
--  * every client gets a private invitation link (token)
--  * a hunter who signs up is linked to the profile the workshop already made for them, not given a blank duplicate
--  * the hunter chooses the mount for each animal (only their own animals, only before work has started)

alter table clients add column if not exists invite_token    text;
alter table clients add column if not exists invite_sent_at  timestamptz;
alter table clients add column if not exists invite_channel  text;
alter table clients add column if not exists registered_at   timestamptz;

update clients set invite_token = replace(gen_random_uuid()::text, '-', '') where invite_token is null;
alter table clients alter column invite_token set default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists clients_invite_token_key on clients(invite_token);
update clients set registered_at = coalesce(registered_at, created_at) where auth_user_id is not null and registered_at is null;

-- ── link a new sign-up to the right client ───────────────────────────────────
create or replace function public.link_auth_user_to_client(
  p_user uuid, p_email text, p_name text, p_phone text, p_type text, p_token text, p_hunter boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_client uuid;
begin
  -- 1. the invitation link they came from
  if p_token is not null and p_token <> '' then
    select id into v_client from clients where invite_token = p_token and (auth_user_id is null or auth_user_id = p_user);
  end if;
  -- 2. the same e-mail address on a profile nobody has claimed yet (the one with the most hunts first)
  if v_client is null and p_hunter and p_email is not null then
    select c.id into v_client from clients c
      where lower(c.email) = lower(p_email) and c.auth_user_id is null
      order by (select count(*) from client_hunts h where h.client_id = c.id) desc, c.created_at
      limit 1;
  end if;
  if v_client is not null then
    update clients set
      auth_user_id = p_user,
      registered_at = coalesce(registered_at, now()),
      onboarding_status = case when onboarding_status = 'complete' then onboarding_status else 'in_progress' end,
      email = coalesce(email, p_email),
      phone = coalesce(phone, p_phone)
    where id = v_client;
    return v_client;
  end if;
  -- 3. nobody known — a new profile
  insert into clients (auth_user_id, full_name, email, phone, client_type, onboarding_status, registered_at)
  values (p_user, p_name, p_email, p_phone, coalesce(p_type, 'export'), 'in_progress', now())
  on conflict (auth_user_id) do nothing
  returning id into v_client;
  return v_client;
end;
$$;
revoke all on function public.link_auth_user_to_client(uuid, text, text, text, text, text, boolean) from public, anon, authenticated;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.link_auth_user_to_client(
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'client_type', 'export'),
    new.raw_user_meta_data->>'invite_token',
    coalesce(new.raw_user_meta_data->>'portal_type', '') = 'hunter'
  );
  return new;
end;
$$;

-- for someone who is already signed in and opens their invitation link afterwards
create or replace function public.claim_client_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_target uuid; v_mine uuid;
begin
  if v_user is null then raise exception 'Please sign in first'; end if;
  select id into v_target from clients where invite_token = p_token and (auth_user_id is null or auth_user_id = v_user);
  if v_target is null then raise exception 'This invitation link is not valid any more'; end if;
  select id into v_mine from clients where auth_user_id = v_user;
  if v_mine is not null and v_mine <> v_target then
    if exists (select 1 from client_hunts where client_id = v_mine) then
      raise exception 'This account already has its own trophies — please contact the workshop';
    end if;
    delete from clients where id = v_mine;
  end if;
  update clients set auth_user_id = v_user, registered_at = coalesce(registered_at, now()) where id = v_target;
  return v_target;
end;
$$;
revoke all on function public.claim_client_invite(text) from public, anon;
grant execute on function public.claim_client_invite(text) to authenticated;

-- what the invitation page may show before the person has an account (first name + what we received, nothing more)
create or replace function public.get_invite_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c record; v jsonb;
begin
  select id, full_name, email, phone, client_type, auth_user_id into c from clients where invite_token = p_token;
  if not found then return null; end if;
  select jsonb_agg(jsonb_build_object(
           'species', d.form_data->>'species',
           'parts', coalesce(d.form_data->'received_parts', '[]'::jsonb),
           'received_at', coalesce(d.form_data->>'received_at', d.created_at::text)
         ) order by d.created_at)
    into v
    from hunt_documents d join client_hunts h on h.id = d.hunt_id
    where h.client_id = c.id and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival');
  return jsonb_build_object(
    'first_name', split_part(c.full_name, ' ', 1), 'full_name', c.full_name, 'email', c.email, 'phone', c.phone,
    'client_type', c.client_type, 'registered', c.auth_user_id is not null,
    'animals', coalesce(v, '[]'::jsonb));
end;
$$;
grant execute on function public.get_invite_info(text) to anon, authenticated;

-- ── the hunter chooses how an animal is to be mounted ───────────────────────
create or replace function public.hunter_choose_mount(p_doc uuid, p_mount text, p_notes text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d record;
begin
  select hd.id, hd.hunt_id, hd.form_data, hd.current_department, hd.started_at into d
    from hunt_documents hd
    join client_hunts h on h.id = hd.hunt_id
    join clients c on c.id = h.client_id
   where hd.id = p_doc and hd.doc_type = 'job_card' and c.auth_user_id = auth.uid();
  if not found then raise exception 'That trophy is not on your profile'; end if;
  if d.current_department <> 'receiving' or d.started_at is not null then
    raise exception 'Work on this trophy has already started — please message the workshop to change it';
  end if;
  if coalesce(trim(p_mount), '') = '' then raise exception 'Please choose a mount'; end if;

  update hunt_documents set
    form_data = coalesce(form_data, '{}'::jsonb) || jsonb_build_object(
      'mount_type', p_mount,
      'instructions', case when coalesce(trim(p_notes), '') = '' then coalesce(form_data->>'instructions', '') else trim(p_notes) end,
      'mount_chosen_at', now(),
      'mount_chosen_by', 'client'),
    title = coalesce(form_data->>'species', 'Trophy') || ' - ' || p_mount
            || case when coalesce(form_data->>'tag_number', '') <> '' then ' (Tag: ' || (form_data->>'tag_number') || ')' else '' end,
    updated_at = now()
  where id = p_doc;

  -- every animal on this hunt now has a mount → the workshop is no longer waiting on the hunter
  if not exists (
    select 1 from hunt_documents x
     where x.hunt_id = d.hunt_id and x.doc_type = 'job_card' and x.status in ('in_progress', 'pending')
       and coalesce(x.form_data->>'mount_type', '') in ('', 'Pending Instructions')
  ) then
    update client_hunts set awaiting_instruction = false, instruction_received_at = now() where id = d.hunt_id;
  end if;
end;
$$;
revoke all on function public.hunter_choose_mount(uuid, text, text) from public, anon;
grant execute on function public.hunter_choose_mount(uuid, text, text) to authenticated;


-- Migration 046: a hunter adds their animals once the hunt is over (before the trophies reach the workshop),
-- chooses a mount for each — including a CUSTOM mount (their own idea, with reference photos, can combine several
-- of their animals into one) or a REPLICA — and staff tick the parts off at arrival.

-- ── reference photos from the hunter ─────────────────────────────────────────
alter table trophy_photos drop constraint if exists trophy_photos_kind_check;
alter table trophy_photos add constraint trophy_photos_kind_check check (kind in ('arrival', 'progress', 'finished', 'reference'));

drop policy if exists "hunter_add_reference_photos" on trophy_photos;
create policy "hunter_add_reference_photos" on trophy_photos for insert to authenticated
  with check (kind = 'reference' and client_id in (select id from clients where auth_user_id = auth.uid()));
drop policy if exists "hunter_update_reference_photos" on trophy_photos;
create policy "hunter_update_reference_photos" on trophy_photos for update to authenticated
  using (kind = 'reference' and client_id in (select id from clients where auth_user_id = auth.uid()))
  with check (kind = 'reference' and client_id in (select id from clients where auth_user_id = auth.uid()));

drop policy if exists "hunter_upload_reference_files" on storage.objects;
create policy "hunter_upload_reference_files" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-photos'
    and (storage.foldername(name))[1] = 'trophy-photos'
    and (storage.foldername(name))[2] in (select id::text from public.clients where auth_user_id = auth.uid())
  );
drop policy if exists "hunter_update_reference_files" on storage.objects;
create policy "hunter_update_reference_files" on storage.objects for update to authenticated
  using (
    bucket_id = 'client-photos'
    and (storage.foldername(name))[1] = 'trophy-photos'
    and (storage.foldername(name))[2] in (select id::text from public.clients where auth_user_id = auth.uid())
  );

-- ── one readable line of instructions for the workshop ───────────────────────
create or replace function public.pose_instructions(p_pose jsonb, p_notes text) returns text
language sql immutable as $$
  select coalesce(nullif(concat_ws('. ',
    nullif('Pose: ' || trim(concat_ws(', ',
      case when coalesce(p_pose->>'head', '') <> '' then 'head ' || lower(p_pose->>'head') end,
      case when coalesce(p_pose->>'neck', '') <> '' then 'neck ' || lower(p_pose->>'neck') end)), 'Pose: '),
    nullif(trim(coalesce(p_notes, '')), '')), ''), '')
$$;

create or replace function public.extra_instructions(p_mount text, p_extra jsonb, p_combined text) returns text
language sql immutable as $$
  select case
    when p_mount = 'Custom mount' then
      trim('CUSTOM MOUNT: ' || coalesce(p_extra->'custom'->>'description', '')
           || case when coalesce(p_combined, '') <> '' then ' Combined with: ' || p_combined || '.' else '' end)
    when p_mount = 'Replica' then
      trim('REPLICA'
           || case when coalesce(p_extra->'replica'->>'type', '') <> '' then ' (' || (p_extra->'replica'->>'type') || ')' else '' end
           || case when jsonb_array_length(coalesce(p_extra->'replica'->'reasons', '[]'::jsonb)) > 0
                   then ', reason: ' || (select string_agg(r, ', ') from jsonb_array_elements_text(p_extra->'replica'->'reasons') r) else '' end
           || '.')
    else '' end
$$;

-- ── register animals after the hunt ──────────────────────────────────────────
drop function if exists public.hunter_register_animals(date, date, text, jsonb);
create or replace function public.hunter_register_animals(p_start date, p_end date, p_operator text, p_animals jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_client uuid; v_type text; v_hunt uuid; a jsonb; v_mount text; v_id uuid; v_map jsonb := '{}'::jsonb;
  v_ids uuid[]; v_species text; k text;
begin
  select id, client_type into v_client, v_type from clients where auth_user_id = auth.uid();
  if v_client is null then raise exception 'We could not find your profile'; end if;
  if p_end is null then raise exception 'Please enter the date your hunt ended'; end if;
  if p_end > current_date then
    raise exception 'You can add your animals once your hunt has ended (%)', to_char(p_end, 'DD Mon YYYY');
  end if;
  if jsonb_typeof(p_animals) <> 'array' or jsonb_array_length(p_animals) = 0 then raise exception 'Add at least one animal'; end if;
  if jsonb_array_length(p_animals) > 40 then raise exception 'Please add at most 40 animals at a time'; end if;

  insert into client_hunts (client_id, year, status, client_type, operator, start_date, end_date)
  values (v_client, extract(year from p_end)::text, 'active', coalesce(v_type, 'export'), nullif(trim(coalesce(p_operator, '')), ''), p_start, p_end)
  returning id into v_hunt;

  -- 1. one job card per animal
  for a in select * from jsonb_array_elements(p_animals) loop
    if coalesce(trim(a->>'species'), '') = '' then raise exception 'Every animal needs a name'; end if;
    v_mount := coalesce(nullif(trim(a->>'mount'), ''), 'Pending Instructions');
    if v_mount = 'Custom mount' and length(trim(coalesce(a->'custom'->>'description', ''))) < 5 then
      raise exception 'Please describe your custom mount for the %', a->>'species';
    end if;
    insert into hunt_documents (hunt_id, doc_type, status, current_department, title, form_data)
    values (v_hunt, 'job_card', 'awaiting_arrival', 'receiving',
            (a->>'species') || ' - ' || v_mount,
            jsonb_build_object(
              'species', a->>'species', 'mount_type', v_mount, 'quantity', 1, 'tag_number', '',
              'instructions', coalesce(nullif(trim(concat_ws(' ', public.extra_instructions(v_mount, a, null), public.pose_instructions(a->'pose', a->>'notes'))), ''), ''),
              'pose', coalesce(a->'pose', '{}'::jsonb), 'custom', coalesce(a->'custom', 'null'::jsonb), 'replica', coalesce(a->'replica', 'null'::jsonb),
              'preregistered_by', 'client', 'registered_at', now(),
              'mount_chosen_by', case when v_mount = 'Pending Instructions' then null else 'client' end,
              'mount_chosen_at', case when v_mount = 'Pending Instructions' then null else now() end))
    returning id into v_id;
    v_map := v_map || jsonb_build_object(coalesce(a->>'key', v_id::text), v_id::text);
  end loop;

  -- 2. custom mounts that combine several of the animals into one
  for a in select * from jsonb_array_elements(p_animals) where (value->>'mount') = 'Custom mount' loop
    select coalesce(array_agg((v_map->>x)::uuid), '{}') into v_ids
      from jsonb_array_elements_text(coalesce(a->'custom'->'combine', '[]'::jsonb)) x
     where v_map ? x and x <> coalesce(a->>'key', '');
    if array_length(v_ids, 1) is not null then
      select string_agg(distinct d.form_data->>'species', ', ') into v_species from hunt_documents d where d.id = any(v_ids);
      update hunt_documents set form_data = form_data
          || jsonb_build_object('custom', coalesce(form_data->'custom', '{}'::jsonb) || jsonb_build_object('combined_with', to_jsonb(v_ids)),
                                'instructions', public.extra_instructions('Custom mount', form_data, v_species) || coalesce(' ' || nullif(public.pose_instructions(null, a->>'notes'), ''), ''))
        where id = (v_map->>coalesce(a->>'key', ''))::uuid;
      update hunt_documents set
          title = (form_data->>'species') || ' - Custom mount (combined)',
          form_data = form_data || jsonb_build_object(
            'mount_type', 'Custom mount (combined)', 'custom_parent', v_map->>coalesce(a->>'key', ''),
            'instructions', 'Part of the custom mount with the ' || (a->>'species'), 'mount_chosen_by', 'client', 'mount_chosen_at', now())
        where id = any(v_ids);
    end if;
  end loop;

  return jsonb_build_object('hunt_id', v_hunt,
    'docs', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'id', value)) from jsonb_each_text(v_map)), '[]'::jsonb));
end;
$$;
revoke all on function public.hunter_register_animals(date, date, text, jsonb) from public, anon;
grant execute on function public.hunter_register_animals(date, date, text, jsonb) to authenticated;

-- the invitation page lists only what has actually been received
create or replace function public.get_invite_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c record; v jsonb;
begin
  select id, full_name, email, phone, client_type, auth_user_id into c from clients where invite_token = p_token;
  if not found then return null; end if;
  select jsonb_agg(jsonb_build_object(
           'species', d.form_data->>'species',
           'parts', coalesce(d.form_data->'received_parts', '[]'::jsonb),
           'received_at', coalesce(d.form_data->>'received_at', d.created_at::text)
         ) order by d.created_at)
    into v
    from hunt_documents d join client_hunts h on h.id = d.hunt_id
    where h.client_id = c.id and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending');
  return jsonb_build_object(
    'first_name', split_part(c.full_name, ' ', 1), 'full_name', c.full_name, 'email', c.email, 'phone', c.phone,
    'client_type', c.client_type, 'registered', c.auth_user_id is not null,
    'animals', coalesce(v, '[]'::jsonb));
end;
$$;
grant execute on function public.get_invite_info(text) to anon, authenticated;

-- ── choose a mount for an animal that is already on the hunter's list ───────
drop function if exists public.hunter_choose_mount(uuid, text, text);
drop function if exists public.hunter_choose_mount(uuid, text, text, jsonb);
create or replace function public.hunter_choose_mount(p_doc uuid, p_mount text, p_notes text default null, p_pose jsonb default null, p_extra jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
declare d record; v_ids uuid[]; v_species text; v_ok int; v_instr text; v_form jsonb;
begin
  select hd.id, hd.hunt_id, hd.form_data, hd.current_department, hd.started_at into d
    from hunt_documents hd
    join client_hunts h on h.id = hd.hunt_id
    join clients c on c.id = h.client_id
   where hd.id = p_doc and hd.doc_type = 'job_card' and c.auth_user_id = auth.uid();
  if not found then raise exception 'That trophy is not on your profile'; end if;
  if d.current_department <> 'receiving' or d.started_at is not null then
    raise exception 'Work on this trophy has already started — please message the workshop to change it';
  end if;
  if coalesce(trim(p_mount), '') = '' then raise exception 'Please choose a mount'; end if;
  if coalesce(d.form_data->>'mount_type', '') = 'Custom mount (combined)' then
    raise exception 'This animal is part of a custom mount — change the custom mount it belongs to instead';
  end if;

  -- an earlier custom mount that combined other animals: set those free again
  update hunt_documents set
      form_data = (form_data - 'custom_parent') || jsonb_build_object('mount_type', 'Pending Instructions', 'instructions', ''),
      title = (form_data->>'species') || ' - Pending Instructions'
    where (form_data->>'custom_parent') = p_doc::text;

  v_form := jsonb_build_object('mount_type', p_mount, 'mount_chosen_at', now(), 'mount_chosen_by', 'client',
                               'pose', coalesce(p_pose, '{}'::jsonb), 'custom', 'null'::jsonb, 'replica', 'null'::jsonb);

  if p_mount = 'Custom mount' then
    if length(trim(coalesce(p_extra->'custom'->>'description', ''))) < 5 then raise exception 'Please describe your custom mount'; end if;
    select coalesce(array_agg(x::uuid), '{}') into v_ids from jsonb_array_elements_text(coalesce(p_extra->'custom'->'combine', '[]'::jsonb)) x;
    if array_length(v_ids, 1) is not null then
      select count(*) into v_ok from hunt_documents hd
        join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id
       where hd.id = any(v_ids) and hd.id <> p_doc and c.auth_user_id = auth.uid() and hd.started_at is null and hd.current_department = 'receiving';
      if v_ok <> array_length(v_ids, 1) then raise exception 'One of the animals you chose to combine is not available'; end if;
      select string_agg(distinct hd.form_data->>'species', ', ') into v_species from hunt_documents hd where hd.id = any(v_ids);
      update hunt_documents set
          title = (form_data->>'species') || ' - Custom mount (combined)',
          form_data = form_data || jsonb_build_object('mount_type', 'Custom mount (combined)', 'custom_parent', p_doc::text,
            'instructions', 'Part of the custom mount with the ' || (d.form_data->>'species'), 'mount_chosen_by', 'client', 'mount_chosen_at', now())
        where id = any(v_ids);
    end if;
    v_form := v_form || jsonb_build_object('custom', jsonb_build_object('description', trim(p_extra->'custom'->>'description'), 'combined_with', to_jsonb(coalesce(v_ids, '{}'))));
  elsif p_mount = 'Replica' then
    v_form := v_form || jsonb_build_object('replica', coalesce(p_extra->'replica', '{}'::jsonb));
  end if;

  v_instr := trim(concat_ws(' ', nullif(public.extra_instructions(p_mount, p_extra, v_species), ''), nullif(public.pose_instructions(p_pose, p_notes), '')));
  update hunt_documents set
    form_data = coalesce(form_data, '{}'::jsonb) || v_form || jsonb_build_object('instructions', coalesce(nullif(v_instr, ''), form_data->>'instructions', '')),
    title = coalesce(form_data->>'species', 'Trophy') || ' - ' || p_mount
            || case when coalesce(form_data->>'tag_number', '') <> '' then ' (Tag: ' || (form_data->>'tag_number') || ')' else '' end,
    updated_at = now()
  where id = p_doc;

  if not exists (
    select 1 from hunt_documents x
     where x.hunt_id = d.hunt_id and x.doc_type = 'job_card' and x.status in ('in_progress', 'pending', 'awaiting_arrival')
       and coalesce(x.form_data->>'mount_type', '') in ('', 'Pending Instructions')
  ) then
    update client_hunts set awaiting_instruction = false, instruction_received_at = now() where id = d.hunt_id;
  end if;
end;
$$;
revoke all on function public.hunter_choose_mount(uuid, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.hunter_choose_mount(uuid, text, text, jsonb, jsonb) to authenticated;


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


