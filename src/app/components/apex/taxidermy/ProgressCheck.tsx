/**
 * ProgressCheck — management goes through every client: their name, the process their trophies are in now, and where the
 * set milestones say they should be (counted from the day the invoice was paid). Then marks it On track or Behind.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { useWorkshopProgress, type HuntProgress } from '../../../../lib/hooks/useWorkshopProgress';
import { expectation, type AutoStatus } from '../../../../lib/progress';
import { ALL_DEPARTMENTS } from '../../../../lib/pipeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { daysText, deptLabel, fmtDate, processChips, shortMilestone, STATUS_CHIP } from './progressUi';

type Filter = 'all' | 'behind' | 'due_soon' | 'on_track' | 'no_clock' | 'unchecked';
const SIZE: Record<string, string> = { small: 'Small order', medium: 'Medium order', large: 'Large order' };
const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';

export function ProgressCheck({ initialHuntId, onNavigate }: { initialHuntId?: string; onNavigate: (view: string, id?: string) => void }) {
  const { profile } = useAuth();
  const canReview = ['admin', 'studio_manager'].includes(profile?.role ?? '');
  const { hunts, loading, error, refresh } = useWorkshopProgress();
  const [filter, setFilter] = useState<Filter>(initialHuntId ? 'all' : 'behind');
  const [search, setSearch] = useState('');
  const [behindFor, setBehindFor] = useState<HuntProgress | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (initialHuntId && !loading) focusRef.current?.scrollIntoView({ block: 'center' }); }, [initialHuntId, loading]);

  const sevenDays = 7 * 86_400_000;
  const unchecked = (h: HuntProgress) => !h.review || Date.now() - new Date(h.review.reviewed_at).getTime() > sevenDays;
  const counts: Record<Filter, number> = {
    all: hunts.length, behind: hunts.filter(h => h.a.auto === 'behind').length, due_soon: hunts.filter(h => h.a.auto === 'due_soon').length,
    on_track: hunts.filter(h => h.a.auto === 'on_track' || h.a.auto === 'finished').length, no_clock: hunts.filter(h => h.a.auto === 'no_clock').length,
    unchecked: hunts.filter(h => h.a.auto !== 'no_clock' && unchecked(h)).length,
  };
  const rank: Record<AutoStatus, number> = { behind: 0, due_soon: 1, on_track: 2, finished: 3, no_clock: 4 };
  const list = useMemo(() => hunts
    .filter(h => filter === 'all' || (filter === 'on_track' ? h.a.auto === 'on_track' || h.a.auto === 'finished' : filter === 'unchecked' ? h.a.auto !== 'no_clock' && unchecked(h) : h.a.auto === filter) || h.huntId === initialHuntId)
    .filter(h => !search.trim() || `${h.clientName} ${h.clientNumber ?? ''} ${h.ref ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (rank[a.a.auto] - rank[b.a.auto]) || a.clientName.localeCompare(b.clientName)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [hunts, filter, search, initialHuntId]);

  async function mark(h: HuntProgress, status: 'on_track' | 'behind', note?: string, dept?: string) {
    setBusy(h.huntId);
    const { error: err } = await (supabase as any).rpc('staff_review_progress', { p_hunt: h.huntId, p_status: status, p_note: note ?? null, p_dept: dept ?? null });
    setBusy(null);
    if (err) { toast.error(err.message); return false; }
    toast.success(status === 'on_track' ? `${h.clientName}: marked on track` : `${h.clientName}: marked behind`); refresh(); return true;
  }

  const FILTERS: [Filter, string][] = [['behind', 'Behind'], ['due_soon', 'Due soon'], ['unchecked', 'Not checked this week'], ['on_track', 'On track'], ['no_clock', 'No payment date'], ['all', 'All']];
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Progress check</h1>
          <p className="text-base text-slate-400 mt-1">Go through each client. See the process their trophies are in and where the milestones say they should be, then mark the order <strong className="text-slate-200">On track</strong> or <strong className="text-slate-200">Behind</strong>.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300" aria-label="Refresh"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      {!canReview && <p className="rounded-xl border border-slate-600 bg-[#111c26] text-slate-300 p-3 text-sm">You can see the progress. Only management can mark an order On track or Behind.</p>}
      {error && <p className="rounded-xl border border-red-700 bg-red-950/30 text-red-200 p-3">{error}</p>}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`shrink-0 min-h-11 px-4 rounded-full border-2 text-sm font-bold ${filter === k ? 'border-[#0073ea] bg-[#0073ea] text-white' : 'border-slate-600 text-slate-200'}`}>{l} · {counts[k]}</button>)}
      </div>
      <div className="relative"><Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input className={`${field} pl-9`} placeholder="Search by client name" value={search} onChange={e => setSearch(e.target.value)} /></div>

      {loading && hunts.length === 0 && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
      {!loading && list.length === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">Nothing here.</p>}

      <div className="space-y-3">
        {list.map(h => {
          const chip = STATUS_CHIP[h.a.auto]; const procs = processChips(h);
          const waiting = h.animals.filter(a => a.kind === 'not_arrived').length; const hold = h.animals.filter(a => a.kind === 'on_hold').length;
          const should = h.a.overdue[0] ?? h.a.next;
          const r = h.review;
          return (
            <div key={h.huntId} ref={h.huntId === initialHuntId ? focusRef : undefined} className={`rounded-2xl border bg-[#111c26] p-4 space-y-3 ${h.huntId === initialHuntId ? 'border-[#0073ea]' : 'border-slate-700'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-slate-100 leading-tight">{h.clientName}</p>
                  <p className="text-sm text-slate-400">{[h.size ? SIZE[h.size] : null, h.year ? `${h.year} hunt` : null, `${h.animals.length} trophies`].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm font-bold whitespace-nowrap ${chip.cls}`}>{chip.label}</span>
              </div>

              {h.a.auto === 'no_clock' ? (
                <div className="rounded-xl border border-slate-600 bg-[#0f1a24] p-3 space-y-2">
                  <p className="text-slate-200">The date this client's invoice was paid is not recorded, so the milestone clock has not started and there is nothing to measure against.</p>
                  <button className="min-h-11 px-4 rounded-lg border border-slate-400 text-slate-100 font-semibold" onClick={() => onNavigate('clients', h.clientId)}>Open the client to set the payment date</button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-300">Paid <strong className="text-slate-100">{fmtDate(h.clockStart)}</strong> · day <strong className="text-slate-100">{h.a.day}</strong> of {h.a.totalDays}</p>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Process they are in now</p>
                    <div className="flex flex-wrap gap-2">
                      {procs.length === 0 && <span className="text-sm text-slate-400">No trophy is being worked on yet</span>}
                      {procs.map(p => <span key={p.dept} className={`rounded-lg border px-2.5 py-1 text-sm font-semibold ${p.behind ? 'border-red-700 bg-red-950/40 text-red-200' : 'border-slate-600 text-slate-200'}`}>{deptLabel(p.dept)} ×{p.n}{p.behind ? ` (${p.behind} behind)` : ''}</span>)}
                      {waiting > 0 && <span className="rounded-lg border border-slate-600 px-2.5 py-1 text-sm text-slate-300">Not arrived ×{waiting}</span>}
                      {hold > 0 && <span className="rounded-lg border border-amber-700 px-2.5 py-1 text-sm text-amber-200">On hold ×{hold}</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Milestones</p>
                    <ul className="space-y-1.5">
                      {h.a.milestones.map(m => {
                        const late = !m.met && m.daysLeft < 0;
                        return (
                          <li key={m.key} className="flex items-start gap-2 text-sm">
                            {m.met ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : late ? <XCircle className="w-5 h-5 text-red-400 shrink-0" /> : <Circle className="w-5 h-5 text-slate-500 shrink-0" />}
                            <span className={`flex-1 ${late ? 'text-red-200' : m.met ? 'text-slate-400' : 'text-slate-200'}`}><strong>{shortMilestone(m.label)}</strong> · {fmtDate(m.due)}{!m.met ? ` (${daysText(m.daysLeft)})` : m.manual ? ' · marked done' : ''}{!m.met || m.total > 1 ? ` · ${m.metCount} of ${m.total} trophies there` : ''}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {should && <p className={`rounded-lg px-3 py-2 text-sm ${should.daysLeft < 0 ? 'bg-red-950/40 text-red-200' : 'bg-[#0f1a24] text-slate-300'}`}><strong>{should.daysLeft < 0 ? 'Should already be:' : `By ${fmtDate(should.due)} it should be:`}</strong> {expectation(should.key, h.size)}.</p>}
                </>
              )}

              {r && <p className="text-sm text-slate-400">Last checked by <strong className="text-slate-200">{r.reviewed_by_name ?? 'management'}</strong> on {fmtDate(r.reviewed_at)}: <strong className={r.status === 'behind' ? 'text-red-300' : 'text-green-300'}>{r.status === 'behind' ? 'Behind' : 'On track'}</strong>{r.held_up_in ? ` · held up in ${deptLabel(r.held_up_in)}` : ''}{r.note ? ` · "${r.note}"` : ''}</p>}

              {canReview && h.a.auto !== 'no_clock' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button disabled={busy === h.huntId} onClick={() => mark(h, 'on_track')} className="min-h-14 rounded-xl border-2 border-green-600 text-green-200 text-lg font-bold hover:bg-green-950/40 disabled:opacity-50">On track</button>
                  <button disabled={busy === h.huntId} onClick={() => setBehindFor(h)} className="min-h-14 rounded-xl border-2 border-red-600 text-red-200 text-lg font-bold hover:bg-red-950/40 disabled:opacity-50">Behind</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {behindFor && <BehindPopup h={behindFor} onClose={() => setBehindFor(null)} onSave={async (note, dept) => { if (await mark(behindFor, 'behind', note, dept)) setBehindFor(null); }} />}
    </div>
  );
}

function BehindPopup({ h, onClose, onSave }: { h: HuntProgress; onClose: () => void; onSave: (note: string, dept: string) => void }) {
  const biggest = [...processChips(h)].sort((a, b) => b.behind - a.behind)[0]?.dept ?? '';
  const [note, setNote] = useState('');
  const [dept, setDept] = useState(biggest);
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-2xl">{h.clientName} is behind</DialogTitle></DialogHeader>
        <div><label className="block text-sm font-semibold text-slate-300 mb-1">Where is it held up?</label>
          <select className={field} value={dept} onChange={e => setDept(e.target.value)}><option value="">Not sure</option>{ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}</select></div>
        <div><label className="block text-sm font-semibold text-slate-300 mb-1">What is holding it up?</label>
          <textarea rows={3} className={field} value={note} onChange={e => setNote(e.target.value)} placeholder="For example: skins have not come back from the tannery" autoFocus /></div>
        <div className="flex gap-2">
          <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Cancel</button>
          <button className="flex-1 min-h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-lg font-bold disabled:opacity-50" disabled={!note.trim()} onClick={() => onSave(note, dept)}>Mark as behind</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
