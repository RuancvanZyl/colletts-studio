/**
 * ReceivingGrid — the paper receiving sheet on the screen: one row per animal, one column per part.
 * Tap a square to tick a part that came in. Each row shows what the client listed, so a difference is easy to see.
 */
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Check, CircleDashed, X, Clock, Plus, Trash2 } from 'lucide-react';
import { PART_LABEL } from '../../../../lib/received';
import { VISUAL_CHECKS } from '../../../../lib/condition';
import { crossCheck, receivedMissing, receivedOk, type ReceivedValue } from '../shared/ReceivedFields';

export type GridStatus = 'pending' | 'ok' | 'issue' | 'later';
export interface GridLine {
  docId: string; species: string; mountType: string; status: GridStatus; rec: ReceivedValue; expectedParts: string[];
  preRegistered: boolean; isNew?: boolean; tagNumber: string;
}

// the columns of the paper sheet, in the same order
const COLS: { code: string; label: string; hint: string }[] = [
  { code: 'SKULL', label: 'Skull', hint: 'Skull' }, { code: 'CAPE', label: 'Cape', hint: 'Cape' }, { code: 'BSKIN', label: 'B/Skin', hint: 'Back skin' },
  { code: 'FLATSKIN', label: 'F/Skin', hint: 'Flat skin' }, { code: 'FSKIN', label: 'FMT/Skin', hint: 'Full mount skin' }, { code: 'FEET', label: 'Feet', hint: 'Feet' },
  { code: 'LEGBONES', label: 'Leg bones', hint: 'Leg bones' }, { code: 'SCROTUM', label: 'Scrotum', hint: 'Scrotum' }, { code: 'TAIL', label: 'Tail', hint: 'Tail' },
  { code: 'TUSKS', label: 'Tusks', hint: 'Tusks' }, { code: 'PANEL', label: 'Panel', hint: 'Panel' },
];
const names = (codes: string[]) => codes.map(c => PART_LABEL[c] ?? c).join(', ');

export function ReceivingGrid({ lines, onRec, onStatus, onRemove, renderDetails }: {
  lines: GridLine[];
  onRec: (idx: number, patch: Partial<ReceivedValue>) => void;
  onStatus: (idx: number, s: GridStatus) => void;
  onRemove: (idx: number) => void;
  renderDetails: (idx: number) => ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);

  function setOk(idx: number, l: GridLine) {
    if (!receivedOk(l.rec)) { toast.error(receivedMissing(l.rec)); setOpen(l.docId); return; }
    onStatus(idx, 'ok');
  }
  const tick = (idx: number, l: GridLine, code: string) =>
    onRec(idx, { parts: l.rec.parts.includes(code) ? l.rec.parts.filter(c => c !== code) : [...l.rec.parts, code] });

  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-600 overflow-x-auto bg-white dark:bg-slate-900">
      <table className="min-w-[1000px] w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            <th className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 text-left px-3 py-2 min-w-[170px] border-b border-slate-300 dark:border-slate-600">Species</th>
            {COLS.map(c => <th key={c.code} title={c.hint} className="px-1 py-2 w-[54px] text-xs font-bold border-b border-l border-slate-300 dark:border-slate-600">{c.label}</th>)}
            <th className="px-2 py-2 min-w-[120px] text-xs font-bold border-b border-l border-slate-300 dark:border-slate-600">Other (specify)</th>
            <th className="px-2 py-2 min-w-[130px] text-xs font-bold border-b border-l border-slate-300 dark:border-slate-600">Visual check</th>
            <th className="px-2 py-2 min-w-[170px] text-xs font-bold border-b border-l border-slate-300 dark:border-slate-600">Checked</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, idx) => {
            const cc = crossCheck(l.expectedParts, l.rec.parts, !l.isNew);
            const rowTone = l.status === 'ok' ? 'bg-green-50 dark:bg-green-950/20' : l.status === 'issue' ? 'bg-red-50 dark:bg-red-950/20' : l.status === 'later' ? 'bg-amber-50 dark:bg-amber-950/20' : '';
            const note = l.isNew ? { t: 'Not on the client’s list', c: 'text-blue-600 dark:text-blue-300' }
              : !cc.listedAny ? { t: 'The client did not list the parts', c: 'text-slate-500' }
              : cc.missing.length === 0 && cc.extra.length === 0 && l.rec.parts.length > 0 ? { t: 'Matches the client’s list ✓', c: 'text-green-700 dark:text-green-400' }
              : { t: `Client listed ${names(l.expectedParts.filter(c => c !== 'OTHER'))}${cc.missing.length && l.rec.parts.length ? ` · not ticked: ${names(cc.missing)}` : ''}${cc.extra.length ? ` · extra: ${names(cc.extra)}` : ''}`, c: 'text-amber-700 dark:text-amber-400' };
            return (
              <>
                <tr key={l.docId} className={`border-b border-slate-200 dark:border-slate-700 ${rowTone}`}>
                  <td className={`sticky left-0 z-10 px-3 py-2 align-top ${rowTone || 'bg-white dark:bg-slate-900'} bg-clip-padding`}>
                    <button type="button" className="text-left w-full" onClick={() => setOpen(o => (o === l.docId ? null : l.docId))} aria-expanded={open === l.docId}>
                      <span className="block font-bold text-slate-900 dark:text-slate-100 leading-tight">{l.species}</span>
                      <span className="block text-xs text-slate-500">{l.mountType && !/pending/i.test(l.mountType) ? l.mountType : 'Mount not chosen yet'}{l.tagNumber ? ` · tag ${l.tagNumber}` : ''}</span>
                      <span className={`block text-[11px] leading-snug mt-0.5 ${note.c}`}>{note.t}</span>
                      <span className="block text-[11px] text-sky-600 dark:text-sky-300 mt-0.5">{open === l.docId ? 'Hide details' : 'Details, photos, notes'}</span>
                    </button>
                  </td>
                  {COLS.map(c => {
                    const on = l.rec.parts.includes(c.code);
                    const exp = l.expectedParts.includes(c.code);
                    return (
                      <td key={c.code} className="border-l border-slate-200 dark:border-slate-700 p-0 text-center">
                        <button type="button" aria-pressed={on} aria-label={`${l.species}: ${c.hint}${exp ? ' (the client listed it)' : ''}`} onClick={() => tick(idx, l, c.code)}
                          className={`w-full min-h-14 flex items-center justify-center ${on ? (exp || !cc.listedAny || l.isNew ? 'bg-green-600 text-white' : 'bg-sky-600 text-white') : exp ? 'text-amber-600' : 'text-slate-300 dark:text-slate-600'}`}>
                          {on ? <Check className="w-6 h-6" /> : exp ? <CircleDashed className="w-6 h-6" /> : <span className="block w-5 h-5 rounded border border-slate-300 dark:border-slate-600" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-l border-slate-200 dark:border-slate-700 p-1 align-middle">
                    <input aria-label={`${l.species}: other part`} className="w-full min-h-11 rounded border border-slate-300 dark:border-slate-600 bg-transparent px-2 text-sm" placeholder="e.g. hide"
                      value={l.rec.other} onChange={e => onRec(idx, { other: e.target.value, parts: e.target.value.trim() && !l.rec.parts.includes('OTHER') ? [...l.rec.parts, 'OTHER'] : (!e.target.value.trim() ? l.rec.parts.filter(c => c !== 'OTHER') : l.rec.parts) })} />
                  </td>
                  <td className="border-l border-slate-200 dark:border-slate-700 p-1 align-middle">
                    <div className="flex gap-1">
                      {VISUAL_CHECKS.map(v => (
                        <button key={v.value} type="button" aria-pressed={l.rec.condition === v.value} onClick={() => onRec(idx, { condition: v.value, salt: v.value === 'salted' ? l.rec.salt : '' })}
                          className={`flex-1 min-h-11 rounded-lg border-2 text-xs font-bold ${l.rec.condition === v.value ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{v.label}</button>
                      ))}
                    </div>
                  </td>
                  <td className="border-l border-slate-200 dark:border-slate-700 p-1 align-middle">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setOk(idx, l)} aria-pressed={l.status === 'ok'} title="Everything is here and in order"
                        className={`flex-1 min-h-11 rounded-lg text-xs font-bold flex flex-col items-center justify-center ${l.status === 'ok' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}><Check className="w-4 h-4" />OK</button>
                      <button type="button" onClick={() => { onStatus(idx, 'issue'); setOpen(l.docId); }} aria-pressed={l.status === 'issue'} title="Something is wrong or missing"
                        className={`flex-1 min-h-11 rounded-lg text-xs font-bold flex flex-col items-center justify-center ${l.status === 'issue' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}><X className="w-4 h-4" />Issue</button>
                      <button type="button" onClick={() => { onStatus(idx, 'later'); setOpen(l.docId); }} aria-pressed={l.status === 'later'} title="Part of it is here, the rest follows"
                        className={`flex-1 min-h-11 rounded-lg text-xs font-bold flex flex-col items-center justify-center ${l.status === 'later' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}><Clock className="w-4 h-4" />To follow</button>
                    </div>
                  </td>
                </tr>
                {open === l.docId && (
                  <tr key={l.docId + ':details'} className={`border-b border-slate-300 dark:border-slate-600 ${rowTone}`}>
                    <td colSpan={COLS.length + 4} className="p-3">
                      <div className="max-w-xl space-y-3">
                        {renderDetails(idx)}
                        {l.isNew && <button type="button" onClick={() => onRemove(idx)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 min-h-11"><Trash2 className="w-4 h-4" />Remove this animal (it was added by mistake)</button>}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 dark:border-slate-700">
        <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-green-600" /> came in (the client listed it)</span>
        <span className="inline-flex items-center gap-1"><CircleDashed className="w-4 h-4 text-amber-600" /> the client listed it, not ticked yet</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-sky-600" /> came in but the client did not list it</span>
        <span className="inline-flex items-center gap-1"><Plus className="w-3 h-3" />Scroll sideways for the other parts</span>
      </p>
    </div>
  );
}
