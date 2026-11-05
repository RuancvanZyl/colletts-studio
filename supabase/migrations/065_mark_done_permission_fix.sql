-- Migration 065: marking a job card done no longer fails with "permission denied".
-- The rule that checks a card before it leaves a department (checklist, lead's acceptance, photo, soak report)
-- ran as the person pressing the button, but it uses private helper functions that only the system may call.
-- It now runs as the system itself. The rules it enforces are exactly the same.

create or replace function public._job_card_protocol() returns trigger
language plpgsql security definer set search_path = public as $$
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
