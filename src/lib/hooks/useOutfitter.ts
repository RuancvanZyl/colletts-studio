/** The signed-in outfitter's own hunts, animals and money (from the outfitter_overview function). */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { DEPT_LABELS } from '../pipeline';

export interface OAnimal { species: string; tag: string | null; status: string; dept: string; mount: string | null }
export interface OMoney { status: string; currency: string; total: number; paid: number; paid_by_outfitter: number }
export interface OHunt { id: string; ref: string | null; hunter: string; email: string | null; start: string | null; end: string | null; registered: boolean; animals: OAnimal[]; money: OMoney | null }
export interface OOverview { outfitter: { id: string; name: string; status: string }; hunts: OHunt[] }

export const animalState = (a: OAnimal): { label: string; tone: 'wait' | 'work' | 'done' | 'todo' } => {
  if (a.status === 'awaiting_arrival') return { label: 'On its way to the workshop', tone: 'wait' };
  if (a.status === 'completed' || a.status === 'complete' || a.dept === 'done') return { label: 'Finished', tone: 'done' };
  if (a.dept === 'receiving') return a.mount ? { label: 'Mount chosen, starting soon', tone: 'work' } : { label: 'Arrived, waiting for the hunter to choose', tone: 'todo' };
  return { label: `In the workshop: ${DEPT_LABELS[a.dept] ?? a.dept}`, tone: 'work' };
};

export function useOutfitter() {
  const [data, setData] = useState<OOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data: d } = await (supabase as any).rpc('outfitter_overview');
    setData(d ?? null); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, refresh: load };
}
