/**
 * HunterTrophies — the hunter's home: every animal the workshop has received from them, what came in,
 * the mount they chose (or still have to choose), and where it is now. Built to be read on a phone.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { useHunterAnimals, type HunterAnimal } from '../../../../lib/hooks/useHunterAnimals';
import { getPipeline, stageIndex, DEPT_LABELS } from '../../../../lib/pipeline';
import { speciesEmoji } from '../../../../lib/pricing';
import { sciName } from '../../../../lib/species';
import { WORKSHOP } from '../../../../lib/workshop';
import { conditionSummary } from '../../../../lib/condition';
import { printDropOffPapers } from '../../../../lib/print';
import { PhotoGallery } from '../shared/TrophyPhotos';
import { ChooseMounts } from './ChooseMounts';
import { AddAnimalsFlow } from './AddAnimalsFlow';
import { QuoteCard } from './QuoteCard';
import { HunterDocuments } from './HunterDocuments';
import { useHunterQuotes } from '../../../../lib/hooks/useQuotes';

function statusOf(a: HunterAnimal): { text: string; tone: 'todo' | 'wait' | 'work' | 'done'; pct: number } {
  if (a.finished) return { text: 'Finished — ready for you', tone: 'done', pct: 100 };
  if (a.expected && a.mountChosen) return { text: 'Mount chosen — waiting for your trophy to arrive', tone: 'wait', pct: 2 };
  if (!a.mountChosen) return { text: 'Waiting for your choice', tone: 'todo', pct: 0 };
  if (!a.started && a.dept === 'receiving') return { text: 'Mount chosen — we will start soon', tone: 'wait', pct: 3 };
  const pipe = getPipeline(a.mount); const idx = stageIndex(pipe, a.dept);
  return { text: `${DEPT_LABELS[a.dept] ?? a.dept}${idx >= 0 ? ` · stage ${idx + 1} of ${pipe.length}` : ''}`, tone: 'work', pct: idx >= 0 ? Math.max(5, Math.round((idx / Math.max(1, pipe.length - 1)) * 100)) : 5 };
}

export function HunterTrophies({ onRegisterHunt, onChanged, startAdding = false }: { onRegisterHunt?: () => void; onChanged?: () => void; startAdding?: boolean }) {
  const { client, animals, loading, refresh } = useHunterAnimals();
  const { quotes, refresh: refreshQuotes } = useHunterQuotes(client?.id);
  const [choosing, setChoosing] = useState<string[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(startAdding);

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!client) return null;

  const first = client.name.split(' ')[0];
  const waiting = animals.filter(a => !a.mountChosen && !a.finished);

  if (adding) return <AddAnimalsFlow clientId={client.id} clientType={client.type} onClose={() => setAdding(false)} onSaved={() => { refresh(); onChanged?.(); }} />;

  if (choosing) {
    const subset = animals.filter(a => choosing.includes(a.docId));
    return <ChooseMounts animals={subset.map(x => ({ ...x }))} clientType={client.type} clientId={client.id} combinable={animals.filter(x => !x.finished && !x.started && x.dept === 'receiving').map(x => ({ docId: x.docId, species: x.species }))} onClose={() => setChoosing(null)} onSaved={() => { refresh(); onChanged?.(); }} />;
  }

  const hunts = [...new Set(animals.map(a => a.huntId))].map(id => ({ id, rows: animals.filter(a => a.huntId === id) }));

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hello, {first}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{animals.length > 0 ? `This is everything ${WORKSHOP.name} has received from you.` : 'Your trophies will appear here as soon as the workshop receives them.'}</p>
      </div>

      <button onClick={() => setAdding(true)} className="w-full min-h-14 rounded-2xl border-2 border-green-700 text-green-800 dark:text-green-300 font-bold text-lg flex items-center justify-center gap-2 bg-white dark:bg-slate-900">
        <span className="text-2xl">🎯</span>Add my animals<span className="text-xs font-normal text-slate-500 hidden sm:inline">after your hunt</span>
      </button>

      {quotes.filter(q => q.status !== 'draft' && q.status !== 'paid' || q.payments.length).map(q => (
        <QuoteCard key={q.id} quote={q} ref_={animals.find(a => a.huntId === q.hunt_id)?.huntRef} onChanged={() => { refreshQuotes(); onChanged?.(); }} />
      ))}

      <HunterDocuments />

      {waiting.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">{waiting.length} animal{waiting.length > 1 ? 's are' : ' is'} waiting for you</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Tell us how you would like {waiting.length > 1 ? 'each one' : 'it'} mounted so we can start work.</p>
            </div>
          </div>
          <button className="w-full rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold min-h-12 text-base" onClick={() => setChoosing(waiting.map(a => a.docId))}>Choose my mounts</button>
        </div>
      )}

      {animals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-slate-500 dark:text-slate-400">
          Nothing has been received yet.
        </div>
      )}

      {hunts.map(h => (
        <section key={h.id} className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">File {h.rows[0].huntRef || h.rows[0].huntYear} · {h.rows[0].huntYear}</h2>
            <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0073ea] min-h-11 px-2"
              onClick={() => printDropOffPapers({
                clientName: client.name, huntRef: h.rows[0].huntRef, workshop: WORKSHOP, inviteLink: null,
                receivedAt: h.rows.find(r => r.receivedAt)?.receivedAt ?? undefined,
                animals: h.rows.map(r => ({ species: r.species, tag: r.tag, condition: conditionSummary(r.conditionReport, r.condition), parts: r.parts.map(p => p.code), other: r.other, notes: '' })),
              }, { sheet: true })}>
              <Printer className="w-4 h-4" />Receiving sheet
            </button>
          </div>
          {h.rows.map(a => {
            const st = statusOf(a); const isOpen = open === a.docId;
            return (
              <div key={a.docId} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                <button className="w-full text-left p-4 flex items-start gap-3" onClick={() => setOpen(isOpen ? null : a.docId)} aria-expanded={isOpen}>
                  <span className="text-3xl leading-none">{speciesEmoji(a.species)}</span>
                  <span className="flex-1 min-w-0 space-y-1.5">
                    <span className="block font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">{a.species}{a.tag ? <span className="text-slate-400 font-normal text-sm"> · {a.tag}</span> : null}</span>
                    {sciName(a.species) && <span className="block text-xs italic text-slate-500 -mt-1">{sciName(a.species)}</span>}
                    <span className="flex flex-wrap gap-1">
                      {a.parts.map(p => <span key={p.code} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">✓ {p.code === 'OTHER' && a.other ? `Other: ${a.other}` : p.label}</span>)}
                      {a.expected && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">Not received yet</span>}
                      {!a.expected && a.parts.length === 0 && <span className="text-xs text-slate-400">Parts list not recorded</span>}
                      {!a.expected && (a.conditionReport || a.condition) && <p className="basis-full text-xs text-slate-600 dark:text-slate-300 mt-1"><strong>When we received it:</strong> {conditionSummary(a.conditionReport, a.condition)}</p>}
                    </span>
                    <span className={`flex items-center gap-1.5 text-sm font-semibold ${st.tone === 'todo' ? 'text-amber-600' : st.tone === 'done' ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {st.tone === 'done' && <CheckCircle2 className="w-4 h-4" />}{a.mountChosen ? `${a.mount} · ` : ''}{st.text}
                    </span>
                    {a.mountChosen && !a.finished && (
                      <span className="block h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"><span className="block h-full bg-green-600" style={{ width: `${st.pct}%` }} /></span>
                    )}
                  </span>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                </button>
                {!a.mountChosen && !a.finished && (
                  <div className="px-4 pb-4"><button className="w-full rounded-xl bg-green-700 text-white font-bold min-h-12" onClick={() => setChoosing([a.docId])}>Choose the mount</button></div>
                )}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800">
                    {a.instructions && <p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">Your notes:</span> {a.instructions}</p>}
                    {a.mountChosen && !a.started && !a.finished && a.dept === 'receiving' && (
                      <button className="text-sm font-semibold text-[#0073ea] min-h-11" onClick={() => setChoosing([a.docId])}>Change my choice</button>
                    )}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Photos</p>
                      <PhotoGallery docId={a.docId} empty="We'll add photos here when your trophy arrives and again when it is finished." />
                    </div>
                    {a.history.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Progress</p>
                        <ul className="text-sm text-slate-700 dark:text-slate-200 space-y-0.5">
                          {a.history.map((s, i) => <li key={i}>✓ {DEPT_LABELS[s.dept] ?? s.dept}{s.completedAt ? <span className="text-slate-400"> · {new Date(s.completedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span> : null}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {onRegisterHunt && (
        <p className="text-center text-xs text-slate-400 pt-2">
          Sending trophies in advance? <button className="underline font-semibold" onClick={onRegisterHunt}>Register a hunt</button>
        </p>
      )}
    </div>
  );
}
