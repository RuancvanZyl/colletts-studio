-- Migration 032: Individual staff logins + task assignment

-- 1. Add assigned_to column to hunt_documents so admin can assign trophies to specific staff
ALTER TABLE hunt_documents
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT NULL;

-- Index for fast per-staff queries
CREATE INDEX IF NOT EXISTS idx_hunt_docs_assigned ON hunt_documents(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- 2. RLS: staff can read hunt_documents assigned to them (in addition to existing staff_read_hunt_docs)
-- Existing policy already allows all active staff to read — no change needed there.

-- 3. Allow admin to update assigned_to field
-- Existing staff_update_hunt_docs policy covers this for admin/studio_manager roles.

-- 4. Ensure staff_profiles has email column for display (it doesn't have one — add it)
ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT '#3AAECC';

-- 5. RLS: all active staff can read other staff profiles (for assignment dropdowns)
DROP POLICY IF EXISTS "staff_read_profiles" ON staff_profiles;
CREATE POLICY "staff_read_profiles" ON staff_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid() AND sp.is_active = true)
  );

-- Admin can update any staff profile
DROP POLICY IF EXISTS "admin_update_profiles" ON staff_profiles;
CREATE POLICY "admin_update_profiles" ON staff_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid() AND sp.role IN ('admin','studio_manager') AND sp.is_active = true)
  );

-- Admin can insert new staff profiles (after creating auth user via edge function)
DROP POLICY IF EXISTS "admin_insert_profiles" ON staff_profiles;
CREATE POLICY "admin_insert_profiles" ON staff_profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid() AND sp.role IN ('admin','studio_manager') AND sp.is_active = true)
  );
