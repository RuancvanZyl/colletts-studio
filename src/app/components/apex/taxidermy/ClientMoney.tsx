/** ClientMoney — a hunter's quotes, what has been paid and what is outstanding, on their profile. */
import { Loader2 } from 'lucide-react';
import { useQuotePipeline, money, STAGE_LABEL } from '../../../../lib/hooks/useQuotes';

export function ClientMoney({ clientId, onOpenQuote }: { clientId: string; onOpenQuote: (huntId: string) => void }) {
  const { rows, loading } = useQuotePipeline();
  const mine = rows.filter(r => r.client_id === clientId);
  if (loading) return <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>;
  if (mine.length === 0) return <p className="text-sm text-slate-500 py-6 text-center">No quote yet. One appears here as soon as the hunter chooses their mounts.</p>;
  return (
    <div className="space-y-3">
      {mine.map(r => {
        const cur = r.currency ?? 'USD'; const out = Math.max(0, (r.total ?? 0) - r.amount_paid);
        return (
          <button key={r.hunt_id} onClick={() => onOpenQuote(r.hunt_id)} className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-2 min-h-16">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{r.ref_number ?? 'Hunt'}</span>
              <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">{STAGE_LABEL[r.stage]}</span>
            </div>
            {r.total != null ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[{ l: 'Total', v: r.total, c: '' }, { l: 'Paid', v: r.amount_paid, c: 'text-emerald-600' }, { l: 'Outstanding', v: out, c: out > 0.005 ? 'text-amber-600' : 'text-emerald-600' }].map(x => (
                  <div key={x.l} className="rounded-lg bg-slate-50 dark:bg-slate-800 py-1.5"><p className="text-[11px] text-slate-500">{x.l}</p><p className={`text-sm font-bold tabular-nums ${x.c}`}>{money(x.v, cur)}</p></div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">{r.chosen} of {r.animals} animals have a mount. No quote prepared yet.</p>}
            <p className="text-xs text-[#0073ea] font-semibold">Open the quote</p>
          </button>
        );
      })}
    </div>
  );
}
