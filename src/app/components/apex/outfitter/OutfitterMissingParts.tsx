/** OutfitterMissingParts — parts of an animal that did not arrive at the workshop. Always red until they arrive. The outfitter gives a date (a plan) and is reminded until the parts are received. */
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useLiveRefresh } from '../../../../lib/liveRefresh';

interface F { id: string; hunt_id: string; doc_id: string; client: string; species: string | null; parts: string; opened_at: string; plan_date: string | null; plan_note: string | null; plan_at: string | null; reminders: number }
const day = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);

export function OutfitterMissingParts() {
  const [items, setItems] = useState<F[]>([]);
  const [date, setDate] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { const { data } = await (supabase as any).rpc('outfitter_part_followups'); setItems(Array.isArray(data) ? data : []); }, []);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);
  useLiveRefresh(['part_followups'], load);
  if (items.length === 0) return null;

  async function save(f: F) {
    if (!date[f.id]) { toast.error('Choose the date the parts will arrive.'); return; }
    setBusy(f.id);
    const { error } = await (supabase as any).rpc('outfitter_set_part_plan', { p_followup: f.id, p_date: date[f.id], p_note: note[f.id] ?? null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Thank you. The workshop can see your plan. We will keep reminding you until the parts have arrived.');
    setEditing(null); load();
  }

  return (
    <section className="space-y-3">
      {items.map(f => {
        const overdue = !!f.plan_date && f.plan_date < today();
        const planning = !f.plan_date || editing === f.id;
        return (
          <div key={f.id} className="rounded-2xl border-2 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
            <p className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />Action needed: parts did not arrive</p>
            <p className="text-slate-800 dark:text-slate-200"><strong>{f.species ?? 'Trophy'}</strong> · {f.client}</p>
            <p className="text-sm text-slate-800 dark:text-slate-200"><strong>Missing:</strong> {f.parts}. The workshop told you on {day(f.opened_at)}.</p>
            {f.plan_date && !overdue && editing !== f.id && (
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"><CalendarClock className="w-4 h-4" />You told us it will arrive by {day(f.plan_date)}{f.plan_note ? ` (${f.plan_note})` : ''}. This stays red until we have it.</p>
            )}
            {overdue && editing !== f.id && <p className="text-sm font-bold text-red-700 dark:text-red-300">You said it would arrive by {day(f.plan_date!)}. That date has passed. Please give us a new date.</p>}
            {planning ? (
              <div className="space-y-2 rounded-xl border border-slate-400 p-3 bg-white/60 dark:bg-slate-900/40">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">When will the missing parts arrive at the workshop?
                  <input type="date" min={today()} value={date[f.id] ?? ''} onChange={e => setDate(d => ({ ...d, [f.id]: e.target.value }))}
                    className="mt-1 w-full min-h-12 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-base text-slate-900 dark:text-slate-100" />
                </label>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">How will they come? <span className="font-normal">(optional)</span>
                  <input value={note[f.id] ?? ''} onChange={e => setNote(n => ({ ...n, [f.id]: e.target.value }))} placeholder="For example: with the courier on Tuesday"
                    className="mt-1 w-full min-h-12 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-base text-slate-900 dark:text-slate-100" />
                </label>
                <button disabled={busy === f.id} onClick={() => save(f)} className="w-full min-h-14 rounded-xl bg-red-600 hover:bg-red-700 text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {busy === f.id ? <Loader2 className="w-5 h-5 animate-spin" /> : null}Tell the workshop when it will arrive
                </button>
              </div>
            ) : (
              <button className="min-h-11 px-4 rounded-xl border-2 border-slate-500 font-semibold text-slate-900 dark:text-slate-100" onClick={() => { setEditing(f.id); setDate(d => ({ ...d, [f.id]: f.plan_date ?? '' })); }}>Change the date</button>
            )}
          </div>
        );
      })}
    </section>
  );
}
