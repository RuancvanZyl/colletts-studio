/**
 * ReceivedFields — what physically came in for one animal: tick every part, then the condition report.
 * Used on the receiving sheet. Fresh or Salted and at least one part are required; the rest is optional.
 */
import { PART_LABEL, PART_PRESETS, RECEIVED_PARTS } from '../../../../lib/received';
import { CONDITION_ISSUES, SALT_QUALITY, SKULL_CONDITION, VISUAL_CHECKS } from '../../../../lib/condition';

export interface ReceivedValue { parts: string[]; other: string; condition: string; salt: string; skull: string; issues: string[] }
export const emptyReceived = (): ReceivedValue => ({ parts: [], other: '', condition: '', salt: '', skull: '', issues: [] });
/** Complete when something came in, "Other" is described, and Fresh or Salted is chosen. */
export const receivedOk = (v: ReceivedValue) => v.parts.length > 0 && (!v.parts.includes('OTHER') || !!v.other.trim()) && !!v.condition;
/** What is still missing, in plain words ('' when complete). */
export const receivedMissing = (v: ReceivedValue) =>
  v.parts.length === 0 ? 'Tick every part that came in.' : v.parts.includes('OTHER') && !v.other.trim() ? 'Say what the "Other" part is.' : !v.condition ? 'Choose Fresh or Salted.' : '';

const label = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
const field = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 min-h-11 text-base';

export function ReceivedFields({ value, expected = [], onChange }: { value: ReceivedValue; expected?: string[]; onChange: (patch: Partial<ReceivedValue>) => void }) {
  const toggle = (code: string) => onChange({ parts: value.parts.includes(code) ? value.parts.filter(c => c !== code) : [...value.parts, code] });
  const notTicked = expected.filter(c => c !== 'OTHER' && !value.parts.includes(c));
  return (
    <div className="space-y-4">
      <div>
        <label className={label}>What came in? Tick every part *</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PART_PRESETS.map(p => <button key={p.label} type="button" className="text-xs font-semibold px-3 min-h-9 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200" onClick={() => onChange({ parts: p.codes })}>{p.label}</button>)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {RECEIVED_PARTS.map(p => {
            const on = value.parts.includes(p.code);
            const exp = expected.includes(p.code);
            return (
              <button key={p.code} type="button" aria-pressed={on} onClick={() => toggle(p.code)}
                className={`rounded-xl border-2 min-h-14 px-1 text-sm font-semibold flex flex-col items-center justify-center gap-0.5 ${on ? 'border-green-600 bg-green-600 text-white' : exp ? 'border-amber-500 text-slate-800 dark:text-slate-100' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>
                <span className="text-base leading-none">{on ? '✓' : '○'}</span>{p.label}
                {exp && !on && <span className="text-[10px] font-normal text-amber-600">expected</span>}
              </button>
            );
          })}
        </div>
        {value.parts.includes('OTHER') && <input className={`${field} mt-2`} placeholder="What else came in? (e.g. hide, antlers, bones)" value={value.other} onChange={e => onChange({ other: e.target.value })} />}
        {notTicked.length > 0 && <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">The hunter listed {notTicked.map(c => PART_LABEL[c] ?? c).join(', ')}, but you have not ticked {notTicked.length > 1 ? 'them' : 'it'}. If {notTicked.length > 1 ? 'they did' : 'it did'} not arrive, mark this animal as an Issue and say so in the notes.</p>}
      </div>

      <div className="rounded-xl border-2 border-slate-300 dark:border-slate-600 p-3 space-y-3">
        <p className="font-bold text-slate-900 dark:text-slate-100">Condition report</p>
        <div>
          <label className={label}>Visual check *</label>
          <div className="grid grid-cols-2 gap-2">
            {VISUAL_CHECKS.map(v => (
              <button key={v.value} type="button" aria-pressed={value.condition === v.value} onClick={() => onChange({ condition: v.value, salt: v.value === 'salted' ? value.salt : '' })}
                className={`min-h-14 rounded-xl border-2 text-lg font-bold ${value.condition === v.value ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{v.label}</button>
            ))}
          </div>
        </div>
        {value.condition === 'salted' && (
          <div className="flex gap-2">
            {SALT_QUALITY.map(v => (
              <button key={v.value} type="button" aria-pressed={value.salt === v.value} onClick={() => onChange({ salt: value.salt === v.value ? '' : v.value })}
                className={`flex-1 min-h-12 rounded-lg border-2 text-sm font-semibold ${value.salt === v.value ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{v.label}</button>
            ))}
          </div>
        )}
        <div>
          <label className={label}>Tick anything you see <span className="font-normal">(optional)</span></label>
          <div className="flex flex-wrap gap-2">
            {CONDITION_ISSUES.map(i => {
              const on = value.issues.includes(i.value);
              return <button key={i.value} type="button" aria-pressed={on} onClick={() => onChange({ issues: on ? value.issues.filter(x => x !== i.value) : [...value.issues, i.value] })}
                className={`min-h-11 px-3 rounded-lg border-2 text-sm font-semibold ${on ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{i.label}</button>;
            })}
          </div>
        </div>
        <div>
          <label className={label}>Skull condition <span className="font-normal">(optional)</span></label>
          <div className="flex flex-wrap gap-2">
            {SKULL_CONDITION.map(v => (
              <button key={v.value} type="button" aria-pressed={value.skull === v.value} onClick={() => onChange({ skull: value.skull === v.value ? '' : v.value })}
                className={`min-h-11 px-3 rounded-lg border-2 text-sm font-semibold ${value.skull === v.value ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{v.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
