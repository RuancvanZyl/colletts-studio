-- Migration 031: Add form_data column to client_messages
-- Stores trophy_tag and species from hunter message submissions
-- Run in Supabase SQL Editor

ALTER TABLE client_messages
  ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT NULL;

-- Also ensure 'upsell' is a valid category for message_templates
-- (migration 025 should have done this, but including as safety net)
ALTER TABLE message_templates
  DROP CONSTRAINT IF EXISTS message_templates_category_check;

ALTER TABLE message_templates
  ADD CONSTRAINT message_templates_category_check
  CHECK (category IN ('deposit','status_update','completion','shipping','general','document_request','upsell'));
