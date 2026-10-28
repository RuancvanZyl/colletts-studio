-- Migration 059: rejected skins, part two.
-- * The outfitter can confirm they have told the client (stamped). If they have not within 3 weeks of the outcome being
--   set to "the client decides", the case shows that the workshop must now tell the client (the 3 weeks is applied in the app).
-- * The AI recommendation from the case conversation is stored on the case (the workshop still chooses the outcome).
-- Needs migration 058.

create or replace function public.outfitter_cases() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; o record;
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  if not found then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) into v from (
    select q.created_at, jsonb_build_object(
      'id', q.id, 'hunt_id', q.hunt_id, 'status', q.status, 'client', c.full_name, 'species', d.form_data->>'species',
      'reasons', q.reasons, 'note', q.note, 'created_at', q.created_at, 'ack_at', q.outfitter_ack_at, 'outcome', q.outcome, 'resolved_at', q.resolved_at,
      'outcome_at', q.outcome_at, 'client_informed_at', q.client_informed_at, 'client_informed_by', q.client_informed_by, 'client_decision', q.client_decision) as j
    from quality_cases q
    join hunt_documents d on d.id = q.job_doc_id
    join client_hunts h on h.id = q.hunt_id join clients c on c.id = h.client_id
    where q.outfitter_id = o.id
  ) x;
  return v;
end;
$$;
revoke all on function public.outfitter_cases() from public, anon;
grant execute on function public.outfitter_cases() to authenticated;

-- "I have told the client"
create or replace function public.outfitter_informed_client(p_case uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o record;
begin
  select * into o from outfitters where auth_user_id = auth.uid();
  if not found then raise exception 'This account is not an outfitter'; end if;
  update quality_cases set client_informed_by = 'outfitter', client_informed_at = coalesce(client_informed_at, now())
   where id = p_case and outfitter_id = o.id and outcome = 'client_decision' and status <> 'resolved';
  if not found then raise exception 'This case is not waiting for you to tell the client'; end if;
end;
$$;
revoke all on function public.outfitter_informed_client(uuid) from public, anon;
grant execute on function public.outfitter_informed_client(uuid) to authenticated;

-- the AI reader's recommendation (a suggestion only)
create or replace function public.case_save_recommendation(p_case uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._can_accept('tannery') then raise exception 'Only the tannery lead or management can use the AI recommendation'; end if;
  update quality_cases set ai_recommendation = p_data, ai_recommended_at = now() where id = p_case;
  if not found then raise exception 'That case does not exist'; end if;
end;
$$;
revoke all on function public.case_save_recommendation(uuid, jsonb) from public, anon;
grant execute on function public.case_save_recommendation(uuid, jsonb) to authenticated;
