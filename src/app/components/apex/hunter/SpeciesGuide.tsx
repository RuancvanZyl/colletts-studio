/**
 * SpeciesGuide — a field-guide page for one animal, only for hunters: real photos and tracks,
 * the Roland Ward record, facts and hunting notes. Opens from any animal card.
 */
import { useEffect, useState } from 'react';
import { Loader2, Trophy, X, Footprints } from 'lucide-react';
import { loadGuide, PHOTO_KIND_LABEL, FACT_KIND_LABEL, type Guide, type GuidePhoto } from '../../../../lib/hooks/useSpeciesGuide';
import { findSpecies } from '../../../../lib/species';
import { speciesEmoji } from '../../../../lib/pricing';
import { GROUP_STYLE } from '../../../../lib/collection';

export function SpeciesGuide({ species, collected = 0, onClose }: { species: string; collected?: number; onClose: () => void }) {
  const sp = findSpecies(species);
  const name = sp?.name ?? species;
  const [data, setData] = useState<{ guide: Guide | null; photos: GuidePhoto[] } | null>(null);
  const [big, setBig] = useState<string | null>(null);

  useEffect(() => { let alive = true; loadGuide(name).then(d => { if (alive) setData(d); }).catch(() => alive && setData({ guide: null, photos: [] })); return () => { alive = false; }; }, [name]);

  const st = GROUP_STYLE[sp?.group ?? 'Antelope'] ?? GROUP_STYLE['Antelope'];
  const main = data?.photos.filter(p => p.kind !== 'tracks') ?? [];
  const tracks = data?.photos.filter(p => p.kind === 'tracks') ?? [];
  const g = data?.guide;
  const facts = (kind: string) => (g?.facts ?? []).filter(f => f.kind === kind && f.text);
  const empty = data && !g && data.photos.length === 0;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="relative w-full sm:max-w-xl max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-stone-50 dark:bg-stone-950 text-slate-900 dark:text-slate-100" onClick={e => e.stopPropagation()}>
        <button aria-label="Close" onClick={onClose} className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>

        {main.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none]">
            {main.map(p => (
              <figure key={p.id} className="relative snap-center shrink-0 w-full">
                <button className="block w-full" onClick={() => setBig(p.url)}><img src={p.url} alt={p.caption ?? name} className="w-full h-64 object-cover" loading="lazy" /></button>
                <figcaption className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-xs px-3 py-1.5">
                  <span className="font-semibold">{PHOTO_KIND_LABEL[p.kind]}</span>{p.caption ? ` · ${p.caption}` : ''}{p.credit ? <span className="opacity-70"> · © {p.credit}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-8xl" style={{ background: st.bg }}>{speciesEmoji(name)}</div>
        )}

        <div className="p-5 space-y-5">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{name}</h1>
            {sp?.sci && <p className="italic text-slate-500">{sp.sci}</p>}
            <div className="flex flex-wrap gap-2 mt-2 text-xs font-semibold">
              {sp && <span className="rounded-full px-2.5 py-1" style={{ background: st.bg, color: st.fg }}>{sp.group}</span>}
              {collected > 0 && <span className="rounded-full px-2.5 py-1 bg-green-100 text-green-800">✓ In your collection{collected > 1 ? ` ×${collected}` : ''}</span>}
            </div>
          </div>

          {!data && <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" />Loading the guide…</div>}
          {empty && <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-slate-500 text-center">The guide page for this animal is coming soon.</p>}

          {g?.summary && <p className="text-base leading-relaxed">{g.summary}</p>}

          {g?.record_value && (
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
              <Trophy className="w-7 h-7 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">Roland Ward record{g.record_label ? ` · ${g.record_label}` : ''}</p>
                <p className="text-xl font-bold">{g.record_value}</p>
                {g.record_note && <p className="text-sm text-slate-600 dark:text-slate-300">{g.record_note}</p>}
              </div>
            </div>
          )}

          {(['cool', 'fact', 'hunting'] as const).map(k => facts(k).length > 0 && (
            <section key={k} className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{FACT_KIND_LABEL[k]}</h2>
              <ul className="space-y-2">
                {facts(k).map((f, i) => <li key={i} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 text-base leading-snug">{f.text}</li>)}
              </ul>
            </section>
          ))}

          {(tracks.length > 0 || g?.tracks_note) && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><Footprints className="w-4 h-4" />Tracks</h2>
              {g?.tracks_note && <p className="text-base leading-snug">{g.tracks_note}</p>}
              {tracks.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {tracks.map(p => (
                    <button key={p.id} className="text-left" onClick={() => setBig(p.url)}>
                      <img src={p.url} alt={p.caption ?? 'Tracks'} className="w-full h-32 object-cover rounded-xl" loading="lazy" />
                      {(p.caption || p.credit) && <span className="block text-[11px] text-slate-500 mt-0.5">{p.caption}{p.credit ? ` · © ${p.credit}` : ''}</span>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {big && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-3" onClick={e => { e.stopPropagation(); setBig(null); }}>
          <img src={big} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
