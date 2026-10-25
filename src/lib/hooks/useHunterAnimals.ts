/**
 * useHunterAnimals — the signed-in hunter's own animals: what the workshop received, what mount they
 * chose, and where each one is now. (One row per job card.)
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { selectIn } from '../supabaseHelpers';
import { PART_LABEL } from '../received';

export interface HunterAnimal {
  docId: string; huntId: string; huntRef: string; huntYear: string;
  species: string; tag: string; condition: string;
  parts: { code: string; label: string }[]; other: string; receivedAt: string | null;
  mount: string; mountChosen: boolean; instructions: string;
  dept: string; status: string; started: boolean; finished: boolean; expected: boolean;
  history: { dept: string; completedAt?: string }[];
}
export interface HunterClient { id: string; name: string; email: string | null; type: string }

export function useHunterAnimals() {
  const { user } = useAuth();
  const [client, setClient] = useState<HunterClient | null>(null);
  const [animals, setAnimals] = useState<HunterAnimal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: c } = await (supabase as any).from('clients').select('id, full_name, email, client_type').eq('auth_user_id', user.id).maybeSingle();
      if (!c) { setClient(null); setAnimals([]); return; }
      setClient({ id: c.id, name: c.full_name, email: c.email, type: c.client_type ?? 'export' });
      const { data: hunts } = await (supabase as any).from('client_hunts').select('id, ref_number, year, status').eq('client_id', c.id);
      const huntById = new Map<string, any>((hunts ?? []).map((h: any) => [h.id, h]));
      const docs = await selectIn<any>('hunt_documents', 'id, hunt_id, doc_type, form_data, current_department, status, started_at, created_at', 'hunt_id', [...huntById.keys()]);
      setAnimals(docs.filter(d => d.doc_type === 'job_card' && d.status !== 'cancelled').map(d => {
        const fd = d.form_data ?? {}; const h = huntById.get(d.hunt_id) ?? {};
        const mount = String(fd.mount_type ?? '');
        const chosen = !!mount && !/^pending instructions$/i.test(mount);
        const parts: { code: string; label: string }[] = Array.isArray(fd.received_parts)
          ? fd.received_parts.map((p: any) => ({ code: p.code, label: p.label ?? PART_LABEL[p.code] ?? p.code })) : [];
        return {
          docId: d.id, huntId: d.hunt_id, huntRef: h.ref_number ?? '', huntYear: String(h.year ?? ''),
          species: fd.species ?? 'Animal', tag: fd.tag_number ?? '', condition: fd.condition ?? '',
          parts, other: fd.received_other ?? '', receivedAt: fd.received_at ?? null,
          mount: chosen ? mount : '', mountChosen: chosen, instructions: fd.instructions ?? '',
          dept: d.current_department ?? 'receiving', status: d.status ?? '', started: !!d.started_at,
          expected: d.status === 'awaiting_arrival',
          finished: d.status === 'completed' || d.status === 'complete' || d.current_department === 'done',
          history: fd.stage_history ?? [],
        } as HunterAnimal;
      }).sort((a, b) => b.huntYear.localeCompare(a.huntYear) || a.huntRef.localeCompare(b.huntRef) || a.species.localeCompare(b.species)));
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  return { client, animals, loading, refresh: load };
}
