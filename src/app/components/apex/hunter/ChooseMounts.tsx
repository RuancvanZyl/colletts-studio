/**
 * ChooseMounts — the hunter decides what they want done with each animal.
 * One animal per screen: see what we received, pick a mount (with the price), add notes. Review, confirm.
 */
import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { mountsFor, formatPrice, speciesEmoji } from '../../../../lib/pricing';
import { listParts } from '../../../../lib/received';
import type { HunterAnimal } from '../../../../lib/hooks/useHunterAnimals';

interface Pick { mount: string; notes: string }

export function ChooseMounts({ animals, clientType, onClose, onSaved }: {
  animals: HunterAnimal[]; clientType: string; onClose: () => void; onSaved: () => void;
}) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Record<string, Pick>>(() => Object.fromEntries(animals.map(a => [a.docId, { mount: a.mount, notes: a.instructions }])));
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const a = animals[i];
  const set = (id: string, p: Partial<Pick>) => setPicks(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));
  const total = animals.reduce((s, x) => { const m = mountsFor(x.species, clientType).find(o => o.name === picks[x.docId]?.mount); return s + (m?.price ?? 0); }, 0);
  const unpriced = animals.filter(x => picks[x.docId]?.mount && !mountsFor(x.species, clientType).find(o => o.name === picks[x.docId].mount)?.price).length;

  async function confirm() {
    setSaving(true);
    let failed = 0;
    for (const x of animals) {
      const p = picks[x.docId];
      if (!p?.mount) continue;
      const { error } = await (supabase as any).rpc('hunter_choose_mount', { p_doc: x.docId, p_mount: p.mount, p_notes: p.notes || null });
      if (error) { failed++; toast.error(`${x.species}: ${error.message}`); }
    }
    setSaving(false);
    if (failed === 0) { setDone(true); onSaved(); }
  }

  const btn = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold min-h-12 px-5 text-base disabled:opacity-50';

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thank you!</h1>
        <p className="text-slate-600 dark:text-slate-300">We have your choices. The workshop will confirm the quote with you and start work. You can follow every stage — with photos — right here.</p>
        <button className={`${btn} bg-green-700 text-white`} onClick={onClose}>Back to my trophies</button>
      </div>
    );
  }

  if (review) {
    return (
      <div className="max-w-xl mx-auto space-y-4 pb-28">
        <button className="text-sm text-slate-500 min-h-11 inline-flex items-center gap-1" onClick={() => setReview(false)}><ArrowLeft className="w-4 h-4" />Back</button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your choices</h1>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {animals.map((x, idx) => {
            const p = picks[x.docId]; const m = mountsFor(x.species, clientType).find(o => o.name === p?.mount);
            return (
              <button key={x.docId} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-14" onClick={() => { setI(idx); setReview(false); }}>
                <span className="text-2xl">{speciesEmoji(x.species)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-900 dark:text-slate-100">{x.species}</span>
                  <span className={`block text-sm ${p?.mount ? 'text-slate-600 dark:text-slate-300' : 'text-amber-600'}`}>{p?.mount || 'Not chosen yet — tap to choose'}</span>
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{m?.price ? formatPrice(m.price, clientType) : p?.mount ? 'We quote' : ''}</span>
              </button>
            );
          })}
        </div>
        {total > 0 && (
          <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-bold text-lg text-slate-900 dark:text-slate-100">Estimate: {formatPrice(total, clientType)}</p>
            <p>{unpriced > 0 ? `${unpriced} item${unpriced > 1 ? 's' : ''} will be quoted separately. ` : ''}Prices are our 2026 price list. The workshop confirms the final quote before work starts.</p>
          </div>
        )}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-700 p-3 md:left-64">
          <div className="max-w-xl mx-auto flex gap-2">
            <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={saving || animals.every(x => !picks[x.docId]?.mount)} onClick={confirm}>
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}Confirm my choices
            </button>
          </div>
        </div>
      </div>
    );
  }

  const options = mountsFor(a.species, clientType);
  const p = picks[a.docId];
  return (
    <div className="max-w-xl mx-auto space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <button className="text-sm text-slate-500 min-h-11" onClick={onClose}>✕ Close</button>
        <span className="text-sm font-semibold text-slate-500">Animal {i + 1} of {animals.length}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{speciesEmoji(a.species)}</span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{a.species}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">We received: {a.parts.length ? listParts(a.parts.map(x => x.code), a.other) : 'details to follow'}</p>
        </div>
      </div>
      <p className="font-semibold text-slate-800 dark:text-slate-100">How would you like it done?</p>
      <div className="space-y-2">
        {options.map(o => {
          const on = p?.mount === o.name;
          return (
            <button key={o.name} type="button" aria-pressed={on} onClick={() => set(a.docId, { mount: o.name })}
              className={`w-full text-left rounded-xl border-2 p-3.5 flex items-start gap-3 min-h-16 ${on ? 'border-green-600 bg-green-50 dark:bg-green-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
              <span className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${on ? 'border-green-600 bg-green-600 text-white text-xs' : 'border-slate-300'}`}>{on ? '✓' : ''}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-slate-900 dark:text-slate-100">{o.name}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-300">{o.blurb}</span>
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{o.price ? formatPrice(o.price, clientType) : 'We quote'}</span>
            </button>
          );
        })}
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Anything we should know? <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea rows={3} value={p?.notes ?? ''} onChange={e => set(a.docId, { notes: e.target.value })} placeholder="Pose, which way the head should face, what to do with feet or tail…"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-base" />
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-700 p-3 md:left-64">
        <div className="max-w-xl mx-auto flex gap-2">
          {i > 0 && <button className={`${btn} border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100`} onClick={() => setI(i - 1)}><ArrowLeft className="w-5 h-5" />Back</button>}
          {i < animals.length - 1
            ? <button className={`${btn} flex-1 bg-green-700 text-white`} onClick={() => setI(i + 1)}>{p?.mount ? 'Next animal' : 'Skip for now'}<ArrowRight className="w-5 h-5" /></button>
            : <button className={`${btn} flex-1 bg-green-700 text-white`} onClick={() => setReview(true)}>Review my choices<ArrowRight className="w-5 h-5" /></button>}
        </div>
      </div>
    </div>
  );
}
