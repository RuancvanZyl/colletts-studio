-- Migration 048: quote, acceptance, payment (deposit or in full) and go-ahead — with fields ready for Xero.
-- After the hunter chooses mounts the manager prepares a quote and sends it. The hunter accepts it, the deposit is
-- confirmed, and only then can the hunt's animals leave Receiving. Hunts that never get a quote (all the existing
-- ones) are not affected.

alter table client_hunts add column if not exists quote_required       boolean not null default false;
alter table client_hunts add column if not exists work_authorised_at   timestamptz;
alter table client_hunts add column if not exists work_authorised_by   uuid references staff_profiles(id);
alter table client_hunts add column if not exists work_authorised_note text;

create table if not exists quotes (
  id                   uuid primary key default gen_random_uuid(),
  hunt_id              uuid not null references client_hunts(id) on delete cascade,
  client_id            uuid not null references clients(id) on delete cascade,
  status               text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'deposit_paid', 'paid')),
  currency             text not null default 'USD' check (currency in ('USD', 'ZAR')),
  deposit_percent      numeric(5, 2) not null default 50 check (deposit_percent >= 0 and deposit_percent <= 100),
  note                 text,
  hunter_comment       text,
  created_by           uuid references staff_profiles(id),
  sent_at              timestamptz,
  accepted_at          timestamptz,
  declined_at          timestamptz,
  payment_option       text check (payment_option in ('deposit', 'full')),
  amount_due_now       numeric(12, 2),
  xero_invoice_id      text,
  xero_invoice_number  text,
  xero_invoice_url     text,
  xero_status          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists quotes_one_open_per_hunt on quotes(hunt_id) where status in ('draft', 'sent', 'accepted');
create index if not exists idx_quotes_hunt on quotes(hunt_id, created_at desc);

create table if not exists quote_lines (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references quotes(id) on delete cascade,
  hunt_doc_id uuid references hunt_documents(id) on delete set null,
  description text not null,
  amount      numeric(12, 2),
  sort_order  int not null default 0
);
create index if not exists idx_quote_lines_quote on quote_lines(quote_id, sort_order);

create table if not exists quote_payments (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references quotes(id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  method          text,
  reference       text,
  source          text not null default 'manual' check (source in ('manual', 'xero')),
  xero_payment_id text unique,
  received_at     timestamptz not null default now(),
  recorded_by     uuid references staff_profiles(id)
);
create index if not exists idx_quote_payments_quote on quote_payments(quote_id, received_at);

-- Xero: which Xero contact a hunter is (filled in when the link is connected)
alter table clients add column if not exists xero_contact_id text;

create or replace function public.is_quote_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager', 'bookkeeper'))
$$;
grant execute on function public.is_quote_staff() to authenticated;

alter table quotes enable row level security;
alter table quote_lines enable row level security;
alter table quote_payments enable row level security;

drop policy if exists "quote_staff_read_quotes" on quotes;
create policy "quote_staff_read_quotes" on quotes for select to authenticated using (public.is_quote_staff());
drop policy if exists "hunter_read_own_quotes" on quotes;
create policy "hunter_read_own_quotes" on quotes for select to authenticated
  using (status <> 'draft' and client_id in (select id from clients where auth_user_id = auth.uid()));
drop policy if exists "quote_staff_read_lines" on quote_lines;
create policy "quote_staff_read_lines" on quote_lines for select to authenticated using (public.is_quote_staff());
drop policy if exists "hunter_read_own_quote_lines" on quote_lines;
create policy "hunter_read_own_quote_lines" on quote_lines for select to authenticated
  using (quote_id in (select q.id from quotes q where q.status <> 'draft' and q.client_id in (select id from clients where auth_user_id = auth.uid())));
drop policy if exists "quote_staff_read_payments" on quote_payments;
create policy "quote_staff_read_payments" on quote_payments for select to authenticated using (public.is_quote_staff());
drop policy if exists "hunter_read_own_payments" on quote_payments;
create policy "hunter_read_own_payments" on quote_payments for select to authenticated
  using (quote_id in (select q.id from quotes q where q.client_id in (select id from clients where auth_user_id = auth.uid())));
-- no direct writes: everything goes through the functions below

-- ── prepare / send a quote ───────────────────────────────────────────────────
create or replace function public.staff_save_quote(p_hunt uuid, p_currency text, p_lines jsonb, p_deposit_percent numeric, p_note text, p_send boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_q uuid; v_status text; l jsonb; v_i int := 0;
begin
  if not public.is_quote_staff() then raise exception 'Only managers can prepare quotes'; end if;
  select client_id into v_client from client_hunts where id = p_hunt;
  if v_client is null then raise exception 'That hunt does not exist'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Add at least one line to the quote'; end if;
  if p_send then
    for l in select * from jsonb_array_elements(p_lines) loop
      if l->>'amount' is null or (l->>'amount')::numeric < 0 then raise exception 'Every line needs an amount before the quote can be sent (%)', l->>'description'; end if;
    end loop;
  end if;

  select id, status into v_q, v_status from quotes where hunt_id = p_hunt and status in ('draft', 'sent', 'declined') order by created_at desc limit 1;
  if v_q is null then
    if exists (select 1 from quotes where hunt_id = p_hunt and status in ('accepted', 'deposit_paid')) then
      raise exception 'This quote has already been accepted';
    end if;
    insert into quotes (hunt_id, client_id, currency, deposit_percent, note, created_by) values (p_hunt, v_client, coalesce(p_currency, 'USD'), coalesce(p_deposit_percent, 50), p_note, auth.uid()) returning id into v_q;
  else
    delete from quote_lines where quote_id = v_q;
    update quotes set currency = coalesce(p_currency, currency), deposit_percent = coalesce(p_deposit_percent, deposit_percent), note = p_note, updated_at = now(), hunter_comment = null where id = v_q;
  end if;

  for l in select * from jsonb_array_elements(p_lines) loop
    if coalesce(trim(l->>'description'), '') = '' then raise exception 'Every line needs a description'; end if;
    v_i := v_i + 1;
    insert into quote_lines (quote_id, hunt_doc_id, description, amount, sort_order)
    values (v_q, nullif(l->>'hunt_doc_id', '')::uuid, trim(l->>'description'), nullif(l->>'amount', '')::numeric, v_i);
  end loop;

  update client_hunts set quote_required = true where id = p_hunt;
  update quotes set status = case when p_send then 'sent' else 'draft' end,
                    sent_at = case when p_send then now() else sent_at end, declined_at = null, updated_at = now()
    where id = v_q;

  if p_send then
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (v_client, p_hunt, 'alert', 'quote', 'Your quote is ready', 'Open My trophies to see the quote and accept it. We start work once the deposit is in.');
  end if;
  return v_q;
end;
$$;
revoke all on function public.staff_save_quote(uuid, text, jsonb, numeric, text, boolean) from public, anon;
grant execute on function public.staff_save_quote(uuid, text, jsonb, numeric, text, boolean) to authenticated;

-- ── the hunter accepts (paying a deposit or in full), or asks for changes ───
create or replace function public.hunter_respond_quote(p_quote uuid, p_accept boolean, p_comment text default null, p_option text default 'deposit') returns void
language plpgsql security definer set search_path = public as $$
declare q record; v_total numeric;
begin
  select qq.* into q from quotes qq join clients c on c.id = qq.client_id where qq.id = p_quote and c.auth_user_id = auth.uid();
  if not found then raise exception 'That quote is not on your profile'; end if;
  if q.status <> 'sent' then raise exception 'This quote is no longer waiting for your answer'; end if;
  if p_accept then
    if p_option not in ('deposit', 'full') then raise exception 'Please choose to pay a deposit or pay in full'; end if;
    select coalesce(sum(amount), 0) into v_total from quote_lines where quote_id = p_quote;
    update quotes set status = 'accepted', accepted_at = now(), hunter_comment = nullif(trim(coalesce(p_comment, '')), ''),
           payment_option = p_option,
           amount_due_now = case when p_option = 'full' then round(v_total, 2) else round(v_total * q.deposit_percent / 100, 2) end,
           updated_at = now()
     where id = p_quote;
  else
    if coalesce(trim(p_comment), '') = '' then raise exception 'Please tell us what you would like changed'; end if;
    update quotes set status = 'declined', declined_at = now(), hunter_comment = trim(p_comment), updated_at = now() where id = p_quote;
  end if;
end;
$$;
revoke all on function public.hunter_respond_quote(uuid, boolean, text, text) from public, anon;
grant execute on function public.hunter_respond_quote(uuid, boolean, text, text) to authenticated;

-- ── a payment arrived (typed in by staff now; sent by Xero once it is linked) ──
create or replace function public.apply_quote_payment(p_quote uuid, p_amount numeric, p_method text, p_reference text, p_source text, p_xero_payment text, p_by uuid, p_received timestamptz default null) returns void
language plpgsql security definer set search_path = public as $$
declare q record; v_paid numeric; v_total numeric;
begin
  select * into q from quotes where id = p_quote;
  if not found then raise exception 'That quote does not exist'; end if;
  if q.status not in ('accepted', 'deposit_paid') then raise exception 'This quote is not waiting for a payment'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the amount received'; end if;
  insert into quote_payments (quote_id, amount, method, reference, source, xero_payment_id, recorded_by, received_at)
  values (p_quote, p_amount, p_method, nullif(trim(coalesce(p_reference, '')), ''), coalesce(p_source, 'manual'), p_xero_payment, p_by, coalesce(p_received, now()));
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
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (q.client_id, q.hunt_id, 'update', 'deposit', 'Payment received', 'Thank you. Your payment is in and the workshop can start on your animals.');
  elsif v_paid >= v_total - 0.005 then
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (q.client_id, q.hunt_id, 'update', 'paid', 'Paid in full', 'Thank you. Your account is settled.');
  end if;
end;
$$;
revoke all on function public.apply_quote_payment(uuid, numeric, text, text, text, text, uuid, timestamptz) from public, anon, authenticated;

create or replace function public.staff_record_payment(p_quote uuid, p_amount numeric, p_method text, p_reference text, p_received timestamptz default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_quote_staff() then raise exception 'Only managers can record a payment'; end if;
  perform public.apply_quote_payment(p_quote, p_amount, p_method, p_reference, 'manual', null, auth.uid(), p_received);
end;
$$;
revoke all on function public.staff_record_payment(uuid, numeric, text, text, timestamptz) from public, anon;
grant execute on function public.staff_record_payment(uuid, numeric, text, text, timestamptz) to authenticated;

-- the hunter agreed by phone, WhatsApp or in person: the workshop records the acceptance for them
create or replace function public.staff_accept_quote(p_quote uuid, p_option text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare q record; v_total numeric;
begin
  if not public.is_quote_staff() then raise exception 'Only managers can accept a quote for a hunter'; end if;
  select * into q from quotes where id = p_quote;
  if not found then raise exception 'That quote does not exist'; end if;
  if q.status <> 'sent' then raise exception 'Send the quote first, then record the hunter''s answer'; end if;
  if p_option not in ('deposit', 'full') then raise exception 'Choose deposit or pay in full'; end if;
  select coalesce(sum(amount), 0) into v_total from quote_lines where quote_id = p_quote;
  update quotes set status = 'accepted', accepted_at = now(), payment_option = p_option,
         amount_due_now = case when p_option = 'full' then round(v_total, 2) else round(v_total * q.deposit_percent / 100, 2) end,
         hunter_comment = 'Accepted by the workshop for the hunter' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), ''), updated_at = now()
   where id = p_quote;
end;
$$;
revoke all on function public.staff_accept_quote(uuid, text, text) from public, anon;
grant execute on function public.staff_accept_quote(uuid, text, text) to authenticated;

-- ── an admin may start work without the deposit (always with a reason) ──────
create or replace function public.staff_authorise_work(p_hunt uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')) then
    raise exception 'Only admins can start work without a deposit';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Please say why work is starting without the deposit'; end if;
  update client_hunts set work_authorised_at = now(), work_authorised_by = auth.uid(), work_authorised_note = 'Started without deposit: ' || trim(p_reason) where id = p_hunt;
end;
$$;
revoke all on function public.staff_authorise_work(uuid, text) from public, anon;
grant execute on function public.staff_authorise_work(uuid, text) to authenticated;

-- ── the gate: animals of a quoted hunt cannot leave Receiving until work is authorised ──
create or replace function public.guard_work_started() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_req boolean; v_auth timestamptz;
begin
  if new.doc_type = 'job_card' and old.current_department = 'receiving' and new.current_department is distinct from 'receiving' then
    select quote_required, work_authorised_at into v_req, v_auth from client_hunts where id = new.hunt_id;
    if coalesce(v_req, false) and v_auth is null then
      raise exception 'Work cannot start yet: the hunter has not accepted the quote and paid the deposit';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_work_started on hunt_documents;
create trigger trg_guard_work_started before update of current_department on hunt_documents
  for each row execute function public.guard_work_started();

-- animals a hunter registered themselves put their hunt on the quote track
create or replace function public.flag_quote_required() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.doc_type = 'job_card' and new.form_data->>'preregistered_by' = 'client' then
    update client_hunts set quote_required = true where id = new.hunt_id and not quote_required;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_flag_quote_required on hunt_documents;
create trigger trg_flag_quote_required after insert on hunt_documents for each row execute function public.flag_quote_required();

-- ── what the manager sees: every hunt on the quote track and where it stands ──
create or replace view v_quote_pipeline with (security_invoker = true) as
select
  h.id as hunt_id, h.client_id, c.full_name as client_name, c.client_number, h.ref_number, h.client_type, h.work_authorised_at,
  (select count(*) from hunt_documents d where d.hunt_id = h.id and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival')) as animals,
  (select count(*) from hunt_documents d where d.hunt_id = h.id and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival')
      and coalesce(d.form_data->>'mount_type', '') not in ('', 'Pending Instructions')) as chosen,
  q.id as quote_id, q.status as quote_status, q.currency, q.deposit_percent, q.sent_at, q.accepted_at, q.payment_option, q.amount_due_now, q.xero_invoice_number,
  (select coalesce(sum(amount), 0) from quote_payments p where p.quote_id = q.id) as amount_paid,
  (select sum(amount) from quote_lines l where l.quote_id = q.id) as total,
  case
    when h.work_authorised_at is not null then 'authorised'
    when q.status in ('deposit_paid', 'paid') then 'authorised'
    when q.status = 'accepted' then 'awaiting_deposit'
    when q.status = 'sent' then 'sent'
    when q.status = 'declined' then 'declined'
    when q.status = 'draft' then 'draft'
    else 'to_quote'
  end as stage
from client_hunts h
join clients c on c.id = h.client_id
left join lateral (select * from quotes qq where qq.hunt_id = h.id order by qq.created_at desc limit 1) q on true
where h.status = 'active'
  and (q.id is not null
       or exists (select 1 from hunt_documents d where d.hunt_id = h.id and d.doc_type = 'job_card' and d.form_data->>'mount_chosen_by' = 'client' and d.status in ('in_progress', 'pending', 'awaiting_arrival')));
grant select on v_quote_pipeline to authenticated;
