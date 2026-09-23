-- Migration 038: add 'stock' as a client_hunts status
--
-- "CWA Stock ex <name>" pseudo-clients represent trophies abandoned by a
-- hunter and absorbed into the workshop's own inventory — they are not
-- real client orders and should not appear alongside real clients in
-- production tracking (Client Status Board, dashboards, etc). Giving them
-- their own status keeps them out of the active/completed/cancelled counts
-- entirely (useClientBoard only tallies those three statuses, so a client
-- whose hunts are all 'stock' simply won't appear in the Client Status
-- Board) without deleting the underlying data.

ALTER TABLE client_hunts
  DROP CONSTRAINT IF EXISTS client_hunts_status_check;

ALTER TABLE client_hunts
  ADD CONSTRAINT client_hunts_status_check
    CHECK (status IN ('active', 'completed', 'cancelled', 'stock'));
