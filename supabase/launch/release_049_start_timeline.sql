-- Migration 049: paying (or an admin starting work) also starts the order timeline — milestones and a deadline —
-- the way management already does it for a deposit. Needs migrations 034 and 035.

create or replace function public.start_timeline_if_needed(p_hunt uuid, p_via text, p_by uuid, p_at timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from client_hunts where id = p_hunt and timeline_started_at is null) then
    perform public._apply_order_timeline(p_hunt, p_via, p_by, least(coalesce(p_at, now()), now()));
  end if;
end;
$$;
revoke all on function public.start_timeline_if_needed(uuid, text, uuid, timestamptz) from public, anon, authenticated;

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
    perform public.start_timeline_if_needed(q.hunt_id, case when p_source = 'xero' then 'xero' else 'cash_manual' end, p_by, p_received);
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (q.client_id, q.hunt_id, 'update', 'deposit', 'Payment received', 'Thank you. Your payment is in and the workshop can start on your animals.');
  elsif v_paid >= v_total - 0.005 then
    insert into client_notifications (client_id, hunt_id, type, stage, title, body)
    values (q.client_id, q.hunt_id, 'update', 'paid', 'Paid in full', 'Thank you. Your account is settled.');
  end if;
end;
$$;

create or replace function public.staff_authorise_work(p_hunt uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')) then
    raise exception 'Only admins can start work without a deposit';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Please say why work is starting without the deposit'; end if;
  update client_hunts set work_authorised_at = now(), work_authorised_by = auth.uid(), work_authorised_note = 'Started without deposit: ' || trim(p_reason) where id = p_hunt;
  perform public.start_timeline_if_needed(p_hunt, 'cash_manual', auth.uid(), null);
end;
$$;
