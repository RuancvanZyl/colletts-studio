-- Migration 009: Client hunts, document tracking, and client type
-- Run in Supabase SQL Editor → New query → Run without RLS

-- ── 1. Add client_type to clients ──────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'export'
    CHECK (client_type IN ('local', 'export'));

-- ── 2. Hunt records (one per job folder from Dropbox) ─────────────────────
CREATE TABLE IF NOT EXISTS client_hunts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year             text NOT NULL,
  ref_number       text NOT NULL,
  operator         text,
  ph               text,
  country          text,
  hunt_area        text,
  dropbox_path     text,              -- relative path inside Dropbox root
  status           text DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_hunts_client   ON client_hunts(client_id);
CREATE INDEX idx_hunts_year     ON client_hunts(client_id, year);
CREATE INDEX idx_hunts_ref      ON client_hunts(ref_number);

-- ── 3. Hunt documents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hunt_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id          uuid NOT NULL REFERENCES client_hunts(id) ON DELETE CASCADE,
  doc_type         text NOT NULL CHECK (doc_type IN (
                     'permit','cites','import_permit',
                     'job_card','receiving_sheet','packing_list',
                     'invoice','other'
                   )),
  title            text NOT NULL,
  -- For Dropbox-linked files:
  dropbox_path     text,
  -- For staff-created / uploaded files:
  storage_path     text,
  -- For structured (form-based) docs, store JSON data:
  form_data        jsonb,
  status           text DEFAULT 'pending' CHECK (status IN ('pending','complete','missing')),
  created_by       uuid REFERENCES staff_profiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_hunt_docs_hunt ON hunt_documents(hunt_id);
CREATE INDEX idx_hunt_docs_type ON hunt_documents(hunt_id, doc_type);

-- ── 4. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE client_hunts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunt_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_hunts" ON client_hunts
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "staff_write_hunts" ON client_hunts
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "staff_update_hunts" ON client_hunts
  FOR UPDATE USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "staff_delete_hunts" ON client_hunts
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM staff_profiles WHERE id = auth.uid()
    AND role IN ('admin','studio_manager') AND is_active
  ));

CREATE POLICY "staff_read_hunt_docs" ON hunt_documents
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "staff_write_hunt_docs" ON hunt_documents
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "staff_update_hunt_docs" ON hunt_documents
  FOR UPDATE USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active));

CREATE POLICY "staff_delete_hunt_docs" ON hunt_documents
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM staff_profiles WHERE id = auth.uid()
    AND role IN ('admin','studio_manager') AND is_active
  ));
