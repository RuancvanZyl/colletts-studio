-- Migration 052: the paperwork depends on the province where the hunt took place.
-- Each hunt gets a province; each required document can be limited to certain provinces (empty list = every province).
-- Also loads the workshop's list of documents per province. Needs migration 051.

alter table client_hunts add column if not exists province text;
alter table document_types add column if not exists provinces text[] not null default '{}';

create or replace function public.generate_hunt_requirements(p_hunt uuid) returns int
language plpgsql security definer set search_path = public as $$
declare h record; n int;
begin
  select id, client_type, outfitter_id, province into h from client_hunts where id = p_hunt;
  if not found then return 0; end if;
  insert into hunt_requirements (hunt_id, document_type_id, name, responsible, needs_signature, needs_stamp)
  select p_hunt, t.id, t.name,
         case when t.responsible = 'outfitter' and h.outfitter_id is null then 'hunter' else t.responsible end,
         t.needs_signature, t.needs_stamp
    from document_types t
   where t.is_active
     and (t.applies_to = 'all' or t.applies_to = coalesce(h.client_type, 'export'))
     and (cardinality(t.provinces) = 0 or (h.province is not null and h.province = any(t.provinces)))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.generate_hunt_requirements(uuid) from public, anon;
grant execute on function public.generate_hunt_requirements(uuid) to authenticated;

-- changing the province: drop untouched documents of the old province, add those of the new one
create or replace function public._hunt_province_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.province is distinct from old.province then
    delete from hunt_requirements r
     where r.hunt_id = new.id and r.status = 'awaiting' and cardinality(r.file_paths) = 0
       and r.document_type_id in (select id from document_types where cardinality(provinces) > 0 and not (coalesce(new.province, '') = any(provinces)));
    perform public.generate_hunt_requirements(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_hunt_province_changed on client_hunts;
create trigger trg_hunt_province_changed after update of province on client_hunts for each row execute function public._hunt_province_changed();

-- who may set the province of a hunt: staff, the hunt's outfitter, or the hunter themselves
create or replace function public.set_hunt_province(p_hunt uuid, p_province text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_province is not null and p_province not in ('Limpopo', 'Mpumalanga', 'Free State', 'North West', 'KwaZulu-Natal', 'Northern Cape', 'Eastern Cape', 'Western Cape', 'Gauteng') then
    raise exception 'Choose one of the nine provinces';
  end if;
  if not (exists (select 1 from staff_profiles where id = auth.uid() and is_active)
          or public._my_outfitter_hunt(p_hunt) or public._my_own_hunt(p_hunt)) then
    raise exception 'You cannot change this hunt';
  end if;
  update client_hunts set province = p_province where id = p_hunt;
end;
$$;
revoke all on function public.set_hunt_province(uuid, text) from public, anon;
grant execute on function public.set_hunt_province(uuid, text) to authenticated;

-- the board now shows which province a hunt is in
create or replace view v_hunt_documents with (security_invoker = true) as
select
  h.id as hunt_id, h.ref_number, h.client_id, c.full_name as client_name, h.outfitter_id, o.name as outfitter_name, h.client_type,
  count(*) filter (where r.status <> 'not_needed') as required,
  count(*) filter (where r.status = 'approved') as approved,
  count(*) filter (where r.status = 'awaiting' and r.responsible = 'outfitter') as waiting_outfitter,
  count(*) filter (where r.status = 'awaiting' and r.responsible = 'hunter') as waiting_hunter,
  count(*) filter (where r.status = 'awaiting' and r.responsible in ('workshop', 'authority')) as waiting_other,
  count(*) filter (where r.status = 'received') as to_check,
  count(*) filter (where r.status = 'rejected') as rejected,
  min(r.requested_at) filter (where r.status in ('awaiting', 'rejected')) as oldest_wait,
  bool_and(r.status in ('approved', 'not_needed')) as complete,
  h.province
from hunt_requirements r
join client_hunts h on h.id = r.hunt_id
join clients c on c.id = h.client_id
left join outfitters o on o.id = h.outfitter_id
where h.status = 'active'
group by h.id, h.ref_number, h.client_id, c.full_name, h.outfitter_id, o.name, h.client_type, h.province;
grant select on v_hunt_documents to authenticated;

-- the workshop's list, per province (only added when a document of that name is not already there)
insert into document_types (name, responsible, applies_to, provinces, needs_signature, needs_stamp, sort_order)
select v.name, 'outfitter', 'all', v.provinces, true, true, v.sort_order
from (values
  ('PH Register',                                    array[]::text[],                                                                                     10),
  ('Hunting rights / permission to hunt',            array['Limpopo', 'Free State', 'KwaZulu-Natal', 'Northern Cape'],                                   20),
  ('Hunting permit (TOPS / CITES)',                  array['Limpopo', 'Mpumalanga', 'Free State', 'North West', 'KwaZulu-Natal', 'Eastern Cape', 'Western Cape', 'Gauteng'], 30),
  ('Hunting permit (sable)',                         array['Free State'],                                                                                 40),
  ('Alien invasive species permit (Barbary sheep)',  array['Limpopo'],                                                                                    50),
  ('P3 exemption',                                   array['Limpopo', 'North West', 'KwaZulu-Natal'],                                                     60),
  ('PH / HO licences',                               array['Limpopo', 'North West', 'KwaZulu-Natal', 'Northern Cape'],                                    70),
  ('Hunting licence',                                array['Free State'],                                                                                 80),
  ('Certificate of adequate fencing',                array['Free State'],                                                                                 90),
  ('Game farm permit',                               array['Northern Cape'],                                                                              100)
) as v(name, provinces, sort_order)
where not exists (select 1 from document_types t where t.name = v.name);
