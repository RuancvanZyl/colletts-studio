/**
 * ClientJobCards — every job card for one client in a single table, with what has to happen next.
 * Open a client, see each trophy: where it is, who has it, when it is due, how far the checklist is,
 * and the very next thing to do.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, CheckCircle2, ArrowRight, Eye, EyeOff, Play, Camera } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useClientHunts } from '../../../../lib/hooks/useClientHunts';
import { PRIORITY_META, dueState, useChecklists } from '../../../../lib/hooks/useTaskFlow';
import { DEPT_LABELS, getPipeline, getNextDepartment } from '../../../../lib/pipeline';
import { PrintButton } from '../shared/PrintButton';
import { JobPhotosDialog } from '../shared/TrophyPhotos';
import { printJobCards } from '../../../../lib/print';

interface Row {
  id: string; huntId: string; huntRef: string; huntYear: string; title: string; species: string; mount: string; instructions: string;
  dept: string; status: string; assignedTo: string | null; priority: number; dueDate: string | null; priorityNote: string;
  openedAt: string | null; startedAt: string | null; huntStatus: string;
}

const ago = (iso: string | null) => {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

export function ClientJobCards({ clientId }: { clientId: string }) {
  const { hunts, loading } = useClientHunts(clientId);
  const [staff, setStaff] = useState<Record<string, string>>({});
  const [showDone, setShowDone] = useState(false);
  const [photoRow, setPhotoRow] = useState<Row | null>(null);

  useEffect(() => {
    (supabase as any).from('staff_profiles').select('id, full_name').then(({ data }: any) => {
      const m: Record<string, string> = {};
      (data ?? []).forEach((s: any) => { m[s.id] = s.full_name; });
      setStaff(m);
    });
  }, []);

  const rows: Row[] = useMemo(() => hunts.flatMap(h =>
    h.documents.filter(d => d.doc_type === 'job_card').map((d: any) => ({
      id: d.id, huntId: h.id, huntRef: h.ref_number, huntYear: h.year, title: d.title ?? '',
      species: d.form_data?.species ?? '', mount: d.form_data?.mount_type ?? '', instructions: d.form_data?.instructions ?? '',
      dept: d.current_department ?? 'receiving', status: d.status ?? 'in_progress',
      assignedTo: d.assigned_to ?? null, priority: d.priority ?? 3, dueDate: d.due_date ?? null, priorityNote: d.priority_note ?? '',
      openedAt: d.opened_at ?? null, startedAt: d.started_at ?? null, huntStatus: h.status,
    }))), [hunts]);

  const finished = (r: Row) => r.status === 'completed' || r.status === 'complete' || r.dept === 'done';
  const live = rows.filter(r => !finished(r));
  const shown = (showDone ? rows : live).slice().sort((a, b) =>
    Number(finished(a)) - Number(finished(b)) || a.priority - b.priority ||
    (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.huntRef.localeCompare(b.huntRef) || a.species.localeCompare(b.species));

  const checklist = useChecklists(live.map(r => r.dept), live.map(r => r.id));

  function nextAction(r: Row): { text: string; tone: 'todo' | 'ready' | 'wait' | 'done' } {
    if (finished(r)) return { text: 'Finished', tone: 'done' };
    if (r.status === 'pending_payment') return { text: 'Waiting for payment before work starts', tone: 'wait' };
    if (r.status === 'awaiting_arrival') return { text: 'Waiting for the trophy to arrive', tone: 'wait' };
    if (r.mount === 'Pending Instructions') return { text: 'Get the client\'s instructions for this item', tone: 'wait' };
    const items = checklist.forDept(r.dept);
    const left = items.filter(i => !checklist.progress[`${r.id}:${i.id}`]?.done);
    if (left.length > 0) return { text: `${DEPT_LABELS[r.dept] ?? r.dept}: ${left[0].label}`, tone: 'todo' };
    const next = getNextDepartment(r.mount, r.dept);
    if (items.length > 0 && next) return { text: `Checklist complete — move on to ${DEPT_LABELS[next] ?? next}`, tone: 'ready' };
    return { text: next ? `Finish ${DEPT_LABELS[r.dept] ?? r.dept}, then ${DEPT_LABELS[next] ?? next}` : `Finish ${DEPT_LABELS[r.dept] ?? r.dept} and close the job`, tone: 'todo' };
  }

  if (loading) return <div className="flex items-center gap-2 text-xs text-slate-400 py-6"><Loader2 className="w-4 h-4 animate-spin" />Loading job cards…</div>;
  if (rows.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">No job cards for this client yet.</p>;

  const counts = {
    live: live.length,
    notStarted: live.filter(r => !r.startedAt).length,
    overdue: live.filter(r => r.dueDate && r.dueDate < new Date().toISOString().slice(0, 10)).length,
    unassigned: live.filter(r => !r.assignedTo).length,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">{counts.live} in production</span>
        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{counts.notStarted} not started</span>
        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{counts.unassigned} not assigned</span>
        {counts.overdue > 0 && <span className="px-2.5 py-1 rounded-full bg-red-600 text-white font-semibold">{counts.overdue} overdue</span>}
        <span className="ml-auto flex items-center gap-3">
          {rows.length > live.length && (
            <button onClick={() => setShowDone(v => !v)} className="text-[#0073ea] hover:underline">{showDone ? 'Hide finished' : `Show finished (${rows.length - live.length})`}</button>
          )}
          {live.length > 0 && <PrintButton compact label="Print job cards" onPrint={() => printJobCards({ docIds: live.map(r => r.id) })} />}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm min-w-[880px]">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left font-semibold px-3 py-2">Trophy</th>
              <th className="text-left font-semibold px-3 py-2">Where it is</th>
              <th className="text-left font-semibold px-3 py-2">Who · status</th>
              <th className="text-left font-semibold px-3 py-2">Priority · due</th>
              <th className="text-left font-semibold px-3 py-2">Checklist</th>
              <th className="text-left font-semibold px-3 py-2">What needs doing next</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {shown.map(r => {
              const done = finished(r);
              const pipeline = getPipeline(r.mount);
              const idx = pipeline.indexOf(r.dept);
              const items = checklist.forDept(r.dept);
              const ticked = items.filter(i => checklist.progress[`${r.id}:${i.id}`]?.done).length;
              const due = dueState(r.dueDate);
              const act = nextAction(r);
              return (
                <tr key={r.id} className={`align-top ${done ? 'opacity-50' : ''} ${r.priority === 1 && !done ? 'bg-red-50/60 dark:bg-red-950/20' : ''}`}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{r.species || r.title}</p>
                    <p className="text-xs text-slate-500">{r.mount}</p>
                    <p className="text-[11px] font-mono text-slate-400">{r.huntRef} · {r.huntYear}</p>
                    <button type="button" onClick={() => setPhotoRow(r)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0073ea] hover:underline"><Camera className="w-3 h-3" />Photos</button>
                    {r.instructions && <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 max-w-[220px] line-clamp-2" title={r.instructions}>{r.instructions}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0073ea]/10 text-[#0073ea]">{done ? 'Done' : (DEPT_LABELS[r.dept] ?? r.dept)}</span>
                    {!done && idx >= 0 && <p className="text-[11px] text-slate-400 mt-1">Stage {idx + 1} of {pipeline.length}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <p className="text-slate-700 dark:text-slate-300">{r.assignedTo ? (staff[r.assignedTo] ?? 'Staff member') : <span className="text-amber-600">Not assigned</span>}</p>
                    {!done && (r.startedAt
                      ? <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-semibold"><Play className="w-3 h-3" />Started {ago(r.startedAt)}</span>
                      : r.openedAt
                        ? <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-500 text-black font-semibold"><Eye className="w-3 h-3" />Opened {ago(r.openedAt)}</span>
                        : r.assignedTo
                          ? <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-500 text-white font-semibold"><EyeOff className="w-3 h-3" />Not opened</span>
                          : null)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {!done && <span className={`inline-block font-bold px-2 py-0.5 rounded-full ${PRIORITY_META[r.priority]?.chip}`}>{PRIORITY_META[r.priority]?.label}</span>}
                    {!done && due && <p className={`mt-1 inline-block font-semibold px-2 py-0.5 rounded-full ${due.className}`}>{due.label}</p>}
                    {!done && r.priorityNote && <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 max-w-[160px]">⚡ {r.priorityNote}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    {done ? null : items.length === 0 ? <span className="text-xs text-slate-400">No checklist</span> : (
                      <div className="w-28">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold">{ticked}/{items.length}</span>
                          <span className={ticked === items.length ? 'text-emerald-600 font-bold' : 'text-amber-600'}>{ticked === items.length ? 'Complete' : 'Not complete'}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className={`h-full ${ticked === items.length ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${(ticked / items.length) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs max-w-[260px]">
                    {act.tone === 'done' ? <span className="text-slate-400">Finished</span>
                      : act.tone === 'ready' ? <span className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />{act.text}</span>
                      : act.tone === 'wait' ? <span className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 font-semibold"><ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />{act.text}</span>
                      : <span className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200"><ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0073ea]" />{act.text}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {photoRow && (
        <JobPhotosDialog open onClose={() => setPhotoRow(null)} docId={photoRow.id} huntId={photoRow.huntId} clientId={clientId}
          title={`${photoRow.species || photoRow.title} (${photoRow.huntRef})`}
          defaultKind={photoRow.dept === 'receiving' ? 'arrival' : (photoRow.dept === 'photos' || photoRow.dept === 'packing') ? 'finished' : 'progress'} />
      )}
    </div>
  );
}
