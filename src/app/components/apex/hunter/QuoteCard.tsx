/**
 * QuoteCard — the hunter sees the quote, accepts it (paying a deposit or the full amount) or asks for changes,
 * and then sees where their payment stands.
 */
import { useState } from 'react';
import { CheckCircle2, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { money, type Quote } from '../../../../lib/hooks/useQuotes';
import { PAYMENT_DETAILS } from '../../../../lib/workshop';

export function QuoteCard({ quote, ref_, onChanged }: { quote: Quote; ref_?: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const total = quote.lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const paid = quote.payments.reduce((s, p) => s + p.amount, 0);
  const s = quote.status;

  if (s === 'draft') return null;
  const tone = s === 'sent' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
    : s === 'accepted' ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30'
    : s === 'declined' ? 'border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-600' : 'border-green-500 bg-green-50 dark:bg-green-950/30';

  return (
    <>
      <div className={`rounded-2xl border-2 p-4 space-y-3 ${tone}`}>
        <div className="flex items-start gap-3">
          <FileText className="w-6 h-6 shrink-0 mt-0.5 text-slate-700 dark:text-slate-200" />
          <div className="min-w-0">
            {s === 'sent' && <><p className="font-bold text-slate-900 dark:text-slate-100">Your quote is ready</p><p className="text-sm text-slate-700 dark:text-slate-300">{money(total, quote.currency)} in total. Please check it and let us know.</p></>}
            {s === 'accepted' && <><p className="font-bold text-slate-900 dark:text-slate-100">Next step: payment of {money(quote.amount_due_now, quote.currency)}</p><p className="text-sm text-slate-700 dark:text-slate-300">{quote.payment_option === 'full' ? 'You chose to pay in full.' : 'You chose to pay a deposit first.'} We start work as soon as it arrives.</p></>}
            {s === 'declined' && <><p className="font-bold text-slate-900 dark:text-slate-100">We have your request</p><p className="text-sm text-slate-700 dark:text-slate-300">The workshop will send you a new quote.</p></>}
            {s === 'deposit_paid' && <><p className="font-bold text-slate-900 dark:text-slate-100">Payment received, work is under way</p><p className="text-sm text-slate-700 dark:text-slate-300">Paid {money(paid, quote.currency)}. Balance {money(Math.max(0, total - paid), quote.currency)} is due before your trophies are shipped.</p></>}
            {s === 'paid' && <><p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5 text-green-600" />Paid in full</p><p className="text-sm text-slate-700 dark:text-slate-300">Thank you. {money(paid, quote.currency)} received.</p></>}
          </div>
        </div>

        {s === 'accepted' && (
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-800 dark:text-slate-200 space-y-0.5">
            {quote.xero_invoice_url ? <a className="font-bold text-[#0073ea] underline" href={quote.xero_invoice_url} target="_blank" rel="noreferrer">Open your invoice and pay online</a>
              : Object.values(PAYMENT_DETAILS).some(Boolean) ? (
                <>
                  {PAYMENT_DETAILS.accountName && <p><strong>Account name:</strong> {PAYMENT_DETAILS.accountName}</p>}
                  {PAYMENT_DETAILS.bank && <p><strong>Bank:</strong> {PAYMENT_DETAILS.bank}</p>}
                  {PAYMENT_DETAILS.accountNumber && <p><strong>Account number:</strong> {PAYMENT_DETAILS.accountNumber}</p>}
                  {PAYMENT_DETAILS.branchCode && <p><strong>Branch code:</strong> {PAYMENT_DETAILS.branchCode}</p>}
                  {PAYMENT_DETAILS.swift && <p><strong>SWIFT:</strong> {PAYMENT_DETAILS.swift}</p>}
                  <p><strong>Reference:</strong> {ref_ ?? 'your hunt reference'}</p>
                  {PAYMENT_DETAILS.note && <p className="text-slate-500">{PAYMENT_DETAILS.note}</p>}
                </>
              ) : <p>The workshop will send you the payment details. Use <strong>{ref_ ?? 'your hunt reference'}</strong> as the payment reference.</p>}
          </div>
        )}

        <button onClick={() => setOpen(true)} className="w-full min-h-12 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold">{s === 'sent' ? 'Review and accept' : 'View the quote'}</button>
      </div>
      {open && <QuoteSheet quote={quote} total={total} paid={paid} onClose={() => setOpen(false)} onChanged={() => { setOpen(false); onChanged(); }} />}
    </>
  );
}

function QuoteSheet({ quote, total, paid, onClose, onChanged }: { quote: Quote; total: number; paid: number; onClose: () => void; onChanged: () => void }) {
  const [option, setOption] = useState<'deposit' | 'full'>('deposit');
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const deposit = Math.round(total * quote.deposit_percent) / 100;

  async function respond(accept: boolean) {
    setBusy(true);
    const { error } = await (supabase as any).rpc('hunter_respond_quote', { p_quote: quote.id, p_accept: accept, p_comment: comment || null, p_option: option });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? 'Thank you. The quote is accepted.' : 'We have your request.');
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="relative w-full sm:max-w-lg max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-stone-50 dark:bg-stone-950 text-slate-900 dark:text-slate-100 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <button aria-label="Close" onClick={onClose} className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold pr-12">Your quote</h1>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {quote.lines.map(l => <div key={l.id ?? l.description} className="px-4 py-3 flex justify-between gap-4"><span>{l.description}</span><strong className="whitespace-nowrap">{money(l.amount, quote.currency)}</strong></div>)}
          <div className="px-4 py-3 flex justify-between text-lg font-bold"><span>Total</span><span>{money(total, quote.currency)}</span></div>
        </div>
        {quote.note && <p className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm">{quote.note}</p>}

        {quote.status === 'sent' && !asking && (
          <>
            <p className="font-semibold">How would you like to pay?</p>
            {([['deposit', `Pay a ${quote.deposit_percent}% deposit now (${money(deposit, quote.currency)})`, 'Pay the balance before your trophies are shipped.'], ['full', `Pay in full now (${money(total, quote.currency)})`, 'Nothing more to pay.']] as const).map(([k, t, d]) => (
              <button key={k} type="button" aria-pressed={option === k} onClick={() => setOption(k)} className={`w-full text-left rounded-xl border-2 p-3.5 min-h-16 ${option === k ? 'border-green-600 bg-green-50 dark:bg-green-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                <span className="block font-bold">{t}</span><span className="block text-sm text-slate-600 dark:text-slate-300">{d}</span>
              </button>
            ))}
            <button disabled={busy} onClick={() => respond(true)} className="w-full min-h-14 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60">{busy && <Loader2 className="w-5 h-5 animate-spin" />}Accept the quote</button>
            <button onClick={() => setAsking(true)} className="w-full min-h-12 text-[#0073ea] font-semibold">I would like something changed</button>
          </>
        )}
        {quote.status === 'sent' && asking && (
          <>
            <label className="block font-semibold">What would you like changed?</label>
            <textarea rows={4} value={comment} onChange={e => setComment(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-base" />
            <button disabled={busy || !comment.trim()} onClick={() => respond(false)} className="w-full min-h-12 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold disabled:opacity-50">Send my request</button>
            <button onClick={() => setAsking(false)} className="w-full min-h-11 text-slate-500">Back</button>
          </>
        )}
        {quote.status !== 'sent' && paid > 0 && <p className="text-sm text-slate-600 dark:text-slate-300">Received so far: <strong>{money(paid, quote.currency)}</strong>.</p>}
      </div>
    </div>
  );
}
