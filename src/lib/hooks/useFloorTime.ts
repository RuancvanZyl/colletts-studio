import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { DEPT_LABELS } from '../pipeline';

interface DeptStat {
  dept: string;
  label: string;
  avgMins: number;
  count: number;
}

interface StaffStat {
  name: string;
  count: number;
  avgMins: number;
}

interface SlowestTrophy {
  docId: string;
  species: string;
  clientNumber: string;
  dept: string;
  ageMins: number;
}

interface FloorTimeData {
  byDept: DeptStat[];
  byStaff: StaffStat[];
  slowest: SlowestTrophy[];
}

export function useFloorTime() {
  const [data, setData]       = useState<FloorTimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // ── 1. Completed stages this month (for avg time + staff throughput) ──
    // trophy_stage_history has: hunt_doc_id, department, completed_by_name, created_at
    // We need pairs: each row's created_at is when THIS stage ended.
    // To get time spent, we compare consecutive rows per hunt_doc_id.
    const { data: history } = await (supabase as any)
      .from('trophy_stage_history')
      .select('hunt_doc_id, department, completed_by_name, created_at')
      .order('hunt_doc_id', { ascending: true })
      .order('created_at', { ascending: true });

    // ── 2. Active (in_progress) job cards to find slowest ──
    const { data: activeDocs } = await (supabase as any)
      .from('hunt_documents')
      .select('id, hunt_id, form_data, current_department, updated_at')
      .eq('doc_type', 'job_card')
      .eq('status', 'in_progress');

    // ── 3. Client numbers for slowest ──
    const huntIds = [...new Set((activeDocs ?? []).map((d: any) => d.hunt_id))];
    let clientNumberMap: Record<string, string> = {};
    if (huntIds.length > 0) {
      const { data: hunts } = await (supabase as any)
        .from('client_hunts').select('id, client_id').in('id', huntIds);
      const clientIds = [...new Set((hunts ?? []).map((h: any) => h.client_id))];
      if (clientIds.length > 0) {
        const { data: clients } = await (supabase as any)
          .from('clients').select('id, client_number').in('id', clientIds);
        const huntToClient: Record<string, string> = {};
        for (const h of hunts ?? []) huntToClient[h.id] = h.client_id;
        const cMap: Record<string, string> = {};
        for (const c of clients ?? []) cMap[c.id] = c.client_number;
        for (const d of activeDocs ?? []) {
          const cid = huntToClient[d.hunt_id];
          if (cid) clientNumberMap[d.id] = cMap[cid] ?? '—';
        }
      }
    }

    // ── Compute per-stage durations from history pairs ──
    const rows = history ?? [];
    interface DurationRow { dept: string; staff: string; mins: number; completedAt: string }
    const durations: DurationRow[] = [];

    // Group by hunt_doc_id
    const byDoc: Record<string, typeof rows> = {};
    for (const r of rows) {
      if (!byDoc[r.hunt_doc_id]) byDoc[r.hunt_doc_id] = [];
      byDoc[r.hunt_doc_id].push(r);
    }

    for (const docRows of Object.values(byDoc)) {
      for (let i = 0; i < docRows.length; i++) {
        const curr = docRows[i];
        const prev = docRows[i - 1];
        // Time spent = previous stage end → this stage end
        // If no prev, we can't compute accurately — skip
        if (!prev) continue;
        const mins = (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / 60000;
        if (mins <= 0) continue;
        durations.push({
          dept:        curr.department,
          staff:       curr.completed_by_name ?? 'Unknown',
          mins,
          completedAt: curr.created_at,
        });
      }
    }

    // Filter to this month for staff stats
    const thisMonthDurations = durations.filter(d => new Date(d.completedAt) >= monthStart);

    // ── byDept ──
    const deptMap: Record<string, { total: number; count: number }> = {};
    for (const d of durations) {
      if (!deptMap[d.dept]) deptMap[d.dept] = { total: 0, count: 0 };
      deptMap[d.dept].total += d.mins;
      deptMap[d.dept].count += 1;
    }
    const byDept: DeptStat[] = Object.entries(deptMap)
      .map(([dept, v]) => ({
        dept,
        label: (DEPT_LABELS as any)[dept] ?? dept.replace(/_/g, ' '),
        avgMins: v.total / v.count,
        count: v.count,
      }))
      .sort((a, b) => b.avgMins - a.avgMins);

    // ── byStaff (this month) ──
    const staffMap: Record<string, { total: number; count: number }> = {};
    for (const d of thisMonthDurations) {
      if (!staffMap[d.staff]) staffMap[d.staff] = { total: 0, count: 0 };
      staffMap[d.staff].total += d.mins;
      staffMap[d.staff].count += 1;
    }
    const byStaff: StaffStat[] = Object.entries(staffMap)
      .map(([name, v]) => ({ name, count: v.count, avgMins: v.total / v.count }))
      .sort((a, b) => b.count - a.count);

    // ── Slowest active trophies (by updated_at age) ──
    const now = Date.now();
    const slowest: SlowestTrophy[] = (activeDocs ?? [])
      .map((d: any) => ({
        docId:        d.id,
        species:      d.form_data?.species ?? '—',
        clientNumber: clientNumberMap[d.id] ?? '—',
        dept:         d.current_department ?? '—',
        ageMins:      (now - new Date(d.updated_at).getTime()) / 60000,
      }))
      .sort((a: SlowestTrophy, b: SlowestTrophy) => b.ageMins - a.ageMins)
      .slice(0, 5);

    setData({ byDept, byStaff, slowest });
    setLoading(false);
  }

  return { data, loading, refresh: load };
}
