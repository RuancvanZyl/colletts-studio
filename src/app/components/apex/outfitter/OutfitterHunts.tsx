/** OutfitterHunts — the outfitter's home: their hunts, where each animal is, and the money side. */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Plus } from 'lucide-react';
import { useOutfitter, animalState, type OHunt } from '../../../../lib/hooks/useOutfitter';
import { money } from '../../../../lib/hooks/useQuotes';
import { sciName } from '../../../../lib/species';
import { OutfitterCases } from './OutfitterCases';

const QUOTE_LABEL: Record<string, string> = { sent: 'Quote sent to the hunter', accepted: 'Accepted, waiting for payment', deposit_paid: 'Deposit paid', paid: 'Paid in full', declined: 'Hunter asked for changes' };

export function OutfitterHunts({ onRegister }: { onRegister: () => void }) {
  const { data, loading } = useOutfitter();
  const [open, setOpen] = useState<string | null>(null);

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <p className="max-w-md mx-auto text-center py-16 text-slate-600">We could not find your outfitter profile. Please contact the workshop.</p>;

  const active = data.outfitter.status === 'active';
  const hunts = data.hunts;
  const animals = hunts.reduce((n, h) => n + h.animals.length, 0);
  const owed = ['USD', 'ZAR'].map(c => ({ c, v: hunts.filter(h => h.money?.currency === c && ['accepted', 'deposit_paid'].includes(h.money.status)).reduce((n, h) => n + Math.max(0, h.money!.total - h.money!.paid), 0) })).filter(x => x.v > 0.005);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.outfitter.name}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Your hunters, their animals and where everything stands.</p>
      </div>

      <OutfitterCases />

      {!active && <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 text-slate-900 dark:text-slate-100"><p className="font-bold">Your account is waiting to be activated</p><p className="text-sm">The workshop will activate it shortly. You can register hunts as soon as they do.</p></div>}

      <div className="grid grid-cols-3 gap-3 text-center">
        {[{ n: hunts.length, l: 'Hunts' }, { n: animals, l: 'Animals' }, { n: hunts.filter(h => h.animals.some(a => a.status === 'awaiting_arrival')).length, l: 'On the way' }].map(x => (
          <div key={x.l} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3"><p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{x.n}</p><p className="text-xs text-slate-500">{x.l}</p></div>
        ))}
      </div>
      {owed.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <span className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">Amount outstanding</span>
          {owed.map(o => <span key={o.c} className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{money(o.v, o.c)}</span>)}
        </div>
      )}

      <button disabled={!active} onClick={onRegister} className="w-full min-h-14 rounded-2xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"><Plus className="w-6 h-6" />Register a hunt</button>

      {hunts.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-slate-500">No hunts yet. Register a hunt once your hunter's animals are on their way.</p>}
      {hunts.map(h => <Hunt key={h.id} h={h} open={open === h.id} toggle={() => setOpen(open === h.id ? null : h.id)} />)}
    </div>
  );
}

function Hunt({ h, open, toggle }: { h: OHunt; open: boolean; toggle: () => void }) {
  const counts = { way: h.animals.filter(a => a.status === 'awaiting_arrival').length, done: h.animals.filter(a => animalState(a).tone === 'done').length };
  const m = h.money; const out = m ? Math.max(0, m.total - m.paid) : 0;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <button onClick={toggle} aria-expanded={open} className="w-full text-left p-4 flex items-start gap-3">
        <span className="flex-1 min-w-0 space-y-1">
          <span className="block text-lg font-bold text-slate-900 dark:text-slate-100">{h.hunter}</span>
          <span className="block text-sm text-slate-600 dark:text-slate-300">{h.animals.length} animal{h.animals.length === 1 ? '' : 's'}{counts.way ? ` · ${counts.way} on the way` : ''}{counts.done ? ` · ${counts.done} finished` : ''}{h.end ? ` · hunt ended ${new Date(h.end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}` : ''}</span>
          <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{m ? `${QUOTE_LABEL[m.status] ?? m.status}${out > 0.005 ? ` · outstanding ${money(out, m.currency)}` : ''}` : 'No quote yet'}</span>
        </span>
        {open ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          {!h.registered && <p className="text-xs text-slate-500">{h.hunter} gets their own profile link from the workshop when the trophies arrive. They choose the mounts themselves.</p>}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {h.animals.map((a, i) => {
              const st = animalState(a);
              return (
                <li key={i} className="py-2.5 flex items-start gap-3">
                  <span className="flex-1 min-w-0"><span className="block font-semibold text-slate-900 dark:text-slate-100">{a.species}{a.tag ? <span className="text-slate-400 font-normal"> · {a.tag}</span> : null}</span>{sciName(a.species ?? '') && <span className="block text-xs italic text-slate-500">{sciName(a.species ?? '')}</span>}</span>
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${st.tone === 'done' ? 'bg-green-100 text-green-800' : st.tone === 'todo' ? 'bg-amber-100 text-amber-800' : st.tone === 'wait' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'bg-sky-100 text-sky-800'}`}>{st.label}</span>
                </li>
              );
            })}
          </ul>
          {m && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ l: 'Total', v: m.total }, { l: 'Paid', v: m.paid }, { l: 'Outstanding', v: out }].map(x => (
                <div key={x.l} className={`rounded-xl border px-2 py-2 ${x.l === 'Outstanding' && x.v > 0.005 ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'}`}><p className="text-xs text-slate-500">{x.l}</p><p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{money(x.v, m.currency)}</p></div>
              ))}
              {m.paid_by_outfitter > 0 && <p className="col-span-3 text-xs text-slate-500">Of the amount paid, {money(m.paid_by_outfitter, m.currency)} was paid by you.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
