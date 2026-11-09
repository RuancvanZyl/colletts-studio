-- Migration 074: issues and "to follow" found when trophies are received.
-- * The outfitter always gets a copy in the hunt's conversation (topic "A trophy", tied to the animal), with the workshop's note.
-- * An animal received with an issue can still move on into production; the issue stays on its card and on the Needs you list until a
--   manager marks it solved (the outfitter is told when it is). Needs migration 071.

drop function if exists public.staff_open_part_followup(uuid, text[]);
create or replace function public.staff_open_part_followup(p_doc uuid, p_parts text[], p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare d record; v_name text; v_id uuid; v_old text[]; v_species text; v_client text; v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not exists (select 1 from staff_profiles where id = auth.uid() and is_active) then raise exception 'Only staff can do this'; end if;
  if coalesce(cardinality(p_parts), 0) = 0 then raise exception 'Say which parts are missing'; end if;
  select hd.id, hd.hunt_id, hd.form_data, h.outfitter_id, c.full_name into d
    from hunt_documents hd join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id where hd.id = p_doc;
  if not found then raise exception 'That animal was not found'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  v_species := coalesce(d.form_data->>'species', 'trophy'); v_client := d.full_name;
  select id, parts into v_id, v_old from part_followups where doc_id = p_doc and resolved_at is null;
  if v_id is null then
    insert into part_followups (hunt_id, doc_id, outfitter_id, parts, opened_by_name) values (d.hunt_id, p_doc, d.outfitter_id, p_parts, v_name) returning id into v_id;
  elsif v_old is distinct from p_parts then
    update part_followups set parts = p_parts where id = v_id;
  else
    if v_note is not null then
      perform public._followup_message(d.hunt_id, p_doc, 'workshop', 'Update about the ' || v_species || ' for ' || v_client || ': ' || v_note);
    end if;
    return v_id;
  end if;
  perform public._followup_message(d.hunt_id, p_doc, 'workshop',
    'Part of the ' || v_species || ' for ' || v_client || ' did not arrive: ' || public._part_labels(p_parts) ||
    case when v_note is not null then '. Note from the workshop: ' || v_note else '' end ||
    '. Please tell us when it will arrive: open "Parts missing" on your home screen and give us the date. We will remind you every few days until it is here.');
  return v_id;
end;
$$;
revoke all on function public.staff_open_part_followup(uuid, text[], text) from public, anon;
grant execute on function public.staff_open_part_followup(uuid, text[], text) to authenticated;

-- a copy of an issue or a "to follow" note for the outfitter (when nothing is missing from the parts list, or in addition)
create or replace function public.staff_tell_outfitter_receiving(p_doc uuid, p_kind text, p_note text, p_summary text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d record; v_species text;
begin
  if not exists (select 1 from staff_profiles where id = auth.uid() and is_active) then raise exception 'Only staff can do this'; end if;
  if p_kind not in ('issue', 'later') then raise exception 'Unknown kind'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'Write the note first'; end if;
  select hd.hunt_id, hd.form_data, c.full_name into d from hunt_documents hd join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id where hd.id = p_doc;
  if not found then raise exception 'That animal was not found'; end if;
  v_species := coalesce(d.form_data->>'species', 'trophy');
  perform public._followup_message(d.hunt_id, p_doc, 'workshop', case p_kind
    when 'issue' then 'There is an issue with the ' || v_species || ' for ' || d.full_name || ' (found when it was received): ' || trim(p_note) ||
                      case when coalesce(trim(p_summary), '') <> '' then '. When received: ' || trim(p_summary) else '' end || '. We will keep you informed.'
    else 'Part of the ' || v_species || ' for ' || d.full_name || ' is still to follow: ' || trim(p_note) || '. Please tell us when it will arrive.' end);
end;
$$;
revoke all on function public.staff_tell_outfitter_receiving(uuid, text, text, text) from public, anon;
grant execute on function public.staff_tell_outfitter_receiving(uuid, text, text, text) to authenticated;

-- a manager decides what happens with the animal that has the issue (production carries on meanwhile; the outfitter is told)
create or replace function public.staff_decide_receiving_issue(p_doc uuid, p_option text, p_note text default null, p_stock_ref text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d record; v_name text; v_species text; v_note text := nullif(trim(coalesce(p_note, '')), ''); v_stock text := nullif(trim(coalesce(p_stock_ref, '')), ''); v_say text;
begin
  if not public._is_management() then raise exception 'Only a manager can decide this'; end if;
  if p_option not in ('outfitter_replacement', 'stock_replacement', 'repair', 'accept_as_is', 'client_decides') then raise exception 'Choose one of the options'; end if;
  if p_option = 'stock_replacement' and v_stock is null then raise exception 'Say which one from stock replaces it'; end if;
  if p_option = 'accept_as_is' and v_note is null then raise exception 'Write who agreed to carry on as it is'; end if;
  select hd.hunt_id, hd.form_data, c.full_name into d from hunt_documents hd join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id where hd.id = p_doc and hd.doc_type = 'job_card';
  if not found then raise exception 'That animal was not found'; end if;
  if coalesce(d.form_data->'receiving_issue'->>'open', 'false') <> 'true' then raise exception 'This animal has no open issue'; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  update hunt_documents set form_data = jsonb_set(form_data, '{receiving_issue}', (form_data->'receiving_issue') || jsonb_build_object(
      'decision', jsonb_build_object('option', p_option, 'note', v_note, 'stock_ref', v_stock, 'by', v_name, 'at', now()))), updated_at = now()
   where id = p_doc;
  v_species := coalesce(d.form_data->>'species', 'trophy');
  v_say := case p_option
    when 'outfitter_replacement' then 'we need a replacement from you. Please tell us here when it will be sent.'
    when 'stock_replacement'     then 'we will replace it from our own stock (' || v_stock || ').'
    when 'repair'                then 'we will repair it here at the workshop.'
    when 'accept_as_is'          then 'we will carry on with it as it is.'
    else 'the client has to decide what to do. Please ask ' || d.full_name || ' and tell us here.' end;
  perform public._followup_message(d.hunt_id, p_doc, 'workshop', 'About the issue with the ' || v_species || ' for ' || d.full_name || ': ' || v_say ||
    case when v_note is not null then ' ' || v_note else '' end);
end;
$$;
revoke all on function public.staff_decide_receiving_issue(uuid, text, text, text) from public, anon;
grant execute on function public.staff_decide_receiving_issue(uuid, text, text, text) to authenticated;

-- a manager marks the issue solved (the outfitter is told)
create or replace function public.staff_resolve_receiving_issue(p_doc uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d record; v_name text; v_species text;
begin
  if not public._is_management() then raise exception 'Only a manager can mark an issue as solved'; end if;
  select hd.hunt_id, hd.form_data, c.full_name into d from hunt_documents hd join client_hunts h on h.id = hd.hunt_id join clients c on c.id = h.client_id where hd.id = p_doc and hd.doc_type = 'job_card';
  if not found then raise exception 'That animal was not found'; end if;
  if coalesce(d.form_data->'receiving_issue'->>'open', 'false') <> 'true' then return; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  update hunt_documents set form_data = jsonb_set(form_data, '{receiving_issue}', (form_data->'receiving_issue') || jsonb_build_object(
      'open', false, 'resolved_at', now(), 'resolved_by', v_name, 'resolved_note', nullif(trim(coalesce(p_note, '')), ''))), updated_at = now()
   where id = p_doc;
  v_species := coalesce(d.form_data->>'species', 'trophy');
  perform public._followup_message(d.hunt_id, p_doc, 'workshop', 'The issue with the ' || v_species || ' for ' || d.full_name || ' is solved.' ||
    case when coalesce(trim(p_note), '') <> '' then ' ' || trim(p_note) else '' end);
end;
$$;
revoke all on function public.staff_resolve_receiving_issue(uuid, text) from public, anon;
grant execute on function public.staff_resolve_receiving_issue(uuid, text) to authenticated;

-- Check (should say true):
select count(*) = 2 as issues_ready from pg_proc where proname in ('staff_tell_outfitter_receiving', 'staff_decide_receiving_issue');
