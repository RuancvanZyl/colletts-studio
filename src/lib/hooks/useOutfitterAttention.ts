/**
 * useOutfitterAttention — what is waiting for the outfitter, so the menu can show a red number where they need to look:
 *   hunts     = rejected skins they have not acknowledged yet
 *   documents = papers the workshop is waiting for from them (or sent back to be corrected)
 *   messages  = unread messages from the workshop
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useLiveRefresh } from '../liveRefresh';

export interface OutfitterAttention { hunts: number; documents: number; messages: number }

export function useOutfitterAttention(enabled = true) {
  const [n, setN] = useState<OutfitterAttention>({ hunts: 0, documents: 0, messages: 0 });
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const [cases, docs, msgs] = await Promise.all([
        (supabase as any).rpc('outfitter_cases'),
        (supabase as any).rpc('outfitter_documents_overview'),
        (supabase as any).from('outfitter_messages').select('id', { count: 'exact', head: true }).eq('sender', 'workshop').is('read_at', null),
      ]);
      const hunts = ((cases.data ?? []) as { status: string; ack_at: string | null }[]).filter(c => c.status !== 'resolved' && !c.ack_at).length;
      const documents = ((docs.data ?? []) as { items: { responsible: string; status: string }[] }[])
        .reduce((sum, h) => sum + (h.items ?? []).filter(i => i.responsible === 'outfitter' && (i.status === 'awaiting' || i.status === 'rejected')).length, 0);
      setN({ hunts, documents, messages: msgs.count ?? 0 });
    } catch { /* the menu simply shows no numbers */ }
  }, [enabled]);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);
  useLiveRefresh(['quality_cases', 'outfitter_messages', 'hunt_requirements'], load);
  return { attention: n, refresh: load };
}
