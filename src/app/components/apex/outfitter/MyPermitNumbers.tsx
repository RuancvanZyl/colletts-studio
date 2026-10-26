/**
 * MyPermitNumbers — the outfitter keeps their own permit number and the permit numbers of the professional hunters
 * they work with. PH permit numbers change every year, so it is one line per year. The workshop checks every
 * register against these, and confirms each one against the permit itself.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface N { id?: string; kind: 'ph_permit' | 'ho_permit'; holder_name: string; year: number; number: string; verified_at?: string | null }
const field = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 min-h-12 text-base';
const lab = 'block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1';

export function MyPermitNumbers({ outfitterId, outfitterName }: { outfitterId: string; outfitterName: string }) {
  const [list, setList] = useState<N[] | null>(null);
  const [edit, setEdit] = useState<N | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => { const { data } = await (supabase as any).from('registered_numbers').select('id, kind, holder_name, year, number, verified_at').order('year', { ascending: false }).order('holder_name'); setList(data ?? []); };
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit || !edit.holder_name.trim() || !edit.number.trim()) return;
    setBusy(true);
    const row = { kind: edit.kind, holder_name: edit.kind === 'ho_permit' ? outfitterName : edit.holder_name.trim(), year: edit.year, number: edit.number.trim() };
    const r = edit.id ? await (supabase as any).from('registered_numbers').update(row).eq('id', edit.id) : await (supabase as any).from('registered_numbers').insert({ ...row, outfitter_id: outfitterId });
    setBusy(false);
    if (r.error) { toast.error(r.error.message.includes('duplicate') ? 'That name already has a number on file for that year. If it is wrong, ask the workshop to change it.' : r.error.message); return; }
    toast.success('Saved. The workshop will verify it against the permit.'); setEdit(null); load();
  }
  const Row = ({ n }: { n: N }) => (
    <button onClick={() => setEdit(n)} className="w-full text-left px-4 py-3 min-h-16 flex items-center gap-3">
      <span className="flex-1 min-w-0"><span className="block font-semibold text-slate-900 dark:text-slate-100">{n.holder_name}</span><span className="block text-sm text-slate-500">{n.year}</span></span>
      <span className="text-right"><span className="block font-mono text-slate-900 dark:text-slate-100">{n.number}</span>
        {n.verified_at ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300"><CheckCircle2 className="w-3.5 h-3.5" />Verified</span> : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300"><Clock className="w-3.5 h-3.5" />Waiting to be verified</span>}</span>
    </button>
  );
  const own = (list ?? []).filter(n => n.kind === 'ho_permit'); const phs = (list ?? []).filter(n => n.kind === 'ph_permit');
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Permit numbers</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Keep these up to date. The workshop checks every hunt register against them. When a number changes, the workshop checks it against the permit again.</p>
      </div>
      {!list && <div className="flex justify-center py-6 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>}
      {list && (
        <>
          <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800 dark:text-slate-100">My outfitter permit</h3>
            <button className="min-h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-100" onClick={() => setEdit({ kind: 'ho_permit', holder_name: outfitterName, year: new Date().getFullYear(), number: '' })}><Plus className="w-4 h-4" />Add a year</button></div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">{own.length ? own.map(n => <Row key={n.id} n={n} />) : <p className="p-4 text-sm text-slate-500">No number yet.</p>}</div>
          <div className="flex items-center justify-between pt-2"><h3 className="font-semibold text-slate-800 dark:text-slate-100">My professional hunters</h3>
            <button className="min-h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-100" onClick={() => setEdit({ kind: 'ph_permit', holder_name: '', year: new Date().getFullYear(), number: '' })}><Plus className="w-4 h-4" />Add</button></div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">{phs.length ? phs.map(n => <Row key={n.id} n={n} />) : <p className="p-4 text-sm text-slate-500">No professional hunters yet. Add each one with this year's permit number.</p>}</div>
        </>
      )}
      {edit && (
        <Dialog open onOpenChange={(o: boolean) => { if (!o) setEdit(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="text-2xl">{edit.kind === 'ho_permit' ? 'My outfitter permit' : edit.id ? 'Change the permit number' : 'Add a professional hunter'}</DialogTitle></DialogHeader>
            {edit.kind === 'ph_permit' && <div><label className={lab}>Professional hunter's name (as written on the register)</label><input className={field} value={edit.holder_name} onChange={e => setEdit({ ...edit, holder_name: e.target.value })} autoFocus={!edit.id} /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lab}>Year</label><input type="number" className={field} value={edit.year} onChange={e => setEdit({ ...edit, year: +e.target.value })} /></div>
              <div><label className={lab}>Permit number</label><input className={field} value={edit.number} onChange={e => setEdit({ ...edit, number: e.target.value })} autoFocus={!!edit.id || edit.kind === 'ho_permit'} /></div>
            </div>
            <div className="flex gap-2">
              <button className="min-h-12 px-5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-semibold" onClick={() => setEdit(null)}>Cancel</button>
              <button className="flex-1 min-h-12 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold disabled:opacity-50" disabled={busy || !edit.holder_name.trim() || !edit.number.trim()} onClick={save}>Save</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
