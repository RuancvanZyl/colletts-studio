/** useWorkshopProgress — every active order with its trophies, measured against the milestones (counted from the day the invoice was paid). */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { fetchAllRows } from '../supabaseHelpers';
import { getPipeline } from '../pipeline';
import { assess, type Assessment, type AnimalPos } from '../progress';

export interface LastReview { status: 'on_track' | 'behind'; note: string | null; held_up_in: string | null; reviewed_by_name: string | null; reviewed_at: string }
export interface ProgressAnimal { id: string; species: string; dept: string; pos: AnimalPos; behind: boolean; kind: 'working' | 'not_arrived' | 'on_hold' }
export interface HuntProgress {
  huntId: string; clientId: string; clientName: string; clientNumber: string | null; ref: string | null; year: string | null;
  size: string | null; clockStart: string | null; deadline: string | null;
  a: Assessment; animals: ProgressAnimal[]; review: LastReview | null;
}

const FINISHED = new Set(['completed', 'complete', 'cancelled']);

export function useWorkshopProgress() {
  const [hunts, setHunts] = useState<HuntProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const db = supabase as any;
      const [cards, huntRows, reviewRows] = await Promise.all([
        fetchAllRows(() => db.from('hunt_documents').select('id, hunt_id, status, current_department, species:form_data->>species, mount:form_data->>mount_type').eq('doc_type', 'job_card').order('id')),
        fetchAllRows(() => db.from('client_hunts').select('id, ref_number, year, order_size, timeline_started_at, deadline_current, milestones, clients(id, full_name, client_number)').eq('status', 'active').order('id')),
        fetchAllRows(() => db.from('v_last_progress_review').select('*').order('hunt_id')).catch(() => []),
      ]);
      const reviews = new Map<string, LastReview>(reviewRows.map((r: any) => [r.hunt_id, r]));
      const byHunt = new Map<string, any[]>();
      for (const c of cards) { if (FINISHED.has(c.status) || c.current_department === 'done') continue; (byHunt.get(c.hunt_id) ?? byHunt.set(c.hunt_id, []).get(c.hunt_id)!).push(c); }

      const out: HuntProgress[] = [];
      for (const h of huntRows) {
        const active = byHunt.get(h.id);
        if (!active?.length) continue;
        const poss = active.map((c: any) => ({ c, pos: { pipeline: getPipeline(c.mount ?? ''), dept: c.current_department ?? 'receiving', done: false } as AnimalPos }));
        const a = assess({ size: h.order_size, clockStart: h.timeline_started_at, milestones: h.milestones, deadline: h.deadline_current }, poss.map(x => x.pos));
        out.push({
          huntId: h.id, clientId: h.clients?.id, clientName: h.clients?.full_name ?? 'Unknown', clientNumber: h.clients?.client_number ?? null, ref: h.ref_number, year: h.year,
          size: h.order_size, clockStart: h.timeline_started_at, deadline: h.deadline_current, a,
          animals: poss.map(x => ({
            id: x.c.id, species: x.c.species ?? 'Animal', dept: x.pos.dept, pos: x.pos, behind: a.animalBehind(x.pos),
            kind: x.c.status === 'awaiting_arrival' ? 'not_arrived' : x.c.status === 'pending_payment' ? 'on_hold' : 'working',
          })),
          review: reviews.get(h.id) ?? null,
        });
      }
      setHunts(out);
    } catch (e: any) { setError(e.message ?? 'Could not load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { hunts, loading, error, refresh: load };
}
