-- Allow awaiting_arrival status for pre-registered export trophies
-- and customisation doc_type (already used in app)
ALTER TABLE hunt_documents
  DROP CONSTRAINT IF EXISTS hunt_documents_status_check,
  DROP CONSTRAINT IF EXISTS hunt_documents_doc_type_check;

ALTER TABLE hunt_documents
  ADD CONSTRAINT hunt_documents_status_check
    CHECK (status IN ('pending','pending_payment','awaiting_arrival','in_progress','completed','complete','missing')),
  ADD CONSTRAINT hunt_documents_doc_type_check
    CHECK (doc_type IN (
      'permit','cites','import_permit',
      'job_card','receiving_sheet','packing_list',
      'invoice','other','customisation'
    ));

-- Track which outfitter pre-registered the hunt
ALTER TABLE client_hunts
  ADD COLUMN IF NOT EXISTS outfitter_id uuid REFERENCES outfitters(id),
  ADD COLUMN IF NOT EXISTS hunt_date date,
  ADD COLUMN IF NOT EXISTS farm_name text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Index for outfitter lookups
CREATE INDEX IF NOT EXISTS idx_client_hunts_outfitter ON client_hunts(outfitter_id);
