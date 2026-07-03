-- Migration 024: Allow hunters to insert inbound messages (questions to the workshop)
-- Run in Supabase SQL Editor

CREATE POLICY "hunter_insert_own_messages" ON client_messages
  FOR INSERT WITH CHECK (
    direction = 'inbound'
    AND client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );
