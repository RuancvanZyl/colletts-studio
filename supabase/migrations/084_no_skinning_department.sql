-- 084: no Skinning department. Trophies are skinned on the farm by the outfitter and arrive at the workshop as skins and skulls,
-- so the first department is Receiving and work goes straight on to Salting (skins) or Cleaning & bleach (skull-only work).
--  * Job cards waiting in Skinning move to the next department of their route (a note is added to their history).
--  * The Skinning checklist is switched off.
--  * Staff who worked in or led Skinning now work in / lead Receiving instead.
-- Safe to run more than once.

update hunt_documents set
    current_department = case
      when form_data->>'mount_type' in ('Euro Skull', 'Euro Mount', 'Bleach Only', 'Artistic Skull') then 'cleaning_bleach'
      when form_data->>'mount_type' in ('Replica', 'Life Cast') then 'mounting'
      else 'salting' end,
    form_data = coalesce(form_data, '{}'::jsonb) || jsonb_build_object('stage_history',
      coalesce(form_data->'stage_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'dept', 'skinning', 'completedBy', 'Apex Trophy Solutions', 'completedAt', now(),
        'notes', 'Skinning is done on the farm, so this card moved on to the next department.')))
  where doc_type = 'job_card' and current_department = 'skinning' and coalesce(status, '') not in ('completed', 'cancelled');

update department_checklist_items set is_active = false where dept_key = 'skinning' and is_active;

update staff_profiles set works_in = array_append(array_remove(works_in, 'skinning'), 'receiving')
  where 'skinning' = any(works_in) and not 'receiving' = any(works_in);
update staff_profiles set works_in = array_remove(works_in, 'skinning') where 'skinning' = any(works_in);
update staff_profiles set manages_departments = array_append(array_remove(manages_departments, 'skinning'), 'receiving')
  where 'skinning' = any(manages_departments) and not 'receiving' = any(manages_departments);
update staff_profiles set manages_departments = array_remove(manages_departments, 'skinning') where 'skinning' = any(manages_departments);

select (select count(*) from hunt_documents where doc_type = 'job_card' and current_department = 'skinning' and coalesce(status, '') not in ('completed', 'cancelled')) = 0
   and (select count(*) from department_checklist_items where dept_key = 'skinning' and is_active) = 0 as skinning_removed;
