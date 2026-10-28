/** SoakReviewList — soak reports waiting for the tannery lead (or management): accept, or reject with reasons. A rejection tells the outfitter. */
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Eye, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { openHuntFile } from '../../../../lib/docs';
import { soakProblems, soakSummary, type SoakFindings } from '../../../../lib/soak';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface Review { id: string; doc_id: string; client: string | null; species: string | null; mount: string | null; type: string; tannery_name: string | null; findings: SoakFindings; holes: number | null; files: string[]; notes: string | null; by: string | null; submitted_at: string }
const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';

export function SoakReviewList({ onCount, onChanged }: { onCount?: (n: number) => void; onChanged?: () => void }) {
  const [rows, setRows] = useState<Review[]>([]);
  const [reject, setReject] = useState<Review | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { const { data } = await (supabase as any).rpc('my_soak_reviews'); setRows(data ?? []); onCount?.((data ?? []).length); }, [onCount]);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);
  if (rows.length === 0) return null;

  async function accept(r: Review) {
    setBusy(r.id);
    const { error } = await (supabase as any).rpc('soak_review', { p_report: r.id, p_accept: true });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success('Soak report accepted'); load(); onChanged?.(); }
  }
  return (
    <section className="rounded-2xl border-2 border-amber-500 bg-[#111c26] overflow-hidden">
      <p className="px-4 py-3 text-xl font-bold text-slate-100">Soak reports to review · {rows.length}</p>
      <ul className="divide-y divide-slate-800 border-t border-slate-800">
        {rows.map(r => {
          const problems = r.type === 'in_house' ? soakProblems(r.findings, r.holes) : [];
          return (
            <li key={r.id} className="px-4 py-3 space-y-2">
              <p className="text-lg font-semibold text-slate-100">{r.species ?? 'Skin'}{r.mount ? <span className="text-base font-normal text-slate-400"> · {r.mount}</span> : null} <span className="text-base font-normal text-slate-400">· {r.client ?? 'Client'}</span></p>
              {r.type === 'in_house'
                ? <p className="text-sm text-slate-300">In-house soak by {r.by ?? 'staff'}: {soakSummary(r.findings, r.holes)}</p>
                : <p className="text-sm text-slate-300">Third-party soak: <strong>{r.tannery_name}</strong>{r.notes ? ` · "${r.notes}"` : ''}</p>}
              {problems.length > 0 && <p className="rounded-lg bg-red-950/40 border border-red-800 text-red-200 text-sm p-2">Problems recorded: {problems.join(', ')}</p>}
              {r.type === 'in_house' && r.notes && <p className="text-sm text-slate-400">Note: {r.notes}</p>}
              {r.files.length > 0 && <div className="flex flex-wrap gap-2">{r.files.map((p, i) => <button key={p} onClick={() => openHuntFile(p).catch(e => toast.error(e.message))} className="min-h-10 px-3 rounded-lg border border-slate-600 text-slate-200 text-sm flex items-center gap-1.5"><Eye className="w-4 h-4" />File {i + 1}</button>)}</div>}
              <div className="grid grid-cols-2 gap-2">
                <button disabled={busy === r.id} onClick={() => accept(r)} className="min-h-12 rounded-xl border-2 border-green-500 text-green-200 font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Accept</button>
                <button onClick={() => setReject(r)} className="min-h-12 rounded-xl border-2 border-red-500 text-red-200 font-bold flex items-center justify-center gap-2"><XCircle className="w-4 h-4" />Reject</button>
              </div>
            </li>
          );
        })}
      </ul>
      {reject && <RejectDialog r={reject} onClose={() => setReject(null)} onDone={() => { setReject(null); load(); onChanged?.(); }} />}
    </section>
  );
}

function RejectDialog({ r, onClose, onDone }: { r: Review; onClose: () => void; onDone: () => void }) {
  const suggested = r.type === 'in_house' ? soakProblems(r.findings, r.holes) : [];
  const [picked, setPicked] = useState<string[]>(suggested);
  const [other, setOther] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const reasons = [...picked, ...(other.trim() ? [other.trim()] : [])];
  async function go() {
    setBusy(true);
    const { error } = await (supabase as any).rpc('soak_review', { p_report: r.id, p_accept: false, p_reasons: reasons, p_note: note || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Rejected. The outfitter has been notified and must acknowledge it.'); onDone();
  }
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Reject this {r.species ?? 'skin'}</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-300">The outfitter is told the reasons and has to acknowledge them. Then you talk about what happens next.</p>
        {suggested.length > 0 && (
          <div><label className="block text-sm font-semibold text-slate-300 mb-1">Reasons from the soak report</label>
            <div className="flex flex-wrap gap-2">{suggested.map(x => { const on = picked.includes(x); return <button key={x} type="button" aria-pressed={on} onClick={() => setPicked(p => on ? p.filter(y => y !== x) : [...p, x])} className={`min-h-11 px-3 rounded-lg border-2 text-sm font-semibold ${on ? 'border-red-500 bg-red-600 text-white' : 'border-slate-600 text-slate-200'}`}>{on ? '✓ ' : ''}{x}</button>; })}</div></div>
        )}
        <div><label className="block text-sm font-semibold text-slate-300 mb-1">{suggested.length ? 'Another reason' : 'Reason'}</label><input className={field} value={other} onChange={e => setOther(e.target.value)} /></div>
        <div><label className="block text-sm font-semibold text-slate-300 mb-1">Note for the outfitter <span className="font-normal text-slate-500">(optional)</span></label><textarea rows={2} className={field} value={note} onChange={e => setNote(e.target.value)} /></div>
        <div className="flex gap-2">
          <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Cancel</button>
          <button className="flex-1 min-h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-lg font-bold disabled:opacity-50" disabled={busy || reasons.length === 0} onClick={go}>{busy ? 'Rejecting…' : 'Reject and tell the outfitter'}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
