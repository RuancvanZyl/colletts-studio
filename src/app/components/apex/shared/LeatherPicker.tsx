import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LEATHER_GROUPS, type Leather } from '../../../../lib/leather';

const chip = (on: boolean) => `rounded-full border-2 px-3 min-h-11 text-sm font-semibold text-left ${on ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`;

/** The three answers about leftover skin, and the list of things that can be made. Controlled: the parent keeps the value. */
export function LeatherPicker({ value, onChange }: { value: Leather; onChange: (v: Leather) => void }) {
  const set = (p: Partial<Leather>) => onChange({ ...value, ...p });
  const toggle = (item: string) => set({ items: value.items.includes(item) ? value.items.filter(x => x !== item) : [...value.items, item] });
  const choices: [Leather['choice'], string, string][] = [
    ['leather', 'Yes, I would like leather work', 'Choose what you would like made. We will agree the price with you before anything is done.'],
    ['none', 'No thank you', 'We will note that you do not want anything made from it.'],
    ['later', 'I am not sure yet', 'We will ask you again.'],
  ];
  return (
    <div className="space-y-2">
      {choices.map(([k, t, d]) => (
        <button key={k} type="button" aria-pressed={value.choice === k} onClick={() => set({ choice: k, items: k === 'leather' ? value.items : [] })}
          className={`w-full text-left rounded-xl border-2 p-3 min-h-14 ${value.choice === k ? 'border-green-600 bg-green-50 dark:bg-green-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
          <span className="block font-bold text-slate-900 dark:text-slate-100">{t}</span>
          <span className="block text-sm text-slate-600 dark:text-slate-300">{d}</span>
        </button>
      ))}
      {value.choice === 'leather' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-3">
          {LEATHER_GROUPS.map(g => (
            <div key={g.heading}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{g.heading}</p>
              <div className="flex flex-wrap gap-2">{g.items.map(it => <button key={it} type="button" aria-pressed={value.items.includes(it)} className={chip(value.items.includes(it))} onClick={() => toggle(it)}>{it}</button>)}</div>
            </div>
          ))}
          <textarea rows={2} value={value.note ?? ''} onChange={e => set({ note: e.target.value })} placeholder="Anything else we should know? (optional)"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-base text-slate-900 dark:text-slate-100" />
        </div>
      )}
    </div>
  );
}

/** Standalone: the picker with its own Save button. `onSave` does the saving (client or staff) and may throw a plain message. */
export function LeatherCard({ initial, onSave, saveLabel = 'Save my answer' }: { initial?: Leather | null; onSave: (v: Leather) => Promise<void>; saveLabel?: string }) {
  const [v, setV] = useState<Leather>(initial?.choice ? { ...initial, items: initial.items ?? [] } : { choice: '', items: [] });
  const [busy, setBusy] = useState(false);
  const ready = v.choice !== '' && (v.choice !== 'leather' || v.items.length > 0);
  return (
    <div className="space-y-3">
      <LeatherPicker value={v} onChange={setV} />
      <button disabled={!ready || busy} onClick={async () => { setBusy(true); try { await onSave(v); } finally { setBusy(false); } }}
        className="w-full min-h-12 rounded-xl bg-green-700 text-white font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}{saveLabel}
      </button>
    </div>
  );
}
