/**
 * Quotes — after a hunter chooses their mounts: prepare the quote, send it, see the answer,
 * record the deposit (or full payment) and let work start. Money is typed in here now; the Xero link will fill it in.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { mountsFor } from '../../../../lib/pricing';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { planRelease, releaseHunt, type ReleasePreview } from '../../../../lib/releaseHunt';
import { sciName } from '../../../../lib/species';
import { useQuotePipeline, loadQuotes, money, STAGE_LABEL, type Quote, type QuoteLine, type PipelineRow } from '../../../../lib/hooks/useQuotes';

const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';
const STAGE_COLOUR: Record<string, string> = {
  to_quote: 'bg-amber-900/50 text-amber-300', draft: 'bg-slate-700 text-slate-200', sent: 'bg-sky-900/50 text-sky-300',
  declined: 'bg-red-900/50 text-red-300', awaiting_deposit: 'bg-orange-900/50 text-orange-300', authorised: 'bg-emerald-900/50 text-emerald-300',
};

export function Quotes({ onChanged, initialHuntId }: { onChanged?: () => void; initialHuntId?: string }) {
  const { rows, loading, refresh } = useQuotePipeline();
  const [open, setOpen] = useState<string | null>(initialHuntId ?? null);

  if (open) return <QuoteEditor huntId={open} onBack={() => { setOpen(null); refresh(); onChanged?.(); }} />;

  const order = ['to_quote', 'declined', 'awaiting_deposit', 'sent', 'draft', 'authorised'];
  // money still to come in, from every quote the hunter has accepted
  const outstanding = ['USD', 'ZAR'].map(cur => ({
    cur, amount: rows.filter(r => r.currency === cur && ['accepted', 'deposit_paid'].includes(r.quote_status ?? '')).reduce((n, r) => n + Math.max(0, (r.total ?? 0) - r.amount_paid), 0),
  })).filter(x => x.amount > 0);
  const groups = order.map(s => ({ s, items: rows.filter(r => r.stage === s) })).filter(g => g.items.length);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Quotes</h1>
        <p className="text-base text-slate-400 mt-1">Hunters who have chosen their mounts, and where each quote stands. Work only starts once the hunter has accepted and paid a deposit or the full amount.</p>
      </div>
      {outstanding.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-950/20 p-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-sm font-bold uppercase tracking-wider text-amber-300">Amount outstanding</span>
          {outstanding.map(o => <span key={o.cur} className="text-3xl font-bold text-white tabular-nums">{money(o.amount, o.cur)}</span>)}
        </div>
      )}
      {loading && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
      {!loading && groups.length === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400 text-lg">Nothing to quote right now.</p>}
      {groups.map(g => (
        <section key={g.s} className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">{STAGE_LABEL[g.s]} · {g.items.length}</h2>
          <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
            {g.items.map(r => <Row key={r.hunt_id} r={r} onOpen={() => setOpen(r.hunt_id)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function Row({ r, onOpen }: { r: PipelineRow; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-16 hover:bg-[#162330]">
      <span className="flex-1 min-w-0">
        <span className="block text-lg font-semibold text-slate-100">{r.client_name} <span className="font-mono text-xs text-slate-500">{r.ref_number}</span></span>
        <span className="block text-sm text-slate-400">{r.chosen} of {r.animals} animals have a mount{r.total != null ? ` · ${money(r.total, r.currency ?? 'USD')}` : ''}{r.amount_paid > 0 ? ` · paid ${money(r.amount_paid, r.currency ?? 'USD')}` : ''}</span>
        {r.total != null && ['accepted', 'deposit_paid', 'paid'].includes(r.quote_status ?? '') && (
          <span className={`block text-sm font-semibold ${r.total - r.amount_paid > 0.005 ? 'text-amber-300' : 'text-emerald-300'}`}>{r.total - r.amount_paid > 0.005 ? `Outstanding ${money(r.total - r.amount_paid, r.currency ?? 'USD')}` : 'Nothing outstanding'}</span>
        )}
      </span>
      <span className={`text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${STAGE_COLOUR[r.stage]}`}>{STAGE_LABEL[r.stage]}</span>
    </button>
  );
}

function QuoteEditor({ huntId, onBack }: { huntId: string; onBack: () => void }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'studio_manager';
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState({ name: '', ref: '', type: 'export' });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [percent, setPercent] = useState(50);
  const [note, setNote] = useState('');
  const [authorised, setAuthorised] = useState(false);
  const [popup, setPopup] = useState<null | { kind: 'deposit' | 'full' | 'balance' | 'other' | 'accept' | 'release' }>(null);
  const [plan, setPlan] = useState<ReleasePreview | null>(null);

  async function load() {
    setLoading(true);
    const { data: hunt } = await (supabase as any).from('client_hunts').select('ref_number, client_type, work_authorised_at, clients(full_name, client_type)').eq('id', huntId).single();
    const type = hunt?.clients?.client_type ?? hunt?.client_type ?? 'export';
    setWho({ name: hunt?.clients?.full_name ?? '', ref: hunt?.ref_number ?? '', type });
    setAuthorised(!!hunt?.work_authorised_at);
    const [q] = await loadQuotes({ huntId });
    setQuote(q ?? null);
    setPlan(await planRelease(huntId).catch(() => null));
    if (q) {
      setLines(q.lines.map(l => ({ ...l }))); setCurrency(q.currency); setPercent(q.deposit_percent); setNote(q.note ?? '');
    } else {
      const { data: docs } = await (supabase as any).from('hunt_documents').select('id, form_data, status').eq('hunt_id', huntId).eq('doc_type', 'job_card').in('status', ['in_progress', 'pending', 'awaiting_arrival']);
      const byId = new Map<string, any>((docs ?? []).map((d: any) => [d.id, d]));
      const cur = type === 'local' ? 'ZAR' : 'USD';
      setCurrency(cur); setPercent(50); setNote('');
      setLines((docs ?? []).filter((d: any) => !/^custom mount \(combined\)$/i.test(d.form_data?.mount_type ?? '') && !/^pending instructions$/i.test(d.form_data?.mount_type ?? '')).map((d: any) => {
        const fd = d.form_data ?? {}; const mount = fd.mount_type ?? '';
        const priced = mountsFor(fd.species ?? '', type).find(o => o.name === mount)?.price ?? null;
        const combined = (fd.custom?.combined_with ?? []).map((id: string) => byId.get(id)?.form_data?.species).filter(Boolean);
        return { hunt_doc_id: d.id, amount: priced, description: `${fd.species ?? 'Animal'}: ${mount}${combined.length ? ` (combined with ${combined.join(', ')})` : ''}${mount === 'Replica' && fd.replica?.type ? ` (${fd.replica.type})` : ''}` };
      }));
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [huntId]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0), [lines]);
  const deposit = Math.round(total * percent) / 100;
  const missing = lines.filter(l => l.amount == null || String(l.amount) === '').length;
  const status = quote?.status ?? 'none';
  const editable = ['none', 'draft', 'declined', 'sent'].includes(status);
  const paid = quote?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const dueNow = quote?.amount_due_now ?? 0;

  async function save(send: boolean) {
    if (send && missing > 0) { toast.error('Every line needs a price before the quote can be sent'); return; }
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_save_quote', {
      p_hunt: huntId, p_currency: currency, p_deposit_percent: percent, p_note: note || null, p_send: send,
      p_lines: lines.filter(l => l.description.trim()).map(l => ({ hunt_doc_id: l.hunt_doc_id, description: l.description, amount: l.amount == null || String(l.amount) === '' ? null : Number(l.amount) })),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(send ? 'Quote sent to the hunter' : 'Quote saved');
    load();
  }

  async function record(amount: number, method: string, reference: string, date: string) {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_record_payment', { p_quote: quote!.id, p_amount: amount, p_method: method, p_reference: reference || null, p_received: date ? `${date}T12:00:00` : null });
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success('Payment recorded'); setPopup(null); await load(); setPopup({ kind: 'release' });
    return true;
  }

  async function acceptForHunter(option: 'deposit' | 'full', noteText: string) {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_accept_quote', { p_quote: quote!.id, p_option: option, p_note: noteText || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Acceptance recorded'); setPopup(null); load();
  }

  async function startAnyway() {
    const reason = window.prompt('Why is work starting without the payment? (this is recorded)');
    if (!reason?.trim()) return;
    const { error } = await (supabase as any).rpc('staff_authorise_work', { p_hunt: huntId, p_reason: reason });
    if (error) toast.error(error.message); else { toast.success('Work can start'); load(); }
  }

  if (loading) return <div className="flex items-center gap-2 text-slate-400 py-10"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>;

  return (
    <div className="max-w-3xl space-y-5 pb-32">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-base text-[#3AAECC] font-semibold min-h-11"><ArrowLeft className="w-4 h-4" />All quotes</button>
      <div>
        <h1 className="text-3xl font-bold text-slate-100 leading-tight">{who.name}</h1>
        <p className="text-slate-400">{who.ref} · {who.type === 'local' ? 'Local' : 'Export'}</p>
      </div>

      {status === 'declined' && quote?.hunter_comment && <div className="rounded-xl border-2 border-red-500 bg-red-950/30 p-4"><p className="font-bold text-red-300">The hunter asked for changes</p><p className="text-slate-100 mt-1">{quote.hunter_comment}</p></div>}
      {status === 'sent' && (
        <div className="rounded-xl border border-sky-600 bg-sky-950/30 p-4 text-sky-200 space-y-3">
          <p>Sent {quote?.sent_at ? new Date(quote.sent_at).toLocaleDateString('en-ZA') : ''}. Waiting for the hunter. You can still change it below and send it again.</p>
          <button className="min-h-11 px-4 rounded-xl border border-sky-400 text-sky-100 font-semibold" onClick={() => setPopup({ kind: 'accept' })}>The hunter agreed by phone, WhatsApp or in person</button>
        </div>
      )}
      {authorised && (
        <div className="rounded-xl border border-emerald-600 bg-emerald-950/30 p-4 text-emerald-200 space-y-2">
          <p className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 shrink-0" />Work can start for this hunt.</p>
          {plan && plan.plans.length > 0 && <button className="min-h-12 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold" onClick={() => setPopup({ kind: 'release' })}>Start the workshop flow ({plan.plans.length} animal{plan.plans.length > 1 ? 's' : ''})</button>}
          {plan && plan.plans.length === 0 && plan.alreadyReleased > 0 && <p className="text-sm text-emerald-300">{plan.alreadyReleased} animal{plan.alreadyReleased > 1 ? 's are' : ' is'} already in the workshop.</p>}
          {plan && (plan.notArrived > 0 || plan.noMount > 0) && <p className="text-sm text-amber-300">{plan.notArrived > 0 ? `${plan.notArrived} animal${plan.notArrived > 1 ? 's have' : ' has'} not arrived yet. ` : ''}{plan.noMount > 0 ? `${plan.noMount} still need${plan.noMount > 1 ? '' : 's'} a mount from the hunter.` : ''}</p>}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-100">Lines</h2>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_130px_44px] gap-2 items-start">
            <input disabled={!editable} className={field} value={l.description} onChange={e => setLines(p => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} aria-label="Description" />
            <input disabled={!editable} className={`${field} ${l.amount == null || String(l.amount) === '' ? 'border-amber-500' : ''}`} inputMode="decimal" placeholder="Price" value={l.amount ?? ''} onChange={e => setLines(p => p.map((x, j) => j === i ? { ...x, amount: e.target.value === '' ? null : (e.target.value as any) } : x))} aria-label="Price" />
            {editable && <button aria-label="Remove line" className="min-h-11 flex items-center justify-center text-red-400" onClick={() => setLines(p => p.filter((_, j) => j !== i))}><Trash2 className="w-5 h-5" /></button>}
          </div>
        ))}
        {editable && <button className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-600 text-slate-200 font-semibold px-4 min-h-12" onClick={() => setLines(p => [...p, { hunt_doc_id: null, description: '', amount: null }])}><Plus className="w-5 h-5" />Add a line (crating, permits, courier…)</button>}
        {missing > 0 && editable && <p className="text-sm text-amber-400">{missing} line{missing > 1 ? 's need' : ' needs'} a price. Custom mounts and replicas are always priced by you.</p>}
      </section>

      <section className="grid sm:grid-cols-3 gap-3">
        <div><label className={lab}>Currency</label><select disabled={!editable} className={field} value={currency} onChange={e => setCurrency(e.target.value)}><option value="USD">US dollars</option><option value="ZAR">Rand</option></select></div>
        <div><label className={lab}>Deposit %</label><input disabled={!editable} className={field} inputMode="numeric" value={percent} onChange={e => setPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} /></div>
        <div className="rounded-xl bg-[#111c26] border border-slate-700 px-4 py-2"><p className="text-xs text-slate-400">Total</p><p className="text-2xl font-bold text-white">{money(total, currency)}</p><p className="text-xs text-slate-400">Deposit {money(deposit, currency)}</p></div>
      </section>
      <div><label className={lab}>Note to the hunter <span className="font-normal text-slate-500">(optional)</span></label><textarea disabled={!editable} rows={3} className={field} value={note} onChange={e => setNote(e.target.value)} placeholder="Timing, what the custom mount includes, anything they should know." /></div>

      {quote && ['accepted', 'deposit_paid', 'paid'].includes(status) && (
        <section className="space-y-3 rounded-2xl border border-slate-700 bg-[#111c26] p-4">
          <h2 className="text-lg font-bold text-slate-100">Payment</h2>
          <p className="text-slate-300">The hunter accepted on {quote.accepted_at ? new Date(quote.accepted_at).toLocaleDateString('en-ZA') : ''} and chose to <strong>{quote.payment_option === 'full' ? 'pay in full' : 'pay a deposit first'}</strong>.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { l: 'Total', v: total, c: 'text-white' },
              { l: 'Due now', v: dueNow, c: 'text-white' },
              { l: 'Received', v: paid, c: 'text-emerald-300' },
              { l: 'Outstanding', v: Math.max(0, total - paid), c: total - paid > 0.005 ? 'text-amber-300' : 'text-emerald-300' },
            ].map(x => (
              <div key={x.l} className={`rounded-xl border px-3 py-2 ${x.l === 'Outstanding' ? 'border-amber-500 bg-amber-950/20' : 'border-slate-700 bg-[#0f1a24]'}`}>
                <p className="text-xs text-slate-400">{x.l}</p><p className={`text-xl font-bold tabular-nums ${x.c}`}>{money(x.v, quote.currency)}</p>
              </div>
            ))}
          </div>
          {quote.payments.length > 0 && <ul className="text-sm text-slate-300 divide-y divide-slate-800 rounded-lg border border-slate-700">{quote.payments.map(p => <li key={p.id} className="px-3 py-2 flex justify-between gap-3"><span>{new Date(p.received_at).toLocaleDateString('en-ZA')} · {p.method ?? ''} {p.reference ? `· ${p.reference}` : ''}{p.source === 'xero' ? ' · from Xero' : ''}</span><strong>{money(p.amount, quote.currency)}</strong></li>)}</ul>}
          {status !== 'paid' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {status === 'accepted' && (
                <button className="min-h-14 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold" onClick={() => setPopup({ kind: 'deposit' })}>
                  {quote.payment_option === 'full' ? 'Mark as paid' : 'Deposit paid'} <span className="font-normal text-green-100">({money(Math.max(0, dueNow - paid), quote.currency)})</span>
                </button>
              )}
              <button className="min-h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold" onClick={() => setPopup({ kind: status === 'accepted' ? 'full' : 'balance' })}>
                {status === 'accepted' ? 'Fully paid' : 'Balance paid'} <span className="font-normal text-emerald-100">({money(Math.max(0, total - paid), quote.currency)})</span>
              </button>
              <button className="sm:col-span-2 min-h-11 text-slate-300 underline" onClick={() => setPopup({ kind: 'other' })}>Another amount</button>
            </div>
          )}
          {status === 'accepted' && isAdmin && !authorised && <button className="text-sm text-amber-300 underline min-h-11" onClick={startAnyway}>Start work without the payment (admin, needs a reason)</button>}
          <p className="text-xs text-slate-500">{quote.xero_invoice_number ? `Xero invoice ${quote.xero_invoice_number}.` : 'Xero is not linked yet, so payments are recorded here by hand.'}</p>
        </section>
      )}

      {popup && quote && popup.kind !== 'accept' && popup.kind !== 'release' && (
        <PaymentPopup kind={popup.kind} who={who.name} currency={quote.currency} busy={busy}
          amount={popup.kind === 'deposit' ? Math.max(0, dueNow - paid) : popup.kind === 'other' ? 0 : Math.max(0, total - paid)}
          stillNeeded={status === 'accepted' ? Math.max(0, dueNow - paid) : 0} onClose={() => setPopup(null)} onConfirm={record} />
      )}
      {popup?.kind === 'release' && plan && <ReleasePopup plan={plan} onClose={() => setPopup(null)} onDone={() => { setPopup(null); load(); }} staff={{ id: profile?.id ?? null, name: profile?.full_name ?? 'Staff' }} huntId={huntId} />}
      {popup?.kind === 'accept' && quote && <AcceptPopup currency={quote.currency} total={total} percent={percent} busy={busy} onClose={() => setPopup(null)} onConfirm={acceptForHunter} />}

      {editable && (
        <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-[#0F1A1C]/95 border-t border-slate-700 p-3 lg:left-60">
          <div className="max-w-3xl mx-auto flex gap-2">
            <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold disabled:opacity-60" disabled={busy} onClick={() => save(false)}>Save draft</button>
            <button className="flex-1 min-h-12 rounded-xl bg-[#0073ea] hover:bg-[#0064cc] text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60" disabled={busy || lines.length === 0} onClick={() => save(true)}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}{status === 'sent' ? 'Send again' : 'Send to the hunter'}</button>
          </div>
        </div>
      )}
    </div>
  );
}


export function PaymentPopup({ kind, who, currency, amount, stillNeeded, busy, onClose, onConfirm }: {
  kind: 'deposit' | 'full' | 'balance' | 'other'; who: string; currency: string; amount: number; stillNeeded: number; busy: boolean;
  onClose: () => void; onConfirm: (amount: number, method: string, reference: string, date: string) => Promise<boolean>;
}) {
  const [amt, setAmt] = useState(amount ? String(amount) : '');
  const [method, setMethod] = useState('EFT');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const n = Number(amt) || 0;
  const title = kind === 'deposit' ? 'Deposit paid?' : kind === 'full' ? 'Fully paid?' : kind === 'balance' ? 'Balance paid?' : 'Record a payment';
  const starts = stillNeeded > 0 && n >= stillNeeded - 0.005;
  const short = stillNeeded > 0 && n > 0 && n < stillNeeded - 0.005;
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-2xl">{title}</DialogTitle></DialogHeader>
        <p className="text-base text-slate-300">Mark that <strong>{who}</strong> paid <strong>{money(n, currency)}</strong>.</p>
        <div className="space-y-3">
          <div><label className={lab}>Amount received</label><input className={field} inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lab}>How</label><select className={field} value={method} onChange={e => setMethod(e.target.value)}>{['EFT', 'Card', 'Cash', 'PayFast', 'Xero', 'Other'].map(m => <option key={m}>{m}</option>)}</select></div>
            <div><label className={lab}>Date received</label><input type="date" className={field} value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <div><label className={lab}>Reference <span className="font-normal text-slate-500">(optional)</span></label><input className={field} value={ref} onChange={e => setRef(e.target.value)} placeholder="Receipt or bank reference" /></div>
        </div>
        {starts && <p className="rounded-lg bg-emerald-950/40 border border-emerald-700 text-emerald-200 p-3 text-sm">This covers what is due now, so work can start for this hunt.</p>}
        {short && <p className="rounded-lg bg-amber-950/40 border border-amber-700 text-amber-200 p-3 text-sm">This is {money(stillNeeded - n, currency)} short of what is due now. Work will not start until the rest arrives.</p>}
        <div className="flex gap-2 pt-1">
          <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Cancel</button>
          <button className="flex-1 min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-60 flex items-center justify-center gap-2" disabled={busy || n <= 0} onClick={() => onConfirm(n, method, ref, date)}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Yes, mark as paid</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AcceptPopup({ currency, total, percent, busy, onClose, onConfirm }: { currency: string; total: number; percent: number; busy: boolean; onClose: () => void; onConfirm: (option: 'deposit' | 'full', note: string) => void }) {
  const [option, setOption] = useState<'deposit' | 'full'>('deposit');
  const [note, setNote] = useState('');
  const dep = Math.round(total * percent) / 100;
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-2xl">The hunter agreed?</DialogTitle></DialogHeader>
        <p className="text-base text-slate-300">Record that the hunter accepted this quote outside the app, and how they will pay.</p>
        {([['deposit', `A ${percent}% deposit first (${money(dep, currency)})`], ['full', `Pay in full (${money(total, currency)})`]] as const).map(([k, t]) => (
          <button key={k} type="button" aria-pressed={option === k} onClick={() => setOption(k)} className={`w-full text-left rounded-xl border-2 p-3.5 min-h-14 font-semibold ${option === k ? 'border-green-500 bg-green-950/30 text-white' : 'border-slate-600 text-slate-200'}`}>{t}</button>
        ))}
        <div><label className={lab}>How they agreed <span className="font-normal text-slate-500">(optional)</span></label><input className={field} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. WhatsApp on 21 Oct" /></div>
        <div className="flex gap-2 pt-1">
          <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Cancel</button>
          <button className="flex-1 min-h-12 rounded-xl bg-[#0073ea] hover:bg-[#0064cc] text-white text-lg font-bold disabled:opacity-60" disabled={busy} onClick={() => onConfirm(option, note)}>Record acceptance</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function ReleasePopup({ plan, huntId, staff, onClose, onDone }: { plan: ReleasePreview; huntId: string; staff: { id: string | null; name: string }; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await releaseHunt(huntId, plan, staff); toast.success(`${plan.plans.length} job card${plan.plans.length > 1 ? 's' : ''} sent into the workshop`); onDone(); }
    catch (e: any) { toast.error(e.message ?? 'Could not start the flow'); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Start the workshop flow?</DialogTitle></DialogHeader>
        {plan.plans.length === 0 ? <p className="text-slate-300">There is nothing to send right now.{plan.notArrived ? ` ${plan.notArrived} animal(s) have not arrived yet.` : ''}{plan.noMount ? ` ${plan.noMount} still need a mount.` : ''}</p> : (
          <>
            <p className="text-base text-slate-300">These job cards move out of Receiving into the workshop{plan.deadline ? <> with the order deadline <strong>{new Date(plan.deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></> : ''}. {plan.clientName.split(' ')[0] || 'The hunter'} is told that work has started.</p>
            <div className="rounded-xl border border-slate-700 divide-y divide-slate-800">
              {plan.plans.map(p => (
                <div key={p.docId} className="px-3 py-3 space-y-0.5">
                  <p className="font-semibold text-slate-100">{p.species} <span className="text-xs italic font-normal text-slate-500">{sciName(p.species)}</span></p>
                  <p className="text-sm text-slate-300">{p.mount === 'Custom mount (combined)' ? 'Part of a custom mount' : p.mount} → starts in <strong>{p.toLabel}</strong></p>
                  <p className="text-xs text-slate-400">Received: {p.received}</p>
                  {p.instructions && <p className="text-xs text-amber-300">{p.instructions}</p>}
                </div>
              ))}
            </div>
            {(plan.notArrived > 0 || plan.noMount > 0) && <p className="text-sm text-amber-300">Left out: {plan.notArrived > 0 ? `${plan.notArrived} not arrived yet` : ''}{plan.notArrived > 0 && plan.noMount > 0 ? ', ' : ''}{plan.noMount > 0 ? `${plan.noMount} without a mount` : ''}.</p>}
          </>
        )}
        <div className="flex gap-2 pt-1">
          <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={onClose}>Not yet</button>
          {plan.plans.length > 0 && <button className="flex-1 min-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold disabled:opacity-60 flex items-center justify-center gap-2" disabled={busy} onClick={go}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}Start the workshop flow</button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
