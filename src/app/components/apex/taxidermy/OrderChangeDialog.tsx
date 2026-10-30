/**
 * OrderChangeDialog — credit a trophy and amend the invoice. Step 1: credit what is cancelled. Step 2: add what replaces it:
 * the same mount again, a mount for another animal (with a new job card), a hide bought from the workshop's stock, or anything else.
 * The client's agreement is recorded. The result is a numbered credit note and an updated invoice.
 */
import { useMemo, useState } from 'react';
import { Loader2, Plus, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { SPECIES_LIST, mountsFor } from '../../../../lib/pricing';
import { money, type Quote } from '../../../../lib/hooks/useQuotes';
import { printCreditNote } from '../../../../lib/print';
import { ALL_DEPARTMENTS } from '../../../../lib/pipeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { deptLabel } from './progressUi';

export interface Add { key: number; kind: 'item' | 'hide_purchase'; description: string; amount: string; stock: string; newCard: boolean; species: string; mount: string; startDept: string; docId?: string }
/** Ready-made answers for the dialog, for example when a mount is swapped for a skin bought from stock */
export interface OrderChangePrefill { credits: Record<string, string>; cancelLineIds?: string[]; adds: Partial<Add>[]; reason?: string }
export interface OrderChangeCase { id: string; docId: string; species: string; reasons: string[] }
const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';
let seq = 1;

export function OrderChangeDialog({ quote, clientType, who, caseInfo, prefill, onClose, onDone }: { quote: Quote; clientType: string; who: string; caseInfo?: OrderChangeCase | null; prefill?: OrderChangePrefill | null; onClose: () => void; onDone: () => void }) {
  const cur = quote.currency;
  const credited = (id?: string) => -quote.lines.filter(l => l.credit_for_line_id === id).reduce((s, l) => s + (l.amount ?? 0), 0);
  const creditable = quote.lines.filter(l => l.kind !== 'credit' && l.id).map(l => ({ ...l, left: Math.max(0, (l.amount ?? 0) - credited(l.id)) })).filter(l => l.left > 0.005);
  const [credits, setCredits] = useState<Record<string, string>>(() => prefill?.credits ?? Object.fromEntries(creditable.filter(l => caseInfo && l.hunt_doc_id === caseInfo.docId).map(l => [l.id!, String(l.left)])));
  const [adds, setAdds] = useState<Add[]>(() => (prefill?.adds ?? []).map(a => ({ key: seq++, kind: 'item', description: '', amount: '', stock: '', newCard: false, species: '', mount: '', startDept: 'mounting', ...a })));
  const cancelIds = new Set(prefill?.cancelLineIds ?? []);
  const [reason, setReason] = useState(prefill?.reason ?? (caseInfo ? `Rejected ${caseInfo.species}: ${caseInfo.reasons.join(', ')}` : ''));
  const [agreed, setAgreed] = useState('');
  const [skin, setSkin] = useState('');
  const [skinNote, setSkinNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; no: string } | null>(null);
  const [mountForm, setMountForm] = useState<{ species: string; mount: string } | null>(null);

  const creditTotal = Object.values(credits).reduce((s, v) => s + (Number(v) || 0), 0);
  const addTotal = adds.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const total = quote.lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const paid = quote.payments.reduce((s, p) => s + p.amount, 0);
  const newTotal = total - creditTotal + addTotal;
  const balance = newTotal - paid;
  const addsOk = adds.every(a => a.description.trim() && a.amount !== '' && Number(a.amount) >= 0 && (a.kind !== 'hide_purchase' || a.stock.trim()) && (!a.newCard || (a.species && a.mount)));
  const ready = (creditTotal > 0 || adds.length > 0) && addsOk && reason.trim() && agreed.trim() && (cancelIds.size === 0 || !!skin);

  const addLine = (p: Partial<Add>) => setAdds(prev => [...prev, { key: seq++, kind: 'item', description: '', amount: '', stock: '', newCard: false, species: '', mount: '', startDept: 'mounting', ...p }]);
  const patch = (key: number, p: Partial<Add>) => setAdds(prev => prev.map(a => a.key === key ? { ...a, ...p } : a));
  const firstCredit = creditable.find(l => credits[l.id!]);
  const mounts = useMemo(() => mountForm?.species ? mountsFor(mountForm.species, clientType).filter(m => m.price) : [], [mountForm?.species, clientType]);

  async function save() {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('staff_amend_quote', {
      p_quote: quote.id, p_case: caseInfo?.id ?? null, p_reason: reason, p_agreed: agreed,
      p_credits: Object.entries(credits).filter(([, v]) => Number(v) > 0).map(([line_id, v]) => ({ line_id, amount: Number(v), ...(cancelIds.has(line_id) ? { cancel_card: true, skin_decision: skin, skin_note: skinNote } : {}) })),
      p_adds: adds.map(a => ({ description: a.description, amount: Number(a.amount), kind: a.kind, stock_reference: a.stock || null, ...(a.docId ? { hunt_doc_id: a.docId } : {}), ...(a.newCard ? { new_card: { species: a.species, mount_type: a.mount, start_department: a.startDept } } : {}) })),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const { data: am } = await (supabase as any).from('quote_amendments').select('credit_no').eq('id', data).single();
    setDone({ id: data, no: am?.credit_no ?? '' });
  }

  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o && !done) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Credit and amend: {who}</DialogTitle></DialogHeader>
        {done ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-green-950/40 border border-green-700 text-green-200 p-4 text-lg font-semibold">Credit note {done.no} is done and the invoice is updated.</p>
            <p className="text-slate-300">{balance > 0.005 ? `The client now owes ${money(balance, cur)}.` : balance < -0.005 ? `The client is in credit by ${money(-balance, cur)}.` : 'The invoice is settled.'}</p>
            <div className="flex gap-2">
              <button className="flex-1 min-h-12 rounded-xl border-2 border-slate-400 text-slate-100 font-bold flex items-center justify-center gap-2" onClick={() => printCreditNote(done.id).catch(e => toast.error(e.message))}><Printer className="w-5 h-5" />Print the credit note</button>
              <button className="flex-1 min-h-12 rounded-xl bg-[#0073ea] text-white font-bold" onClick={onDone}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">1. Credit what is cancelled</h3>
              {cancelIds.size > 0 && <p className="rounded-lg border border-amber-600 bg-amber-950/30 text-amber-100 p-2 text-sm">The job card of the credited mount is closed when you save, so nobody keeps working on it.</p>}
              {creditable.length === 0 && <p className="text-slate-400">Nothing on this invoice can be credited.</p>}
              {creditable.map(l => { const on = credits[l.id!] !== undefined; return (
                <div key={l.id} className={`rounded-xl border-2 p-3 flex items-center gap-3 ${on ? 'border-red-500 bg-red-950/20' : 'border-slate-700'}`}>
                  <button type="button" aria-pressed={on} onClick={() => setCredits(p => { const n = { ...p }; if (on) delete n[l.id!]; else n[l.id!] = String(l.left); return n; })} className={`w-7 h-7 rounded-md border-2 shrink-0 flex items-center justify-center text-sm ${on ? 'border-red-500 bg-red-500 text-white' : 'border-slate-500'}`}>{on ? '✓' : ''}</button>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-slate-100">{l.description}</p><p className="text-sm text-slate-400">{money(l.left, cur)} can be credited{l.kind === 'hide_purchase' ? ' · hide purchase' : ''}</p></div>
                  {on && <input className={`${field} !w-28`} inputMode="decimal" value={credits[l.id!]} onChange={e => setCredits(p => ({ ...p, [l.id!]: e.target.value }))} aria-label="Credit amount" />}
                </div>); })}
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">2. Add what replaces it</h3>
              {adds.map(a => (
                <div key={a.key} className="rounded-xl border border-slate-600 p-3 space-y-2">
                  <div className="grid grid-cols-[1fr_120px_40px] gap-2 items-start">
                    <input className={field} value={a.description} onChange={e => patch(a.key, { description: e.target.value })} aria-label="Description" />
                    <input className={`${field} ${a.amount === '' ? 'border-amber-500' : ''}`} inputMode="decimal" placeholder="Price" value={a.amount} onChange={e => patch(a.key, { amount: e.target.value })} aria-label="Price" />
                    <button aria-label="Remove" className="min-h-11 flex items-center justify-center text-red-400" onClick={() => setAdds(p => p.filter(x => x.key !== a.key))}><Trash2 className="w-5 h-5" /></button>
                  </div>
                  {a.kind === 'hide_purchase' && <div><label className={lab}>Which hide from stock? *</label><input className={field} value={a.stock} onChange={e => patch(a.key, { stock: e.target.value })} placeholder="Stock reference or description" /></div>}
                  {a.newCard && <div className="grid grid-cols-2 gap-2 items-end"><p className="text-sm text-sky-200 col-span-2">A new job card is created for {a.species} · {a.mount}.</p><div><label className={lab}>It starts in</label><select className={field} value={a.startDept} onChange={e => patch(a.key, { startDept: e.target.value })}>{ALL_DEPARTMENTS.filter(d => d !== 'receiving').map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}</select></div></div>}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {firstCredit && <button className="min-h-11 px-3 rounded-lg border border-slate-500 text-slate-100 text-sm font-semibold flex items-center gap-1.5" onClick={() => addLine({ description: firstCredit.description, amount: String(credits[firstCredit.id!]) })}><Plus className="w-4 h-4" />Same mount again</button>}
                <button className="min-h-11 px-3 rounded-lg border border-slate-500 text-slate-100 text-sm font-semibold flex items-center gap-1.5" onClick={() => setMountForm({ species: '', mount: '' })}><Plus className="w-4 h-4" />A mount for another animal</button>
                <button className="min-h-11 px-3 rounded-lg border-2 border-amber-500 text-amber-200 text-sm font-bold flex items-center gap-1.5" onClick={() => addLine({ kind: 'hide_purchase', description: `Hide purchase${caseInfo ? `: ${caseInfo.species}` : ''}` })}><Plus className="w-4 h-4" />Hide purchase</button>
                <button className="min-h-11 px-3 rounded-lg border border-slate-500 text-slate-100 text-sm font-semibold flex items-center gap-1.5" onClick={() => addLine({})}><Plus className="w-4 h-4" />Another line</button>
              </div>
              {mountForm && (
                <div className="rounded-xl border border-sky-600 bg-sky-950/20 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={lab}>Animal</label><select className={field} value={mountForm.species} onChange={e => setMountForm({ species: e.target.value, mount: '' })}><option value="">Choose…</option>{SPECIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className={lab}>Mount</label><select className={field} disabled={!mountForm.species} value={mountForm.mount} onChange={e => setMountForm({ ...mountForm, mount: e.target.value })}><option value="">Choose…</option>{mounts.map(m => <option key={m.name} value={m.name}>{m.name} · {money(m.price, cur)}</option>)}</select></div>
                  </div>
                  <div className="flex gap-2">
                    <button className="min-h-11 px-4 rounded-lg border border-slate-500 text-slate-100 font-semibold" onClick={() => setMountForm(null)}>Cancel</button>
                    <button disabled={!mountForm.species || !mountForm.mount} className="flex-1 min-h-11 rounded-lg bg-[#0073ea] text-white font-bold disabled:opacity-50" onClick={() => { const p = mounts.find(m => m.name === mountForm.mount)?.price; addLine({ description: `${mountForm.species}: ${mountForm.mount}`, amount: p ? String(p) : '', newCard: true, species: mountForm.species, mount: mountForm.mount }); setMountForm(null); }}>Add this mount and a new job card</button>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">3. The result</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[['Credit', -creditTotal], ['Added', addTotal], ['New invoice total', newTotal], [balance < -0.005 ? 'Credit due to the client' : 'Balance outstanding', Math.abs(balance)]].map(([l, v]) => <div key={String(l)} className={`rounded-xl border px-3 py-2 ${String(l).startsWith('Credit due') ? 'border-green-600' : 'border-slate-700'} bg-[#0f1a24]`}><p className="text-xs text-slate-400">{l}</p><p className="text-xl font-bold tabular-nums text-white">{money(v as number, cur)}</p></div>)}
              </div>
              <p className="text-xs text-slate-500">Already received: {money(paid, cur)}. The old total was {money(total, cur)}.</p>
            </section>

            {cancelIds.size > 0 && (
              <section className="space-y-2">
                <h3 className="text-lg font-bold text-slate-100">What happens to the first skin? *</h3>
                {[['discard', 'Throw it away', 'It goes to the workshop stock if the quality is good enough.'], ['leather', 'Make leather products from it', ''], ['keep_ship', 'Keep it as a ready-to-mount skin', 'It is packed and shipped with the other trophies.']].map(([v, t, h]) => (
                  <button key={v} type="button" aria-pressed={skin === v} onClick={() => setSkin(v)} className={`w-full text-left rounded-xl border-2 px-4 py-3 ${skin === v ? 'border-green-500 bg-green-950/30' : 'border-slate-700'}`}><span className="block font-semibold text-slate-100">{skin === v ? '✓ ' : ''}{t}</span>{h && <span className="block text-sm text-slate-400">{h}</span>}</button>
                ))}
                <input className={field} value={skinNote} onChange={e => setSkinNote(e.target.value)} placeholder="Anything the workshop must know about it (optional)" aria-label="Note about the first skin" />
              </section>
            )}

            <section className="space-y-2">
              <div><label className={lab}>Why is the invoice changing? *</label><textarea rows={2} className={field} value={reason} onChange={e => setReason(e.target.value)} /></div>
              <div><label className={lab}>How and when did the client agree? *</label><textarea rows={2} className={field} value={agreed} onChange={e => setAgreed(e.target.value)} placeholder="For example: agreed through the outfitter on WhatsApp, 12 Nov" /></div>
            </section>
            <div className="flex gap-2">
              <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Cancel</button>
              <button disabled={busy || !ready} className="flex-1 min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2" onClick={save}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Issue the credit note and update the invoice</button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
