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
