-- Speed up the job-card screens (Receiving, Daily Tasks, Job Cards, Whiteboard).
-- Safe to run more than once.
CREATE INDEX IF NOT EXISTS idx_hunt_documents_hunt_id ON public.hunt_documents (hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunt_documents_jobcard_lookup
  ON public.hunt_documents (doc_type, status, current_department);
CREATE INDEX IF NOT EXISTS idx_client_hunts_client_id ON public.client_hunts (client_id);
CREATE INDEX IF NOT EXISTS idx_client_hunts_status ON public.client_hunts (status);
ANALYZE public.hunt_documents;
ANALYZE public.client_hunts;
