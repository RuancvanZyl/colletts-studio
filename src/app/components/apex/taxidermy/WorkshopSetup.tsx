/**
 * WorkshopSetup — admins edit the department checklists without touching the database.
 * A job card can only leave a department when every active step for that department is ticked.
 */
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, ArrowUp, ArrowDown, Camera, EyeOff, Eye, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { ALL_DEPARTMENTS, DEPT_LABELS } from '../../../../lib/pipeline';
import { Button } from '../../ui/button';

interface Item { id: string; dept_key: string; label: string; requires_photo: boolean; sort_order: number; is_active: boolean }

export function WorkshopSetup() {
  const [dept, setDept] = useState<string>('skinning');
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('department_checklist_items')
      .select('id, dept_key, label, requires_photo, sort_order, is_active').order('sort_order');
    if (error) toast.error('Could not load checklists: ' + error.message + ' (has migration 041 been run?)');
    const rows: Item[] = data ?? [];
    setItems(rows);
    const c: Record<string, number> = {};
    rows.filter(r => r.is_active).forEach(r => { c[r.dept_key] = (c[r.dept_key] ?? 0) + 1; });
    setCounts(c);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const mine = items.filter(i => i.dept_key === dept).sort((a, b) => a.sort_order - b.sort_order);

  async function patch(id: string, fields: Partial<Item>) {
    const { error } = await (supabase as any).from('department_checklist_items').update(fields).eq('id', id);
    if (error) { toast.error(error.message); return false; }
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...fields } : i)));
    return true;
  }

  async function move(item: Item, dir: -1 | 1) {
    const idx = mine.findIndex(i => i.id === item.id);
    const other = mine[idx + dir];
    if (!other) return;
    setBusy(true);
    // swap positions; if two steps share a number, spread them first
    const a = item.sort_order === other.sort_order ? item.sort_order + dir : item.sort_order;
    await Promise.all([patch(item.id, { sort_order: other.sort_order + (item.sort_order === other.sort_order ? dir : 0) }), patch(other.id, { sort_order: a })]);
    setBusy(false);
    load();
  }

  async function add() {
    const label = newLabel.trim();
    if (!label) return;
    setBusy(true);
    const next = (mine.length ? mine[mine.length - 1].sort_order : 0) + 10;
    const { error } = await (supabase as any).from('department_checklist_items').insert({ dept_key: dept, label, sort_order: next, requires_photo: false });
    setBusy(false);
    if (error) { toast.error(error.message.includes('duplicate') ? 'That step already exists for this department' : error.message); return; }
    setNewLabel(''); toast.success('Step added'); load();
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Checklists for each department</h2>
        <p className="text-sm text-slate-500">The steps a worker must tick before a job card can move to the next department.</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Changes apply from now on. Switching a step off (instead of deleting it) keeps the record of every time it was ticked in the past. A department with no active steps has no checklist rule.</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_DEPARTMENTS.map(d => (
          <button key={d} onClick={() => setDept(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${dept === d ? 'bg-[#0073ea] text-white border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>
            {DEPT_LABELS[d] ?? d} <span className="opacity-70 text-xs">{counts[d] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>
      ) : (
        <div className="space-y-2">
          {mine.length === 0 && <p className="text-sm text-slate-400 py-4">No steps yet — this department has no checklist rule. Add the first step below.</p>}
          {mine.map((it, i) => (
            <div key={it.id} className={`flex items-center gap-2 p-2 rounded-xl border bg-white dark:bg-slate-900 ${it.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-50'}`}>
              <span className="w-6 text-center text-xs font-bold text-slate-400">{i + 1}</span>
              <input defaultValue={it.label} key={it.label}
                onBlur={e => { const v = e.target.value.trim(); if (v && v !== it.label) patch(it.id, { label: v }).then(ok => { if (ok) toast.success('Saved'); }); }}
                className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-[#0073ea] bg-transparent focus:outline-none" />
              <button onClick={() => patch(it.id, { requires_photo: !it.requires_photo })} title="Mark as needing a photo" aria-label="Mark as needing a photo"
                className={`p-1.5 rounded-lg ${it.requires_photo ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'text-slate-300 hover:text-slate-500'}`}><Camera className="w-4 h-4" /></button>
              <button onClick={() => move(it, -1)} disabled={busy || i === 0} title="Move up" aria-label="Move up" className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => move(it, 1)} disabled={busy || i === mine.length - 1} title="Move down" aria-label="Move down" className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => patch(it.id, { is_active: !it.is_active }).then(ok => { if (ok) load(); })}
                title={it.is_active ? 'Switch this step off' : 'Switch this step back on'} aria-label={it.is_active ? 'Switch this step off' : 'Switch this step back on'}
                className="p-1.5 text-slate-400 hover:text-slate-700">{it.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={`New step for ${DEPT_LABELS[dept] ?? dept}…`} className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
            <Button onClick={add} disabled={busy || !newLabel.trim()} className="gap-1.5"><Plus className="w-4 h-4" />Add step</Button>
          </div>
        </div>
      )}
    </div>
  );
}
