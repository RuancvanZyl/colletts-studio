/**
 * useHunterHunts — fetches a hunter's real hunt + job card data from the new schema.
 * Looks up client by auth_user_id, then loads client_hunts + hunt_documents.
 * Used by the Hunter Portal's tracking views.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { getPipeline, DEPT_LABELS, STALL_HOURS } from '../pipeline';

export interface HunterTrophy {
  docId:       string;
  huntId:      string;
  huntYear:    number;
  operator:    string | null;
  species:     string;
  mountType:   string;
  tagNumber:   string;
  quantity:    number;
  instructions: string;
  status:      string;   // pending_payment | in_progress | completed | flagged
  currentDept: string;
  pipeline:    string[];
  stagesDone:  number;   // how many pipeline stages completed
  pct:         number;
  lastMovedAt: string | null;
  stageHistory: { dept: string; completedAt: string; completedBy: string }[];
  isStalled:   boolean;
}

export interface HunterHunt {
  id:          string;
  year:        number;
  operator:    string | null;
  farm:        string | null;
  clientType:  string;
  processType: string;
  createdAt:   string;
  trophies:    HunterTrophy[];
  totalCount:  number;
  doneCount:   number;
  pct:         number;
}

export function useHunterHunts() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [hunts,    setHunts]    = useState<HunterHunt[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Resolve client record from auth user
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from('clients')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      setClientId(data?.id ?? null);
    })();
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);

    // Step 1: get this client's hunt IDs
    const { data: huntRows } = await (supabase as any)
      .from('client_hunts')
      .select('id, year, operator, farm, client_type, process_type, created_at')
      .eq('client_id', clientId)
      .order('year', { ascending: false });

    if (!huntRows || huntRows.length === 0) { setHunts([]); setLoading(false); return; }

    const huntIds = huntRows.map((h: any) => h.id);

    // Step 2: get job cards for those hunts
    const { data: docs } = await (supabase as any)
      .from('hunt_documents')
      .select('id, title, status, current_department, last_moved_at, form_data, hunt_id')
      .eq('doc_type', 'job_card')
      .in('hunt_id', huntIds)
      .order('created_at', { ascending: false });

    // Build a lookup map of hunt metadata
    const huntMeta: Record<string, any> = {};
    for (const h of huntRows) huntMeta[h.id] = h;

    if (!docs) { setLoading(false); return; }

    // Group by hunt
    const huntMap: Record<string, HunterHunt> = {};
    for (const d of docs) {
      const h = huntMeta[d.hunt_id];
      if (!h) continue;
      if (!huntMap[h.id]) {
        huntMap[h.id] = {
          id:          h.id,
          year:        h.year,
          operator:    h.operator ?? null,
          farm:        h.farm ?? null,
          clientType:  h.client_type ?? 'export',
          processType: h.process_type ?? 'taxidermy',
          createdAt:   h.created_at,
          trophies:    [],
          totalCount:  0,
          doneCount:   0,
          pct:         0,
        };
      }

      const fd           = d.form_data ?? {};
      const mountType    = fd.mount_type ?? 'Shoulder Mount';
      const pipeline     = getPipeline(mountType);
      const currIdx      = pipeline.indexOf(d.current_department);
      const stagesDone   = d.status === 'completed' ? pipeline.length : Math.max(currIdx, 0);
      const pct          = Math.round((stagesDone / pipeline.length) * 100);
      const stallThresh  = STALL_HOURS[d.current_department] ?? 72;
      const hoursStalled = d.last_moved_at
        ? (Date.now() - new Date(d.last_moved_at).getTime()) / 3_600_000
        : 0;

      huntMap[h.id].trophies.push({
        docId:        d.id,
        huntId:       h.id,
        huntYear:     h.year,
        operator:     h.operator ?? null,
        species:      fd.species ?? 'Unknown',
        mountType,
        tagNumber:    fd.tag_number ?? '',
        quantity:     fd.quantity ?? 1,
        instructions: fd.instructions ?? '',
        status:       d.status,
        currentDept:  d.current_department,
        pipeline,
        stagesDone,
        pct,
        lastMovedAt:  d.last_moved_at ?? null,
        stageHistory: (fd.stage_history ?? []).map((s: any) => ({
          dept:        s.dept,
          completedAt: s.completedAt,
          completedBy: s.completedBy,
        })),
        isStalled: d.status === 'in_progress' && hoursStalled > stallThresh * 2,
      });
    }

    const result = Object.values(huntMap).map(h => {
      const done = h.trophies.filter(t => t.status === 'completed').length;
      return {
        ...h,
        totalCount: h.trophies.length,
        doneCount:  done,
        pct:        h.trophies.length ? Math.round((done / h.trophies.length) * 100) : 0,
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setHunts(result);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return { hunts, loading, clientId, refresh: load };
}
