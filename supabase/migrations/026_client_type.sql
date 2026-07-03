-- Add client_type to distinguish local (collection) vs export (shipping) clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'export'
  CHECK (client_type IN ('local', 'export'));
