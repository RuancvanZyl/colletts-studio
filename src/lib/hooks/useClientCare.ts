/**
 * useClientCare — the client-relationship layer.
 *
 * The workshop tracks trophies well; this tracks whether the *hunter* has
 * actually been kept in the loop. For every client with live work it answers:
 *   - when did we last talk to them?
 *   - has their trophy moved since then without us telling them?
 *   - are they waiting on a reply from us?
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { DEPT_LABELS } from '../pipeline';

export type CareLevel = 'overdue' | 'due' | 'ok';

export interface CareClient {
  clientId:        string;
  name:            string;
  email:           string | null;
  clientNumber:    string | null;
  clientType:      string;
  activeTrophies:  number;
  latestDept:      string | null;
  latestDeptLabel: string | null;
  lastMovedAt:     string | null;   // last time their work progressed
  lastContactAt:   string | null;   // last outbound message to them
  daysSinceContact: number | null;
  unansweredInbound: number;        // their messages we have not replied to
  movedSinceContact: boolean;       // work progressed but they were not told
  level:           CareLevel;
  reason:          string;
}

// How long a client may go without hearing from us before we flag it
const DUE_DAYS     = 21;
const OVERDUE_DAYS = 35;

function daysBetween(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function useClientCare() {
  const [clients, setClients] = useState<CareClient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // 1. Active job cards, with their hunt + client
    const { data: docs } = await (supabase as any)
      .from('hunt_documents')
      .select(`
        id, status, current_department, last_moved_at,
        client_hunts!inner(
          id, client_id,
          clients!inner(id, full_name, email, client_number, client_type)
        )
      `)
      .eq('doc_type', 'job_card')
      .in('status', ['in_progress', 'pending_payment', 'awaiting_arrival']);

    const byClient: Record<string, CareClient> = {};

    for (const d of docs ?? []) {
      const c = d.client_hunts?.clients;
      if (!c) continue;

      if (!byClient[c.id]) {
        byClient[c.id] = {
          clientId: c.id,
          name: c.full_name,
          email: c.email ?? null,
          clientNumber: c.client_number ?? null,
          clientType: c.client_type ?? 'export',
          activeTrophies: 0,
          latestDept: null,
          latestDeptLabel: null,
          lastMovedAt: null,
          lastContactAt: null,
          daysSinceContact: null,
          unansweredInbound: 0,
          movedSinceContact: false,
          level: 'ok',
          reason: '',
        };
      }

      const entry = byClient[c.id];
      entry.activeTrophies++;

      if (d.last_moved_at && (!entry.lastMovedAt || d.last_moved_at > entry.lastMovedAt)) {
        entry.lastMovedAt     = d.last_moved_at;
        entry.latestDept      = d.current_department;
        entry.latestDeptLabel = DEPT_LABELS[d.current_department] ?? d.current_department;
      }
    }

    const clientIds = Object.keys(byClient);
    if (clientIds.length === 0) { setClients([]); setLoading(false); return; }

    // 2. Message history for those clients
    const { data: msgs } = await (supabase as any)
      .from('client_messages')
      .select('client_id, direction, sent_at, created_at')
      .in('client_id', clientIds)
      .order('sent_at', { ascending: false });

    const lastOutbound: Record<string, string> = {};
    const lastInbound:  Record<string, string> = {};

    for (const m of msgs ?? []) {
      const when = m.sent_at ?? m.created_at;
      if (!when) continue;
      if (m.direction === 'outbound') {
        if (!lastOutbound[m.client_id] || when > lastOutbound[m.client_id]) lastOutbound[m.client_id] = when;
      } else {
        if (!lastInbound[m.client_id] || when > lastInbound[m.client_id]) lastInbound[m.client_id] = when;
      }
    }

    // 3. Score each client
    for (const id of clientIds) {
      const e = byClient[id];
      e.lastContactAt    = lastOutbound[id] ?? null;
      e.daysSinceContact = daysBetween(e.lastContactAt);

      // They wrote to us more recently than we wrote to them → we owe a reply
      const inbound = lastInbound[id];
      if (inbound && (!e.lastContactAt || inbound > e.lastContactAt)) e.unansweredInbound = 1;

      // Their trophy progressed after our last message → they don't know
      e.movedSinceContact = !!(e.lastMovedAt && e.lastContactAt && e.lastMovedAt > e.lastContactAt);

      if (e.unansweredInbound) {
        e.level = 'overdue';
        e.reason = 'Waiting on a reply from us';
      } else if (e.lastContactAt === null) {
        e.level = 'overdue';
        e.reason = 'Never contacted';
      } else if ((e.daysSinceContact ?? 0) >= OVERDUE_DAYS) {
        e.level = 'overdue';
        e.reason = `No update in ${e.daysSinceContact} days`;
      } else if (e.movedSinceContact) {
        e.level = 'due';
        e.reason = `Moved to ${e.latestDeptLabel} since last update`;
      } else if ((e.daysSinceContact ?? 0) >= DUE_DAYS) {
        e.level = 'due';
        e.reason = `No update in ${e.daysSinceContact} days`;
      } else {
        e.level = 'ok';
        e.reason = `Updated ${e.daysSinceContact} days ago`;
      }
    }

    const order: Record<CareLevel, number> = { overdue: 0, due: 1, ok: 2 };
    setClients(
      Object.values(byClient).sort((a, b) =>
        order[a.level] - order[b.level] ||
        (b.daysSinceContact ?? 9999) - (a.daysSinceContact ?? 9999)
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const overdue = clients.filter(c => c.level === 'overdue').length;
  const due     = clients.filter(c => c.level === 'due').length;

  return { clients, loading, overdue, due, refresh: load };
}
