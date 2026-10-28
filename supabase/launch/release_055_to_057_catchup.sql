-- Catch-up: migrations 055, 056 and 057, for a database where 058 and later were already run.
-- 057 must come first because 058 onwards use its functions; the job card protocol at the end is the newest version (with the soak report rule).
-- Safe to run more than once.

-- Migration 055: management's progress check.
-- Management goes through each client's order against the production milestones (counted from the day the invoice was
-- paid) and marks it On track or Behind. Every check is kept, with who made it, when, and what is holding it up.

create table if not exists hunt_progress_reviews (
  id               uuid primary key default gen_random_uuid(),
  hunt_id          uuid not null references client_hunts(id) on delete cascade,
  status           text not null check (status in ('on_track', 'behind')),
  note             text,
  held_up_in       text,
  reviewed_by      uuid,
  reviewed_by_name text,
  reviewed_at      timestamptz not null default now()
);
create index if not exists idx_progress_reviews_hunt on hunt_progress_reviews (hunt_id, reviewed_at desc);
alter table hunt_progress_reviews enable row level security;
drop policy if exists "staff_read_progress_reviews" on hunt_progress_reviews;
create policy "staff_read_progress_reviews" on hunt_progress_reviews for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

create or replace function public.staff_review_progress(p_hunt uuid, p_status text, p_note text default null, p_dept text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select full_name into v_name from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager');
  if not found then raise exception 'Only management can check progress'; end if;
  if p_status not in ('on_track', 'behind') then raise exception 'Choose On track or Behind'; end if;
  if p_status = 'behind' and coalesce(trim(p_note), '') = '' then raise exception 'Say what is holding it up'; end if;
  if not exists (select 1 from client_hunts where id = p_hunt) then raise exception 'That hunt does not exist'; end if;
  insert into hunt_progress_reviews (hunt_id, status, note, held_up_in, reviewed_by, reviewed_by_name)
  values (p_hunt, p_status, nullif(trim(coalesce(p_note, '')), ''), nullif(trim(coalesce(p_dept, '')), ''), auth.uid(), v_name);
end;
$$;
revoke all on function public.staff_review_progress(uuid, text, text, text) from public, anon;
grant execute on function public.staff_review_progress(uuid, text, text, text) to authenticated;

-- the latest check for each hunt
create or replace view v_last_progress_review with (security_invoker = true) as
select distinct on (hunt_id) hunt_id, status, note, held_up_in, reviewed_by_name, reviewed_at
from hunt_progress_reviews
order by hunt_id, reviewed_at desc;
grant select on v_last_progress_review to authenticated;

-- Migration 056: management feedback when a milestone is missed.
-- Every milestone that passes its date without being met needs management's feedback: what is holding it up, where, the plan
-- and a new target date. A second missed milestone needs feedback again. The history is kept. Needs migration 055.

create table if not exists milestone_feedback (
  id            uuid primary key default gen_random_uuid(),
  hunt_id       uuid not null references client_hunts(id) on delete cascade,
  milestone_key text not null check (milestone_key in ('m1', 'm2', 'm3', 'm4')),
  level         text not null check (level in ('yellow', 'red')),
  reason        text not null,
  held_up_in    text,
  plan          text,
  new_target    date,
  given_by      uuid,
  given_by_name text,
  given_at      timestamptz not null default now()
);
create index if not exists idx_milestone_feedback_hunt on milestone_feedback (hunt_id, given_at desc);
alter table milestone_feedback enable row level security;
drop policy if exists "staff_read_milestone_feedback" on milestone_feedback;
create policy "staff_read_milestone_feedback" on milestone_feedback for select to authenticated
  using (exists (select 1 from staff_profiles where id = auth.uid() and is_active));

create or replace function public.staff_give_milestone_feedback(p_hunt uuid, p_key text, p_level text, p_reason text, p_dept text default null, p_plan text default null, p_target date default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select full_name into v_name from staff_profiles where id = auth.uid() and is_active and role in ('admin', 'studio_manager');
  if not found then raise exception 'Only management can give milestone feedback'; end if;
  if p_level not in ('yellow', 'red') then raise exception 'Choose yellow or red'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Say what is holding it up'; end if;
  if not exists (select 1 from client_hunts h, jsonb_array_elements(coalesce(h.milestones, '[]'::jsonb)) m where h.id = p_hunt and m->>'key' = p_key) then
    raise exception 'This order has no such milestone';
  end if;
  if p_target is not null and p_target < current_date then raise exception 'The new target date cannot be in the past'; end if;
  insert into milestone_feedback (hunt_id, milestone_key, level, reason, held_up_in, plan, new_target, given_by, given_by_name)
  values (p_hunt, p_key, p_level, trim(p_reason), nullif(trim(coalesce(p_dept, '')), ''), nullif(trim(coalesce(p_plan, '')), ''), p_target, auth.uid(), v_name);
end;
$$;
revoke all on function public.staff_give_milestone_feedback(uuid, text, text, text, text, text, date) from public, anon;
grant execute on function public.staff_give_milestone_feedback(uuid, text, text, text, text, text, date) to authenticated;

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


-- the newest job card protocol (checklist, lead acceptance, Mounting and Finishing photo, accepted soak report at the tannery)
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
      if v_leg <> 'none' and old.current_department = 'tannery' and not public._soak_accepted(old.id) then
        raise exception 'The soak report must be done and accepted before this card can leave the tannery.' using errcode = 'P0001';
      end if;
    end if;
    new.opened_at := null; new.started_at := null; new.started_by := null;
    new.assigned_to := null; new.assigned_at := null; new.assigned_by := null;
  end if;
  return new;
end;
$$;
