/**
 * Task flow — priority, due dates, opened/started tracking and the per-department
 * checklist that must be complete before a job card can leave a department.
 * All writes go through database functions (migration 041) so the rules are enforced server-side.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export const PRIORITY_META: Record<number, { label: string; chip: string; rank: number }> = {
  1: { label: 'Urgent', chip: 'bg-red-600 text-white',    rank: 1 },
  2: { label: 'High',   chip: 'bg-orange-500 text-white', rank: 2 },
  3: { label: 'Normal', chip: 'bg-sky-600/80 text-white', rank: 3 },
  4: { label: 'Low',    chip: 'bg-slate-500 text-white',  rank: 4 },
};

export interface ChecklistItem { id: string; dept_key: string; label: string; requires_photo: boolean; sort_order: number }
export interface ChecklistProgress { item_id: string; job_doc_id: string; done: boolean; done_by_name: string | null; done_at: string }

export function dueState(due: string | null | undefined): { label: string; className: string } | null {
  if (!due) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due + 'T00:00:00');
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  const text = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  if (days < 0)  return { label: `Overdue ${-days}d · ${text}`, className: 'bg-red-600 text-white' };
  if (days === 0) return { label: `Due today`,                  className: 'bg-red-500/90 text-white' };
  if (days <= 2) return { label: `Due ${text} (${days}d)`,      className: 'bg-amber-500 text-black' };
  return { label: `Due ${text}`, className: 'bg-slate-600/60 text-slate-100' };
}

export function taskStatus(t: { assignedTo?: string | null; openedAt?: string | null; startedAt?: string | null }): { label: string; className: string } {
  if (t.startedAt) return { label: 'Started', className: 'bg-emerald-600 text-white' };
  if (t.openedAt)  return { label: 'Opened — not started', className: 'bg-amber-500 text-black' };
  if (t.assignedTo) return { label: 'Not opened yet', className: 'bg-slate-500 text-white' };
  return { label: 'Unassigned', className: 'bg-slate-700 text-slate-200' };
}

/** Checklist items for the given departments + progress for the given job cards */
export function useChecklists(depts: string[], docIds: string[]) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<Record<string, ChecklistProgress>>({}); // key = `${doc}:${item}`
  const deptKey = [...new Set(depts)].sort().join(',');
  const docKey = docIds.join(',');

  const load = useCallback(async () => {
    if (!deptKey) { setItems([]); return; }
    const { data } = await (supabase as any).from('department_checklist_items')
      .select('id, dept_key, label, requires_photo, sort_order')
      .in('dept_key', deptKey.split(',')).eq('is_active', true).order('sort_order');
    setItems(data ?? []);
    if (docKey) {
      const rows: ChecklistProgress[] = [];
      const ids = docKey.split(',');
      for (let i = 0; i < ids.length; i += 150) {
        const { data: p } = await (supabase as any).from('job_checklist_progress')
          .select('item_id, job_doc_id, done, done_by_name, done_at').in('job_doc_id', ids.slice(i, i + 150));
        rows.push(...(p ?? []));
      }
      const map: Record<string, ChecklistProgress> = {};
      rows.forEach(r => { map[`${r.job_doc_id}:${r.item_id}`] = r; });
      setProgress(map);
    } else setProgress({});
  }, [deptKey, docKey]);

  useEffect(() => { load(); }, [load]);

  async function setDone(docId: string, itemId: string, done: boolean) {
    const { error } = await (supabase as any).rpc('job_check_item', { p_doc: docId, p_item: itemId, p_done: done, p_note: null });
    if (error) return { error: error.message as string };
    setProgress(prev => ({
      ...prev,
      [`${docId}:${itemId}`]: { item_id: itemId, job_doc_id: docId, done, done_by_name: 'You', done_at: new Date().toISOString() },
    }));
    return { error: null };
  }

  const forDept = (dept: string) => items.filter(i => i.dept_key === dept);
  const remaining = (docId: string, dept: string) =>
    forDept(dept).filter(i => !progress[`${docId}:${i.id}`]?.done).length;

  return { items, progress, forDept, remaining, setDone, reload: load };
}

export async function markJobOpened(docId: string) {
  await (supabase as any).rpc('job_mark_opened', { p_doc: docId });
}
export async function markJobStarted(docId: string) {
  return (supabase as any).rpc('job_mark_started', { p_doc: docId });
}
