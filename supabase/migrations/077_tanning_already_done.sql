-- 077: a client who changes to a skull-only mount (Euro, bleach) after the skin has reached the tannery still pays for the tanning.
-- The quote gets a line "<animal>: tanning already done" with no price. The workshop sets the price, so the quote waits for staff.
-- A price the workshop set stays on later rebuilds. Safe to run more than once.

create or replace function public.hunter_finish_choices(p_hunt uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h record; v_type text; v_lines jsonb; v_unpriced int; v_q record; v_id uuid; v_leather jsonb; v_tan jsonb;
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
  -- tanning already done: the skin had reached the tannery, then the client chose a skull-only mount, so the tanned skin is not used.
  -- The client still pays for the tanning. The workshop sets that price (it is not on the price list), so the quote waits for staff.
  select coalesce(jsonb_agg(jsonb_build_object('hunt_doc_id', d.id, 'amount', null,
           'description', coalesce(d.form_data->>'species', 'Animal') || ': tanning already done') order by d.created_at, d.id), '[]'::jsonb)
    into v_tan
    from hunt_documents d
   where d.hunt_id = p_hunt and d.doc_type = 'job_card' and d.status in ('in_progress', 'pending', 'awaiting_arrival')
     and d.current_department in ('tannery', 'dip_pack')
     and public._mount_group(d.form_data->>'mount_type') = 'skull';
  v_lines := v_lines || v_tan;

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

select pg_get_functiondef('public.hunter_finish_choices(uuid)'::regprocedure) like '%tanning already done%' as tanning_charge_ready;
