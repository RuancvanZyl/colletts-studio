/**
 * useWorkshopStats — real-time KPIs from hunt_documents + trophy_stage_history.
 * Replaces useDashboard for the main workshop overview.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { STALL_HOURS, DEPT_LABELS } from '../pipeline';

export interface DeptCount { dept: string; label: string; count: number; stalled: number }

export interface WorkshopStats {
  totalActive:        number;
  pendingPayment:     number;
  completedThisMonth: number;
  stalledRed:         number;   // > 2× threshold
  stalledYellow:      number;   // > threshold
  byDept:             DeptCount[];
  recentActivity:     { title: string; dept: string; clientName: string; movedAt: string }[];
}

export function useWorkshopStats() {
  const [stats,   setStats]   = useState<WorkshopStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    // Active job cards
    const { data: active } = await (supabase as any)
      .from('hunt_documents')
      .select('id, current_department, last_moved_at, status')
      .eq('doc_type', 'job_card')
      .eq('status', 'in_progress');

    // Pending payment
    const { count: pendingCount } = await (supabase as any)
      .from('hunt_documents')
      .select('id', { count: 'exact', head: true })
      .eq('doc_type', 'job_card')
      .eq('status', 'pending_payment');

    // Completed this month
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const { count: completedCount } = await (supabase as any)
      .from('hunt_documents')
      .select('id', { count: 'exact', head: true })
      .eq('doc_type', 'job_card')
      .eq('status', 'completed')
      .gte('last_moved_at', monthStart.toISOString());

    // Recent stage history (activity feed) — join in two steps to avoid nested join issues
    const { data: history } = await (supabase as any)
      .from('trophy_stage_history')
      .select('department, completed_at, completed_by_name, hunt_doc_id')
      .order('completed_at', { ascending: false })
      .limit(15);

    // Resolve document titles + client names for activity feed
    const docIds = [...new Set((history ?? []).map((h: any) => h.hunt_doc_id).filter(Boolean))];
    const docMeta: Record<string, { title: string; clientName: string }> = {};
    if (docIds.length > 0) {
      const { data: docRows } = await (supabase as any)
        .from('hunt_documents')
        .select('id, title, hunt_id')
        .in('id', docIds);
      const huntIds2 = [...new Set((docRows ?? []).map((d: any) => d.hunt_id).filter(Boolean))];
      const huntClientMap: Record<string, string> = {};
      if (huntIds2.length > 0) {
        const { data: huntRows } = await (supabase as any)
          .from('client_hunts')
          .select('id, clients!inner(full_name)')
          .in('id', huntIds2);
        for (const hr of huntRows ?? []) {
          huntClientMap[hr.id] = hr.clients?.full_name ?? '';
        }
      }
      for (const dr of docRows ?? []) {
        docMeta[dr.id] = { title: dr.title, clientName: huntClientMap[dr.hunt_id] ?? '' };
      }
    }

    // Build stats
    const docs = active ?? [];
    const now  = Date.now();

    // Per-dept counts + stall
    const deptMap: Record<string, { count: number; stalled: number }> = {};
    let stalledRed = 0, stalledYellow = 0;

    for (const doc of docs) {
      const dept = doc.current_department;
      if (!deptMap[dept]) deptMap[dept] = { count: 0, stalled: 0 };
      deptMap[dept].count++;

      if (doc.last_moved_at) {
        const hrs       = (now - new Date(doc.last_moved_at).getTime()) / 3_600_000;
        const threshold = STALL_HOURS[dept] ?? 72;
        if (hrs > threshold * 2)  { deptMap[dept].stalled++; stalledRed++; }
        else if (hrs > threshold)  { stalledYellow++; }
      }
    }

    const byDept: DeptCount[] = Object.entries(deptMap)
      .map(([dept, v]) => ({ dept, label: DEPT_LABELS[dept] ?? dept, ...v }))
      .sort((a, b) => b.count - a.count);

    const recentActivity = (history ?? []).map((h: any) => ({
      title:      docMeta[h.hunt_doc_id]?.title ?? 'Trophy',
      dept:       h.department,
      clientName: docMeta[h.hunt_doc_id]?.clientName ?? '',
      movedAt:    h.completed_at,
    }));

    setStats({
      totalActive:        docs.length,
      pendingPayment:     pendingCount ?? 0,
      completedThisMonth: completedCount ?? 0,
      stalledRed,
      stalledYellow,
      byDept,
      recentActivity,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return { stats, loading, refresh: load };
}
