/** DocumentTypesEditor — the list of documents every hunt needs. New hunts get it automatically. */
import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { PROVINCES, RESPONSIBLE_LABEL } from '../../../../lib/docs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface T { id: string; name: string; description: string | null; responsible: string; applies_to: string; provinces: string[]; needs_signature: boolean; needs_stamp: boolean; sort_order: number; is_active: boolean }
const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';
const APPLIES: Record<string, string> = { all: 'Overseas and local hunters', export: 'Overseas (export) hunters only', local: 'Local hunters only' };

export function DocumentTypesEditor() {
  const [list, setList] = useState<T[] | null>(null);
  const [edit, setEdit] = useState<Partial<T> | null>(null);
  const load = async () => { const { data } = await (supabase as any).from('document_types').select('*').order('sort_order').order('name'); setList(data ?? []); };
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit?.name?.trim()) return;
    const row = { provinces: edit.provinces ?? [], name: edit.name.trim(), description: edit.description?.trim() || null, responsible: edit.responsible ?? 'outfitter', applies_to: edit.applies_to ?? 'export', needs_signature: edit.needs_signature ?? true, needs_stamp: edit.needs_stamp ?? true, is_active: edit.is_active ?? true, sort_order: edit.sort_order ?? (list?.length ?? 0) * 10 };
    const r = edit.id ? await (supabase as any).from('document_types').update(row).eq('id', edit.id) : await (supabase as any).from('document_types').insert(row);
    if (r.error) { toast.error(r.error.message.includes('row-level') ? 'Only admins can change this list' : r.error.message); return; }
    setEdit(null); load();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-slate-100">Required documents</h1><p className="text-base text-slate-400 mt-1">The paperwork every hunt needs before trophies can be exported. Say who is responsible, and whether it must be signed and stamped. New hunts get this list automatically; for a hunt that is already open, use "Create the checklist" on its Documents page.</p></div>
        <button className="min-h-12 px-4 rounded-xl bg-[#0073ea] text-white font-bold flex items-center gap-2 shrink-0" onClick={() => setEdit({ responsible: 'outfitter', applies_to: 'all', provinces: [], needs_signature: true, needs_stamp: true, is_active: true })}><Plus className="w-5 h-5" />Add</button>
      </div>
      {!list && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
      {list && list.length === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">No documents on the list yet. Add them one by one, or send the list and it can be loaded for you.</p>}
      {list && list.length > 0 && (
        <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
          {list.map(t => (
            <button key={t.id} onClick={() => setEdit(t)} className={`w-full text-left px-4 py-3 flex items-center gap-3 min-h-16 hover:bg-[#162330] ${t.is_active ? '' : 'opacity-50'}`}>
              <span className="flex-1 min-w-0"><span className="block text-lg font-semibold text-slate-100">{t.name}</span><span className="block text-sm text-slate-400">{RESPONSIBLE_LABEL[t.responsible]} · {t.provinces?.length ? t.provinces.join(', ') : 'Every province'}{t.applies_to === 'all' ? '' : ` · ${APPLIES[t.applies_to]}`}{t.needs_signature ? ' · signed' : ''}{t.needs_stamp ? ' · stamped' : ''}</span></span>
              {!t.is_active && <span className="text-xs rounded-full bg-slate-700 text-slate-300 px-2.5 py-1">Switched off</span>}
            </button>
          ))}
        </div>
      )}
      {edit && (
        <Dialog open onOpenChange={(o: boolean) => { if (!o) setEdit(null); }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-2xl">{edit.id ? 'Change the document' : 'Add a document'}</DialogTitle></DialogHeader>
            <div><label className={lab}>Name</label><input className={field} value={edit.name ?? ''} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
            <div><label className={lab}>What it is for <span className="font-normal text-slate-500">(optional)</span></label><input className={field} value={edit.description ?? ''} onChange={e => setEdit(p => ({ ...p, description: e.target.value }))} /></div>
            <div><label className={lab}>Who must supply it?</label><select className={field} value={edit.responsible} onChange={e => setEdit(p => ({ ...p, responsible: e.target.value }))}>{Object.entries(RESPONSIBLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className={lab}>Overseas or local hunters?</label><select className={field} value={edit.applies_to} onChange={e => setEdit(p => ({ ...p, applies_to: e.target.value }))}>{Object.entries(APPLIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div>
              <label className={lab}>Which provinces? <span className="font-normal text-slate-500">(none ticked = every province)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {PROVINCES.map(pv => { const on = (edit.provinces ?? []).includes(pv); return (
                  <button key={pv} type="button" aria-pressed={on} onClick={() => setEdit(p => ({ ...p, provinces: on ? (p?.provinces ?? []).filter(x => x !== pv) : [...(p?.provinces ?? []), pv] }))}
                    className={`min-h-11 rounded-lg border-2 text-sm font-semibold px-2 ${on ? 'border-green-500 bg-green-950/30 text-white' : 'border-slate-600 text-slate-300'}`}>{pv}</button>
                ); })}
              </div>
            </div>
            <label className="flex items-center gap-3 text-base text-slate-200 min-h-11"><input type="checkbox" className="w-5 h-5" checked={edit.needs_signature ?? true} onChange={e => setEdit(p => ({ ...p, needs_signature: e.target.checked }))} />It must be signed</label>
            <label className="flex items-center gap-3 text-base text-slate-200 min-h-11"><input type="checkbox" className="w-5 h-5" checked={edit.needs_stamp ?? true} onChange={e => setEdit(p => ({ ...p, needs_stamp: e.target.checked }))} />It must be stamped</label>
            <label className="flex items-center gap-3 text-base text-slate-200 min-h-11"><input type="checkbox" className="w-5 h-5" checked={edit.is_active ?? true} onChange={e => setEdit(p => ({ ...p, is_active: e.target.checked }))} />In use (new hunts get it)</label>
            <div className="flex gap-2"><button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={() => setEdit(null)}>Cancel</button><button className="flex-1 min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50" disabled={!edit.name?.trim()} onClick={save}>Save</button></div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
