-- Migration 008: Client photos — arrival and finished product
-- Run in Supabase SQL Editor → New query → Run without RLS

-- ── Table ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  photo_type   text NOT NULL CHECK (photo_type IN ('arrival', 'finished')),
  storage_path text NOT NULL,
  caption      text,
  uploaded_by  uuid REFERENCES staff_profiles(id),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_client_photos_client ON client_photos(client_id);
CREATE INDEX idx_client_photos_type   ON client_photos(client_id, photo_type);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE client_photos ENABLE ROW LEVEL SECURITY;

-- Staff can read all photos
CREATE POLICY "staff_read_client_photos" ON client_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
  );

-- Staff can insert photos
CREATE POLICY "staff_insert_client_photos" ON client_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
  );

-- Staff can delete photos (admins + studio_manager)
CREATE POLICY "staff_delete_client_photos" ON client_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'studio_manager')
        AND is_active
    )
  );

-- ── Storage bucket (run in Supabase dashboard → Storage → New bucket) ──────
-- Bucket name : client-photos
-- Public      : NO (private)
-- Then add these storage policies in Storage → Policies:
--
-- Allow staff to upload:
-- (storage.foldername(name))[1] IS NOT NULL
-- AND EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
--
-- Allow staff to read:
-- EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
