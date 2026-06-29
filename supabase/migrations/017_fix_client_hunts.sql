-- Migration 017: Fix client_hunts — add client_type column + auto-generate ref_number
-- Run without RLS in Supabase SQL Editor (open a new query tab)

-- 1. Add client_type to client_hunts (denormalised from clients for easy reporting)
ALTER TABLE client_hunts
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'export'
    CHECK (client_type IN ('local', 'export'));

-- 2. Backfill client_type from the related clients row
UPDATE client_hunts h
SET client_type = c.client_type
FROM clients c
WHERE h.client_id = c.id
  AND h.client_type IS NULL;

-- 3. Create a sequence for hunt reference numbers (resets by year in app logic)
CREATE SEQUENCE IF NOT EXISTS hunt_ref_seq START 1;

-- 4. Add a generated ref_number default so existing NOT NULL constraint still passes
--    Format: ATS-{YYYY}-{zero-padded-4-digit-seq}
ALTER TABLE client_hunts
  ALTER COLUMN ref_number SET DEFAULT 'PENDING';   -- temporary default

-- 5. Function to auto-assign ref_number before insert
CREATE OR REPLACE FUNCTION assign_hunt_ref_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  yr text;
  seq_val int;
BEGIN
  -- Only assign if not already provided
  IF NEW.ref_number IS NULL OR NEW.ref_number = 'PENDING' OR NEW.ref_number = '' THEN
    yr := EXTRACT(YEAR FROM now())::text;
    seq_val := nextval('hunt_ref_seq');
    NEW.ref_number := 'ATS-' || yr || '-' || LPAD(seq_val::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_hunt_ref ON client_hunts;
CREATE TRIGGER trg_assign_hunt_ref
  BEFORE INSERT ON client_hunts
  FOR EACH ROW EXECUTE FUNCTION assign_hunt_ref_number();

-- 6. Backfill existing rows that have 'PENDING' as ref_number
DO $$
DECLARE
  rec RECORD;
  yr text;
  seq_val int;
BEGIN
  yr := EXTRACT(YEAR FROM now())::text;
  FOR rec IN SELECT id FROM client_hunts WHERE ref_number = 'PENDING' OR ref_number IS NULL ORDER BY created_at ASC LOOP
    seq_val := nextval('hunt_ref_seq');
    UPDATE client_hunts
      SET ref_number = 'ATS-' || yr || '-' || LPAD(seq_val::text, 4, '0')
      WHERE id = rec.id;
  END LOOP;
END $$;
