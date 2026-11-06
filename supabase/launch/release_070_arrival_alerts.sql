-- Migration 070: "arrived" for trophies at the workshop, ready for the tag programme. When trophies arrive (a tag is seen at the
-- receiving area, or a person presses "Trophies have arrived") each animal's job card is marked arrived, and the receiving team and
-- the admins are told: "Hunter X's trophies have arrived. Condition report needs to be done." The arrival is not "checked": the
-- parts, photos and condition report are still done on the receiving sheet.

alter table hunt_documents add column if not exists arrived_at timestamptz;
alter table hunt_documents add column if not exists arrived_via text check (arrived_via in ('tag', 'manual'));

-- mark the animals of a hunt (or one animal) as arrived; staff, or the system itself (the tag function). Returns how many were marked.
create or replace function public.mark_arrived(p_hunt uuid, p_doc uuid default null, p_via text default 'manual') returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is not null and not exists (select 1 from staff_profiles where id = auth.uid() and is_active) then
    raise exception 'Only staff can mark trophies as arrived';
  end if;
  if p_via not in ('tag', 'manual') then raise exception 'Unknown way of arriving'; end if;
  update hunt_documents set arrived_at = now(), arrived_via = p_via
   where doc_type = 'job_card' and hunt_id = p_hunt and (p_doc is null or id = p_doc)
     and current_department = 'receiving' and status in ('awaiting_arrival', 'in_progress', 'flagged') and arrived_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.mark_arrived(uuid, uuid, text) from public, anon;
grant execute on function public.mark_arrived(uuid, uuid, text) to authenticated;

-- Check (should say true):
select count(*) = 1 as arrival_ready from pg_proc where proname = 'mark_arrived';
