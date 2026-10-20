-- Launch-day cleanup. Safe to run more than once. Nothing here deletes data.
-- Run AFTER migrations 041-043. Review each step; run the whole file in the SQL Editor.

-- 1. One word for a finished job card
UPDATE hunt_documents SET status = 'completed' WHERE doc_type = 'job_card' AND status = 'complete';

-- 2. Start every stall clock fresh at go-live (otherwise the whiteboard shows hundreds of "critically stalled" jobs
--    simply because the backfilled cards are old)
UPDATE hunt_documents SET last_moved_at = now() WHERE doc_type = 'job_card' AND status = 'in_progress';

-- 3. Flag the hunts whose Dropbox folder says the client has not given instructions yet
UPDATE client_hunts SET awaiting_instruction = true,
       instruction_requested_at = COALESCE(instruction_requested_at, now()),
       instruction_received_at = NULL
WHERE status = 'active' AND awaiting_instruction = false
  AND dropbox_path ~* 'await(ing)?\s*(more\s*)?(photos\s*re\s*)?instr|finalis(e|ing)\s*instr|instructions?\s*(o\s*s|outstanding)|thinking about instructions';

-- 4. What this did
SELECT
  (SELECT count(*) FROM hunt_documents WHERE doc_type = 'job_card' AND status = 'in_progress') AS active_job_cards,
  (SELECT count(*) FROM hunt_documents WHERE doc_type = 'job_card' AND status = 'complete')    AS leftover_complete_status,
  (SELECT count(*) FROM client_hunts WHERE awaiting_instruction)                                AS hunts_awaiting_instruction;
