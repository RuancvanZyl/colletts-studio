-- Migration 057: department hand-over with accountability.
-- When a job card enters a department the department LEAD must accept it (name and time stamped) before work on it can be
-- completed. A card cannot leave Mounting or Finishing without a completion photo. Each department's time on a card is
-- recorded for management (admin / studio manager) only: it never changes a milestone colour. A card waiting more than
-- 24 hours to be accepted is flagged. Only cards that ENTER a department from now on are tracked, so work already in
-- progress is not blocked. Needs migrations 041 and 043.

create table if not exists job_card_legs (
  id                uuid primary key default gen_random_uuid(),
  job_doc_id        uuid not null references hunt_documents(id) on delete cascade,
  department        text not null,
  sent_at           timestamptz not null default now(),
  sent_by           uuid,
  accepted_at       timestamptz,
  accepted_by       uuid,
  accepted_by_name  text,
  completed_at      timestamptz,
  completed_by      uuid,
  completed_by_name text,
  override_reason   text
);
create unique index if not exists job_card_legs_one_open on job_card_legs (job_doc_id) where completed_at is null;
create index if not exists idx_job_card_legs_doc on job_card_legs (job_doc_id, sent_at);
alter table job_card_legs enable row level security;
drop policy if exists "management_read_legs" on job_card_legs;
create policy "management_read_legs" on job_card_legs for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager')));

-- who may accept a card into a department: management, that department's lead, or (when nobody leads it) its own staff
create or replace function public._can_accept(p_dept text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_profiles me
    where me.id = auth.uid() and me.is_active and (
      me.role in ('admin', 'studio_manager')
      or p_dept = any(coalesce(me.manages_departments, '{}'))
      or (p_dept = any(coalesce(me.works_in, '{}'))
          and not exists (select 1 from staff_profiles l where l.is_active and p_dept = any(coalesce(l.manages_departments, '{}'))))
    )
  )
$$;
grant execute on function public._can_accept(text) to authenticated;

-- 'none' = this card is not tracked in that department, 'waiting' = waiting to be accepted, 'accepted'
create or replace function public._open_leg_state(p_doc uuid, p_dept text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select case when accepted_at is null then 'waiting' else 'accepted' end
                     from job_card_legs where job_doc_id = p_doc and department = p_dept and completed_at is null), 'none')
$$;
revoke all on function public._open_leg_state(uuid, text) from public, anon, authenticated;

-- the lead accepts the card
create or replace function public.job_accept(p_doc uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_dept text; v_leg job_card_legs%rowtype; v_name text;
begin
  if public._apex_staff_role() is null then raise exception 'Staff only'; end if;
  select current_department into v_dept from hunt_documents where id = p_doc and doc_type = 'job_card';
  if not found then raise exception 'Job card not found'; end if;
  select * into v_leg from job_card_legs where job_doc_id = p_doc and department = v_dept and completed_at is null;
  if not found then raise exception 'This card is not waiting to be accepted'; end if;
  if v_leg.accepted_at is not null then return; end if;
  if not public._can_accept(v_dept) then raise exception 'Only the % lead can accept this card', v_dept; end if;
  select full_name into v_name from staff_profiles where id = auth.uid();
  update job_card_legs set accepted_at = now(), accepted_by = auth.uid(), accepted_by_name = v_name where id = v_leg.id;
end;
$$;
revoke all on function public.job_accept(uuid) from public, anon;
grant execute on function public.job_accept(uuid) to authenticated;

-- the cards waiting for the caller to accept
create or replace function public.my_incoming_cards() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if public._apex_staff_role() is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.j order by x.sent_at), '[]'::jsonb) into v from (
    select l.sent_at, jsonb_build_object(
      'doc_id', d.id, 'hunt_id', d.hunt_id, 'client', c.full_name, 'species', d.form_data->>'species', 'mount', d.form_data->>'mount_type',
      'department', l.department, 'sent_at', l.sent_at, 'hours_waiting', round(extract(epoch from (now() - l.sent_at)) / 3600)::int) as j
    from job_card_legs l
    join hunt_documents d on d.id = l.job_doc_id and d.doc_type = 'job_card'
    left join client_hunts h on h.id = d.hunt_id
    left join clients c on c.id = h.client_id
    where l.completed_at is null and l.accepted_at is null and public._can_accept(l.department)
  ) x;
  return v;
end;
$$;
revoke all on function public.my_incoming_cards() from public, anon;
grant execute on function public.my_incoming_cards() to authenticated;

-- keep the record: close the old leg and open the new one whenever a card changes department
create or replace function public._job_card_legs() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.doc_type <> 'job_card' then return new; end if;
  if new.current_department is distinct from old.current_department then
    select full_name into v_name from staff_profiles where id = auth.uid();
    update job_card_legs set completed_at = now(), completed_by = auth.uid(), completed_by_name = v_name,
           override_reason = case when coalesce(current_setting('apex.override', true), '') = 'on' then 'Checklist overridden by management' else null end
     where job_doc_id = new.id and completed_at is null;
    if new.current_department is not null and new.current_department not in ('done', 'receiving')
       and coalesce(new.status, '') not in ('completed', 'complete', 'cancelled') then
      insert into job_card_legs (job_doc_id, department, sent_by) values (new.id, new.current_department, auth.uid());
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_job_card_legs on public.hunt_documents;
create trigger trg_job_card_legs after update on public.hunt_documents for each row execute function public._job_card_legs();

-- the existing protocol (checklist must be complete) now also needs the lead's acceptance, and a photo for Mounting and Finishing
create or replace function public._job_card_protocol() returns trigger
language plpgsql as $$
declare v_open integer; v_total integer; v_leg text;
begin
  if new.doc_type <> 'job_card' then return new; end if;
  if new.current_department is distinct from old.current_department and old.current_department is not null then
    if auth.uid() is not null and coalesce(current_setting('apex.override', true), '') <> 'on' then
      select count(*) filter (where not exists (
               select 1 from job_checklist_progress p where p.job_doc_id = old.id and p.item_id = i.id and p.done)),
             count(*)
        into v_open, v_total
      from department_checklist_items i
      where i.dept_key = old.current_department and i.is_active;
      if v_open > 0 then
        raise exception 'Checklist incomplete: % of % steps still to be ticked. Tick them in My Tasks or the department station first.', v_open, v_total
          using errcode = 'P0001';
      end if;
      v_leg := public._open_leg_state(old.id, old.current_department);
      if v_leg = 'waiting' then
        raise exception 'Not accepted yet: the % lead must accept this card before it can be completed.', old.current_department using errcode = 'P0001';
      end if;
      if v_leg <> 'none' and old.current_department in ('mounting', 'finishing') and cardinality(coalesce(new.completion_photo_paths, '{}')) = 0 then
        raise exception 'A time-stamped photo is required before this card can leave %.', old.current_department using errcode = 'P0001';
      end if;
    end if;
    new.opened_at := null; new.started_at := null; new.started_by := null;
    new.assigned_to := null; new.assigned_at := null; new.assigned_by := null;
  end if;
  return new;
end;
$$;
