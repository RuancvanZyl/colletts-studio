-- Migration 037: v_recent_checkins view
--
-- The Receiving Sheet screen (ReceivingSheet.tsx) queries a view called
-- v_recent_checkins first, then falls back to 3 sequential queries
-- (hunt_documents x2 + client_hunts join) if that view errors. Since the
-- view was never created, every single load was hitting the slow fallback
-- path. This creates it so the fast path actually works.
--
-- Matches the "Awaiting Receiving" tab's fallback logic exactly: hunts with
-- a job_card doc in status awaiting_arrival/in_progress, currently sitting
-- in the receiving department.

CREATE OR REPLACE VIEW public.v_recent_checkins AS
SELECT
  ch.id,
  ch.year,
  COALESCE(ch.client_type, 'export') AS client_type,
  c.full_name   AS client_name,
  c.client_number,
  c.email       AS client_email,
  ch.operator,
  ch.created_at AS checked_in_at
FROM client_hunts ch
JOIN clients c ON c.id = ch.client_id
WHERE EXISTS (
  SELECT 1 FROM hunt_documents hd
  WHERE hd.hunt_id = ch.id
    AND hd.doc_type = 'job_card'
    AND hd.status IN ('awaiting_arrival', 'in_progress')
    AND hd.current_department = 'receiving'
)
ORDER BY ch.created_at DESC
LIMIT 50;

GRANT SELECT ON public.v_recent_checkins TO authenticated;
