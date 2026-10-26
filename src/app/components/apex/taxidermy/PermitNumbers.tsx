/** PermitNumbers — the permit numbers on file: a professional hunter gets a new one every year, an outfitter has theirs. */
import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface N { id?: string; kind: string; holder_name: string; year: number; number: string }
const KIND: Record<string, string> = { ph_permit: 'Professional hunter permit', ho_permit: 'Outfitter permit' };
const field = 'w-full rounded-lg border border-slate-600 bg-[#0f1a24] text-slate-100 px-3 min-h-11 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0073ea]';
const lab = 'block text-sm font-semibold text-slate-300 mb-1';

export function PermitNumbers() {
  const [list, setList] = useState<N[] | null>(null);
  const [edit, setEdit] = useState<N | null>(null);
  const load = async () => { const { data } = await (supabase as any).from('registered_numbers').select('*').order('year', { ascending: false }).order('holder_name'); setList(data ?? []); };
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit?.holder_name.trim() || !edit.number.trim()) return;
    const row = { kind: edit.kind, holder_name: edit.holder_name.trim(), year: edit.year, number: edit.number.trim() };
    const r = edit.id ? await (supabase as any).from('registered_numbers').update(row).eq('id', edit.id) : await (supabase as any).from('registered_numbers').insert(row);
    if (r.error) { toast.error(r.error.message.includes('row-level') ? 'Only admins can change this list' : r.error.message.includes('duplicate') ? 'That person already has a number for that year' : r.error.message); return; }
    setEdit(null); load();
  }
  async function remove() {
    if (!edit?.id || !window.confirm('Remove this number?')) return;
    const { error } = await (supabase as any).from('registered_numbers').delete().eq('id', edit.id);
    if (error) toast.error(error.message); else { setEdit(null); load(); }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-slate-100">Permit numbers</h1><p className="text-base text-slate-400 mt-1">Each professional hunter gets a new permit number every year, and each outfitter has their own. Add them here and every hunt register is checked against them.</p></div>
        <button className="min-h-12 px-4 rounded-xl bg-[#0073ea] text-white font-bold flex items-center gap-2 shrink-0" onClick={() => setEdit({ kind: 'ph_permit', holder_name: '', year: new Date().getFullYear(), number: '' })}><Plus className="w-5 h-5" />Add</button>
      </div>
      {!list && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
      {list && list.length === 0 && <p className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">No numbers on file yet. Until you add them, a register can only show a warning that its numbers could not be checked.</p>}
      {list && list.length > 0 && (
        <div className="rounded-2xl border border-slate-700 bg-[#111c26] divide-y divide-slate-800 overflow-hidden">
          {list.map(n => (
            <button key={n.id} onClick={() => setEdit(n)} className="w-full text-left px-4 py-3 flex items-center gap-3 min-h-16 hover:bg-[#162330]">
              <span className="flex-1 min-w-0"><span className="block text-lg font-semibold text-slate-100">{n.holder_name}</span><span className="block text-sm text-slate-400">{KIND[n.kind]} · {n.year}</span></span>
              <span className="font-mono text-slate-200">{n.number}</span>
            </button>
          ))}
        </div>
      )}
      {edit && (
        <Dialog open onOpenChange={(o: boolean) => { if (!o) setEdit(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="text-2xl">{edit.id ? 'Change the number' : 'Add a number'}</DialogTitle></DialogHeader>
            <div><label className={lab}>Whose permit?</label><select className={field} value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value })}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className={lab}>Name (as it is written on the register)</label><input className={field} value={edit.holder_name} onChange={e => setEdit({ ...edit, holder_name: e.target.value })} autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lab}>Year</label><input type="number" className={field} value={edit.year} onChange={e => setEdit({ ...edit, year: +e.target.value })} /></div>
              <div><label className={lab}>Permit number</label><input className={field} value={edit.number} onChange={e => setEdit({ ...edit, number: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              {edit.id && <button className="min-h-12 px-4 rounded-xl border border-red-500 text-red-300 font-semibold" onClick={remove}>Remove</button>}
              <button className="min-h-12 px-5 rounded-xl border border-slate-500 text-slate-100 font-semibold" onClick={() => setEdit(null)}>Cancel</button>
              <button className="flex-1 min-h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50" disabled={!edit.holder_name.trim() || !edit.number.trim()} onClick={save}>Save</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
