-- Migration 018: Create storage buckets and policies
-- Run WITHOUT RLS in Supabase SQL Editor → New query tab

-- ── Buckets ────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-photos',
  'client-photos',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- ── Policies: client-photos ────────────────────────────────────────────────────

DO $$
BEGIN
  DROP POLICY IF EXISTS "staff_upload_client_photos" ON storage.objects;
  DROP POLICY IF EXISTS "staff_read_client_photos"   ON storage.objects;
  DROP POLICY IF EXISTS "staff_delete_client_photos" ON storage.objects;
  DROP POLICY IF EXISTS "staff_upload_client_docs"   ON storage.objects;
  DROP POLICY IF EXISTS "staff_read_client_docs"     ON storage.objects;
  DROP POLICY IF EXISTS "staff_delete_client_docs"   ON storage.objects;
END $$;

-- Staff can upload photos and hunt documents
CREATE POLICY "staff_upload_client_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-photos'
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE id = auth.uid() AND is_active
    )
  );

-- Staff can read photos and hunt documents
CREATE POLICY "staff_read_client_photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-photos'
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE id = auth.uid() AND is_active
    )
  );

-- Admins and studio managers can delete
CREATE POLICY "staff_delete_client_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-photos'
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'studio_manager')
        AND is_active
    )
  );

-- ── Policies: client-documents ─────────────────────────────────────────────────

CREATE POLICY "staff_upload_client_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE id = auth.uid() AND is_active
    )
  );

CREATE POLICY "staff_read_client_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE id = auth.uid() AND is_active
    )
  );

CREATE POLICY "staff_delete_client_docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'studio_manager')
        AND is_active
    )
  );
