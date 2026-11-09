-- Migration 073: a local client does not need permits or documents, only the information needed to open an account.
-- * the permit and document lists that were set to "all" now apply to overseas (export) hunters only
-- * documents already asked for on local hunts, and not yet received, are marked "not needed"
-- * from now on a document type that is not meant for local hunters is never put on a local hunt (even if someone sets it to "all")
-- Documents added by hand on one hunt (no document type) are still allowed. A type can still be made for local hunters in Setup.

update document_types set applies_to = 'export' where applies_to = 'all';

update hunt_requirements r
   set status = 'not_needed', note = coalesce(r.note, 'A local client does not need permits or documents.')
  from client_hunts h
 where h.id = r.hunt_id and h.client_type = 'local' and r.status = 'awaiting';

create or replace function public._no_documents_for_local() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.document_type_id is not null
     and exists (select 1 from client_hunts h where h.id = new.hunt_id and h.client_type = 'local')
     and coalesce((select t.applies_to from document_types t where t.id = new.document_type_id), 'export') <> 'local' then
    return null;   -- skip: a local client is not asked for this document
  end if;
  return new;
end;
$$;
drop trigger if exists trg_no_documents_for_local on hunt_requirements;
create trigger trg_no_documents_for_local before insert on hunt_requirements for each row execute function public._no_documents_for_local();

-- Check (should say 0): documents still waiting on local hunts
select count(*) as local_documents_waiting from hunt_requirements r join client_hunts h on h.id = r.hunt_id where h.client_type = 'local' and r.status = 'awaiting';
