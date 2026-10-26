/**
 * HuntRegister — the register the professional hunter fills in, typed in once and cross-checked:
 * permit numbers on file, the permits handed in, the hunt itself and the receiving sheet.
 * Every mistake is listed and highlighted where it is; a problem is only set aside with a recorded reason.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { PROVINCES } from '../../../../lib/docs';
import { RECEIVED_PARTS } from '../../../../lib/received';
import type { AiRegister } from '../../../../lib/aiReader';

export interface Finding { key: string; level: 'error' | 'warn'; where: string; field: string | null; message: string; overridden: boolean; override_reason: string | null }
interface Line { farm_name: string; farm_reg_no: string; district: string; landowner: string; permit_no: string; date_killed: string; species: string; quantity: string; sex: string; parts: string[] }
interface Head { register_no: string; province: string; commenced: string; terminated: string; ph_name: string; ph_permit_no: string; ph_signed: boolean; client_name: string; client_passport_no: string; client_signed: boolean; ho_name: string; ho_permit_no: string; ho_signed: boolean }

const blankLine = (): Line => ({ farm_name: '', farm_reg_no: '', district: '', landowner: '', permit_no: '', date_killed: '', species: '', quantity: '1', sex: '', parts: [] });
const field = 'w-full rounded-lg border bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-xs font-semibold text-slate-400 mb-1';
const PARTS = RECEIVED_PARTS.filter(p => p.code !== 'OTHER');

export function FindingsList({ findings, hunt, canEdit, onChanged }: { findings: Finding[]; hunt: string; canEdit: boolean; onChanged: () => void }) {
  async function setAside(f: Finding) {
    const why = window.prompt(`Why is this acceptable?\n\n${f.message}\n\n(This is recorded.)`);
    if (!why?.trim()) return;
    const { error } = await (supabase as any).rpc('staff_override_check', { p_hunt: hunt, p_key: f.key, p_reason: why });
    if (error) toast.error(error.message); else onChanged();
  }
  async function undo(f: Finding) {
    const { error } = await (supabase as any).rpc('staff_clear_override', { p_hunt: hunt, p_key: f.key });
    if (error) toast.error(error.message); else onChanged();
  }
  const groups = [...new Set(findings.map(f => f.where))];
  return (
    <div className="space-y-3">
      {groups.map(g => (
        <div key={g} className="rounded-xl border border-slate-700 bg-[#0f1a24] overflow-hidden">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 bg-[#111c26]">{g}</p>
          <ul className="divide-y divide-slate-800">
            {findings.filter(f => f.where === g).map(f => (
              <li key={f.key} className="px-3 py-2.5 flex items-start gap-2.5">
                {f.overridden ? <CheckCircle2 className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" /> : <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${f.level === 'error' ? 'text-red-400' : 'text-amber-400'}`} />}
                <div className="flex-1 min-w-0">
                  <p className={`text-base ${f.overridden ? 'text-slate-500 line-through' : f.level === 'error' ? 'text-red-200' : 'text-amber-200'}`}>{f.message}</p>
                  {f.overridden && <p className="text-sm text-slate-400">Set aside: {f.override_reason}</p>}
                </div>
                {canEdit && f.level === 'error' && (f.overridden
                  ? <button className="text-sm text-slate-400 underline min-h-9" onClick={() => undo(f)}>Undo</button>
                  : <button className="text-sm text-sky-300 underline min-h-9 whitespace-nowrap" onClick={() => setAside(f)}>Set aside</button>)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function HuntRegister({ huntId, defaults, canEdit, onChanged, prefill }: { huntId: string; defaults: { province: string | null; outfitter: string | null; client: string }; canEdit: boolean; onChanged?: () => void; prefill?: { data: AiRegister; nonce: number } | null }) {
  const [head, setHead] = useState<Head | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [ai, setAi] = useState<{ unsure: string[]; flags: string[] } | null>(null);

  const check = async () => { const { data } = await (supabase as any).rpc('check_hunt_register', { p_hunt: huntId }); setFindings(data ?? []); };
  const load = async () => {
    const db = supabase as any;
    const { data: r } = await db.from('hunt_registers').select('*').eq('hunt_id', huntId).maybeSingle();
    if (r) {
      const { data: ls } = await db.from('hunt_register_lines').select('*').eq('register_id', r.id).order('line_no');
      setHead({ register_no: r.register_no ?? '', province: r.province ?? '', commenced: r.commenced ?? '', terminated: r.terminated ?? '', ph_name: r.ph_name ?? '', ph_permit_no: r.ph_permit_no ?? '', ph_signed: r.ph_signed, client_name: r.client_name ?? '', client_passport_no: r.client_passport_no ?? '', client_signed: r.client_signed, ho_name: r.ho_name ?? '', ho_permit_no: r.ho_permit_no ?? '', ho_signed: r.ho_signed });
      setLines((ls ?? []).map((l: any) => ({ farm_name: l.farm_name ?? '', farm_reg_no: l.farm_reg_no ?? '', district: l.district ?? '', landowner: l.landowner ?? '', permit_no: l.permit_no ?? '', date_killed: l.date_killed ?? '', species: l.species ?? '', quantity: String(l.quantity ?? ''), sex: l.sex ?? '', parts: l.parts ?? [] })));
    } else {
      setHead({ register_no: '', province: defaults.province ?? '', commenced: '', terminated: '', ph_name: '', ph_permit_no: '', ph_signed: false, client_name: defaults.client, client_passport_no: '', client_signed: false, ho_name: defaults.outfitter ?? '', ho_permit_no: '', ho_signed: false });
      setLines([blankLine()]);
    }
    await check();
  };
  useEffect(() => { load(); }, [huntId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!prefill) return;
    const d = prefill.data; const t = (x: unknown) => (typeof x === 'string' ? x : '');
    setHead(h => ({
      register_no: t(d.header.register_no), province: PROVINCES.includes(t(d.header.province)) ? t(d.header.province) : '', commenced: t(d.header.commenced), terminated: t(d.header.terminated),
      ph_name: t(d.header.ph_name), ph_permit_no: t(d.header.ph_permit_no), ph_signed: !!d.header.ph_signed,
      client_name: t(d.header.client_name) || h?.client_name || '', client_passport_no: t(d.header.client_passport_no), client_signed: !!d.header.client_signed,
      ho_name: t(d.header.ho_name) || h?.ho_name || '', ho_permit_no: t(d.header.ho_permit_no), ho_signed: !!d.header.ho_signed,
    }));
    const valid = new Set(RECEIVED_PARTS.map(p => p.code));
    setLines(d.lines.length ? d.lines.map(l => ({ farm_name: l.farm_name ?? '', farm_reg_no: l.farm_reg_no ?? '', district: l.district ?? '', landowner: l.landowner ?? '', permit_no: l.permit_no ?? '', date_killed: l.date_killed ?? '', species: l.species ?? '', quantity: l.quantity != null ? String(l.quantity) : '', sex: l.sex ?? '', parts: (l.parts ?? []).filter(c => valid.has(c)) })) : [blankLine()]);
    setAi({ unsure: d.unsure ?? [], flags: d.flags ?? [] });
    setDirty(true);
  }, [prefill?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!head) return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>;

  const set = (k: keyof Head, v: string | boolean) => { setHead(h => ({ ...h!, [k]: v })); setDirty(true); };
  const setLine = (i: number, k: keyof Line, v: string | string[]) => { setLines(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l)); setDirty(true); };
  const errOf = (key: string) => findings.find(f => f.key === key && !f.overridden);
  const headErr = (fieldName: string) => findings.find(f => f.key.startsWith('header:') && f.field === fieldName && !f.overridden);
  const border = (e?: Finding, unsure = false) => !e ? (unsure ? 'border-amber-400 bg-amber-950/20' : 'border-slate-600') : e.level === 'error' ? 'border-red-500 bg-red-950/30' : 'border-amber-500';
  const msg = (e?: Finding, unsure = false) => e ? <p className={`text-xs mt-1 ${e.level === 'error' ? 'text-red-300' : 'text-amber-300'}`}>{e.message}</p> : unsure ? <p className="text-xs mt-1 text-amber-300">The AI reader was not sure about this one. Check it against the paper.</p> : null;
  const uns = (k: string) => !!ai?.unsure.includes(k);

  async function save() {
    setBusy(true);
    const { error } = await (supabase as any).rpc('staff_save_register', { p_hunt: huntId, p_header: head, p_lines: lines.map(l => ({ ...l, quantity: l.quantity || null })) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setDirty(false); toast.success('Register saved and checked'); await check(); onChanged?.();
  }

  const H = ({ k, label, type = 'text', ph }: { k: keyof Head; label: string; type?: string; ph?: string }) => (
    <div><label className={lab}>{label}</label><input type={type} disabled={!canEdit} className={`${field} ${border(headErr(k), uns(k))}`} value={head[k] as string} placeholder={ph} onChange={e => set(k, e.target.value)} />{msg(headErr(k), uns(k))}</div>
  );
  const Sig = ({ k, label }: { k: 'ph_signed' | 'client_signed' | 'ho_signed'; label: string }) => (
    <div><button type="button" disabled={!canEdit} aria-pressed={head[k]} onClick={() => set(k, !head[k])} className={`w-full min-h-11 rounded-lg border-2 text-sm font-semibold ${head[k] ? 'border-green-500 bg-green-950/30 text-white' : headErr(k) ? 'border-red-500 text-red-200' : 'border-slate-600 text-slate-300'}`}>{head[k] ? '✓ ' : ''}{label}</button>{msg(headErr(k))}</div>
  );

  const errors = findings.filter(f => f.level === 'error' && !f.overridden).length;
  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-3 text-base font-semibold ${errors === 0 && findings.length >= 0 && !findings.some(f => f.key === 'register:missing') ? 'border-emerald-600 bg-emerald-950/30 text-emerald-200' : 'border-red-600 bg-red-950/20 text-red-200'}`}>
        {findings.some(f => f.key === 'register:missing') ? 'Type in the register below, then save to check it.' : errors === 0 ? 'No open problems on the register.' : `${errors} open problem${errors > 1 ? 's' : ''}. The register cannot be approved until each is fixed or set aside with a reason.`}
      </div>

      {ai && (
        <div className="rounded-xl border border-sky-500 bg-sky-950/30 p-3 space-y-1.5">
          <p className="font-bold text-sky-200">Filled in by the AI reader from the scan</p>
          <p className="text-sm text-sky-100">Check every field against the paper before you save. Fields it was not sure about are outlined in amber.</p>
          {ai.flags.length > 0 && <ul className="text-sm text-amber-200 list-disc pl-5 space-y-0.5">{ai.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>}
        </div>
      )}

      {findings.length > 0 && !findings.some(f => f.key === 'register:missing') && <FindingsList findings={findings} hunt={huntId} canEdit={canEdit} onChanged={check} />}

      <section className="rounded-2xl border border-slate-700 bg-[#111c26] p-4 space-y-3">
        <h3 className="text-lg font-bold text-slate-100">Top of the register</h3>
        <div className="grid grid-cols-2 gap-3">
          <H k="register_no" label="Register No." />
          <div><label className={lab}>Province ticked</label><select disabled={!canEdit} className={`${field} ${border(headErr('province'))}`} value={head.province} onChange={e => set('province', e.target.value)}><option value="">None ticked</option>{PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}</select>{msg(headErr('province'))}</div>
          <H k="commenced" label="Commenced" type="date" /><H k="terminated" label="Terminated" type="date" />
        </div>
        <p className="text-sm font-bold text-slate-300 pt-1">Professional hunter</p>
        <div className="grid grid-cols-2 gap-3"><H k="ph_name" label="Name" /><H k="ph_permit_no" label="PH permit No." /></div><Sig k="ph_signed" label="PH has signed" />
        <p className="text-sm font-bold text-slate-300 pt-1">Client</p>
        <div className="grid grid-cols-2 gap-3"><H k="client_name" label="Name" /><H k="client_passport_no" label="Passport No." /></div><Sig k="client_signed" label="Client has signed" />
        <p className="text-sm font-bold text-slate-300 pt-1">Hunting outfitter</p>
        <div className="grid grid-cols-2 gap-3"><H k="ho_name" label="Name" /><H k="ho_permit_no" label="HO permit No." /></div><Sig k="ho_signed" label="Outfitter has signed" />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-slate-100">The animals</h3>
        {lines.map((l, i) => {
          const E = (f: string) => errOf(`line:${i + 1}:${f}`);
          const F = ({ k, label, type = 'text' }: { k: keyof Line; label: string; type?: string }) => (
            <div><label className={lab}>{label}</label><input type={type} disabled={!canEdit} className={`${field} ${border(E(k === 'farm_name' ? 'farm' : String(k)), uns(`line:${i + 1}:${String(k)}`))}`} value={l[k] as string} onChange={e => setLine(i, k, e.target.value)} />{msg(E(k === 'farm_name' ? 'farm' : String(k)), uns(`line:${i + 1}:${String(k)}`))}</div>
          );
          return (
            <div key={i} className="rounded-2xl border border-slate-700 bg-[#111c26] p-4 space-y-3">
              <div className="flex items-center justify-between"><p className="font-bold text-slate-100">Line {i + 1}{l.species ? ` · ${l.species}` : ''}</p>{canEdit && lines.length > 1 && <button className="text-slate-400 min-h-9 min-w-9 flex items-center justify-center" aria-label="Remove this line" onClick={() => { setLines(ls => ls.filter((_, j) => j !== i)); setDirty(true); }}><Trash2 className="w-4 h-4" /></button>}</div>
              <div className="grid grid-cols-2 gap-3">
                <F k="species" label="Species killed" /><F k="date_killed" label="Date killed" type="date" />
                <F k="quantity" label="Number killed" type="number" /><div><label className={lab}>Sex</label><select disabled={!canEdit} className={`${field} ${border(E('sex'))}`} value={l.sex} onChange={e => setLine(i, 'sex', e.target.value)}><option value="">Not filled in</option><option value="M">Male</option><option value="F">Female</option></select>{msg(E('sex'))}</div>
                <F k="farm_name" label="Farm name" /><F k="farm_reg_no" label="Farm registration No." />
                <F k="district" label="Magisterial district" /><F k="permit_no" label="Hunting permit No." />
              </div>
              <div><label className={lab}>Land owner (name and address)</label><input disabled={!canEdit} className={`${field} ${border(E('landowner'))}`} value={l.landowner} onChange={e => setLine(i, 'landowner', e.target.value)} />{msg(E('landowner'))}</div>
              <div>
                <label className={lab}>Parts of the trophy to be exported</label>
                <div className="flex flex-wrap gap-2">
                  {PARTS.map(p => { const on = l.parts.includes(p.code); return <button key={p.code} type="button" disabled={!canEdit} aria-pressed={on} onClick={() => setLine(i, 'parts', on ? l.parts.filter(x => x !== p.code) : [...l.parts, p.code])} className={`min-h-10 px-3 rounded-lg border-2 text-sm font-semibold ${on ? 'border-green-500 bg-green-950/30 text-white' : 'border-slate-600 text-slate-300'}`}>{p.label}</button>; })}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Horns count as Skull. Hooves are Feet. Back skin is B/Skin. Flat skin is F/Skin. A full mount skin is Full skin.</p>
                {msg(E('parts'))}
              </div>
            </div>
          );
        })}
        {canEdit && <button className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-600 text-slate-200 font-semibold px-4 min-h-12" onClick={() => { setLines(ls => [...ls, { ...blankLine(), farm_name: ls[ls.length - 1]?.farm_name ?? '', farm_reg_no: ls[ls.length - 1]?.farm_reg_no ?? '', district: ls[ls.length - 1]?.district ?? '', landowner: ls[ls.length - 1]?.landowner ?? '', permit_no: ls[ls.length - 1]?.permit_no ?? '' }]); setDirty(true); }}><Plus className="w-5 h-5" />Add a line</button>}
      </section>

      {canEdit && <button disabled={busy} className="w-full min-h-14 rounded-xl bg-[#0073ea] text-white text-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2" onClick={save}>{busy && <Loader2 className="w-5 h-5 animate-spin" />}{dirty ? 'Save and check' : 'Check again'}</button>}
    </div>
  );
}
