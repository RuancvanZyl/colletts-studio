/**
 * useAttentionItems — everything across the management systems that needs
 * admin action, surfaced on the Summary sheet:
 *  - new hunter-submitted hunts awaiting deposit/review
 *  - unassigned active job cards
 *  - unread client messages
 *  - critically stalled jobs
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { STALL_HOURS } from '../pipeline';

export interface AttentionItems {
  newHunterSubmissions: number;   // job cards pending_payment submitted by hunters
  unassignedActive:     number;   // in_progress jobs with no assigned_to
  unreadMessages:       number;   // inbound client messages not yet read
  stalledRed:           number;   // jobs stuck > 2× threshold
}

export function useAttentionItems() {
  const [items,   setItems]   = useState<AttentionItems | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const [pendingRes, activeRes, messagesRes] = await Promise.all([
      // New hunter submissions awaiting review/deposit
      (supabase as any)
        .from('hunt_documents')
        .select('id', { count: 'exact', head: true })
        .eq('doc_type', 'job_card')
        .eq('status', 'pending_payment'),

      // Active jobs — check assignment + stall in JS
      (supabase as any)
        .from('hunt_documents')
        .select('id, assigned_to, current_department, last_moved_at')
        .eq('doc_type', 'job_card')
        .eq('status', 'in_progress'),

      // Unread inbound client messages
      (supabase as any)
        .from('client_messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .is('read_at', null),
    ]);

    const activeDocs: any[] = activeRes.data ?? [];
    const now = Date.now();
    let unassigned = 0, stalledRed = 0;
    for (const d of activeDocs) {
      if (!d.assigned_to) unassigned++;
      if (d.last_moved_at) {
        const hrs = (now - new Date(d.last_moved_at).getTime()) / 3_600_000;
        if (hrs > (STALL_HOURS[d.current_department] ?? 72) * 2) stalledRed++;
      }
    }

    setItems({
      newHunterSubmissions: pendingRes.count ?? 0,
      unassignedActive:     unassigned,
      unreadMessages:       messagesRes.count ?? 0,
      stalledRed,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return { items, loading, refresh: load };
}
