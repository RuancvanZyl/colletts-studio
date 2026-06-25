-- Migration 006: Link hunter auth accounts to client records
-- Run in Supabase SQL Editor → Run without RLS

-- 1. Add auth_user_id to clients so hunters can own their record
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_auth_user_id_idx
  ON clients(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 2. Add pricing catalog table (species + mount type → price)
CREATE TABLE IF NOT EXISTS price_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id  uuid REFERENCES species(id) ON DELETE CASCADE,
  mount_type_id uuid REFERENCES mount_types(id) ON DELETE CASCADE,
  price_usd   numeric(10,2) NOT NULL DEFAULT 0,
  price_zar   numeric(10,2),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species_id, mount_type_id)
);

ALTER TABLE price_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_catalog_public_read" ON price_catalog
  FOR SELECT USING (true);

CREATE POLICY "price_catalog_staff_write" ON price_catalog
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active)
  );

-- 3. RLS: hunters can read and update their own client record
CREATE POLICY "clients_hunter_own_read" ON clients
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "clients_hunter_own_update" ON clients
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "clients_hunter_own_insert" ON clients
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- 4. Hunters can read their own specimens
CREATE POLICY "specimens_hunter_own_read" ON specimens
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Hunters can insert expected specimens (trophies they're submitting)
CREATE POLICY "specimens_hunter_own_insert" ON specimens
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- 5. Hunters can read their own jobs (via specimens)
CREATE POLICY "jobs_hunter_own_read" ON jobs
  FOR SELECT USING (
    specimen_id IN (
      SELECT s.id FROM specimens s
      JOIN clients c ON c.id = s.client_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- 6. Hunters can read their own invoices
CREATE POLICY "invoices_hunter_own_read" ON invoices
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- 7. Function: find or create a client record for the logged-in hunter
CREATE OR REPLACE FUNCTION get_or_create_hunter_client(
  p_full_name text,
  p_email     text DEFAULT NULL,
  p_phone     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Try to find existing record for this auth user
  SELECT id INTO v_client_id FROM clients WHERE auth_user_id = auth.uid() LIMIT 1;
  IF FOUND THEN RETURN v_client_id; END IF;

  -- Try to match by email if the record was imported without an auth link
  IF p_email IS NOT NULL THEN
    SELECT id INTO v_client_id FROM clients
    WHERE lower(email) = lower(p_email) AND auth_user_id IS NULL
    LIMIT 1;
    IF FOUND THEN
      UPDATE clients SET auth_user_id = auth.uid() WHERE id = v_client_id;
      RETURN v_client_id;
    END IF;
  END IF;

  -- Create new client record
  INSERT INTO clients (full_name, email, phone, auth_user_id, onboarding_status)
  VALUES (p_full_name, p_email, p_phone, auth.uid(), 'in_progress')
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_hunter_client TO authenticated;
