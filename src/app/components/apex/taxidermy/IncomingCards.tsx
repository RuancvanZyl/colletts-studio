/**
 * IncomingCards — job cards that have arrived in a department and wait for its lead to accept them.
 * Accepting is stamped with the lead's name and the time. Until then the card cannot be completed.
 * A card that has waited more than 24 hours is flagged.
 */
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { deptLabel } from './progressUi';
import { SoakReviewList } from './SoakReviewList';

interface Incoming { doc_id: string; hunt_id: string; client: string | null; species: string | null; mount: string | null; department: string; sent_at: string; hours_waiting: number }
const LATE_HOURS = 24;
const ago = (h: number) => h < 1 ? 'just now' : h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ${h % 24} h ago`;

export function IncomingCards({ compact = false, onChanged }: { compact?: boolean; onChanged?: () => void }) {
  const [rows, setRows] = useState<Incoming[] | null>(null);
  const [reviews, setReviews] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { const { data } = await (supabase as any).rpc('my_incoming_cards'); setRows(data ?? []); }, []);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  async function accept(ids: string[], key: string) {
    setBusy(key);
    let failed = 0;
    for (const id of ids) {
      const { error } = await (supabase as any).rpc('job_accept', { p_doc: id });
      if (error) { failed++; toast.error(error.message); }
    }
    setBusy(null);
    if (failed < ids.length) { toast.success(ids.length === 1 ? 'Accepted. It is now yours.' : `Accepted ${ids.length - failed} cards`); onChanged?.(); }
    load();
  }

  if (!rows) return compact ? null : <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>;
  if (rows.length === 0 && reviews === 0 && compact) return null;

  const depts = [...new Set(rows.map(r => r.department))];
  return (
    <div className={compact ? 'space-y-3' : 'max-w-3xl space-y-4'}>
      {!compact && (
        <div className="flex items-start justify-between gap-3">
          <div><h1 className="text-3xl font-bold text-slate-100">Incoming</h1><p className="text-base text-slate-400 mt-1">Job cards that have arrived in your department. Accept each one to take responsibility for it. It cannot be completed until it is accepted.</p></div>
          <button onClick={load} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300" aria-label="Refresh"><RefreshCw className="w-5 h-5" /></button>
        </div>
      )}
      <SoakReviewList onCount={setReviews} onChanged={onChanged} />
      {rows.length === 0 && reviews === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">Nothing is waiting for you to accept.</p>}
      {depts.map(d => {
        const list = rows.filter(r => r.department === d);
        const late = list.filter(r => r.hours_waiting >= LATE_HOURS).length;
        return (
          <section key={d} className={`rounded-2xl border-2 ${late ? 'border-red-600' : 'border-sky-600'} bg-[#111c26] overflow-hidden`}>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1"><p className="text-xl font-bold text-slate-100">{deptLabel(d)} · {list.length} waiting</p>{late > 0 && <p className="text-sm font-semibold text-red-300">{late} waiting more than 24 hours</p>}</div>
              {list.length > 1 && <button disabled={busy === d} onClick={() => accept(list.map(x => x.doc_id), d)} className="min-h-12 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50 flex items-center gap-2">{busy === d && <Loader2 className="w-4 h-4 animate-spin" />}Accept all {list.length}</button>}
            </div>
            <ul className="divide-y divide-slate-800 border-t border-slate-800">
              {list.map(r => (
                <li key={r.doc_id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-slate-100">{r.species ?? 'Trophy'}{r.mount ? <span className="text-base font-normal text-slate-400"> · {r.mount}</span> : null}</p>
                    <p className="text-sm text-slate-400">{r.client ?? 'Client'} · arrived {ago(r.hours_waiting)}{r.hours_waiting >= LATE_HOURS ? <span className="text-red-300 font-semibold"> · over 24 hours</span> : null}</p>
                  </div>
                  <button disabled={busy === r.doc_id} onClick={() => accept([r.doc_id], r.doc_id)} className="min-h-12 px-5 rounded-xl border-2 border-green-500 text-green-200 font-bold hover:bg-green-950/40 disabled:opacity-50 flex items-center gap-2">{busy === r.doc_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Accept</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
