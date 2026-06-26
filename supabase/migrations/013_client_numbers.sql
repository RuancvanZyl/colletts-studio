-- Migration 013: Client numbers (E-XXX for export, L-XXX for local)
-- Run without RLS in Supabase SQL Editor

ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_number text UNIQUE;

-- Sequences for auto-incrementing client numbers
CREATE SEQUENCE IF NOT EXISTS export_client_seq START 1;
CREATE SEQUENCE IF NOT EXISTS local_client_seq START 1;

-- Backfill existing clients (export first, then local)
DO $$
DECLARE
  rec RECORD;
  seq_val INT;
BEGIN
  -- Export clients
  FOR rec IN SELECT id FROM clients WHERE client_type = 'export' AND client_number IS NULL ORDER BY created_at ASC LOOP
    seq_val := nextval('export_client_seq');
    UPDATE clients SET client_number = 'E-' || LPAD(seq_val::text, 3, '0') WHERE id = rec.id;
  END LOOP;
  -- Local clients
  FOR rec IN SELECT id FROM clients WHERE client_type = 'local' AND client_number IS NULL ORDER BY created_at ASC LOOP
    seq_val := nextval('local_client_seq');
    UPDATE clients SET client_number = 'L-' || LPAD(seq_val::text, 3, '0') WHERE id = rec.id;
  END LOOP;
END $$;

-- Function to assign client number on insert
CREATE OR REPLACE FUNCTION assign_client_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.client_number IS NULL THEN
    IF NEW.client_type = 'local' THEN
      NEW.client_number := 'L-' || LPAD(nextval('local_client_seq')::text, 3, '0');
    ELSE
      NEW.client_number := 'E-' || LPAD(nextval('export_client_seq')::text, 3, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_client_number ON clients;
CREATE TRIGGER trg_assign_client_number
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION assign_client_number();
