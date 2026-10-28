/** Shared bits of the progress screens: status chips, dates, process chips. */
import { DEPT_LABELS } from '../../../../lib/pipeline';
import type { AutoStatus } from '../../../../lib/progress';
import type { HuntProgress } from '../../../../lib/hooks/useWorkshopProgress';

export const STATUS_CHIP: Record<AutoStatus, { label: string; cls: string }> = {
  behind:   { label: 'Behind',             cls: 'bg-red-900/60 text-red-200 border-red-700' },
  due_soon: { label: 'Milestone due soon', cls: 'bg-amber-900/60 text-amber-200 border-amber-700' },
  on_track: { label: 'On track',           cls: 'bg-green-900/60 text-green-200 border-green-700' },
  finished: { label: 'All milestones met', cls: 'bg-sky-900/60 text-sky-200 border-sky-700' },
  no_clock: { label: 'No payment date',    cls: 'bg-slate-700 text-slate-200 border-slate-500' },
};
export const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const deptLabel = (d: string) => DEPT_LABELS[d] ?? d.replace(/_/g, ' ');
export const shortMilestone = (label: string) => label.replace(/^Milestone (\d)\s*[—-]\s*/, 'M$1 · ');
export const daysText = (n: number) => n < 0 ? `${-n} day${n === -1 ? '' : 's'} overdue` : n === 0 ? 'due today' : `in ${n} day${n === 1 ? '' : 's'}`;

/** "Tannery ×5 · Mounting ×2" for the trophies that are being worked on. */
export function processChips(h: HuntProgress): { dept: string; n: number; behind: number }[] {
  const m = new Map<string, { dept: string; n: number; behind: number }>();
  for (const a of h.animals) {
    if (a.kind !== 'working') continue;
    const e = m.get(a.dept) ?? { dept: a.dept, n: 0, behind: 0 };
    e.n++; if (a.behind) e.behind++; m.set(a.dept, e);
  }
  return [...m.values()];
}
