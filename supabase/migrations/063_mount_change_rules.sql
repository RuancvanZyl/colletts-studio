-- 063: rules for changing a mount, and an admin-only edit of a job card.
--
--  * Full body  -> Half body or Shoulder is allowed; Half body -> Shoulder is allowed.
--  * A shoulder mount cannot become a half body or full mount, and a flat skin cannot become a shoulder, half body or full mount,
--    because of the way the skin is cut. The client can instead BUY a skin from stock (hide purchase) which works like a rejected skin:
--    credit the first mount, amend the invoice, and a new job card starts for the stock skin.
--  * Only admins (and studio managers) can edit a job card; every change is written on the card (who, when, why) and the hunter is told.
--  * A hunter can no longer swap a chosen mount for a bigger one by choosing again.
-- Safe to run more than once.

create or replace function public._mount_group(p_mount text) returns text
language sql immutable as $$
  select case trim(coalesce(p_mount, ''))
    when 'Full Mount' then 'full'
    when 'Half Mount' then 'half'
    when 'Shoulder Mount' then 'shoulder' when 'Offset Shoulder Mount' then 'shoulder' when 'Pedestal Mount' then 'shoulder'
    when 'Flat Skin' then 'flat' when 'Tan Only' then 'flat' when 'Rug Mount on Felt' then 'flat' when 'Dip & Pack' then 'flat'
    when 'Euro Skull' then 'skull' when 'Euro Mount' then 'skull' when 'Bleach Only' then 'skull' when 'Artistic Skull' then 'skull'
    else null end
$$;

-- null when the change is fine, otherwise the reason in plain words
create or replace function public._mount_change_problem(p_from text, p_to text) returns text
language plpgsql immutable as $$
declare gf text := public._mount_group(p_from); gt text := public._mount_group(p_to);
        rf int; rt int; nice jsonb := '{"full":"a full mount","half":"a half-body mount","shoulder":"a shoulder mount","flat":"a flat skin","skull":"a skull"}'::jsonb;
begin
  if gf is null or gt is null then return 'This is a custom mount, a replica or not a normal mount. Change it through Credit and amend on the invoice instead'; end if;
  if trim(p_from) = trim(p_to) then return 'That is the mount it already has'; end if;
  if gt = 'skull' or gf = gt then return null; end if;
  if gf in ('flat', 'skull') then
    return 'This skin cannot become ' || (nice->>gt) || '. The client can buy a skin from our stock for it, but it will not be their own animal''s skin';
  end if;
  if gt = 'flat' then
    if gf = 'full' then return null; end if;
    if trim(p_to) in ('Tan Only', 'Dip & Pack') then return null; end if;
    return trim(p_to) || ' needs a skin that was cut flat';
  end if;
  rf := case gf when 'full' then 4 when 'half' then 3 else 2 end;
  rt := case gt when 'full' then 4 when 'half' then 3 else 2 end;
  if rt < rf then return null; end if;
  return 'This skin was cut for ' || (nice->>gf) || ', so it cannot become ' || (nice->>gt) || '. The client can buy a skin from our stock for ' || (nice->>gt) || ', but it will not be their own animal''s skin';
end;
$$;
grant execute on function public._mount_change_problem(text, text) to authenticated;

-- admin: change the mount on a job card (only a change the rules allow)
create or replace function public.staff_change_mount(p_doc uuid, p_new_mount text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d record; v_old text; v_name text; v_problem text; v_client uuid;
begin
  if not public._is_management() then raise exception 'Only an admin can edit a job card'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Say why the mount is being changed'; end if;
  select hd.id, hd.hunt_id, hd.status, hd.form_data, hd.current_department into d from hunt_documents hd where hd.id = p_doc and hd.doc_type = 'job_card';
  if not found then raise exception 'That job card does not exist'; end if;
  if d.status in ('completed', 'cancelled') then raise exception 'This job card is already finished or cancelled'; end if;
  if d.current_department in ('mounting', 'finishing', 'quality_check', 'photos', 'packing', 'administration') then
    raise exception 'Once a trophy is being mounted its mount can no longer be changed';
  end if;
  v_old := coalesce(d.form_data->>'mount_type', '');
  if v_old in ('', 'Pending Instructions') then raise exception 'The hunter has not chosen a mount yet'; end if;
  v_problem := public._mount_change_problem(v_old, p_new_mount);
  if v_problem is not null then raise exception '%', v_problem; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  update hunt_documents set
      title = coalesce(d.form_data->>'species', 'Trophy') || ' - ' || trim(p_new_mount),
      form_data = d.form_data || jsonb_build_object('mount_type', trim(p_new_mount),
        'mount_history', coalesce(d.form_data->'mount_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'from', v_old, 'to', trim(p_new_mount), 'by', v_name, 'at', now(), 'reason', trim(p_reason)))),
      updated_at = now()
    where id = p_doc;
  select client_id into v_client from client_hunts where id = d.hunt_id;
  insert into client_notifications (client_id, hunt_id, type, stage, title, body)
  values (v_client, d.hunt_id, 'alert', 'order', 'Your mount was changed',
          'Your ' || coalesce(d.form_data->>'species', 'trophy') || ' was changed from ' || v_old || ' to ' || trim(p_new_mount) || '. The workshop will confirm the new price with you.');
  return jsonb_build_object('from', v_old, 'to', trim(p_new_mount));
end;
$$;
revoke all on function public.staff_change_mount(uuid, text, text) from public, anon;
grant execute on function public.staff_change_mount(uuid, text, text) to authenticated;

-- admin: change the instructions or the tag number on a job card (written on the card)
create or replace function public.staff_edit_card(p_doc uuid, p_instructions text, p_tag text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare d record; v_name text; v_before jsonb;
begin
  if not public._is_management() then raise exception 'Only an admin can edit a job card'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Say why the job card is being changed'; end if;
  select hd.id, hd.status, hd.form_data into d from hunt_documents hd where hd.id = p_doc and hd.doc_type = 'job_card';
  if not found then raise exception 'That job card does not exist'; end if;
  if d.status in ('completed', 'cancelled') then raise exception 'This job card is already finished or cancelled'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  v_before := jsonb_build_object('instructions', coalesce(d.form_data->>'instructions', ''), 'tag_number', coalesce(d.form_data->>'tag_number', ''));
  update hunt_documents set
      form_data = d.form_data || jsonb_build_object('instructions', coalesce(p_instructions, ''), 'tag_number', coalesce(trim(p_tag), ''),
        'edit_history', coalesce(d.form_data->'edit_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'by', v_name, 'at', now(), 'reason', trim(p_reason), 'before', v_before))),
      updated_at = now()
    where id = p_doc;
end;
$$;
revoke all on function public.staff_edit_card(uuid, text, text, text) from public, anon;
grant execute on function public.staff_edit_card(uuid, text, text, text) to authenticated;

-- a hunter choosing again cannot swap to a bigger mount than their skin allows
create or replace function public._guard_mount_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_old text := coalesce(old.form_data->>'mount_type', ''); v_new text := coalesce(new.form_data->>'mount_type', ''); v_problem text;
begin
  if v_old = v_new or v_old in ('', 'Pending Instructions') or v_new in ('', 'Pending Instructions') then return new; end if;
  if auth.uid() is null or public._is_management() then return new; end if;
  if public._mount_group(v_old) is null or public._mount_group(v_new) is null then return new; end if;
  v_problem := public._mount_change_problem(v_old, v_new);
  if v_problem is not null then raise exception '%. Please message the workshop', v_problem; end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_mount_change on hunt_documents;
create trigger trg_guard_mount_change before update of form_data on hunt_documents
  for each row execute function public._guard_mount_change();

-- credit and amend: a credited mount can also close its job card, and a new card knows which card it replaces
create or replace function public.staff_amend_quote(p_quote uuid, p_case uuid, p_credits jsonb, p_adds jsonb, p_reason text, p_agreed text) returns uuid
language plpgsql security definer set search_path = public as $$
declare q record; v_name text; v_id uuid; v_no text; c jsonb; a jsonb; ln record; v_credit numeric := 0; v_added numeric := 0; v_i int; v_doc uuid; v_prev numeric; v_amt numeric; v_card boolean := false; v_case_doc uuid; v_cancelled uuid; v_disp text := ''; v_choice text;
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
    -- the mount is cancelled, not just credited: its job card is closed so nobody keeps working on it
    if coalesce((c->>'cancel_card')::boolean, false) and ln.hunt_doc_id is not null then
      -- the client must say what happens to the first skin: thrown away (to stock if good enough), made into leather, or kept and shipped
      v_choice := c->>'skin_decision';
      if v_choice is null or v_choice not in ('discard', 'leather', 'keep_ship') then raise exception 'Say what happens to the first skin: thrown away, made into leather, or kept and shipped with the trophies'; end if;
      v_disp := case v_choice
        when 'discard' then 'The client is throwing the first skin away. It goes to the workshop stock if the quality is good enough.'
        when 'leather' then 'The first skin is made into leather products.'
        else 'The client keeps the first skin as a ready-to-mount skin. Pack it and ship it with the other trophies.' end;
      if coalesce(trim(c->>'skin_note'), '') <> '' then v_disp := v_disp || ' ' || trim(c->>'skin_note'); end if;
      update hunt_documents set status = 'cancelled',
             form_data = form_data || jsonb_build_object('cancelled_reason', trim(p_reason), 'cancelled_by', v_name, 'cancelled_at', now(),
               'skin_disposition', jsonb_build_object('choice', v_choice, 'text', v_disp, 'by', v_name, 'at', now()))
       where id = ln.hunt_doc_id and status <> 'cancelled';
      update job_card_legs set completed_at = now(), completed_by = auth.uid(), completed_by_name = v_name, override_reason = 'Mount cancelled and credited'
       where job_doc_id = ln.hunt_doc_id and completed_at is null;
      v_cancelled := ln.hunt_doc_id;
    end if;
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
              jsonb_build_object('species', a->'new_card'->>'species', 'mount_type', a->'new_card'->>'mount_type', 'quantity', 1, 'instructions', case when v_disp <> '' then 'Replacement skin from stock. ' || v_disp else '' end,
                                 'tag_number', '', 'mount_chosen_by', 'workshop', 'replacement_for', coalesce(v_case_doc, v_cancelled), 'stock_reference', nullif(trim(coalesce(a->>'stock_reference', '')), ''),
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
