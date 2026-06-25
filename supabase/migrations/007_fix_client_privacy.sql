-- Migration 007: Fix client privacy — only real staff can read all clients
-- Run in Supabase SQL Editor → New query → Run without RLS

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Drop the overly permissive policies that let any auth user see all clients
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_read_clients"          ON clients;
DROP POLICY IF EXISTS "clients_hunter_own_read"     ON clients;  -- recreated below
DROP POLICY IF EXISTS "clients_hunter_own_update"   ON clients;
DROP POLICY IF EXISTS "clients_hunter_own_insert"   ON clients;

-- Also drop the anon-permissive policy added during debugging
DROP POLICY IF EXISTS "allow_anon_read_clients"     ON clients;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Staff-only read — a user is "staff" if they have a row in staff_profiles
-- ──────────────────────────────────────────────────────────────────────────
CREATE POLICY "staff_only_read_clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid()
        AND is_active = true
    )
  );

-- Staff who can write clients (already exists but restate for clarity)
DROP POLICY IF EXISTS "staff_write_clients"  ON clients;
DROP POLICY IF EXISTS "staff_update_clients" ON clients;

CREATE POLICY "staff_write_clients" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid()
        AND role IN ('admin','studio_manager','ground_staff')
        AND is_active = true
    )
  );

CREATE POLICY "staff_update_clients" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid()
        AND role IN ('admin','studio_manager')
        AND is_active = true
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Hunters can only see and manage their OWN client record
-- ──────────────────────────────────────────────────────────────────────────
CREATE POLICY "hunter_own_client_read" ON clients
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "hunter_own_client_update" ON clients
  FOR UPDATE
  USING     (auth_user_id = auth.uid())
  WITH CHECK(auth_user_id = auth.uid());

CREATE POLICY "hunter_own_client_insert" ON clients
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Fix specimens — staff see all, hunters only see their own
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_read_specimens"        ON specimens;
DROP POLICY IF EXISTS "specimens_hunter_own_read"   ON specimens;
DROP POLICY IF EXISTS "specimens_hunter_own_insert" ON specimens;

CREATE POLICY "staff_read_specimens" ON specimens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
  );

CREATE POLICY "hunter_own_specimens_read" ON specimens
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "hunter_own_specimens_insert" ON specimens
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Fix jobs — staff see all, hunters only see their own via specimens
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "read_jobs"              ON jobs;
DROP POLICY IF EXISTS "jobs_hunter_own_read"   ON jobs;

CREATE POLICY "staff_read_jobs" ON jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
  );

CREATE POLICY "hunter_own_jobs_read" ON jobs
  FOR SELECT USING (
    specimen_id IN (
      SELECT s.id FROM specimens s
      JOIN clients c ON c.id = s.client_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Global search RPC — staff only, searches clients + specimens + jobs
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION global_search(query text)
RETURNS TABLE (
  result_type  text,
  result_id    uuid,
  label        text,
  sub_label    text,
  nav_hint     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only staff can call this
  IF NOT EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active) THEN
    RETURN;
  END IF;

  RETURN QUERY
    -- Clients
    SELECT
      'client'::text,
      c.id,
      c.full_name,
      COALESCE(c.email, c.phone, c.country, ''),
      'clients'::text
    FROM clients c
    WHERE
      c.full_name ILIKE '%' || query || '%'
      OR c.email   ILIKE '%' || query || '%'
      OR c.phone   ILIKE '%' || query || '%'
      OR c.country ILIKE '%' || query || '%'
    LIMIT 5

    UNION ALL

    -- Specimens by tag number or species name
    SELECT
      'specimen'::text,
      s.id,
      COALESCE(s.tag_number, s.species_name, 'Specimen'),
      COALESCE(s.species_name, '') || ' · ' || COALESCE(c2.full_name, ''),
      'arrival'::text
    FROM specimens s
    LEFT JOIN clients c2 ON c2.id = s.client_id
    WHERE
      s.tag_number   ILIKE '%' || query || '%'
      OR s.species_name ILIKE '%' || query || '%'
    LIMIT 5

    UNION ALL

    -- Jobs by phase or tag
    SELECT
      'job'::text,
      j.id,
      COALESCE(s2.tag_number, s2.species_name, 'Job'),
      j.current_phase::text || ' · ' || COALESCE(c3.full_name, ''),
      'inventory'::text
    FROM jobs j
    LEFT JOIN specimens s2 ON s2.id = j.specimen_id
    LEFT JOIN clients   c3 ON c3.id = s2.client_id
    WHERE
      s2.tag_number   ILIKE '%' || query || '%'
      OR s2.species_name ILIKE '%' || query || '%'
      OR c3.full_name   ILIKE '%' || query || '%'
    LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION global_search TO authenticated;
