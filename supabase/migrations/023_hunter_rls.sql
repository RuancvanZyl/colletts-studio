-- Migration 023: Hunter RLS — allow authenticated hunters to read their own data
-- Hunters are identified by clients.auth_user_id = auth.uid()

-- ── client_hunts: hunters can read their own hunts ────────────────────────────
CREATE POLICY "hunter_read_own_hunts" ON client_hunts
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- ── hunt_documents: hunters can read job cards for their hunts ────────────────
CREATE POLICY "hunter_read_own_docs" ON hunt_documents
  FOR SELECT TO authenticated
  USING (
    hunt_id IN (
      SELECT ch.id FROM client_hunts ch
      JOIN clients c ON c.id = ch.client_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- ── client_notifications: hunters can read and mark their own notifications ───
CREATE POLICY "hunter_read_own_notifs" ON client_notifications
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "hunter_update_own_notifs" ON client_notifications
  FOR UPDATE TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- ── trophy_stage_history: hunters can read history for their job cards ─────────
CREATE POLICY "hunter_read_own_history" ON trophy_stage_history
  FOR SELECT TO authenticated
  USING (
    hunt_doc_id IN (
      SELECT hd.id FROM hunt_documents hd
      JOIN client_hunts ch ON ch.id = hd.hunt_id
      JOIN clients c ON c.id = ch.client_id
      WHERE c.auth_user_id = auth.uid()
    )
  );
