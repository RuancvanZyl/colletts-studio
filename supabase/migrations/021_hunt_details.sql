-- Migration 021: Add farm, region, start/end dates + payment tracking to client_hunts

ALTER TABLE client_hunts
  ADD COLUMN IF NOT EXISTS farm             text,
  ADD COLUMN IF NOT EXISTS region           text,
  ADD COLUMN IF NOT EXISTS start_date       date,
  ADD COLUMN IF NOT EXISTS end_date         date,
  ADD COLUMN IF NOT EXISTS deposit_amount   numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_paid_at  timestamptz;
