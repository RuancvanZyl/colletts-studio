/**
 * RegisterHunt — the outfitter tells the workshop who hunted and which animals are coming.
 * Animals only: the hunter chooses the mounts themselves once their trophies arrive.
 */
import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { AnimalPicker, pickedName, type PickedAnimal } from '../shared/AnimalPicker';
import { speciesEmoji } from '../../../../lib/pricing';

const field = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 min-h-12 text-base';
const lab = 'block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold min-h-12 px-5 text-base disabled:opacity-50';
const today = () => new Date().toISOString().slice(0, 10);

export function RegisterHunt({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [hunter, setHunter] = useState({ name: '', email: '', phone: '', country: '', client_type: 'export' });
  const [end, setEnd] = useState(today()); const [start, setStart] = useState(''); const [farm, setFarm] = useState('');
  const [items, setItems] = useState<PickedAnimal[]>([]);
  const [tags, setTags] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const valid1 = hunter.name.trim().length >= 2;
  const valid2 = !!end && end <= today();

  async function send() {
    setBusy(true);
    const { error } = await (supabase as any).rpc('outfitter_register_hunt', {
      p_hunter: hunter, p_start: start || null, p_end: end, p_farm: farm || null,
      p_animals: items.map(it => ({ species: pickedName(it), tag: tags[it.id] ?? '' })),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setDone(true); onDone();
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Registered</h1>
        <p className="text-slate-600 dark:text-slate-300">The workshop knows {hunter.name.split(' ')[0]}'s {items.length} animal{items.length === 1 ? '' : 's'} are on the way. When they arrive, the workshop gives {hunter.name.split(' ')[0]} their own link to choose the mounts.</p>
        <button className={`${btn} bg-green-700 text-white`} onClick={onClose}>Back to my hunts</button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-28">
      <button className="text-sm text-slate-500 min-h-11" onClick={onClose}>✕ Cancel</button>
      <p className="text-sm font-semibold text-slate-500">Step {step} of 4</p>

      {step === 1 && (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Who hunted?</h1>
          <div><label className={lab}>Hunter's full name *</label><input className={field} value={hunter.name} onChange={e => setHunter(h => ({ ...h, name: e.target.value }))} autoFocus /></div>
          <div><label className={lab}>E-mail</label><input className={field} type="email" inputMode="email" value={hunter.email} onChange={e => setHunter(h => ({ ...h, email: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lab}>Mobile / WhatsApp</label><input className={field} inputMode="tel" value={hunter.phone} onChange={e => setHunter(h => ({ ...h, phone: e.target.value }))} /></div>
            <div><label className={lab}>Country</label><input className={field} value={hunter.country} onChange={e => setHunter(h => ({ ...h, country: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[['export', 'Overseas (export)'], ['local', 'South Africa (local)']].map(([v, l]) => <button key={v} type="button" onClick={() => setHunter(h => ({ ...h, client_type: v }))} className={`rounded-lg border-2 min-h-12 text-sm font-semibold ${hunter.client_type === v ? 'border-green-700 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{l}</button>)}
          </div>
          <p className="text-xs text-slate-500">An e-mail or phone number lets the workshop send the hunter their link when the trophies arrive.</p>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">The hunt</h1>
          <div><label className={lab}>When did the hunt end? *</label><input type="date" className={field} value={end} max={today()} onChange={e => setEnd(e.target.value)} /></div>
          <div><label className={lab}>When did it start? <span className="font-normal text-slate-400">(optional)</span></label><input type="date" className={field} value={start} max={end || today()} onChange={e => setStart(e.target.value)} /></div>
          <div><label className={lab}>Farm or area <span className="font-normal text-slate-400">(optional)</span></label><input className={field} value={farm} onChange={e => setFarm(e.target.value)} /></div>
          {!valid2 && <p className="text-sm text-amber-700 dark:text-amber-400">Register the animals once the hunt has ended.</p>}
        </div>
      )}
      {step === 3 && (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Which animals?</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Tap + once for every animal that was taken. You do not choose the mounts, the hunter does that.</p>
          <AnimalPicker items={items} onChange={setItems} plain />
        </div>
      )}
      {step === 4 && (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Check and send</h1>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"><p className="font-bold text-lg text-slate-900 dark:text-slate-100">{hunter.name}</p><p className="text-sm text-slate-500">{[hunter.email, hunter.phone].filter(Boolean).join(' · ') || 'No contact details yet'} · hunt ended {new Date(end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}</p></div>
          <p className="text-sm text-slate-600 dark:text-slate-300">Add your tag numbers if you have them:</p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {items.map(it => (
              <div key={it.id} className="flex items-center gap-3 px-3 py-2">
                <span className="text-2xl">{speciesEmoji(it.base)}</span>
                <span className="flex-1 font-semibold text-slate-900 dark:text-slate-100">{pickedName(it)}</span>
                <input className={`${field} !w-32 !min-h-10`} placeholder="Tag no." value={tags[it.id] ?? ''} onChange={e => setTags(t => ({ ...t, [it.id]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-700 p-3 md:left-64">
        <div className="max-w-xl mx-auto flex gap-2">
          {step > 1 && <button className={`${btn} border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100`} onClick={() => setStep((step - 1) as 1 | 2 | 3)}><ArrowLeft className="w-5 h-5" />Back</button>}
          {step === 1 && <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={!valid1} onClick={() => setStep(2)}>Next: the hunt<ArrowRight className="w-5 h-5" /></button>}
          {step === 2 && <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={!valid2} onClick={() => setStep(3)}>Next: the animals<ArrowRight className="w-5 h-5" /></button>}
          {step === 3 && <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={items.length === 0} onClick={() => setStep(4)}>{items.length ? `Next: check (${items.length})` : 'Add at least one animal'}<ArrowRight className="w-5 h-5" /></button>}
          {step === 4 && <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={busy} onClick={send}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}Send to the workshop</button>}
        </div>
      </div>
    </div>
  );
}
