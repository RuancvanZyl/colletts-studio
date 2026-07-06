-- Migration 028: Allow hunters to self-register and create their own hunts/trophies

-- Hunters can insert their own client row (only if auth_user_id matches)
CREATE POLICY "hunter_insert_own_client" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Hunters can update their own client row
CREATE POLICY "hunter_update_own_client" ON clients
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid());

-- Hunters can read their own client row
CREATE POLICY "hunter_read_own_client" ON clients
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Hunters can insert hunts for themselves
CREATE POLICY "hunter_insert_own_hunts" ON client_hunts
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Hunters can insert job cards (trophies) for their hunts
CREATE POLICY "hunter_insert_own_docs" ON hunt_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    hunt_id IN (
      SELECT ch.id FROM client_hunts ch
      JOIN clients c ON c.id = ch.client_id
      WHERE c.auth_user_id = auth.uid()
    )
  );
