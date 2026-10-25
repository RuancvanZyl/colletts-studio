/** PaymentsLedger — money in and money still to come, across all hunters. Older deposit submissions sit underneath. */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useQuotePipeline, money, STAGE_LABEL } from '../../../../lib/hooks/useQuotes';
import { PaymentConfirmation } from './PaymentConfirmation';

interface Pay { id: string; amount: number; method: string | null; reference: string | null; received_at: string; source: string; currency: string; client: string; ref: string; huntId: string }

export function PaymentsLedger({ onOpenQuote }: { onOpenQuote: (huntId: string) => void }) {
  const { rows, loading } = useQuotePipeline();
  const [pays, setPays] = useState<Pay[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('quote_payments')
        .select('id, amount, method, reference, received_at, source, quotes(currency, hunt_id, clients(full_name), client_hunts(ref_number))')
        .order('received_at', { ascending: false }).limit(60);
      setPays((data ?? []).map((p: any) => ({ id: p.id, amount: Number(p.amount), method: p.method, reference: p.reference, received_at: p.received_at, source: p.source, currency: p.quotes?.currency ?? 'USD', client: p.quotes?.clients?.full_name ?? '', ref: p.quotes?.client_hunts?.ref_number ?? '', huntId: p.quotes?.hunt_id })));
      setBusy(false);
    })();
  }, []);

  const month = new Date().toISOString().slice(0, 7);
  const sum = (cur: string, f: (p: Pay) => boolean) => pays.filter(p => p.currency === cur && f(p)).reduce((n, p) => n + p.amount, 0);
  const owing = rows.filter(r => ['accepted', 'deposit_paid'].includes(r.quote_status ?? '') && (r.total ?? 0) - r.amount_paid > 0.005)
    .sort((a, b) => ((b.total ?? 0) - b.amount_paid) - ((a.total ?? 0) - a.amount_paid));
  const owe = (cur: string) => owing.filter(r => r.currency === cur).reduce((n, r) => n + (r.total ?? 0) - r.amount_paid, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div><h1 className="text-3xl font-bold text-slate-100">Payments</h1><p className="text-base text-slate-400 mt-1">What has come in, and what hunters still owe.</p></div>
      <div className="grid grid-cols-2 gap-3">
        {['USD', 'ZAR'].map(cur => (
          <div key={cur} className="rounded-2xl border border-slate-700 bg-[#111c26] p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{cur === 'USD' ? 'US dollars' : 'Rand'}</p>
            <div><p className="text-xs text-slate-400">Received this month</p><p className="text-2xl font-bold text-emerald-300 tabular-nums">{money(sum(cur, p => p.received_at.startsWith(month)), cur)}</p></div>
            <div><p className="text-xs text-slate-400">Outstanding</p><p className="text-2xl font-bold text-amber-300 tabular-nums">{money(owe(cur), cur)}</p></div>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Still owed · {owing.length}</h2>
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : owing.length === 0 ? <p className="text-slate-400">Nobody owes anything on an accepted quote.</p> : (
          <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
            {owing.map(r => (
              <button key={r.hunt_id} onClick={() => onOpenQuote(r.hunt_id)} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-16 hover:bg-[#162330]">
                <span className="flex-1 min-w-0"><span className="block text-lg font-semibold text-slate-100">{r.client_name}</span><span className="block text-sm text-slate-400">{r.ref_number} · {STAGE_LABEL[r.stage]} · paid {money(r.amount_paid, r.currency ?? 'USD')} of {money(r.total, r.currency ?? 'USD')}</span></span>
                <span className="text-xl font-bold text-amber-300 tabular-nums">{money((r.total ?? 0) - r.amount_paid, r.currency ?? 'USD')}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Recent payments</h2>
        {busy ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : pays.length === 0 ? <p className="text-slate-400">No payments recorded yet.</p> : (
          <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
            {pays.map(p => (
              <button key={p.id} onClick={() => p.huntId && onOpenQuote(p.huntId)} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-14 hover:bg-[#162330]">
                <span className="flex-1 min-w-0"><span className="block text-base font-semibold text-slate-100">{p.client}</span><span className="block text-xs text-slate-400">{new Date(p.received_at).toLocaleDateString('en-ZA')} · {p.method ?? ''}{p.reference ? ` · ${p.reference}` : ''}{p.source === 'xero' ? ' · Xero' : ''}</span></span>
                <span className="text-lg font-bold text-emerald-300 tabular-nums">{money(p.amount, p.currency)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <details className="rounded-2xl border border-slate-700 bg-[#111c26] p-4">
        <summary className="cursor-pointer text-base font-semibold text-slate-200 min-h-11 flex items-center">Older hunter submissions waiting for a deposit</summary>
        <div className="pt-3"><PaymentConfirmation /></div>
      </details>
    </div>
  );
}
