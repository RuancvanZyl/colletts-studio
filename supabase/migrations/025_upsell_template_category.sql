-- Migration 025: Add 'upsell' category to message_templates
ALTER TABLE message_templates
  DROP CONSTRAINT IF EXISTS message_templates_category_check;

ALTER TABLE message_templates
  ADD CONSTRAINT message_templates_category_check
  CHECK (category IN ('deposit','status_update','completion','shipping','general','document_request','upsell'));
