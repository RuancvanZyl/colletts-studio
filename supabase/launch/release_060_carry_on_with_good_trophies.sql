-- Migration 060: carry on with the good trophies.
-- A rejected skin must not hold back the rest of the order. Management can override with a reason: the order continues and
-- the good trophies can be shipped, while the problem trophy stays on the job card in red until it is solved. It is solved
-- either by a replacement (a new soak report is accepted and the trophy catches up) or by cancelling that trophy.
-- Needs migrations 058 and 059.

alter table quality_cases add column if not exists order_override_at timestamptz;
alter table quality_cases add column if not exists order_override_by_name text;
alter table quality_cases add column if not exists order_override_reason text;
alter table quality_cases add column if not exists replacement_arrived_at timestamptz;
alter table quality_cases add column if not exists replacement_note text;
alter table quality_cases add column if not exists cancelled_at timestamptz;
alter table quality_cases add column if not exists cancelled_by_name text;
alter table quality_cases add column if not exists cancel_reason text;

create or replace function public._is_management() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager'))
$$;
grant execute on function public._is_management() to authenticated;

-- management: continue the order without this trophy, for now
create or replace function public.case_override_order(p_case uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public._is_management() then raise exception 'Only management can let the order continue without this trophy'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Say why the order can continue without it'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  update quality_cases set order_override_at = coalesce(order_override_at, now()), order_override_by_name = v_name, order_override_reason = trim(p_reason)
   where id = p_case and status <> 'resolved';
  if not found then raise exception 'That case does not exist or is already solved'; end if;
end;
$$;
revoke all on function public.case_override_order(uuid, text) from public, anon;
grant execute on function public.case_override_order(uuid, text) to authenticated;

-- the replacement is here: a new soak report can now be done
create or replace function public.case_replacement_arrived(p_case uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._can_accept('tannery') then raise exception 'Only the tannery lead or management can record this'; end if;
  update quality_cases set replacement_arrived_at = now(), replacement_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_case and status <> 'resolved' and outcome in ('outfitter_replacement', 'stock_replacement');
  if not found then raise exception 'This case is not waiting for a replacement'; end if;
end;
$$;
revoke all on function public.case_replacement_arrived(uuid, text) from public, anon;
grant execute on function public.case_replacement_arrived(uuid, text) to authenticated;

-- management: cancel this trophy (the order shrinks; the quote needs a credit)
create or replace function public.case_cancel_trophy(p_case uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text; v_doc uuid;
begin
  if not public._is_management() then raise exception 'Only management can cancel a trophy'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Say why the trophy is cancelled'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  select job_doc_id into v_doc from quality_cases where id = p_case and status <> 'resolved';
  if not found then raise exception 'That case does not exist or is already solved'; end if;
  update hunt_documents set status = 'cancelled' where id = v_doc;
  update job_card_legs set completed_at = now(), completed_by = auth.uid(), completed_by_name = v_name, override_reason = 'Trophy cancelled' where job_doc_id = v_doc and completed_at is null;
  update quality_cases set cancelled_at = now(), cancelled_by_name = v_name, cancel_reason = trim(p_reason), status = 'resolved', resolved_at = now(), resolved_by_name = v_name,
         resolution_note = 'Trophy cancelled: ' || trim(p_reason), needs_quote_change = true, needs_job_card_change = false
   where id = p_case;
end;
$$;
revoke all on function public.case_cancel_trophy(uuid, text) from public, anon;
grant execute on function public.case_cancel_trophy(uuid, text) to authenticated;

create or replace function public.soak_review(p_report uuid, p_accept boolean, p_reasons text[] default null, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare r soak_reports%rowtype; v_name text; v_hunt uuid; v_out uuid; v_case uuid; v_species text; v_body text;
begin
  if public._apex_staff_role() is null then raise exception 'Staff only'; end if;
  if not public._can_accept('tannery') then raise exception 'Only the tannery lead or management can accept or reject a soak report'; end if;
  select * into r from soak_reports where id = p_report;
  if not found then raise exception 'That soak report does not exist'; end if;
  if r.status <> 'submitted' then raise exception 'This soak report has already been reviewed'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  if p_accept then
    update soak_reports set status = 'accepted', reviewed_by = auth.uid(), reviewed_by_name = v_name, reviewed_at = now() where id = p_report;
    -- the trophy has caught up: any open problem on this card is solved
    update quality_cases set status = 'resolved', resolved_at = now(), resolved_by_name = v_name,
           resolution_note = 'A new soak report was accepted, so the trophy has caught up'
     where job_doc_id = r.job_doc_id and status <> 'resolved';
    return null;
  end if;
  if coalesce(array_length(p_reasons, 1), 0) = 0 then raise exception 'Give at least one reason for rejecting it'; end if;
  update soak_reports set status = 'rejected', reviewed_by = auth.uid(), reviewed_by_name = v_name, reviewed_at = now(),
         rejection_reasons = p_reasons, rejection_note = nullif(trim(coalesce(p_note, '')), '') where id = p_report;
  select d.hunt_id, d.form_data->>'species', h.outfitter_id into v_hunt, v_species, v_out
    from hunt_documents d join client_hunts h on h.id = d.hunt_id where d.id = r.job_doc_id;
  insert into quality_cases (hunt_id, job_doc_id, soak_report_id, outfitter_id, reasons, note, created_by_name, outfitter_notified_at)
  values (v_hunt, r.job_doc_id, p_report, v_out, p_reasons, nullif(trim(coalesce(p_note, '')), ''), v_name, case when v_out is not null then now() end)
  returning id into v_case;
  if v_out is not null then
    v_body := 'The ' || coalesce(v_species, 'skin') || ' was rejected at the soak. Reasons: ' || array_to_string(p_reasons, ', ') || coalesce('. ' || nullif(trim(coalesce(p_note, '')), ''), '') || '. Please acknowledge this and tell us how you want to proceed.';
    insert into outfitter_messages (hunt_id, outfitter_id, sender, sender_user, sender_name, body, case_id, channel)
    values (v_hunt, v_out, 'workshop', auth.uid(), v_name, v_body, v_case, 'system');
  end if;
  return v_case;
end;
$$;
revoke all on function public.soak_review(uuid, boolean, text[], text) from public, anon;
grant execute on function public.soak_review(uuid, boolean, text[], text) to authenticated;

