-- Migration 010: Dashboard stats function for hunts + documents
-- Run in Supabase SQL Editor → New query → Run without RLS

CREATE OR REPLACE FUNCTION get_hunt_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND is_active) THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT jsonb_build_object(

    -- Totals
    'total_hunts',          (SELECT count(*) FROM client_hunts),
    'total_clients',        (SELECT count(*) FROM clients),
    'export_clients',       (SELECT count(*) FROM clients WHERE client_type = 'export'),
    'local_clients',        (SELECT count(*) FROM clients WHERE client_type = 'local'),
    'active_hunts',         (SELECT count(*) FROM client_hunts WHERE status = 'active'),
    'completed_hunts',      (SELECT count(*) FROM client_hunts WHERE status = 'completed'),

    -- Documents
    'hunts_with_job_card',      (SELECT count(DISTINCT hunt_id) FROM hunt_documents WHERE doc_type = 'job_card' AND status = 'complete'),
    'hunts_with_receiving',     (SELECT count(DISTINCT hunt_id) FROM hunt_documents WHERE doc_type = 'receiving_sheet' AND status = 'complete'),
    'hunts_with_invoice',       (SELECT count(DISTINCT hunt_id) FROM hunt_documents WHERE doc_type = 'invoice' AND status = 'complete'),
    'hunts_with_permit',        (SELECT count(DISTINCT hunt_id) FROM hunt_documents WHERE doc_type IN ('permit','cites','import_permit') AND status = 'complete'),
    'total_documents',          (SELECT count(*) FROM hunt_documents),

    -- Trophies / Receiving sheets tells us trophies are physically here
    'trophies_received',        (SELECT count(*) FROM hunt_documents WHERE doc_type = 'receiving_sheet' AND status = 'complete'),

    -- By year
    'hunts_by_year', (
      SELECT jsonb_object_agg(year, cnt)
      FROM (
        SELECT year, count(*) AS cnt
        FROM client_hunts
        GROUP BY year
        ORDER BY year
      ) y
    ),

    -- By type
    'hunts_by_type', (
      SELECT jsonb_object_agg(client_type, cnt)
      FROM (
        SELECT c.client_type, count(*) AS cnt
        FROM client_hunts h
        JOIN clients c ON c.id = h.client_id
        GROUP BY c.client_type
      ) t
    ),

    -- Missing documents (hunts without a receiving sheet)
    'hunts_missing_receiving', (
      SELECT count(*)
      FROM client_hunts h
      WHERE NOT EXISTS (
        SELECT 1 FROM hunt_documents d
        WHERE d.hunt_id = h.id AND d.doc_type = 'receiving_sheet'
      )
      AND h.status = 'active'
    ),

    -- Missing job cards
    'hunts_missing_job_card', (
      SELECT count(*)
      FROM client_hunts h
      WHERE NOT EXISTS (
        SELECT 1 FROM hunt_documents d
        WHERE d.hunt_id = h.id AND d.doc_type = 'job_card'
      )
      AND h.status = 'active'
    )

  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_hunt_dashboard TO authenticated;
