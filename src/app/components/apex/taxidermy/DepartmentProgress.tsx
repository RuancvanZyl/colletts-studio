/**
 * DepartmentProgress — the workshop seen by department, not by person: how many trophies are in each stage right now,
 * and which of them are behind the milestones (counted from the day each client's invoice was paid).
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { useWorkshopProgress, type HuntProgress } from '../../../../lib/hooks/useWorkshopProgress';
import { ALL_DEPARTMENTS, DEPT_COLORS } from '../../../../lib/pipeline';
import { daysText, deptLabel, fmtDate, shortMilestone, STATUS_CHIP } from './progressUi';
import { plainError } from '../../../../lib/plainError';

export function DepartmentProgress({ onNavigate }: { onNavigate: (view: string, id?: string) => void }) {
  const { hunts, loading, error, refresh } = useWorkshopProgress();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const counts = { red: 0, yellow: 0, green: 0, no_clock: 0 };
  for (const h of hunts) { const k = h.a.auto === 'finished' ? 'green' : h.a.auto; counts[k]++; }

  type Row = { h: HuntProgress; n: number; behind: number };
  const byDept = new Map<string, Row[]>();
  for (const h of hunts) {
    const per = new Map<string, Row>();
    for (const a of h.animals) {
      if (a.kind !== 'working') continue;
      const r = per.get(a.dept) ?? { h, n: 0, behind: 0 }; r.n++; if (a.behind) r.behind++; per.set(a.dept, r);
    }
    for (const [d, r] of per) (byDept.get(d) ?? byDept.set(d, []).get(d)!).push(r);
  }
  const notArrived = hunts.map(h => ({ h, n: h.animals.filter(a => a.kind === 'not_arrived').length })).filter(r => r.n > 0);
  const onHold = hunts.map(h => ({ h, n: h.animals.filter(a => a.kind === 'on_hold').length })).filter(r => r.n > 0);
  const order = [...ALL_DEPARTMENTS, ...[...byDept.keys()].filter(d => !ALL_DEPARTMENTS.includes(d))];

  const rowsFor = (rows: Row[]) => [...rows].sort((a, b) => (b.behind - a.behind) || a.h.clientName.localeCompare(b.h.clientName));

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Departments</h1>
          <p className="text-base text-slate-400 mt-1">Where every trophy is right now, and whether it is where it should be. The clock for each client starts the day their invoice was paid.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300" aria-label="Refresh"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {error && <p className="rounded-xl border border-red-700 bg-red-950/30 text-red-200 p-3">{plainError(error)}</p>}
      {loading && hunts.length === 0 && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([['red', 'Red'], ['yellow', 'Yellow'], ['green', 'Green'], ['no_clock', 'No payment date']] as const).map(([k, l]) => (
          <button key={k} onClick={() => onNavigate('progress-check')} className={`rounded-2xl border p-3 text-center ${STATUS_CHIP[k].cls}`}>
            <span className="block text-3xl font-bold tabular-nums">{counts[k]}</span><span className="block text-sm">{l}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-500">Counts are clients. Tap one to go through them in the progress check.</p>

      <div className="space-y-3">
        {order.map(d => {
          const rows = rowsFor(byDept.get(d) ?? []);
          const n = rows.reduce((s, r) => s + r.n, 0); const behind = rows.reduce((s, r) => s + r.behind, 0);
          if (n === 0) return null;
          const isOpen = open[d] ?? behind > 0;
          return (
            <section key={d} className="rounded-2xl border border-slate-700 bg-[#111c26] overflow-hidden">
              <button onClick={() => setOpen(o => ({ ...o, [d]: !isOpen }))} className="w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left">
                <span className={`w-3 h-3 rounded-full ${DEPT_COLORS[d] ?? 'bg-slate-500'}`} />
                <span className="flex-1"><span className="block text-xl font-bold text-slate-100">{deptLabel(d)}</span><span className="block text-sm text-slate-400">{n} {n === 1 ? 'trophy' : 'trophies'} · {rows.length} client{rows.length === 1 ? '' : 's'}</span></span>
                {behind > 0 ? <span className="rounded-full border border-red-700 bg-red-900/60 text-red-200 px-3 py-1 text-sm font-bold">{behind} behind</span> : <span className="rounded-full border border-green-700 bg-green-900/40 text-green-200 px-3 py-1 text-sm font-semibold">On time</span>}
                {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {isOpen && (
                <ul className="divide-y divide-slate-800 border-t border-slate-800">
                  {rows.map(r => {
                    const chip = STATUS_CHIP[r.h.a.auto]; const nx = r.h.a.next;
                    return (
                      <li key={r.h.huntId} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-semibold text-slate-100">{r.h.clientName} <span className="text-base font-normal text-slate-400">· {r.n} here{r.behind > 0 ? `, ${r.behind} behind` : ''}</span></p>
                          <p className="text-sm text-slate-400">{nx ? `${shortMilestone(nx.label)} due ${fmtDate(nx.due)} (${daysText(nx.daysLeft)})` : r.h.a.auto === 'no_clock' ? 'The invoice payment date is not recorded, so there is no clock' : 'All milestones met'}</p>
                        </div>
                        <span className={`hidden sm:inline rounded-full border px-2.5 py-1 text-xs font-bold ${chip.cls}`}>{chip.label}</span>
                        <button onClick={() => onNavigate('progress-check', r.h.huntId)} className="min-h-11 px-3 rounded-lg border border-slate-500 text-slate-100 text-sm font-semibold">Check</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
        {[{ title: 'Waiting for the trophy to arrive', rows: notArrived }, { title: 'On hold: waiting for the invoice to be paid', rows: onHold }].map(g => g.rows.length > 0 && (
          <section key={g.title} className="rounded-2xl border border-slate-700 bg-[#111c26] overflow-hidden">
            <p className="px-4 py-3 text-lg font-bold text-slate-100">{g.title} <span className="text-sm font-normal text-slate-400">· {g.rows.reduce((s, r) => s + r.n, 0)} trophies</span></p>
            <ul className="divide-y divide-slate-800 border-t border-slate-800">{g.rows.map(r => <li key={r.h.huntId} className="px-4 py-2.5 text-slate-200">{r.h.clientName} <span className="text-slate-400">· {r.n}</span></li>)}</ul>
          </section>
        ))}
        {!loading && hunts.length === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">No active orders yet.</p>}
      </div>
    </div>
  );
}
