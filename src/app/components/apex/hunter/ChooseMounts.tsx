/**
 * ChooseMounts — the hunter decides what they want done with each animal.
 * One animal per screen: pick a mount (with the price), the pose for mounts with a head, notes.
 * Two special choices: a CUSTOM mount (their own idea, photos, can combine several of their animals into one)
 * and a REPLICA (with the reason). Used for animals the workshop has received and for animals added after the hunt.
 */
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { mountsFor, formatPrice, speciesEmoji, HEAD_POSITIONS, NECK_POSITIONS, REPLICA_TYPES, REPLICA_REASONS, mountHasHead } from '../../../../lib/pricing';
import { sciName } from '../../../../lib/species';
import { listParts } from '../../../../lib/received';
import { savePhotos, shrinkPhoto } from '../../../../lib/offline/photos';

export interface MountAnimal { docId: string; huntId?: string; species: string; parts: { code: string; label: string }[]; other: string; mount: string; instructions: string; expected?: boolean }
export interface MountPick {
  mount: string; notes: string; head: string; neck: string;
  custom: { description: string; files: File[]; combine: string[] };
  replica: { type: string; reasons: string[] };
}
/** An animal of the hunter's that could be folded into someone's custom mount. */
export interface Combinable { docId: string; species: string }

const stripLead = (t: string) => t.replace(/^(Pose: [^.]*\.|CUSTOM MOUNT:[^]*|REPLICA[^.]*\.)\s*/, '');
const blank = (a: MountAnimal): MountPick => ({ mount: a.mount, notes: stripLead(a.instructions), head: '', neck: '', custom: { description: '', files: [], combine: [] }, replica: { type: '', reasons: [] } });

export function ChooseMounts({ animals, clientType, clientId, combinable = [], onClose, onSaved, onConfirmPicks, doneText, doneExtra }: {
  animals: MountAnimal[]; clientType: string; clientId?: string; combinable?: Combinable[];
  onClose: () => void; onSaved: () => void;
  /** Replace the default "save each animal" (used when the animals are not saved yet). Return an error text, or null when done. */
  onConfirmPicks?: (picks: Record<string, MountPick>) => Promise<string | null>;
  doneText?: string; doneExtra?: React.ReactNode;
}) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Record<string, MountPick>>(() => Object.fromEntries(animals.map(a => [a.docId, blank(a)])));
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const a = animals[i];
  const set = (id: string, p: Partial<MountPick>) => setPicks(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));
  const setCustom = (id: string, p: Partial<MountPick['custom']>) => setPicks(prev => ({ ...prev, [id]: { ...prev[id], custom: { ...prev[id].custom, ...p } } }));
  const setReplica = (id: string, p: Partial<MountPick['replica']>) => setPicks(prev => ({ ...prev, [id]: { ...prev[id], replica: { ...prev[id].replica, ...p } } }));

  // who is folded into whose custom mount
  const includedBy: Record<string, string> = {};
  for (const x of animals) if (picks[x.docId]?.mount === 'Custom mount') for (const id of picks[x.docId].custom.combine) includedBy[id] = x.docId;
  const nameOf = (id: string) => animals.find(x => x.docId === id)?.species ?? combinable.find(c => c.docId === id)?.species ?? 'animal';

  const priceOf = (x: MountAnimal) => includedBy[x.docId] ? 0 : mountsFor(x.species, clientType).find(o => o.name === picks[x.docId]?.mount)?.price ?? 0;
  const total = animals.reduce((s, x) => s + priceOf(x), 0);
  const unpriced = animals.filter(x => !includedBy[x.docId] && picks[x.docId]?.mount && !priceOf(x)).length;

  async function confirm() {
    setSaving(true);
    let failed = 0;
    if (onConfirmPicks) {
      const err = await onConfirmPicks(picks);
      if (err) { failed = 1; toast.error(err); }
    } else {
      for (const x of animals) {
        const p = picks[x.docId];
        if (!p?.mount || includedBy[x.docId]) continue;       // combined animals are set by the custom mount they belong to
        const pose = mountHasHead(p.mount) && (p.head || p.neck) ? { head: p.head || null, neck: p.neck || null } : null;
        const extra = p.mount === 'Custom mount' ? { custom: { description: p.custom.description, combine: p.custom.combine } }
          : p.mount === 'Replica' ? { replica: { type: p.replica.type, reasons: p.replica.reasons } } : null;
        const { error } = await (supabase as any).rpc('hunter_choose_mount', { p_doc: x.docId, p_mount: p.mount, p_notes: p.notes || null, p_pose: pose, p_extra: extra });
        if (error) { failed++; toast.error(`${x.species}: ${error.message}`); continue; }
        if (p.mount === 'Custom mount' && p.custom.files.length && clientId) {
          const blobs = await Promise.all(p.custom.files.map(f => shrinkPhoto(f)));
          await savePhotos({ clientId, huntId: x.huntId ?? null, docId: x.docId, kind: 'reference', shared: true, files: blobs, staffId: null, staffName: null });
        }
      }
    }
    setSaving(false);
    if (failed === 0) { setDone(true); onSaved(); }
  }

  const btn = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold min-h-12 px-5 text-base disabled:opacity-50';
  const chip = (on: boolean) => `rounded-full border-2 px-4 min-h-11 text-sm font-semibold ${on ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`;
  const box = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4';

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thank you!</h1>
        <p className="text-slate-600 dark:text-slate-300">{doneText ?? 'We have your choices. The workshop will confirm the quote with you and start work. You can follow every stage — with photos — right here.'}</p>
        {doneExtra}
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
            const p = picks[x.docId]; const price = priceOf(x); const inc = includedBy[x.docId];
            const pose = p?.mount && mountHasHead(p.mount) ? [p.head, p.neck && `neck ${p.neck.toLowerCase()}`].filter(Boolean).join(', ') : '';
            return (
              <button key={x.docId} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-14" onClick={() => { setI(idx); setReview(false); }}>
                <span className="text-2xl">{speciesEmoji(x.species)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-900 dark:text-slate-100">{x.species}</span>
                  <span className="block text-xs italic text-slate-500">{sciName(x.species)}</span>
                  <span className={`block text-sm ${p?.mount || inc ? 'text-slate-600 dark:text-slate-300' : 'text-amber-600'}`}>
                    {inc ? `Part of the custom mount with the ${nameOf(inc)}` : p?.mount ? `${p.mount}${p.mount === 'Replica' && p.replica.type ? ` (${p.replica.type})` : ''}` : 'Not chosen yet — tap to choose'}{pose ? ` · ${pose}` : ''}
                  </span>
                  {p?.mount === 'Custom mount' && p.custom.combine.length > 0 && <span className="block text-xs text-slate-500">Combines with: {p.custom.combine.map(nameOf).join(', ')}</span>}
                  {p?.mount === 'Custom mount' && p.custom.files.length > 0 && <span className="block text-xs text-slate-500">{p.custom.files.length} reference photo{p.custom.files.length > 1 ? 's' : ''}</span>}
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{inc ? '' : price ? formatPrice(price, clientType) : p?.mount ? 'We quote' : ''}</span>
              </button>
            );
          })}
        </div>
        {total > 0 && (
          <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-bold text-lg text-slate-900 dark:text-slate-100">Estimate: {formatPrice(total, clientType)}</p>
            <p>{unpriced > 0 ? `${unpriced} item${unpriced > 1 ? 's' : ''} (custom mounts, replicas and others) will be quoted separately. ` : ''}Prices are our 2026 price list. The workshop confirms the final quote before work starts.</p>
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
  const inc = includedBy[a.docId];
  // animals this one could be combined with: everything else on the hunter's list, not already folded into another custom mount
  const others = [...animals.filter(x => x.docId !== a.docId).map(x => ({ docId: x.docId, species: x.species })), ...combinable.filter(c => !animals.some(x => x.docId === c.docId) && c.docId !== a.docId)]
    .filter(o => !includedBy[o.docId] || includedBy[o.docId] === a.docId)
    .filter(o => picks[o.docId]?.mount !== 'Custom mount' || (picks[o.docId]?.custom.combine.length ?? 0) === 0 || false);

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-28">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) setCustom(a.docId, { files: [...p.custom.files, ...f].slice(0, 6) }); e.target.value = ''; }} />
      <div className="flex items-center justify-between">
        <button className="text-sm text-slate-500 min-h-11" onClick={onClose}>✕ Close</button>
        <span className="text-sm font-semibold text-slate-500">Animal {i + 1} of {animals.length}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{speciesEmoji(a.species)}</span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{a.species}</h1>
          {sciName(a.species) && <p className="text-sm italic text-slate-500">{sciName(a.species)}</p>}
          {!a.expected && <p className="text-sm text-slate-600 dark:text-slate-300">We received: {a.parts.length ? listParts(a.parts.map(x => x.code), a.other) : 'details to follow'}</p>}
        </div>
      </div>

      {inc ? (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <p className="font-bold text-slate-900 dark:text-slate-100">This animal is part of the custom mount with the {nameOf(inc)}.</p>
          <button className={`${btn} border border-slate-400 text-slate-800 dark:text-slate-100`} onClick={() => setCustom(inc, { combine: picks[inc].custom.combine.filter(x => x !== a.docId) })}>Take it out of that custom mount</button>
        </div>
      ) : (
        <>
          <p className="font-semibold text-slate-800 dark:text-slate-100">How would you like it done?</p>
          <div className="space-y-2">
            {options.map(o => {
              const on = p?.mount === o.name;
              return (
                <button key={o.name} type="button" aria-pressed={on} onClick={() => set(a.docId, { mount: o.name })}
                  className={`w-full text-left rounded-xl border-2 p-3.5 flex items-start gap-3 min-h-16 ${on ? 'border-green-600 bg-green-50 dark:bg-green-950/30' : o.special ? 'border-dashed border-amber-400 bg-amber-50/60 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                  <span className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${on ? 'border-green-600 bg-green-600 text-white text-xs' : 'border-slate-300'}`}>{on ? '✓' : ''}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-900 dark:text-slate-100">{o.special === 'custom' && <Sparkles className="inline w-4 h-4 mr-1 text-amber-600" />}{o.name}</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">{o.blurb}</span>
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{o.price ? formatPrice(o.price, clientType) : 'We quote'}</span>
                </button>
              );
            })}
          </div>

          {p?.mount === 'Custom mount' && (
            <div className={box}>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Describe your idea *</p>
                <p className="text-sm text-slate-500 mb-2">Pose, scene, base, what it should look like. The more detail the better.</p>
                <textarea rows={5} value={p.custom.description} onChange={e => setCustom(a.docId, { description: e.target.value })}
                  placeholder="e.g. The kudu with its head turned back, on a rock base, and the impala leaping beside it…"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-base" />
                {p.custom.description.trim().length < 5 && <p className="text-xs text-amber-600 mt-1">Please describe your idea so we can quote it.</p>}
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Reference photos <span className="font-normal text-slate-400">(optional)</span></p>
                <div className="flex flex-wrap gap-2">
                  {p.custom.files.map((f, k) => (
                    <div key={k} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      <button type="button" aria-label="Remove photo" className="absolute top-0.5 right-0.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center" onClick={() => setCustom(a.docId, { files: p.custom.files.filter((_, j) => j !== k) })}><X className="w-3.5 h-3.5 text-white" /></button>
                    </div>
                  ))}
                  {p.custom.files.length < 6 && <button type="button" className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-500 text-xs gap-1" onClick={() => fileRef.current?.click()}><Camera className="w-5 h-5" />Add photo</button>}
                </div>
              </div>
              {others.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Combine with other animals on your list?</p>
                  <p className="text-sm text-slate-500 mb-2">Tick any animal that should be part of this one mount.</p>
                  <div className="space-y-2">
                    {others.map(o => {
                      const on = p.custom.combine.includes(o.docId);
                      return (
                        <button key={o.docId} type="button" aria-pressed={on} onClick={() => setCustom(a.docId, { combine: on ? p.custom.combine.filter(x => x !== o.docId) : [...p.custom.combine, o.docId] })}
                          className={`w-full text-left flex items-center gap-3 rounded-xl border-2 px-3 min-h-14 ${on ? 'border-green-600 bg-green-50 dark:bg-green-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                          <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm ${on ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300'}`}>{on ? '✓' : ''}</span>
                          <span className="text-xl">{speciesEmoji(o.species)}</span>
                          <span className="flex-1 font-semibold text-slate-900 dark:text-slate-100">{o.species}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {p?.mount === 'Replica' && (
            <div className={box}>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">What kind of replica?</p>
                <div className="flex flex-wrap gap-2">{REPLICA_TYPES.map(t => <button key={t} type="button" aria-pressed={p.replica.type === t} className={chip(p.replica.type === t)} onClick={() => setReplica(a.docId, { type: p.replica.type === t ? '' : t })}>{t}</button>)}</div>
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Why a replica? <span className="font-normal text-slate-400">(pick any)</span></p>
                <div className="flex flex-wrap gap-2">{REPLICA_REASONS.map(r => {
                  const on = p.replica.reasons.includes(r);
                  return <button key={r} type="button" aria-pressed={on} className={chip(on)} onClick={() => setReplica(a.docId, { reasons: on ? p.replica.reasons.filter(x => x !== r) : [...p.replica.reasons, r] })}>{r}</button>;
                })}</div>
              </div>
            </div>
          )}

          {p?.mount && mountHasHead(p.mount) && (
            <div className={box}>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Which way should the head face?</p>
                <div className="flex flex-wrap gap-2">{HEAD_POSITIONS.map(h => <button key={h} type="button" aria-pressed={p.head === h} className={chip(p.head === h)} onClick={() => set(a.docId, { head: p.head === h ? '' : h })}>{h}</button>)}</div>
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Neck position</p>
                <div className="flex flex-wrap gap-2">{NECK_POSITIONS.map(n => <button key={n} type="button" aria-pressed={p.neck === n} className={chip(p.neck === n)} onClick={() => set(a.docId, { neck: p.neck === n ? '' : n })}>{n}</button>)}</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Anything we should know? <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea rows={3} value={p?.notes ?? ''} onChange={e => set(a.docId, { notes: e.target.value })} placeholder="What to do with the feet or tail, ear position, anything else…"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-base" />
          </div>
        </>
      )}

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-700 p-3 md:left-64">
        <div className="max-w-xl mx-auto flex gap-2">
          {i > 0 && <button className={`${btn} border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100`} onClick={() => setI(i - 1)}><ArrowLeft className="w-5 h-5" />Back</button>}
          {i < animals.length - 1
            ? <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={p?.mount === 'Custom mount' && p.custom.description.trim().length < 5} onClick={() => setI(i + 1)}>{p?.mount || inc ? 'Next animal' : 'Skip for now'}<ArrowRight className="w-5 h-5" /></button>
            : <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={p?.mount === 'Custom mount' && p.custom.description.trim().length < 5} onClick={() => setReview(true)}>Review my choices<ArrowRight className="w-5 h-5" /></button>}
        </div>
      </div>
    </div>
  );
}
