-- Migration 050: the outfitter link.
-- An outfitter has their own account tied to their business record. They register the hunter and the animals taken
-- (never the mounts: the hunter chooses those), then follow each hunt and see the money side: quote status, paid, outstanding,
-- and what the outfitter paid themselves. Everything goes through the functions below; they can read nothing else.

alter table outfitters add column if not exists auth_user_id   uuid unique references auth.users(id) on delete set null;
alter table outfitters add column if not exists invite_token   text;
alter table outfitters add column if not exists invite_sent_at timestamptz;
alter table outfitters add column if not exists registered_at  timestamptz;
update outfitters set invite_token = replace(gen_random_uuid()::text, '-', '') where invite_token is null;
alter table outfitters alter column invite_token set default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists outfitters_invite_token_key on outfitters(invite_token);

-- only staff, and the outfitter themselves, may read outfitter records
drop policy if exists "staff_read_outfitters" on outfitters;
drop policy if exists "staff_or_own_read_outfitters" on outfitters;
create policy "staff_or_own_read_outfitters" on outfitters for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active) or auth_user_id = auth.uid());

-- who paid: the hunter, the outfitter, or someone else
alter table quote_payments add column if not exists paid_by text not null default 'hunter' check (paid_by in ('hunter', 'outfitter', 'other'));

drop function if exists public.staff_record_payment(uuid, numeric, text, text, timestamptz);
drop function if exists public.apply_quote_payment(uuid, numeric, text, text, text, text, uuid, timestamptz);

create or replace function public.apply_quote_payment(p_quote uuid, p_amount numeric, p_method text, p_reference text, p_source text, p_xero_payment text, p_by uuid, p_received timestamptz default null, p_paid_by text default 'hunter') returns void
language plpgsql security definer set search_path = public as $$
declare q record; v_paid numeric; v_total numeric;
begin
  select * into q from quotes where id = p_quote;
  if not found then raise exception 'That quote does not exist'; end if;
  if q.status not in ('accepted', 'deposit_paid') then raise exception 'This quote is not waiting for a payment'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the amount received'; end if;
  insert into quote_payments (quote_id, amount, method, reference, source, xero_payment_id, recorded_by, received_at, paid_by)
  values (p_quote, p_amount, p_method, nullif(trim(coalesce(p_reference, '')), ''), coalesce(p_source, 'manual'), p_xero_payment, p_by, coalesce(p_received, now()), coalesce(p_paid_by, 'hunter'));
  select coalesce(sum(amount), 0) into v_paid from quote_payments where quote_id = p_quote;
  select coalesce(sum(amount), 0) into v_total from quote_lines where quote_id = p_quote;

  if v_paid >= v_total - 0.005 then
    update quotes set status = 'paid', updated_at = now() where id = p_quote;
  elsif q.status = 'accepted' and v_paid >= coalesce(q.amount_due_now, 0) - 0.005 then
    update quotes set status = 'deposit_paid', updated_at = now() where id = p_quote;
  end if;

  if q.status = 'accepted' and v_paid >= coalesce(q.amount_due_now, 0) - 0.005 then
    update client_hunts set work_authorised_at = now(), work_authorised_by = p_by, work_authorised_note = 'Payment received',
           deposit_amount = v_paid, deposit_paid_at = now() where id = q.hunt_id;
    perform public.start_timeline_if_needed(q.hunt_id, case when p_source = 'xero' then 'xero' else 'cash_manual' end, p_by, p_received);
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (q.client_id, q.hunt_id, 'update', 'deposit', 'Payment received', 'Thank you. Your payment is in and the workshop can start on your animals.');
  elsif v_paid >= v_total - 0.005 then
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (q.client_id, q.hunt_id, 'update', 'paid', 'Paid in full', 'Thank you. Your account is settled.');
  end if;
end;
$$;
revoke all on function public.apply_quote_payment(uuid, numeric, text, text, text, text, uuid, timestamptz, text) from public, anon, authenticated;

create or replace function public.staff_record_payment(p_quote uuid, p_amount numeric, p_method text, p_reference text, p_received timestamptz default null, p_paid_by text default 'hunter') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_quote_staff() then raise exception 'Only managers can record a payment'; end if;
  perform public.apply_quote_payment(p_quote, p_amount, p_method, p_reference, 'manual', null, auth.uid(), p_received, p_paid_by);
end;
$$;
revoke all on function public.staff_record_payment(uuid, numeric, text, text, timestamptz, text) from public, anon;
grant execute on function public.staff_record_payment(uuid, numeric, text, text, timestamptz, text) to authenticated;

-- animals an outfitter registered also put the hunt on the quote track
create or replace function public.flag_quote_required() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.doc_type = 'job_card' and new.form_data->>'preregistered_by' in ('client', 'outfitter') then
    update client_hunts set quote_required = true where id = new.hunt_id and not quote_required;
  end if;
  return new;
end;
$$;

-- ── signing up as an outfitter ────────────────────────────────────────────────
create or replace function public.link_auth_user_to_outfitter(p_user uuid, p_email text, p_company text, p_contact text, p_phone text, p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_token is not null and p_token <> '' then
    select id into v_id from outfitters where invite_token = p_token and (auth_user_id is null or auth_user_id = p_user);
  end if;
  if v_id is null and p_email is not null then
    select id into v_id from outfitters where lower(email) = lower(p_email) and auth_user_id is null limit 1;
  end if;
  if v_id is not null then
    update outfitters set auth_user_id = p_user, registered_at = coalesce(registered_at, now()),
           email = coalesce(email, p_email), phone = coalesce(phone, p_phone), contact_name = coalesce(contact_name, p_contact) where id = v_id;
    return v_id;
  end if;
  -- someone nobody invited: created, but inactive until the workshop approves them
  insert into outfitters (name, contact_name, email, phone, status, auth_user_id, registered_at)
  values (coalesce(nullif(trim(p_company), ''), nullif(trim(p_contact), ''), split_part(p_email, '@', 1)), p_contact, p_email, p_phone, 'inactive', p_user, now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.link_auth_user_to_outfitter(uuid, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'portal_type', '') = 'outfitter' then
    perform public.link_auth_user_to_outfitter(new.id, new.email, new.raw_user_meta_data->>'company', new.raw_user_meta_data->>'full_name',
                                               new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'invite_token');
    return new;
  end if;
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

create or replace function public.get_outfitter_invite_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o record;
begin
  select name, contact_name, email, auth_user_id into o from outfitters where invite_token = p_token;
  if not found then return null; end if;
  return jsonb_build_object('name', o.name, 'contact_name', o.contact_name, 'email', o.email, 'registered', o.auth_user_id is not null);
end;
$$;
grant execute on function public.get_outfitter_invite_info(text) to anon, authenticated;

-- ── what an outfitter may see: their own hunts, animals and money (totals only) ──
create or replace function public.outfitter_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o record; v jsonb;
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  if not found then return null; end if;
  select coalesce(jsonb_agg(s.h order by s.created_at desc), '[]'::jsonb) into v from (
    select ch.created_at, jsonb_build_object(
      'id', ch.id, 'ref', ch.ref_number, 'hunter', c.full_name, 'email', c.email, 'start', ch.start_date, 'end', ch.end_date,
      'registered', c.auth_user_id is not null,
      'animals', (select coalesce(jsonb_agg(jsonb_build_object(
                    'species', d.form_data->>'species', 'tag', d.form_data->>'tag_number', 'status', d.status, 'dept', d.current_department,
                    'mount', case when coalesce(d.form_data->>'mount_type', '') in ('', 'Pending Instructions') then null else d.form_data->>'mount_type' end
                  ) order by d.created_at), '[]'::jsonb)
                  from hunt_documents d where d.hunt_id = ch.id and d.doc_type = 'job_card' and d.status <> 'cancelled'),
      'money', (select jsonb_build_object(
                    'status', q.status, 'currency', q.currency,
                    'total', coalesce((select sum(amount) from quote_lines l where l.quote_id = q.id), 0),
                    'paid', coalesce((select sum(amount) from quote_payments p where p.quote_id = q.id), 0),
                    'paid_by_outfitter', coalesce((select sum(amount) from quote_payments p where p.quote_id = q.id and p.paid_by = 'outfitter'), 0))
                  from quotes q where q.hunt_id = ch.id and q.status <> 'draft' order by q.created_at desc limit 1)
    ) as h
    from client_hunts ch join clients c on c.id = ch.client_id
    where ch.outfitter_id = o.id and ch.status <> 'cancelled'
  ) s;
  return jsonb_build_object('outfitter', jsonb_build_object('id', o.id, 'name', o.name, 'status', o.status), 'hunts', v);
end;
$$;
revoke all on function public.outfitter_overview() from public, anon;
grant execute on function public.outfitter_overview() to authenticated;

-- ── register a hunter's hunt and the animals taken ───────────────────────────
create or replace function public.outfitter_register_hunt(p_hunter jsonb, p_start date, p_end date, p_farm text, p_animals jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare o record; v_client uuid; v_hunt uuid; a jsonb; v_email text := nullif(lower(trim(coalesce(p_hunter->>'email', ''))), ''); v_type text := coalesce(nullif(p_hunter->>'client_type', ''), 'export');
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  if not found then raise exception 'This account is not an outfitter'; end if;
  if o.status <> 'active' then raise exception 'Your outfitter account is waiting for the workshop to activate it'; end if;
  if coalesce(trim(p_hunter->>'name'), '') = '' then raise exception 'Please enter the hunter''s name'; end if;
  if p_end is null then raise exception 'Please enter the date the hunt ended'; end if;
  if p_end > current_date then raise exception 'Register the animals once the hunt has ended (%)', to_char(p_end, 'DD Mon YYYY'); end if;
  if jsonb_typeof(p_animals) <> 'array' or jsonb_array_length(p_animals) = 0 then raise exception 'Add at least one animal'; end if;
  if jsonb_array_length(p_animals) > 60 then raise exception 'Please add at most 60 animals at a time'; end if;

  if v_email is not null then select id into v_client from clients where lower(email) = v_email order by (auth_user_id is not null) desc, created_at limit 1; end if;
  if v_client is null then
    insert into clients (full_name, email, phone, country, client_type, outfitter_id, onboarding_status)
    values (trim(p_hunter->>'name'), v_email, nullif(trim(coalesce(p_hunter->>'phone', '')), ''), nullif(trim(coalesce(p_hunter->>'country', '')), ''), v_type, o.id, 'not_started')
    returning id into v_client;
  else
    update clients set outfitter_id = coalesce(outfitter_id, o.id) where id = v_client;
  end if;

  insert into client_hunts (client_id, year, status, client_type, operator, outfitter_id, farm_name, start_date, end_date, hunt_date)
  values (v_client, extract(year from p_end)::text, 'active', v_type, o.name, o.id, nullif(trim(coalesce(p_farm, '')), ''), p_start, p_end, p_end)
  returning id into v_hunt;

  for a in select * from jsonb_array_elements(p_animals) loop
    if coalesce(trim(a->>'species'), '') = '' then raise exception 'Every animal needs a name'; end if;
    insert into hunt_documents (hunt_id, doc_type, status, current_department, title, form_data)
    values (v_hunt, 'job_card', 'awaiting_arrival', 'receiving', (a->>'species') || ' - Pending Instructions',
            jsonb_build_object('species', a->>'species', 'mount_type', 'Pending Instructions', 'quantity', 1,
                               'tag_number', coalesce(trim(a->>'tag'), ''), 'instructions', '', 'preregistered_by', 'outfitter',
                               'outfitter_id', o.id, 'registered_at', now()));
  end loop;
  return v_hunt;
end;
$$;
revoke all on function public.outfitter_register_hunt(jsonb, date, date, text, jsonb) from public, anon;
grant execute on function public.outfitter_register_hunt(jsonb, date, date, text, jsonb) to authenticated;

-- more animals on a hunt the outfitter already registered (only while they have not arrived)
create or replace function public.outfitter_add_animals(p_hunt uuid, p_animals jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare o record; a jsonb;
begin
  select * into o from outfitters where auth_user_id = auth.uid() and status = 'active';
  if not found then raise exception 'This account is not an active outfitter'; end if;
  if not exists (select 1 from client_hunts where id = p_hunt and outfitter_id = o.id) then raise exception 'That hunt is not yours'; end if;
  if jsonb_typeof(p_animals) <> 'array' or jsonb_array_length(p_animals) = 0 then raise exception 'Add at least one animal'; end if;
  for a in select * from jsonb_array_elements(p_animals) loop
    if coalesce(trim(a->>'species'), '') = '' then raise exception 'Every animal needs a name'; end if;
    insert into hunt_documents (hunt_id, doc_type, status, current_department, title, form_data)
    values (p_hunt, 'job_card', 'awaiting_arrival', 'receiving', (a->>'species') || ' - Pending Instructions',
            jsonb_build_object('species', a->>'species', 'mount_type', 'Pending Instructions', 'quantity', 1,
                               'tag_number', coalesce(trim(a->>'tag'), ''), 'instructions', '', 'preregistered_by', 'outfitter', 'outfitter_id', o.id, 'registered_at', now()));
  end loop;
end;
$$;
revoke all on function public.outfitter_add_animals(uuid, jsonb) from public, anon;
grant execute on function public.outfitter_add_animals(uuid, jsonb) to authenticated;
