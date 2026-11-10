-- 076: a deposit does not lock an order; money that is not needed is kept as a tracked credit.
--  * A client can change their choices after accepting or paying, until the animal is being mounted (the skin rules from 063 still apply).
--    Their payment stays on the invoice and counts toward the new total.
--  * Extra money (the order got cheaper, or an order was dropped) becomes a CREDIT on the client's account. Every credit and every use of
--    credit is written down in client_credits, so nobody gets confused about where the money is.
--  * Credit is used on the deposit or the balance of another order, by staff or by the client.
--  * Prices the workshop set by hand (custom mounts, leather work) are kept when the client changes something else.
-- Safe to run more than once.

alter table quotes add column if not exists reopened_at timestamptz;
alter table quotes add column if not exists change_count int not null default 0;

-- money can now also go back out of an invoice (moved to credit) and come in from credit
alter table quote_payments drop constraint if exists quote_payments_amount_check;
alter table quote_payments add constraint quote_payments_amount_check check (amount <> 0);
alter table quote_payments drop constraint if exists quote_payments_source_check;
alter table quote_payments add constraint quote_payments_source_check check (source in ('manual', 'xero', 'credit', 'gateway'));

create table if not exists client_credits (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  hunt_id         uuid references client_hunts(id) on delete set null,
  quote_id        uuid references quotes(id) on delete set null,
  currency        text not null check (currency in ('USD', 'ZAR')),
  amount          numeric(12, 2) not null check (amount <> 0),            -- + kept as credit, - used or refunded
  kind            text not null check (kind in ('kept', 'used', 'refunded')),
  note            text,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_client_credits_client on client_credits(client_id, created_at);
alter table client_credits enable row level security;
drop policy if exists "quote_staff_read_credits" on client_credits;
create policy "quote_staff_read_credits" on client_credits for select to authenticated using (public.is_quote_staff());
drop policy if exists "hunter_read_own_credits" on client_credits;
create policy "hunter_read_own_credits" on client_credits for select to authenticated
  using (client_id in (select id from clients where auth_user_id = auth.uid()));

create or replace function public.client_credit_balance(p_client uuid, p_currency text) returns numeric
language sql stable security definer set search_path = public as $$
  select case when public.is_quote_staff() or exists (select 1 from clients where id = p_client and auth_user_id = auth.uid())
              then coalesce((select sum(amount) from client_credits where client_id = p_client and currency = p_currency), 0) else 0 end
$$;
revoke all on function public.client_credit_balance(uuid, text) from public, anon;
grant execute on function public.client_credit_balance(uuid, text) to authenticated;

-- keep part of what a client paid on an invoice as credit (internal)
create or replace function public._move_to_credit(p_quote uuid, p_amount numeric, p_note text, p_by uuid, p_by_name text) returns void
language plpgsql security definer set search_path = public as $$
declare q record; v_paid numeric; v_total numeric;
begin
  select * into q from quotes where id = p_quote;
  if not found then raise exception 'That invoice does not exist'; end if;
  select coalesce(sum(amount), 0) into v_paid from quote_payments where quote_id = p_quote;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount to keep as credit'; end if;
  if p_amount > v_paid + 0.005 then raise exception 'Only % has been paid on this invoice', v_paid; end if;
  insert into quote_payments (quote_id, amount, method, reference, source, recorded_by, paid_by)
  values (p_quote, -p_amount, 'Moved to credit', nullif(trim(coalesce(p_note, '')), ''), 'credit', p_by, 'other');
  insert into client_credits (client_id, hunt_id, quote_id, currency, amount, kind, note, created_by, created_by_name)
  values (q.client_id, q.hunt_id, p_quote, q.currency, p_amount, 'kept', nullif(trim(coalesce(p_note, '')), ''), p_by, p_by_name);
  select coalesce(sum(amount), 0) into v_total from quote_lines where quote_id = p_quote;
  select coalesce(sum(amount), 0) into v_paid from quote_payments where quote_id = p_quote;
  if q.status = 'paid' and v_paid < v_total - 0.005 then update quotes set status = 'deposit_paid', updated_at = now() where id = p_quote; end if;
  insert into client_notifications (client_id, hunt_id, type, stage, title, body)
  values (q.client_id, q.hunt_id, 'update', 'credit', 'Credit on your account', 'We are keeping ' || to_char(p_amount, 'FM999G999G990D00') || ' ' || q.currency || ' as credit for you. You can use it on another order.');
end;
$$;
revoke all on function public._move_to_credit(uuid, numeric, text, uuid, text) from public, anon, authenticated;

create or replace function public.staff_keep_as_credit(p_quote uuid, p_amount numeric, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public.is_quote_staff() then raise exception 'Only managers can move money to credit'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  perform public._move_to_credit(p_quote, p_amount, p_note, auth.uid(), v_name);
end;
$$;
revoke all on function public.staff_keep_as_credit(uuid, numeric, text) from public, anon;
grant execute on function public.staff_keep_as_credit(uuid, numeric, text) to authenticated;

-- use credit on an invoice that is waiting for money (internal). It is paid like any other payment, so the clock starts the same way.
create or replace function public._use_credit(p_quote uuid, p_amount numeric, p_by uuid, p_by_name text) returns numeric
language plpgsql security definer set search_path = public as $$
declare q record; v_bal numeric; v_paid numeric; v_total numeric; v_want numeric; v_use numeric;
begin
  select * into q from quotes where id = p_quote;
  if not found then raise exception 'That invoice does not exist'; end if;
  if q.status not in ('accepted', 'deposit_paid') then raise exception 'This invoice is not waiting for a payment'; end if;
  select coalesce(sum(amount), 0) into v_bal from client_credits where client_id = q.client_id and currency = q.currency;
  select coalesce(sum(amount), 0) into v_paid from quote_payments where quote_id = p_quote;
  select coalesce(sum(amount), 0) into v_total from quote_lines where quote_id = p_quote;
  v_want := case when q.status = 'accepted' then coalesce(q.amount_due_now, 0) - v_paid else v_total - v_paid end;
  v_use := least(coalesce(p_amount, v_want), v_want, v_bal);
  if v_use <= 0.004 then raise exception 'There is no credit to use here'; end if;
  insert into client_credits (client_id, hunt_id, quote_id, currency, amount, kind, note, created_by, created_by_name)
  values (q.client_id, q.hunt_id, p_quote, q.currency, -v_use, 'used', 'Used on this invoice', p_by, p_by_name);
  perform public.apply_quote_payment(p_quote, v_use, 'Credit', 'Credit from an earlier order', 'credit', null, p_by, null, 'hunter');
  return v_use;
end;
$$;
revoke all on function public._use_credit(uuid, numeric, uuid, text) from public, anon, authenticated;

create or replace function public.staff_use_credit(p_quote uuid, p_amount numeric default null) returns numeric
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public.is_quote_staff() then raise exception 'Only managers can use a client''s credit'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  return public._use_credit(p_quote, p_amount, auth.uid(), v_name);
end;
$$;
revoke all on function public.staff_use_credit(uuid, numeric) from public, anon;
grant execute on function public.staff_use_credit(uuid, numeric) to authenticated;

create or replace function public.hunter_use_credit(p_quote uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare v_name text; v_ok boolean;
begin
  select c.full_name, true into v_name, v_ok from quotes qq join clients c on c.id = qq.client_id where qq.id = p_quote and c.auth_user_id = auth.uid();
  if v_ok is not true then raise exception 'That quote is not on your profile'; end if;
  return public._use_credit(p_quote, null, null, v_name);
end;
$$;
revoke all on function public.hunter_use_credit(uuid) from public, anon;
grant execute on function public.hunter_use_credit(uuid) to authenticated;

-- the client wants to change their choices after accepting or paying
create or replace function public.hunter_reopen_quote(p_quote uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q record;
begin
  select qq.* into q from quotes qq join clients c on c.id = qq.client_id where qq.id = p_quote and c.auth_user_id = auth.uid();
  if not found then raise exception 'That quote is not on your profile'; end if;
  if q.status not in ('accepted', 'deposit_paid', 'paid') then raise exception 'This quote can be changed without any extra step'; end if;
  if not exists (select 1 from hunt_documents d where d.hunt_id = q.hunt_id and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival')
                   and coalesce(d.current_department, '') not in ('mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration')) then
    raise exception 'Every animal is already being mounted, so nothing can be changed any more';
  end if;
  update quotes set status = 'sent', reopened_at = now(), change_count = change_count + 1, hunter_comment = null, declined_at = null, updated_at = now() where id = p_quote;
end;
$$;
revoke all on function public.hunter_reopen_quote(uuid) from public, anon;
grant execute on function public.hunter_reopen_quote(uuid) to authenticated;

-- accepting: what is already paid counts, extra money becomes credit
create or replace function public.hunter_respond_quote(p_quote uuid, p_accept boolean, p_comment text default null, p_option text default 'deposit') returns void
language plpgsql security definer set search_path = public as $$
declare q record; v_total numeric; v_paid numeric; v_target numeric; v_name text;
begin
  select qq.*, c.full_name as client_name into q from quotes qq join clients c on c.id = qq.client_id where qq.id = p_quote and c.auth_user_id = auth.uid();
  if not found then raise exception 'That quote is not on your profile'; end if;
  if q.status <> 'sent' then raise exception 'This quote is no longer waiting for your answer'; end if;
  if p_accept then
    if p_option not in ('deposit', 'full') then raise exception 'Please choose to pay a deposit or pay in full'; end if;
    select coalesce(sum(amount), 0) into v_total from quote_lines where quote_id = p_quote;
    select coalesce(sum(amount), 0) into v_paid from quote_payments where quote_id = p_quote;
    v_target := round(case when p_option = 'full' then v_total else v_total * q.deposit_percent / 100 end, 2);
    update quotes set status = 'accepted', accepted_at = now(), hunter_comment = nullif(trim(coalesce(p_comment, '')), ''),
           payment_option = p_option, amount_due_now = v_target, updated_at = now()
     where id = p_quote;
    if v_paid > 0.004 then
      -- an order that was already paid on and then changed
      if v_paid > v_total + 0.005 then
        perform public._move_to_credit(p_quote, round(v_paid - v_total, 2), 'The order was changed and came to less', null, q.client_name);
        v_paid := v_total;
      end if;
      if v_paid >= v_total - 0.005 then update quotes set status = 'paid', updated_at = now() where id = p_quote;
      elsif v_paid >= v_target - 0.005 then update quotes set status = 'deposit_paid', updated_at = now() where id = p_quote;
      end if;
    end if;
  else
    if coalesce(trim(p_comment), '') = '' then raise exception 'Please tell us what you would like changed'; end if;
    update quotes set status = 'declined', declined_at = now(), hunter_comment = trim(p_comment), updated_at = now() where id = p_quote;
  end if;
end;
$$;
revoke all on function public.hunter_respond_quote(uuid, boolean, text, text) from public, anon;
grant execute on function public.hunter_respond_quote(uuid, boolean, text, text) to authenticated;

-- the client finished choosing: build or rebuild the pro-forma. Prices the workshop set by hand are kept for animals that did not change.
create or replace function public.hunter_finish_choices(p_hunt uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h record; v_type text; v_lines jsonb; v_unpriced int; v_q record; v_id uuid; v_leather jsonb;
begin
  select hh.id, hh.client_id, c.client_type into h from client_hunts hh join clients c on c.id = hh.client_id where hh.id = p_hunt and c.auth_user_id = auth.uid();
  if not found then raise exception 'That hunt is not on your profile'; end if;
  v_type := case when h.client_type = 'local' then 'local' else 'export' end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'hunt_doc_id', d.id,
           'amount', p.price,
           'description', coalesce(d.form_data->>'species', 'Animal') || ': ' || (d.form_data->>'mount_type') ||
             case when jsonb_array_length(coalesce(d.form_data->'custom'->'combined_with', '[]'::jsonb)) > 0
                  then ' (combined with ' || (select string_agg(x.form_data->>'species', ', ') from hunt_documents x where x.id::text in (select jsonb_array_elements_text(d.form_data->'custom'->'combined_with'))) || ')' else '' end ||
             case when d.form_data->>'mount_type' = 'Replica' and coalesce(d.form_data->'replica'->>'type', '') <> '' then ' (' || (d.form_data->'replica'->>'type') || ')' else '' end
         ) order by d.created_at, d.id), '[]'::jsonb)
    into v_lines
    from hunt_documents d
    left join mount_prices p on p.species = d.form_data->>'species' and p.mount = d.form_data->>'mount_type' and p.client_type = v_type
   where d.hunt_id = p_hunt and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival')
     and coalesce(d.form_data->>'mount_type', '') not in ('', 'Pending Instructions', 'Custom mount (combined)');
  if jsonb_array_length(v_lines) = 0 then return jsonb_build_object('result', 'nothing'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('hunt_doc_id', d.id, 'amount', null,
           'description', coalesce(d.form_data->>'species', 'Animal') || ': leather work' ||
             case when jsonb_array_length(coalesce(d.form_data->'leather'->'items', '[]'::jsonb)) > 0
                  then ' (' || (select string_agg(x, ', ') from jsonb_array_elements_text(d.form_data->'leather'->'items') x) || ')' else '' end
         ) order by d.created_at, d.id), '[]'::jsonb)
    into v_leather
    from hunt_documents d
   where d.hunt_id = p_hunt and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival')
     and coalesce(d.form_data->>'mount_type', '') not in ('', 'Pending Instructions', 'Custom mount (combined)')
     and d.form_data->'leather'->>'choice' = 'leather';
  v_lines := v_lines || v_leather;

  select id, status, auto_made, deposit_percent, note into v_q from quotes where hunt_id = p_hunt order by created_at desc limit 1;
  if found and v_q.status in ('accepted', 'deposit_paid', 'paid') then return jsonb_build_object('result', 'accepted', 'quote_id', v_q.id); end if;
  if found and v_q.status in ('draft', 'sent', 'declined') then
    -- an invoice with credit notes or stock hides on it is never rebuilt by the app: staff are told instead
    if exists (select 1 from quote_lines where quote_id = v_q.id and kind <> 'item') then
      update quotes set status = 'declined', declined_at = now(), hunter_comment = 'I changed my choices. Please update my quote.', updated_at = now() where id = v_q.id and status = 'sent';
      update client_hunts set quote_required = true where id = p_hunt;
      return jsonb_build_object('result', 'staff', 'quote_id', v_q.id);
    end if;
    -- an animal that did not change keeps the price it already has (this is how a price the workshop set by hand survives),
    -- and lines that are not about one animal (an extra crate, say) stay
    select coalesce(jsonb_agg(case when ol.amount is not null and ol.description = e->>'description'
                                   then jsonb_set(e, '{amount}', to_jsonb(ol.amount)) else e end order by ord), '[]'::jsonb)
      into v_lines
      from jsonb_array_elements(v_lines) with ordinality as t(e, ord)
      left join lateral (select l.amount, l.description from quote_lines l where l.quote_id = v_q.id and l.hunt_doc_id = nullif(e->>'hunt_doc_id', '')::uuid and l.kind = 'item' and l.description = e->>'description' limit 1) ol on true;
    select v_lines || coalesce(jsonb_agg(jsonb_build_object('hunt_doc_id', null, 'amount', l.amount, 'description', l.description) order by l.sort_order), '[]'::jsonb)
      into v_lines from quote_lines l where l.quote_id = v_q.id and l.hunt_doc_id is null and l.kind = 'item';
    select count(*) into v_unpriced from jsonb_array_elements(v_lines) e where e->>'amount' is null;
    if not v_q.auto_made then
      -- the workshop's own quote: rebuild it with their prices kept, but never send it on its own. Staff look it over and send it.
      v_id := public._save_quote(p_hunt, case when v_type = 'local' then 'ZAR' else 'USD' end, v_lines, v_q.deposit_percent, v_q.note, false, null);
      update quotes set auto_made = false, status = 'declined', declined_at = now(), hunter_comment = 'I changed my choices. Please check my quote and send it again.', updated_at = now() where id = v_id;
      update client_hunts set quote_required = true where id = p_hunt;
      return jsonb_build_object('result', 'staff', 'quote_id', v_id);
    end if;
  else
    select count(*) into v_unpriced from jsonb_array_elements(v_lines) e where e->>'amount' is null;
  end if;

  v_id := public._save_quote(p_hunt, case when v_type = 'local' then 'ZAR' else 'USD' end, v_lines, 50, null, v_unpriced = 0, null);
  update quotes set auto_made = true where id = v_id;
  return jsonb_build_object('result', case when v_unpriced = 0 then 'sent' else 'staff' end, 'quote_id', v_id);
end;
$$;
revoke all on function public.hunter_finish_choices(uuid) from public, anon;
grant execute on function public.hunter_finish_choices(uuid) to authenticated;

-- the client chooses (or changes) a mount: allowed until the animal is being mounted; a custom mount needs a description or a photo
create or replace function public.hunter_choose_mount(p_doc uuid, p_mount text, p_notes text default null, p_pose jsonb default null, p_extra jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
declare d record; v_ids uuid[]; v_species text; v_ok int; v_instr text; v_form jsonb; v_old text;
begin
  select hd.id, hd.hunt_id, hd.form_data, hd.current_department, hd.status, c.full_name as client_name into d
    from hunt_documents hd
    join client_hunts h on h.id = hd.hunt_id
    join clients c on c.id = h.client_id
   where hd.id = p_doc and hd.doc_type = 'job_card' and c.auth_user_id = auth.uid();
  if not found then raise exception 'That trophy is not on your profile'; end if;
  -- a client may change their mind until the animal is being mounted (the skin rules in 063 still stop a bigger mount than the cut skin allows)
  if d.current_department in ('mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration') or d.status in ('completed', 'cancelled') then
    raise exception 'This animal is already being mounted, so it cannot be changed any more. Please message the workshop';
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
    if length(trim(coalesce(p_extra->'custom'->>'description', ''))) < 5 and coalesce(nullif(p_extra->'custom'->>'photos', '')::int, 0) = 0 then raise exception 'Please write a short description of your custom mount, or add a photo'; end if;
    select coalesce(array_agg(x::uuid), '{}') into v_ids from jsonb_array_elements_text(coalesce(p_extra->'custom'->'combine', '[]'::jsonb)) x;
    if array_length(v_ids, 1) is not null then
      select count(*) into v_ok from hunt_documents hd
        join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id
       where hd.id = any(v_ids) and hd.id <> p_doc and c.auth_user_id = auth.uid() and hd.current_department not in ('mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration') and hd.status not in ('completed', 'cancelled');
      if v_ok <> array_length(v_ids, 1) then raise exception 'One of the animals you chose to combine is not available'; end if;
      select string_agg(distinct hd.form_data->>'species', ', ') into v_species from hunt_documents hd where hd.id = any(v_ids);
      update hunt_documents set
          title = (form_data->>'species') || ' - Custom mount (combined)',
          form_data = form_data || jsonb_build_object('mount_type', 'Custom mount (combined)', 'custom_parent', p_doc::text,
            'instructions', 'Part of the custom mount with the ' || (d.form_data->>'species'), 'mount_chosen_by', 'client', 'mount_chosen_at', now())
        where id = any(v_ids);
    end if;
    v_form := v_form || jsonb_build_object('custom', jsonb_build_object('description', trim(coalesce(p_extra->'custom'->>'description', '')), 'combined_with', to_jsonb(coalesce(v_ids, '{}'))));
  elsif p_mount = 'Replica' then
    v_form := v_form || jsonb_build_object('replica', coalesce(p_extra->'replica', '{}'::jsonb));
  end if;

  -- a change after the first choice is written on the job card, so the workshop can see it
  v_old := coalesce(d.form_data->>'mount_type', '');
  if v_old not in ('', 'Pending Instructions') and v_old <> p_mount then
    v_form := v_form || jsonb_build_object('mount_history', coalesce(d.form_data->'mount_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'from', v_old, 'to', p_mount, 'by', d.client_name || ' (the client)', 'at', now(), 'reason', 'The client changed their choice')));
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

select count(*) = 9 as change_after_deposit_ready from pg_proc where proname in ('hunter_reopen_quote', 'hunter_respond_quote', 'hunter_finish_choices', 'hunter_use_credit', 'staff_use_credit', 'staff_keep_as_credit', 'client_credit_balance', '_move_to_credit', 'hunter_choose_mount');
