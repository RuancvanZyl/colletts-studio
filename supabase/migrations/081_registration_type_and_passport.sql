-- 081: a new client is saved as local or export the way they chose at sign-up, and an export client's passport photo is kept in their file.
--  * Until now the choice made at sign-up was stored but then ignored: every self-registered client was created as export (dollar price list).
--    Now the client is created as local or export, which also decides the price list they are linked to.
--  * An export client can add a photo of their passport themselves. It is stored in their private folder, written on their file, and every
--    replacement is kept in the history (the old file also stays in storage).
-- Safe to run more than once.

create or replace function public.get_or_create_hunter_client(p_full_name text, p_email text default null, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_client_id uuid; v_type text;
begin
  select id into v_client_id from public.clients where auth_user_id = v_user_id limit 1;
  if v_client_id is not null then return v_client_id; end if;

  if p_email is not null then
    select id into v_client_id from public.clients where email ilike p_email and auth_user_id is null limit 1;
    if v_client_id is not null then
      update public.clients set auth_user_id = v_user_id where id = v_client_id;
      return v_client_id;
    end if;
  end if;

  -- what the person chose when they signed up (local = their trophies stay in South Africa)
  select case when u.raw_user_meta_data ->> 'client_type' = 'local' then 'local' else 'export' end into v_type from auth.users u where u.id = v_user_id;

  insert into public.clients (auth_user_id, full_name, email, phone, client_type, onboarding_status)
  values (v_user_id, p_full_name, p_email, p_phone, coalesce(v_type, 'export'), 'in_progress')
  on conflict do nothing
  returning id into v_client_id;
  if v_client_id is null then select id into v_client_id from public.clients where auth_user_id = v_user_id limit 1; end if;
  return v_client_id;
end;
$$;
grant execute on function public.get_or_create_hunter_client(text, text, text) to authenticated;

-- ───────────── the passport photo ─────────────
create table if not exists client_documents (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  doc_type      text not null,
  storage_path  text not null,
  file_name     text,
  uploaded_at   timestamptz default now(),
  uploaded_by   uuid,
  unique (client_id, doc_type)
);
alter table client_documents enable row level security;
drop policy if exists "staff_manage_client_documents" on client_documents;
create policy "staff_manage_client_documents" on client_documents for all to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active))
  with check (exists (select 1 from staff_profiles where id = auth.uid() and is_active));
drop policy if exists "hunter_read_own_client_documents" on client_documents;
create policy "hunter_read_own_client_documents" on client_documents for select to authenticated
  using (client_id in (select id from clients where auth_user_id = auth.uid()));

drop policy if exists "hunter_add_own_passport_file" on storage.objects;
create policy "hunter_add_own_passport_file" on storage.objects for insert to authenticated
  with check (bucket_id = 'client-documents' and (storage.foldername(name))[1] = 'passports'
              and (storage.foldername(name))[2] in (select id::text from public.clients where auth_user_id = auth.uid()));
drop policy if exists "hunter_read_own_passport_file" on storage.objects;
create policy "hunter_read_own_passport_file" on storage.objects for select to authenticated
  using (bucket_id = 'client-documents' and (storage.foldername(name))[1] = 'passports'
         and (storage.foldername(name))[2] in (select id::text from public.clients where auth_user_id = auth.uid()));

create or replace function public.hunter_save_passport(p_path text, p_file_name text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_client uuid;
begin
  select id into v_client from clients where auth_user_id = auth.uid() limit 1;
  if v_client is null then raise exception 'Your profile was not found'; end if;
  if coalesce(p_path, '') not like 'passports/' || v_client::text || '/%' then raise exception 'That file is not in your own folder'; end if;
  insert into client_documents (client_id, doc_type, storage_path, file_name, uploaded_by)
  values (v_client, 'passport', p_path, nullif(trim(coalesce(p_file_name, '')), ''), auth.uid())
  on conflict (client_id, doc_type) do update set storage_path = excluded.storage_path, file_name = excluded.file_name, uploaded_at = now(), uploaded_by = auth.uid();
end;
$$;
revoke all on function public.hunter_save_passport(text, text) from public, anon;
grant execute on function public.hunter_save_passport(text, text) to authenticated;

-- every passport added or replaced is written in the history
drop trigger if exists trg_audit on client_documents;
create trigger trg_audit after insert or update or delete on client_documents for each row execute function public._audit_row();

select exists (select 1 from pg_proc where proname = 'hunter_save_passport')
   and (select prosrc like '%raw_user_meta_data%' from pg_proc where proname = 'get_or_create_hunter_client' limit 1) as registration_type_and_passport_ready;
