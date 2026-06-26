-- Migration 015: Production pipeline tracking
-- Run without RLS in Supabase SQL Editor

-- Track which department currently holds each trophy
ALTER TABLE hunt_documents ADD COLUMN IF NOT EXISTS current_department text;

-- Initialise existing job cards to their assigned department (or 'receiving')
UPDATE hunt_documents
SET current_department = COALESCE(form_data->>'department', 'receiving')
WHERE doc_type = 'job_card' AND current_department IS NULL;

-- Stage history stored in form_data.stage_history (JSONB array), no extra column needed
