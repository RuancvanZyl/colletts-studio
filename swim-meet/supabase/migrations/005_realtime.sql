-- Enable realtime so the countdown, gun start, and live scan feed update
-- instantly across every connected station/display without polling.
alter publication supabase_realtime add table race_sessions;
alter publication supabase_realtime add table scan_events;
