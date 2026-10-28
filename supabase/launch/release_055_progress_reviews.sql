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
