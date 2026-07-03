import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export type HuntDashboardStats = {
  total_hunts: number;
  total_clients: number;
  export_clients: number;
  local_clients: number;
  active_hunts: number;
  completed_hunts: number;
  hunts_with_job_card: number;
  hunts_with_receiving: number;
  hunts_with_invoice: number;
  hunts_with_permit: number;
  total_documents: number;
  trophies_received: number;
  hunts_missing_receiving: number;
  hunts_missing_job_card: number;
  hunts_by_year: Record<string, number>;
  hunts_by_type: Record<string, number>;
};

export function useHuntDashboard() {
  const [stats, setStats] = useState<HuntDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    // Fallback: direct count queries (works with RLS when authenticated)
    const [huntsRes, clientsRes, docsRes] = await Promise.all([
      (supabase as any).from('client_hunts').select('id, status, year, client_id'),
      (supabase as any).from('clients').select('id, client_type'),
      (supabase as any).from('hunt_documents').select('hunt_id, doc_type, status'),
    ]);

    const hunts = huntsRes.data ?? [];
    const clients = clientsRes.data ?? [];
    const docs = docsRes.data ?? [];

    const byYear: Record<string, number> = {};
    const byType: Record<string, number> = { export: 0, local: 0 };

    hunts.forEach((h: any) => {
      byYear[h.year] = (byYear[h.year] ?? 0) + 1;
    });
    clients.forEach((c: any) => {
      const t = c.client_type ?? 'export';
      byType[t] = (byType[t] ?? 0) + 1;
    });

    // job_card: any status except pending_payment counts as "created"
    const activeDocs = docs.filter((d: any) => d.status !== 'pending_payment');
    const completedDocs = docs.filter((d: any) => d.status === 'completed');
    const huntsWithJobCard   = new Set(activeDocs.filter((d: any) => d.doc_type === 'job_card').map((d: any) => d.hunt_id));
    const huntsWithReceiving = new Set(docs.filter((d: any) => d.doc_type === 'receiving_sheet').map((d: any) => d.hunt_id));
    const huntsWithInvoice   = new Set(docs.filter((d: any) => d.doc_type === 'invoice').map((d: any) => d.hunt_id));
    const huntsWithPermit    = new Set(docs.filter((d: any) => ['permit','cites','import_permit'].includes(d.doc_type)).map((d: any) => d.hunt_id));
    const huntIds            = new Set(hunts.map((h: any) => h.id));

    setStats({
      total_hunts:             hunts.length,
      total_clients:           clients.length,
      export_clients:          byType.export ?? 0,
      local_clients:           byType.local ?? 0,
      active_hunts:            hunts.filter((h: any) => h.status === 'active').length,
      completed_hunts:         hunts.filter((h: any) => h.status === 'completed').length,
      hunts_with_job_card:     huntsWithJobCard.size,
      hunts_with_receiving:    huntsWithReceiving.size,
      hunts_with_invoice:      huntsWithInvoice.size,
      hunts_with_permit:       huntsWithPermit.size,
      total_documents:         docs.length,
      trophies_received:       huntsWithReceiving.size,
      hunts_missing_receiving: hunts.filter((h: any) => h.status === 'active' && !huntsWithReceiving.has(h.id)).length,
      hunts_missing_job_card:  hunts.filter((h: any) => h.status === 'active' && !huntsWithJobCard.has(h.id)).length,
      hunts_by_year:           byYear,
      hunts_by_type:           byType,
    });

    setLoading(false);
  }

  // Re-fetch when auth session changes
  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') load();
    });
    return () => subscription.unsubscribe();
  }, []);

  return { stats, loading, refresh: load };
}
