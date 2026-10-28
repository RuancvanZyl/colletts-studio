/** OutfitterCases — skins rejected at the workshop's soak. The outfitter must acknowledge it (stamped for the record), then talks to the workshop about what happens next. */
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { WORKSHOP } from '../../../../lib/workshop';
import { OutfitterThread } from '../shared/OutfitterThread';
import { informDaysLeft, informDeadline } from '../../../../lib/cases';

interface C { id: string; hunt_id: string; status: string; client: string; species: string | null; reasons: string[]; note: string | null; created_at: string; ack_at: string | null; outcome: string | null; outcome_at: string | null; client_informed_at: string | null; client_decision: string | null }
const OUTCOME: Record<string, string> = { outfitter_replacement: 'You will replace it', stock_replacement: 'The workshop will replace it from stock', client_decision: 'The client will decide: change the order or scrap it' };

export function OutfitterCases() {
  const [cases, setCases] = useState<C[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(async () => { const { data } = await (supabase as any).rpc('outfitter_cases'); setCases((data ?? []).filter((c: C) => c.status !== 'resolved')); }, []);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);
  if (cases.length === 0) return null;

  async function told(c: C) {
    setBusy(c.id);
    const { error } = await (supabase as any).rpc('outfitter_informed_client', { p_case: c.id });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success('Recorded. Thank you.'); load(); }
  }
  async function ack(c: C) {
    setBusy(c.id);
    const { error } = await (supabase as any).rpc('outfitter_ack_case', { p_case: c.id });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success('Thank you. Your acknowledgement is recorded.'); setOpen(c.id); load(); }
  }
  return (
    <section className="space-y-3">
      {cases.map(c => (
        <div key={c.id} className={`rounded-2xl border-2 p-4 space-y-3 ${c.ack_at ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/30'}`}>
          <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{c.ack_at ? 'Rejected skin: talk to the workshop' : 'Action needed: a skin was rejected'}</p>
          <p className="text-slate-800 dark:text-slate-200"><strong>{c.species ?? 'Skin'}</strong> · {c.client}</p>
          <p className="text-sm text-slate-800 dark:text-slate-200"><strong>Reasons:</strong> {c.reasons.join(', ')}{c.note ? ` · ${c.note}` : ''}</p>
          {c.outcome && <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Agreed: {OUTCOME[c.outcome] ?? c.outcome}</p>}
          {c.outcome === 'client_decision' && (c.client_informed_at
            ? <p className="text-sm text-green-800 dark:text-green-300">You told the client on {new Date(c.client_informed_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}.{c.client_decision ? ` They decided to ${c.client_decision === 'scrap' ? 'scrap it' : 'change the order'}.` : ' The workshop is waiting for their decision.'}</p>
            : (() => { const left = informDaysLeft(c); return (
              <div className="space-y-2 rounded-xl border border-slate-400 p-3">
                <p className="text-sm text-slate-900 dark:text-slate-100">Please tell the client{left !== null && left >= 0 ? ` by ${informDeadline(c.outcome_at)?.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}` : ''}. {left !== null && left < 0 ? 'The 3 weeks have passed, so the workshop will now tell the client.' : 'After 3 weeks the workshop will contact them instead.'}</p>
                <button disabled={busy === c.id} onClick={() => told(c)} className="w-full min-h-12 rounded-xl bg-green-700 text-white font-bold disabled:opacity-50">I have told the client</button>
              </div>); })())}
          {!c.ack_at ? (
            <button disabled={busy === c.id} onClick={() => ack(c)} className="w-full min-h-14 rounded-xl bg-red-600 hover:bg-red-700 text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy === c.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}I acknowledge this notification</button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">You acknowledged this on {new Date(c.ack_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}.</p>
              <div className="flex gap-2">
                <button className="flex-1 min-h-12 rounded-xl bg-green-700 text-white font-bold" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Hide the conversation' : 'Open the conversation'}</button>
                {WORKSHOP.whatsapp && <a className="min-h-12 px-4 rounded-xl border border-slate-400 text-slate-900 dark:text-slate-100 font-semibold flex items-center gap-2" target="_blank" rel="noopener" href={`https://wa.me/${WORKSHOP.whatsapp}?text=${encodeURIComponent(`About the rejected ${c.species ?? 'skin'} for ${c.client}: `)}`}><MessageCircle className="w-4 h-4 text-green-600" />WhatsApp</a>}
              </div>
              {open === c.id && <OutfitterThread huntId={c.hunt_id} side="outfitter" caseId={c.id} />}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
