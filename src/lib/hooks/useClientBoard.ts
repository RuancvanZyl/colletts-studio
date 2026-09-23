import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export type ClientBoardEntry = {
  clientId: string;
  fullName: string;
  clientNumber: string | null;
  clientType: string;
  activeHunts: number;
  completedHunts: number;
  cancelledHunts: number;
  departments: string[];       // distinct current_department values across this client's active job cards
  missingJobCard: boolean;     // has an active hunt with zero job_card docs
};

export function useClientBoard() {
  const [entries, setEntries] = useState<ClientBoardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const [{ data: clients }, { data: hunts }, { data: docs }] = await Promise.all([
      (supabase as any).from('clients').select('id, full_name, client_number, client_type'),
      (supabase as any).from('client_hunts').select('id, client_id, status'),
      (supabase as any).from('hunt_documents').select('hunt_id, doc_type, status, current_department').eq('doc_type', 'job_card'),
    ]);

    const huntToClient: Record<string, string> = {};
    (hunts ?? []).forEach((h: any) => { huntToClient[h.id] = h.client_id; });

    const jobCardHuntIds = new Set((docs ?? []).map((d: any) => d.hunt_id));

    const byClient: Record<string, ClientBoardEntry> = {};
    for (const c of clients ?? []) {
      byClient[c.id] = {
        clientId: c.id,
        fullName: c.full_name,
        clientNumber: c.client_number ?? null,
        clientType: c.client_type ?? 'export',
        activeHunts: 0,
        completedHunts: 0,
        cancelledHunts: 0,
        departments: [],
        missingJobCard: false,
      };
    }

    for (const h of hunts ?? []) {
      const entry = byClient[h.client_id];
      if (!entry) continue;
      if (h.status === 'active') {
        entry.activeHunts++;
        if (!jobCardHuntIds.has(h.id)) entry.missingJobCard = true;
      } else if (h.status === 'completed') {
        entry.completedHunts++;
      } else if (h.status === 'cancelled') {
        entry.cancelledHunts++;
      }
    }

    for (const d of docs ?? []) {
      const clientId = huntToClient[d.hunt_id];
      const entry = clientId ? byClient[clientId] : null;
      if (!entry || d.status !== 'in_progress' || !d.current_department) continue;
      if (!entry.departments.includes(d.current_department)) entry.departments.push(d.current_department);
    }

    const all = Object.values(byClient).filter(e => e.activeHunts + e.completedHunts + e.cancelledHunts > 0);
    setEntries(all);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') load();
    });
    return () => subscription.unsubscribe();
  }, []);

  return { entries, loading, refresh: load };
}
