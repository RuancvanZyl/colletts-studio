-- Migration 061: credit and amend an order, and the hide purchase.
-- When a trophy is cancelled or changed (for example after a rejected skin) management runs a credit note against the invoice and
-- then adds what replaces it: a new mount, a hide bought from the workshop's stock, or both. A "Hide purchase" is a line type of its own
-- (with the stock reference). Every change is an amendment on record with a credit note number, a reason and the client's agreement.
-- The invoice (quote) total is always the sum of its lines, so credits are negative lines. Needs migrations 048 and 060.

alter table quote_lines add column if not exists kind text not null default 'item' check (kind in ('item', 'credit', 'hide_purchase'));
alter table quote_lines add column if not exists amendment_id uuid;
alter table quote_lines add column if not exists credit_for_line_id uuid references quote_lines(id) on delete set null;
alter table quote_lines add column if not exists stock_reference text;

create sequence if not exists credit_note_seq;
create table if not exists quote_amendments (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references quotes(id) on delete cascade,
  hunt_id         uuid not null references client_hunts(id) on delete cascade,
  case_id         uuid references quality_cases(id) on delete set null,
  credit_no       text unique,
  reason          text not null,
  client_agreed   text not null,
  credit_total    numeric(12, 2) not null default 0,
  added_total     numeric(12, 2) not null default 0,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_quote_amendments_quote on quote_amendments (quote_id, created_at);
alter table quote_amendments enable row level security;
drop policy if exists "quote_staff_read_amendments" on quote_amendments;
create policy "quote_staff_read_amendments" on quote_amendments for select to authenticated using (public.is_quote_staff());
drop policy if exists "hunter_read_own_amendments" on quote_amendments;
create policy "hunter_read_own_amendments" on quote_amendments for select to authenticated
  using (quote_id in (select q.id from quotes q where q.client_id in (select id from clients where auth_user_id = auth.uid())));

-- the quote's status follows its total: paid when the payments cover it, otherwise waiting for the balance
create or replace function public._requote_status(p_quote uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q record; v_total numeric; v_paid numeric;
begin
  select * into q from quotes where id = p_quote;
  if not found or q.status not in ('accepted', 'deposit_paid', 'paid') then return; end if;
  select coalesce(sum(amount), 0) into v_total from quote_lines where quote_id = p_quote;
  select coalesce(sum(amount), 0) into v_paid from quote_payments where quote_id = p_quote;
  update quotes set status = case when v_paid >= v_total - 0.005 then 'paid' when v_paid >= coalesce(amount_due_now, 0) - 0.005 and v_paid > 0 then 'deposit_paid' else 'accepted' end,
         updated_at = now() where id = p_quote;
end;
$$;
revoke all on function public._requote_status(uuid) from public, anon, authenticated;

-- credit note + new lines (+ new job cards) in one step
create or replace function public.staff_amend_quote(p_quote uuid, p_case uuid, p_credits jsonb, p_adds jsonb, p_reason text, p_agreed text) returns uuid
language plpgsql security definer set search_path = public as $$
declare q record; v_name text; v_id uuid; v_no text; c jsonb; a jsonb; ln record; v_credit numeric := 0; v_added numeric := 0; v_i int; v_doc uuid; v_prev numeric; v_amt numeric; v_card boolean := false; v_case_doc uuid;
begin
  if not public.is_quote_staff() then raise exception 'Only managers can credit or amend an invoice'; end if;
  select * into q from quotes where id = p_quote;
  if not found then raise exception 'That quote does not exist'; end if;
  if q.status not in ('accepted', 'deposit_paid', 'paid') then raise exception 'Only an accepted invoice can be credited or amended. Edit the quote instead'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Say why the invoice is being changed'; end if;
  if coalesce(trim(p_agreed), '') = '' then raise exception 'Record how and when the client agreed to the change'; end if;
  if coalesce(jsonb_array_length(coalesce(p_credits, '[]'::jsonb)), 0) = 0 and coalesce(jsonb_array_length(coalesce(p_adds, '[]'::jsonb)), 0) = 0 then raise exception 'Credit something or add something'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  v_no := 'CN-' || lpad(nextval('credit_note_seq')::text, 5, '0');
  insert into quote_amendments (quote_id, hunt_id, case_id, credit_no, reason, client_agreed, created_by, created_by_name)
  values (p_quote, q.hunt_id, p_case, v_no, trim(p_reason), trim(p_agreed), auth.uid(), v_name) returning id into v_id;
  select coalesce(max(sort_order), 0) into v_i from quote_lines where quote_id = p_quote;
  if p_case is not null then select job_doc_id into v_case_doc from quality_cases where id = p_case; end if;

  for c in select * from jsonb_array_elements(coalesce(p_credits, '[]'::jsonb)) loop
    select * into ln from quote_lines where id = (c->>'line_id')::uuid and quote_id = p_quote and kind <> 'credit';
    if not found then raise exception 'One of the lines to credit is not on this invoice'; end if;
    v_amt := (c->>'amount')::numeric;
    if v_amt is null or v_amt <= 0 then raise exception 'A credit must be more than nothing'; end if;
    select coalesce(-sum(amount), 0) into v_prev from quote_lines where credit_for_line_id = ln.id;
    if v_amt + v_prev > coalesce(ln.amount, 0) + 0.005 then raise exception 'You cannot credit more than the line is worth (%)', ln.description; end if;
    v_i := v_i + 1;
    insert into quote_lines (quote_id, hunt_doc_id, description, amount, sort_order, kind, amendment_id, credit_for_line_id)
    values (p_quote, ln.hunt_doc_id, 'Credit (' || v_no || '): ' || ln.description, -v_amt, v_i, 'credit', v_id, ln.id);
    v_credit := v_credit + v_amt;
  end loop;

  for a in select * from jsonb_array_elements(coalesce(p_adds, '[]'::jsonb)) loop
    if coalesce(trim(a->>'description'), '') = '' then raise exception 'Every new line needs a description'; end if;
    v_amt := nullif(a->>'amount', '')::numeric;
    if v_amt is null or v_amt < 0 then raise exception 'Every new line needs an amount (%)', a->>'description'; end if;
    if a->>'kind' = 'hide_purchase' and coalesce(trim(a->>'stock_reference'), '') = '' then raise exception 'A hide purchase says which hide from stock it is'; end if;
    v_doc := nullif(a->>'hunt_doc_id', '')::uuid;
    if a->'new_card' is not null and jsonb_typeof(a->'new_card') = 'object' then
      insert into hunt_documents (hunt_id, doc_type, status, current_department, title, form_data)
      values (q.hunt_id, 'job_card', 'in_progress', coalesce(nullif(a->'new_card'->>'start_department', ''), 'mounting'),
              (a->'new_card'->>'species') || ' - ' || (a->'new_card'->>'mount_type') || ' (replacement)',
              jsonb_build_object('species', a->'new_card'->>'species', 'mount_type', a->'new_card'->>'mount_type', 'quantity', 1, 'instructions', '',
                                 'tag_number', '', 'mount_chosen_by', 'workshop', 'replacement_for', v_case_doc, 'stock_reference', nullif(trim(coalesce(a->>'stock_reference', '')), ''),
                                 'received_at', now()))
      returning id into v_doc;
      v_card := true;
    end if;
    v_i := v_i + 1;
    insert into quote_lines (quote_id, hunt_doc_id, description, amount, sort_order, kind, amendment_id, stock_reference)
    values (p_quote, v_doc, trim(a->>'description'), v_amt, v_i, case when a->>'kind' = 'hide_purchase' then 'hide_purchase' else 'item' end, v_id, nullif(trim(coalesce(a->>'stock_reference', '')), ''));
    v_added := v_added + v_amt;
  end loop;

  update quote_amendments set credit_total = v_credit, added_total = v_added where id = v_id;
  perform public._requote_status(p_quote);
  if p_case is not null then
    update quality_cases set needs_quote_change = false, needs_job_card_change = case when v_card then false else needs_job_card_change end where id = p_case;
  end if;
  insert into client_notifications (client_id, hunt_id, type, stage, title, body)
  values (q.client_id, q.hunt_id, 'alert', 'quote', 'Your order was changed', 'A credit note (' || v_no || ') was applied and your invoice was updated. Open My trophies to see the new total.');
  return v_id;
end;
$$;
revoke all on function public.staff_amend_quote(uuid, uuid, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.staff_amend_quote(uuid, uuid, jsonb, jsonb, text, text) to authenticated;

-- the job card of a trophy changes: a different mount on the same card, or nothing to change
create or replace function public.case_update_card(p_case uuid, p_mount text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_doc uuid; v_species text;
begin
  if not public._is_management() then raise exception 'Only management can change a job card'; end if;
  select job_doc_id into v_doc from quality_cases where id = p_case;
  if not found then raise exception 'That case does not exist'; end if;
  if coalesce(trim(p_mount), '') <> '' then
    select form_data->>'species' into v_species from hunt_documents where id = v_doc;
    update hunt_documents set form_data = form_data || jsonb_build_object('mount_type', trim(p_mount)), title = coalesce(v_species, 'Trophy') || ' - ' || trim(p_mount) where id = v_doc;
  end if;
  update quality_cases set needs_job_card_change = false where id = p_case;
end;
$$;
revoke all on function public.case_update_card(uuid, text) from public, anon;
grant execute on function public.case_update_card(uuid, text) to authenticated;

-- quotes can now carry a hide purchase line
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
    insert into quote_lines (quote_id, hunt_doc_id, description, amount, sort_order, kind, stock_reference)
    values (v_q, nullif(l->>'hunt_doc_id', '')::uuid, trim(l->>'description'), nullif(l->>'amount', '')::numeric, v_i,
            case when l->>'kind' = 'hide_purchase' then 'hide_purchase' else 'item' end, nullif(trim(coalesce(l->>'stock_reference', '')), ''));
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
