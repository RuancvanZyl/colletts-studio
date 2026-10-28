-- Migration 062: live updates. The tables the workshop boards show are published for realtime, so a change one person makes
-- appears on everyone else's screen without a refresh. Row security still applies: people only receive changes to rows they may see.

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  foreach t in array array['hunt_documents', 'client_hunts', 'job_card_legs', 'soak_reports', 'quality_cases', 'outfitter_messages',
                           'hunt_requirements', 'quotes', 'quote_lines', 'quote_payments', 'milestone_feedback', 'hunt_progress_reviews',
                           'registered_numbers', 'document_types', 'department_checklist_items'] loop
    if to_regclass('public.' || t) is not null
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
