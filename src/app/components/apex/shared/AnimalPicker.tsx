/**
 * Choosing animals from the full African catalogue — common name with the scientific name small underneath.
 * Colour variants (black springbok, golden wildebeest…) are a choice made AFTER the animal is picked,
 * because the animal — and its scientific name — stays the same.
 *   <AnimalPicker>  add several animals (hunter)       <SpeciesField>  pick one animal (workshop)
 */
import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { SPECIES, SPECIES_GROUPS, findSpecies, sciName, composeName, variantsOf, splitVariant, type Species } from '../../../../lib/species';
import { GROUP_STYLE, rankOf } from '../../../../lib/collection';
import { SpeciesGuide } from '../hunter/SpeciesGuide';
import { Info } from 'lucide-react';
import { speciesEmoji } from '../../../../lib/pricing';

const POPULAR = ['Kudu', 'Impala', 'Wildebeest (Blue)', 'Zebra (Burchell\'s)', 'Warthog', 'Gemsbok', 'Springbok', 'Eland', 'Waterbuck', 'Blesbok', 'Nyala', 'Bushbuck', 'Giraffe', 'Buffalo (Cape)', 'Sable', 'Hartebeest', 'Tsessebe', 'Wildebeest (Black)', 'Duiker (Common)', 'Steenbok', 'Lion', 'Leopard'];

function matches(sp: Species, q: string) {
  const t = q.toLowerCase();
  return sp.name.toLowerCase().includes(t) || sp.sci.toLowerCase().includes(t) || (sp.aliases ?? []).some(a => a.toLowerCase().includes(t));
}

function useCatalogue(query: string, group: string) {
  return useMemo(() => {
    if (query.trim().length >= 2) return SPECIES.filter(s => matches(s, query.trim())).slice(0, 60);
    if (group === 'Popular') return POPULAR.map(n => SPECIES.find(s => s.name === n)!).filter(Boolean);
    return SPECIES.filter(s => s.group === group);
  }, [query, group]);
}

const select = 'rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 min-h-11 text-base';

function GroupChips({ group, setGroup }: { group: string; setGroup: (g: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
      {['Popular', ...SPECIES_GROUPS].map(g => (
        <button key={g} type="button" onClick={() => setGroup(g)}
          className={`whitespace-nowrap rounded-full border-2 px-4 min-h-10 text-sm font-semibold ${group === g ? 'border-[#0073ea] bg-[#0073ea] text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{g}</button>
      ))}
    </div>
  );
}

// ── add several (hunter) ────────────────────────────────────────────────────

export interface PickedAnimal { id: string; base: string; variant: string }

/** The progress ring + rank at the top, like a life list filling up. */
export function CollectionStrip({ speciesCount, total }: { speciesCount: number; total: number }) {
  const rank = rankOf(speciesCount);
  const pct = Math.min(100, Math.round((speciesCount / Math.max(1, total)) * 100 * 4));   // magnified so early progress is visible
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-[#14301f] text-white p-3.5">
      <div className="relative w-16 h-16 shrink-0 rounded-full" style={{ background: `conic-gradient(#f4c542 ${pct}%, rgba(255,255,255,0.15) 0)` }}>
        <div className="absolute inset-1.5 rounded-full bg-[#14301f] flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none">{speciesCount}</span><span className="text-[10px] text-green-200">species</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="font-bold leading-tight">{rank.title}</p>
        <p className="text-sm text-green-200">{rank.next ? `${rank.next - speciesCount} more species to reach the next rank` : 'Top rank reached'}</p>
        <p className="text-xs text-green-300/80">{speciesCount} of {total} African species collected</p>
      </div>
    </div>
  );
}

export function AnimalPicker({ items, onChange, hunted, plain = false }: { items: PickedAnimal[]; onChange: (next: PickedAnimal[]) => void; hunted?: Set<string>; plain?: boolean }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('Popular');
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [guide, setGuide] = useState<string | null>(null);
  const list = useCatalogue(query, group);
  const before = hunted ?? new Set<string>();
  const live = new Set<string>([...before, ...items.map(i => i.base)]);
  const count = (name: string) => items.filter(i => i.base === name).length;
  const add = (name: string) => {
    onChange([...items, { id: crypto.randomUUID(), base: name, variant: 'Normal' }]);
    setJustAdded(name); setTimeout(() => setJustAdded(j => (j === name ? null : j)), 700);
    if (!plain && !live.has(name) && name !== 'Other') toast.success(`New species for your collection: ${name}`, { duration: 2200 });
  };
  const removeOne = (name: string) => { const k = [...items].reverse().find(i => i.base === name); if (k) onChange(items.filter(i => i.id !== k.id)); };

  return (
    <div className="space-y-4">
      {guide && <SpeciesGuide species={guide} collected={0} onClose={() => setGuide(null)} />}
      {!plain && <CollectionStrip speciesCount={[...live].filter(n => n !== 'Other').length} total={SPECIES.length - 1} />}

      {items.length > 0 && (
        <div className="rounded-2xl border-2 border-green-600 bg-green-50 dark:bg-green-950/30 p-3 space-y-2">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Your animals ({items.length})</p>
          {items.map(it => {
            const vars = variantsOf(it.base);
            return (
              <div key={it.id} className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                <span className="text-2xl">{speciesEmoji(it.base)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-900 dark:text-slate-100 leading-tight">{it.base}</span>
                  <span className="block text-xs italic text-slate-500">{sciName(it.base)}</span>
                </span>
                {vars.length > 0 && (
                  <label className="order-last w-full flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 pl-10">Colour
                    <select className={`${select} min-h-10 flex-1`} value={it.variant} onChange={e => onChange(items.map(x => x.id === it.id ? { ...x, variant: e.target.value } : x))}>
                      {vars.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                )}
                <button type="button" aria-label={`Remove ${it.base}`} className="p-2 text-red-500 min-h-11 min-w-11 flex items-center justify-center" onClick={() => onChange(items.filter(x => x.id !== it.id))}><Trash2 className="w-5 h-5" /></button>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className={`${select} w-full pl-9`} placeholder="Search by name or scientific name" value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      {query.trim().length < 2 && <GroupChips group={group} setGroup={setGroup} />}

      {list.length === 0 && <p className="p-4 text-sm text-slate-500">No animal found. Try another spelling, or pick “Other” and tell us in the notes.</p>}
      <div className="grid grid-cols-2 gap-3">
        {list.map(sp => {
          const n = count(sp.name);
          const isNew = !plain && !before.has(sp.name) && sp.name !== 'Other';
          const st = GROUP_STYLE[sp.group] ?? GROUP_STYLE['Antelope'];
          return (
            <div key={sp.name} className={`relative rounded-2xl overflow-hidden border-2 bg-white dark:bg-slate-900 ${n > 0 ? 'border-green-600' : 'border-slate-200 dark:border-slate-700'} ${justAdded === sp.name ? 'apex-pop' : ''}`}>
              <button type="button" aria-label={`Add ${sp.name}`} onClick={() => add(sp.name)} className="block w-full text-left">
                <span className="flex items-center justify-center h-24 text-6xl" style={{ background: st.bg }}>{speciesEmoji(sp.name)}</span>
                <span className="block pl-3 pr-12 pt-2 pb-3 min-h-[76px]">
                  <span className="block text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{sp.name}</span>
                  {sp.sci && <span className="block text-[11px] italic text-slate-500 leading-snug mt-0.5">{sp.sci}</span>}
                </span>
              </button>
              <button type="button" aria-label={`About the ${sp.name}`} onClick={() => setGuide(sp.name)} className="absolute bottom-2 left-2 min-h-9 min-w-9 rounded-full bg-white/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center"><Info className="w-4 h-4" /></button>
              {isNew && n === 0 && <span className="absolute top-2 left-2 text-[11px] font-bold rounded-full bg-amber-400 text-amber-950 px-2 py-0.5">NEW</span>}
              {sp.variants && <span className="absolute top-2 right-2 text-[11px] font-semibold rounded-full bg-white/90 text-slate-700 px-2 py-0.5">colours</span>}
              {n > 0 ? (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-green-700 text-white rounded-full pl-1 pr-1">
                  <button type="button" aria-label={`Remove one ${sp.name}`} className="min-h-9 min-w-9 flex items-center justify-center" onClick={() => removeOne(sp.name)}><Minus className="w-4 h-4" /></button>
                  <span className="font-bold w-4 text-center">{n}</span>
                  <button type="button" aria-label={`Add another ${sp.name}`} className="min-h-9 min-w-9 flex items-center justify-center" onClick={() => add(sp.name)}><Plus className="w-4 h-4" /></button>
                </div>
              ) : (
                <span className="absolute bottom-2 right-2 min-h-9 min-w-9 rounded-full bg-green-700 text-white flex items-center justify-center pointer-events-none"><Plus className="w-5 h-5" /></span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const pickedName = (p: PickedAnimal) => composeName(p.base, p.variant);

// ── pick one (workshop) ─────────────────────────────────────────────────────

/** value is the stored name ("Springbok, Black"); onChange gives the stored name. */
export function SpeciesField({ value, onChange, labelClass, fieldClass }: { value: string; onChange: (stored: string) => void; labelClass: string; fieldClass: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { base, variant } = splitVariant(value);
  const found = findSpecies(base);
  const hits = useMemo(() => (q.trim() ? SPECIES.filter(s => matches(s, q.trim())).slice(0, 10) : POPULAR.map(n => SPECIES.find(s => s.name === n)!).filter(Boolean).slice(0, 10)), [q]);
  const vars = variantsOf(base);

  return (
    <div className="space-y-2">
      <div className="relative">
        <label className={labelClass}>Species *</label>
        <input className={fieldClass} placeholder="Start typing — Kudu, Impala…" value={open ? q : base}
          onFocus={() => { setOpen(true); setQ(''); }} onChange={e => setQ(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 180)} />
        {!open && found?.sci && <p className="text-xs italic text-slate-500 mt-1">{found.sci}</p>}
        {open && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-72 overflow-y-auto">
            {hits.map(s => (
              <button key={s.name} type="button" className="w-full text-left px-4 py-2 min-h-12 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                onMouseDown={e => e.preventDefault()} onClick={() => { onChange(s.name); setOpen(false); }}>
                <span className="block text-base leading-tight">{speciesEmoji(s.name)} {s.name}</span>
                {s.sci && <span className="block text-xs italic text-slate-500">{s.sci}</span>}
              </button>
            ))}
            {q.trim().length > 1 && !hits.some(s => s.name.toLowerCase() === q.trim().toLowerCase()) && (
              <button type="button" className="w-full text-left px-4 min-h-12 text-base text-[#0073ea] font-semibold" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(q.trim()); setOpen(false); }}>Use “{q.trim()}”</button>
            )}
          </div>
        )}
      </div>
      {vars.length > 0 && (
        <div>
          <label className={labelClass}>Colour</label>
          <select className={fieldClass} value={variant} onChange={e => onChange(composeName(base, e.target.value))}>
            {vars.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
