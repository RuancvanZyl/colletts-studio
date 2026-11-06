-- Migration 066: team messages appear on the other person's screen straight away (and the Messages badge updates),
-- without opening the app again. Row security still applies: people only receive messages they may see.

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  foreach t in array array['staff_messages', 'staff_message_reads', 'client_messages'] loop
    if to_regclass('public.' || t) is not null
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Check (should say true for all three):
select tablename, true as live from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('staff_messages', 'staff_message_reads', 'client_messages');
