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
