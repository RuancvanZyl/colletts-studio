-- Migration 020: Complete client registration fields

-- Add missing columns to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS first_name          text,
  ADD COLUMN IF NOT EXISTS last_name           text,
  ADD COLUMN IF NOT EXISTS cell                text,
  ADD COLUMN IF NOT EXISTS residential_address text,
  ADD COLUMN IF NOT EXISTS delivery_address    text,
  ADD COLUMN IF NOT EXISTS profile_photo_path  text,
  ADD COLUMN IF NOT EXISTS passport_copy_path  text,
  ADD COLUMN IF NOT EXISTS registration_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registered_at       timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

-- Backfill first/last from full_name where possible
UPDATE clients
SET
  first_name = split_part(trim(full_name), ' ', 1),
  last_name  = CASE
    WHEN length(trim(full_name)) - length(replace(trim(full_name), ' ', '')) >= 1
    THEN substring(trim(full_name) FROM position(' ' IN trim(full_name)) + 1)
    ELSE ''
  END
WHERE first_name IS NULL;

-- Index for registration status
CREATE INDEX IF NOT EXISTS idx_clients_registration ON clients(registration_complete, created_at);

-- Function to mark registration complete and set timestamp
CREATE OR REPLACE FUNCTION complete_client_registration(p_client_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE clients
  SET registration_complete = true,
      registered_at = now(),
      onboarding_status = 'in_progress'
  WHERE id = p_client_id;
END;
$$;
