/**
 * HunterCollection — the hunter's life list. Every African species is a card: collected ones are in colour,
 * the rest wait greyed out. Progress rings, ranks and badges (Big Five, spiral-horn slam…) fill as they hunt.
 */
import { useMemo, useState } from 'react';
import { Loader2, Lock, Plus } from 'lucide-react';
import { useHunterAnimals } from '../../../../lib/hooks/useHunterAnimals';
import { SPECIES, SPECIES_GROUPS } from '../../../../lib/species';
import { speciesEmoji } from '../../../../lib/pricing';
import { BADGES, GROUP_STYLE, collectionOf } from '../../../../lib/collection';
import { CollectionStrip } from '../shared/AnimalPicker';
import { SpeciesGuide } from './SpeciesGuide';
import { useDailyFact, FACT_KIND_LABEL } from '../../../../lib/hooks/useSpeciesGuide';

export function HunterCollection({ onAddAnimals }: { onAddAnimals: () => void }) {
  const { animals, loading } = useHunterAnimals();
  const stats = useMemo(() => collectionOf(animals.map(a => a.species)), [animals]);
  const [group, setGroup] = useState<string>('All');
  const [only, setOnly] = useState<'all' | 'have'>('all');
  const [guide, setGuide] = useState<string | null>(null);
  const fact = useDailyFact();

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const shown = SPECIES.filter(s => s.name !== 'Other' && (group === 'All' || s.group === group) && (only === 'all' || stats.hunted.has(s.name)));
  const years = [...new Set(animals.map(a => a.huntYear).filter(Boolean))];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My collection</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Every animal you hunt is added to your life list.</p>
      </div>

      <CollectionStrip speciesCount={stats.speciesCount} total={stats.catalogueTotal} />

      {fact && (
        <button onClick={() => setGuide(fact.species)} className="w-full text-left rounded-2xl border-2 border-sky-300 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-800 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">{FACT_KIND_LABEL[fact.kind] ?? 'Did you know?'} · {fact.species}</p>
          <p className="text-base text-slate-900 dark:text-slate-100 mt-1 leading-snug">{fact.text}</p>
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 mt-2">Open the {fact.species} guide</p>
        </button>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        {[{ n: stats.total, l: 'Animals' }, { n: stats.speciesCount, l: 'Species' }, { n: years.length, l: years.length === 1 ? 'Hunting year' : 'Hunting years' }].map(x => (
          <div key={x.l} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3">
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{x.n}</p><p className="text-xs text-slate-500">{x.l}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Badges</h2>
        <div className="grid grid-cols-3 gap-3">
          {BADGES.map(b => {
            const got = b.earned(stats); const [have, of] = b.progress(stats);
            return (
              <div key={b.id} title={b.how} className={`rounded-2xl border-2 p-3 text-center ${got ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                <div className={`text-4xl leading-none ${got ? '' : 'grayscale opacity-40'}`}>{b.icon}</div>
                <p className={`text-xs font-bold mt-1.5 leading-tight ${got ? 'text-amber-900 dark:text-amber-200' : 'text-slate-500'}`}>{b.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{got ? 'Unlocked' : <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" />{have} of {of}</span>}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Life list</h2>
          <button className="text-sm font-semibold text-[#0073ea] min-h-11 px-2" onClick={() => setOnly(only === 'all' ? 'have' : 'all')}>{only === 'all' ? 'Show only mine' : 'Show everything'}</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
          {['All', ...SPECIES_GROUPS].map(g => {
            const row = stats.byGroup.find(x => x.group === g);
            return (
              <button key={g} onClick={() => setGroup(g)} className={`whitespace-nowrap rounded-full border-2 px-4 min-h-10 text-sm font-semibold ${group === g ? 'border-green-700 bg-green-700 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>
                {g}{row ? ` ${row.have}/${row.of}` : ''}
              </button>
            );
          })}
        </div>
        {shown.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">Nothing here yet — your first animal starts the list.</p>}
        <div className="grid grid-cols-3 gap-2.5">
          {shown.map(sp => {
            const n = stats.counts[sp.name] ?? 0; const st = GROUP_STYLE[sp.group] ?? GROUP_STYLE['Antelope'];
            return (
              <button key={sp.name} type="button" onClick={() => setGuide(sp.name)} className={`relative text-left rounded-xl overflow-hidden border ${n ? 'border-green-600' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-900`}>
                <div className={`flex items-center justify-center h-16 text-4xl ${n ? '' : 'grayscale opacity-30'}`} style={{ background: n ? st.bg : undefined }}>{speciesEmoji(sp.name)}</div>
                <div className="px-1.5 py-1.5 text-center">
                  <p className={`text-[12px] font-bold leading-tight ${n ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>{sp.name}</p>
                  {sp.sci && <p className="text-[10px] italic text-slate-400 leading-tight">{sp.sci}</p>}
                </div>
                {n > 0 && <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-green-700 text-white text-[11px] font-bold flex items-center justify-center">{n > 1 ? `×${n}` : '✓'}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {guide && <SpeciesGuide species={guide} collected={stats.counts[guide] ?? 0} onClose={() => setGuide(null)} />}

      <button onClick={onAddAnimals} className="w-full min-h-14 rounded-2xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold flex items-center justify-center gap-2"><Plus className="w-6 h-6" />Add my animals</button>
    </div>
  );
}
