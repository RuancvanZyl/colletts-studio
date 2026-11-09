/** useAttentionCounts — the numbers behind "Needs you" and the whiteboard: documents, rejected skins, cards waiting to be accepted, permit numbers. Updates live. */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { informDaysLeft } from '../cases';
import { useLiveRefresh } from '../liveRefresh';

export interface AttentionCounts {
  toCheck: number; fromOutfitter: number; unreadChat: number; unverified: number; lateAccept: number;
  notAcked: number; needOutcome: number; clientOverdue: number; heldAside: number;
  arrivedToCheck: number;   // hunters whose trophies have arrived (tag or button) and still need the condition report
  missingParts: number;     // animals received with parts missing / still to follow
}
const ZERO: AttentionCounts = { toCheck: 0, fromOutfitter: 0, unreadChat: 0, unverified: 0, lateAccept: 0, notAcked: 0, needOutcome: 0, clientOverdue: 0, heldAside: 0, arrivedToCheck: 0, missingParts: 0 };

export function useAttentionCounts(): AttentionCounts {
  const [c, setC] = useState<AttentionCounts>(ZERO);
  const load = useCallback(() => {
    (async () => {
      const db = supabase as any;
      const { data: v } = await db.from('v_hunt_documents').select('to_check, waiting_outfitter');
      const { count } = await db.from('outfitter_messages').select('id', { count: 'exact', head: true }).eq('sender', 'outfitter').is('read_at', null);
      const { count: unv } = await db.from('registered_numbers').select('id', { count: 'exact', head: true }).is('verified_at', null);
      const { count: late } = await db.from('job_card_legs').select('id', { count: 'exact', head: true }).is('accepted_at', null).is('completed_at', null).lt('sent_at', new Date(Date.now() - 24 * 3_600_000).toISOString());
      const { data: qc } = await db.from('quality_cases').select('status, outfitter_id, outfitter_ack_at, outcome, outcome_at, client_informed_at, order_override_at').neq('status', 'resolved');
      const cases: any[] = qc ?? [];
      // trophies at the receiving stage: arrived but not checked yet, and animals with parts missing
      const recvQuery = (cols: string) => db.from('hunt_documents').select(cols).eq('doc_type', 'job_card').eq('current_department', 'receiving').in('status', ['awaiting_arrival', 'in_progress', 'flagged']);
      const first = await recvQuery('hunt_id, status, arrived_at, received:form_data->received_parts, tf:form_data->>to_follow, mp:form_data->missing_parts');
      const rc = first.error ? (await recvQuery('hunt_id, status, received:form_data->received_parts, tf:form_data->>to_follow, mp:form_data->missing_parts')).data : first.data;   // without migration 070 there is no arrival column
      const atReceiving: any[] = rc ?? [];
      const arrivedHunts = new Set(atReceiving.filter(x => x.arrived_at && !(Array.isArray(x.received) && x.received.length > 0)).map(x => x.hunt_id));
      const oldMissing = atReceiving.filter(x => x.tf === 'true' || (x.status === 'flagged' && Array.isArray(x.mp) && x.mp.length > 0)).length;
      const fu = await db.from('part_followups').select('id', { count: 'exact', head: true }).is('resolved_at', null);
      const missing = fu.error ? oldMissing : (fu.count ?? 0);
      setC({
        arrivedToCheck: arrivedHunts.size, missingParts: missing,
        heldAside: cases.filter(x => x.order_override_at).length,
        clientOverdue: cases.filter(x => { const d = informDaysLeft(x); return d !== null && d < 0; }).length,
        notAcked: cases.filter(x => x.outfitter_id && !x.outfitter_ack_at).length,
        needOutcome: cases.filter(x => x.status === 'open').length,
        lateAccept: late ?? 0, unverified: unv ?? 0, unreadChat: count ?? 0,
        toCheck: (v ?? []).reduce((n: number, r: any) => n + +r.to_check, 0),
        fromOutfitter: (v ?? []).filter((r: any) => +r.waiting_outfitter > 0).length,
      });
    })().catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['hunt_requirements', 'quality_cases', 'job_card_legs', 'registered_numbers', 'outfitter_messages', 'hunt_documents', 'part_followups'], load);
  return c;
}
