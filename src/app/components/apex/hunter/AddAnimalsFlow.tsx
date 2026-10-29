/**
 * AddAnimalsFlow — after the hunt, before the trophies reach the workshop: the hunter lists their animals,
 * chooses a mount for each (seeing the prices) and the workshop gets an order waiting for the trophies to arrive.
 */
import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarCheck } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { AnimalPicker, pickedName, type PickedAnimal } from '../shared/AnimalPicker';
import { ChooseMounts, type MountPick } from './ChooseMounts';
import { savePhotos, shrinkPhoto } from '../../../../lib/offline/photos';
import { mountHasHead } from '../../../../lib/pricing';
import { useHunterAnimals } from '../../../../lib/hooks/useHunterAnimals';
import { collectionOf, newBadges, rankOf } from '../../../../lib/collection';

const field = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 min-h-12 text-base';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold min-h-12 px-5 text-base disabled:opacity-50';
const today = () => new Date().toISOString().slice(0, 10);

export function AddAnimalsFlow({ clientId, clientType, onClose, onSaved }: { clientId: string; clientType: string; onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<'hunt' | 'pick' | 'mounts'>('hunt');
  const [endDate, setEndDate] = useState(today());
  const [startDate, setStartDate] = useState('');
  const [operator, setOperator] = useState('');
  const [items, setItems] = useState<PickedAnimal[]>([]);
  const { animals: existing } = useHunterAnimals();
  const before = collectionOf(existing.map(a => a.species));

  const ended = !!endDate && endDate <= today();

  if (step === 'mounts') {
    const after = collectionOf([...existing.map(a => a.species), ...items.map(pickedName)]);
    const gained = after.speciesCount - before.speciesCount;
    const unlocked = newBadges(before, after);
    const extra = (
      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 text-left space-y-2">
        <p className="font-bold text-slate-900 dark:text-slate-100">{gained > 0 ? `+${gained} new species — you now have ${after.speciesCount}` : `Your collection stays at ${after.speciesCount} species`}</p>
        <p className="text-sm text-slate-700 dark:text-slate-300">Rank: {rankOf(after.speciesCount).title}</p>
        {unlocked.map(b => <p key={b.id} className="text-base font-semibold text-amber-900 dark:text-amber-200">{b.icon} Badge unlocked: {b.title}</p>)}
      </div>
    );
    const drafts = items.map(it => ({ docId: it.id, species: pickedName(it), parts: [], other: '', mount: '', instructions: '', expected: true }));
    return (
      <ChooseMounts
        animals={drafts} clientType={clientType} clientId={clientId} onClose={onClose} onSaved={onSaved}
        doneExtra={extra}
        doneText="Your animals are registered with the workshop. When your trophies arrive we tick off exactly what came in, and you can follow every stage, with photos, right here."
        onConfirmPicks={async (picks: Record<string, MountPick>) => {
          // an animal folded into another animal's custom mount is described by that mount
          const included = new Set<string>();
          for (const d of drafts) if (picks[d.docId]?.mount === 'Custom mount') picks[d.docId].custom.combine.forEach(k => included.add(k));
          const animals = drafts.map(d => {
            const p = picks[d.docId];
            const mount = included.has(d.docId) ? '' : (p?.mount ?? '');
            const pose = mount && mountHasHead(mount) && (p.head || p.neck) ? { head: p.head || null, neck: p.neck || null } : null;
            return {
              key: d.docId, species: d.species, mount, notes: p?.notes ?? '', pose,
              custom: mount === 'Custom mount' ? { description: p.custom.description, combine: p.custom.combine } : null,
              replica: mount === 'Replica' ? { type: p.replica.type, reasons: p.replica.reasons } : null,
            };
          });
          const { data, error } = await (supabase as any).rpc('hunter_register_animals', { p_start: startDate || null, p_end: endDate, p_operator: operator || null, p_animals: animals });
          if (error) return error.message;
          // reference photos for custom mounts, now that the job cards exist
          const ids: Record<string, string> = Object.fromEntries((data?.docs ?? []).map((x: any) => [x.key, x.id]));
          for (const d of drafts) {
            const p = picks[d.docId];
            if (p?.mount === 'Custom mount' && p.custom.files.length && ids[d.docId]) {
              const blobs = await Promise.all(p.custom.files.map(f => shrinkPhoto(f)));
              await savePhotos({ clientId, huntId: data.hunt_id, docId: ids[d.docId], kind: 'reference', shared: true, files: blobs, staffId: null, staffName: null });
            }
          }
          return null;
        }}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-28">
      <button className="text-sm text-slate-500 min-h-11" onClick={onClose}>✕ Close</button>

      {step === 'hunt' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add my animals</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Once your hunt is over, tell us what you hunted and how you would like each animal done. We will be ready when your trophies arrive.</p>
          </div>
          <div className="space-y-3">
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">When did your hunt end? *</label>
              <input type="date" className={field} value={endDate} max={today()} onChange={e => setEndDate(e.target.value)} /></div>
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">When did it start? <span className="font-normal text-slate-400">(optional)</span></label>
              <input type="date" className={field} value={startDate} max={endDate || today()} onChange={e => setStartDate(e.target.value)} /></div>
            <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Outfitter or farm <span className="font-normal text-slate-400">(optional)</span></label>
              <input className={field} value={operator} onChange={e => setOperator(e.target.value)} placeholder="e.g. Steve Collett Safaris" /></div>
          </div>
          {!ended && endDate && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-slate-800 dark:text-slate-200">
              <CalendarCheck className="w-5 h-5 text-amber-600 shrink-0" />You can add your animals once your hunt has ended. Come back after {new Date(endDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}.
            </div>
          )}
        </>
      )}

      {step === 'pick' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Which animals did you hunt?</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Tap + once for each animal. If an animal comes in different colours you can choose the colour after you add it.</p>
          </div>
          <AnimalPicker items={items} onChange={setItems} hunted={before.hunted} />
        </>
      )}

      <div className="fixed bottom-[4.75rem] md:bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-700 p-3 md:left-64">
        <div className="max-w-xl mx-auto flex gap-2">
          {step === 'pick' && <button className={`${btn} border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100`} onClick={() => setStep('hunt')}><ArrowLeft className="w-5 h-5" />Back</button>}
          {step === 'hunt'
            ? <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={!ended} onClick={() => setStep('pick')}>Next: choose my animals<ArrowRight className="w-5 h-5" /></button>
            : <button className={`${btn} flex-1 bg-green-700 text-white`} disabled={items.length === 0} onClick={() => setStep('mounts')}>{items.length === 0 ? 'Add at least one animal' : `Next: choose mounts (${items.length})`}<ArrowRight className="w-5 h-5" /></button>}
        </div>
      </div>
    </div>
  );
}
