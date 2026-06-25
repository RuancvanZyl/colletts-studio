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
    // Try RPC first (migration 010)
    const { data, error } = await (supabase as any).rpc('get_hunt_dashboard');
    if (!error && data) {
      setStats(data as HuntDashboardStats);
    } else {
      // Fallback: direct count queries if RPC not deployed yet
      const [huntsRes, clientsRes] = await Promise.all([
        (supabase as any).from('client_hunts').select('id, status, year', { count: 'exact' }),
        (supabase as any).from('clients').select('id, client_type', { count: 'exact' }),
      ]);

      const hunts = huntsRes.data ?? [];
      const clients = clientsRes.data ?? [];

      const byYear: Record<string, number> = {};
      const byType: Record<string, number> = { export: 0, local: 0 };

      hunts.forEach((h: any) => {
        byYear[h.year] = (byYear[h.year] ?? 0) + 1;
      });
      clients.forEach((c: any) => {
        const t = c.client_type ?? 'export';
        byType[t] = (byType[t] ?? 0) + 1;
      });

      setStats({
        total_hunts:            hunts.length,
        total_clients:          clients.length,
        export_clients:         byType.export,
        local_clients:          byType.local,
        active_hunts:           hunts.filter((h: any) => h.status === 'active').length,
        completed_hunts:        hunts.filter((h: any) => h.status === 'completed').length,
        hunts_with_job_card:    0,
        hunts_with_receiving:   0,
        hunts_with_invoice:     0,
        hunts_with_permit:      0,
        total_documents:        0,
        trophies_received:      0,
        hunts_missing_receiving:0,
        hunts_missing_job_card: 0,
        hunts_by_year:          byYear,
        hunts_by_type:          byType,
      });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  return { stats, loading, refresh: load };
}
