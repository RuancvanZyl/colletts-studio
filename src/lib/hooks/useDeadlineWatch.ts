/**
 * useDeadlineWatch — every hunt with a running production timeline, checked
 * against its deadline. Surfaces anyone who has actually missed their
 * deadline (strict — not a soft "due soon" nudge) so management can never
 * lose track of a client who is genuinely overdue.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export type DeadlineStatus = 'overdue' | 'due-soon' | 'on-track' | 'not-started';

export interface DeadlineWatchHunt {
  huntId:        string;
  clientId:      string;
  clientName:    string;
  clientNumber:  string | null;
  refNumber:     string;
  year:          string;
  orderSize:     string | null;
  deadline:      string | null;
  daysOverdue:   number;       // positive = overdue, negative = days remaining
  status:        DeadlineStatus;
  timelineStartedAt: string | null;
  amendedCount:  number;
}

const DAY = 86_400_000;

export function useDeadlineWatch() {
  const [hunts, setHunts]     = useState<DeadlineWatchHunt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const { data } = await (supabase as any)
      .from('client_hunts')
      .select(`
        id, ref_number, year, order_size, deadline_current, timeline_started_at,
        deadline_amendments,
        clients!inner(id, full_name, client_number)
      `)
      .eq('status', 'active')
      .eq('client_type', 'export')
      .order('deadline_current', { ascending: true, nullsFirst: false });

    const now = Date.now();
    const result: DeadlineWatchHunt[] = (data ?? []).map((h: any) => {
      let status: DeadlineStatus = 'not-started';
      let daysOverdue = 0;

      if (h.deadline_current) {
        daysOverdue = Math.floor((now - new Date(h.deadline_current).getTime()) / DAY);
        if (daysOverdue > 0) status = 'overdue';
        else if (daysOverdue >= -14) status = 'due-soon';
        else status = 'on-track';
      }

      return {
        huntId:       h.id,
        clientId:     h.clients?.id,
        clientName:   h.clients?.full_name ?? 'Unknown',
        clientNumber: h.clients?.client_number ?? null,
        refNumber:    h.ref_number,
        year:         h.year,
        orderSize:    h.order_size,
        deadline:     h.deadline_current,
        daysOverdue,
        status,
        timelineStartedAt: h.timeline_started_at,
        amendedCount: (h.deadline_amendments ?? []).length,
      };
    });

    // Alphabetical by client name, as requested — overdue chip does the flagging visually
    result.sort((a, b) => a.clientName.localeCompare(b.clientName));

    setHunts(result);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const overdue    = hunts.filter(h => h.status === 'overdue');
  const dueSoon    = hunts.filter(h => h.status === 'due-soon');
  const notStarted = hunts.filter(h => h.status === 'not-started');

  return { hunts, loading, overdue, dueSoon, notStarted, refresh: load };
}
