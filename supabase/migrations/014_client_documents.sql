-- Migration 014: Client documents (passport, ID, etc.)
-- Run without RLS in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS client_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  doc_type      text NOT NULL,          -- 'passport', 'id', 'permit', etc.
  storage_path  text NOT NULL,
  file_name     text,
  uploaded_at   timestamptz DEFAULT now(),
  uploaded_by   uuid REFERENCES auth.users(id),
  UNIQUE (client_id, doc_type)          -- one passport per client
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS delivery_address text;

-- RLS
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage client documents"
  ON client_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM staff_profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff_profiles WHERE auth_user_id = auth.uid()));
