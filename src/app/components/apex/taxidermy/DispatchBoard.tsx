/**
 * DispatchBoard — admin control of the workshop floor.
 * Assign job cards to people, set priority and due dates, push urgent work in,
 * and see at a glance whether each worker has opened and started their task.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { RefreshCw, Loader2, Zap, UserCheck, Search, CalendarDays, Eye, EyeOff, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { DEPT_LABELS } from '../../../../lib/pipeline';
import { PRIORITY_META, dueState } from '../../../../lib/hooks/useTaskFlow';
import { Button } from '../../ui/button';

interface Row {
  id: string;
  client: string;
  clientNo: string;
  species: string;
  mount: string;
  dept: string;
  assignedTo: string | null;
  assignedAt: string | null;
  openedAt: string | null;
  startedAt: string | null;
  priority: number;
  dueDate: string | null;
  note: string;
}
interface Staff { id: string; full_name: string }

type StatusKey = 'unassigned' | 'notopened' | 'opened' | 'started' | 'overdue';
const STATUS_LABEL: Record<StatusKey, string> = {
  unassigned: 'Unassigned', notopened: 'Not opened', opened: 'Opened, not started', started: 'Started', overdue: 'Overdue',
};

function rowStatus(r: Row): StatusKey {
  if (!r.assignedTo) return 'unassigned';
  if (r.startedAt) return 'started';
  if (r.openedAt) return 'opened';
  return 'notopened';
}
const isOverdue = (r: Row) => !!r.dueDate && r.dueDate < new Date().toISOString().slice(0, 10);

function ago(iso: string | null) {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function DispatchBoard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deptFilter, setDeptFilter] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey | ''>('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(100);
  // bulk form
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkDue, setBulkDue] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all: any[] = [];
      for (let from = 0; from < 10000; from += 1000) {
        const { data, error } = await (supabase as any).from('hunt_documents')
          .select('id, current_department, form_data, assigned_to, assigned_at, opened_at, started_at, priority, due_date, priority_note, client_hunts(clients(full_name, client_number))')
          .eq('doc_type', 'job_card').eq('status', 'in_progress').order('id').range(from, from + 999);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      setRows(all.map(d => ({
        id: d.id,
        client: d.client_hunts?.clients?.full_name ?? 'Unknown',
        clientNo: d.client_hunts?.clients?.client_number ?? '',
        species: d.form_data?.species ?? '',
        mount: d.form_data?.mount_type ?? '',
        dept: d.current_department ?? 'receiving',
        assignedTo: d.assigned_to, assignedAt: d.assigned_at, openedAt: d.opened_at, startedAt: d.started_at,
        priority: d.priority ?? 3, dueDate: d.due_date, note: d.priority_note ?? '',
      })));
      const { data: st } = await (supabase as any).from('staff_profiles').select('id, full_name').eq('is_active', true).order('full_name');
      setStaff(st ?? []);
    } catch (e: any) {
      toast.error('Could not load job cards: ' + (e?.message ?? 'unknown error') + ' (has migration 041 been run?)');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const nameOf = (id: string | null) => staff.find(s => s.id === id)?.full_name ?? (id ? 'Staff' : '');

  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { unassigned: 0, notopened: 0, opened: 0, started: 0, overdue: 0 };
    for (const r of rows) { c[rowStatus(r)]++; if (isOverdue(r)) c.overdue++; }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter(r => !deptFilter || r.dept === deptFilter)
      .filter(r => !workerFilter || (workerFilter === 'none' ? !r.assignedTo : r.assignedTo === workerFilter))
      .filter(r => !statusFilter || (statusFilter === 'overdue' ? isOverdue(r) : rowStatus(r) === statusFilter))
      .filter(r => !needle || r.client.toLowerCase().includes(needle) || r.species.toLowerCase().includes(needle) || r.clientNo.toLowerCase().includes(needle))
      .sort((a, b) => a.priority - b.priority || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.client.localeCompare(b.client));
  }, [rows, deptFilter, workerFilter, statusFilter, q]);

  const depts = useMemo(() => [...new Set(rows.map(r => r.dept))].sort(), [rows]);

  async function assign(ids: string[], patch: { assignee?: string | null; priority?: number | null; due?: string | null; clearDue?: boolean; note?: string | null }, okMsg: string) {
    if (ids.length === 0) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('job_assign', {
      p_doc_ids: ids,
      p_assignee: patch.assignee && patch.assignee !== 'none' ? patch.assignee : null,
      p_unassign: patch.assignee === 'none',
      p_priority: patch.priority ?? null,
      p_due: patch.due ?? null,
      p_clear_due: !!patch.clearDue,
      p_note: patch.note ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success(okMsg);
    await load();
    return true;
  }

  async function applyBulk() {
    const ids = [...selected];
    if (ids.length === 0) { toast.error('Tick the job cards first'); return; }
    if (!bulkAssignee && !bulkPriority && !bulkDue && !bulkNote.trim()) { toast.error('Choose who, a priority, a due date or add a note'); return; }
    const ok = await assign(ids, {
      assignee: bulkAssignee || undefined,
      priority: bulkPriority ? Number(bulkPriority) : null,
      due: bulkDue || null,
      note: bulkNote.trim() || null,
    }, `Updated ${ids.length} job card${ids.length !== 1 ? 's' : ''}`);
    if (ok) { setSelected(new Set()); setBulkAssignee(''); setBulkPriority(''); setBulkDue(''); setBulkNote(''); }
  }

  async function pushUrgent() {
    const ids = [...selected];
    if (ids.length === 0) { toast.error('Tick the job cards to push in first'); return; }
    const today = new Date().toISOString().slice(0, 10);
    const ok = await assign(ids, {
      assignee: bulkAssignee || undefined, priority: 1, due: bulkDue || today,
      note: bulkNote.trim() || 'Pushed to the top — do this before anything else.',
    }, `${ids.length} job card${ids.length !== 1 ? 's' : ''} pushed to the top`);
    if (ok) { setSelected(new Set()); setBulkNote(''); }
  }

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allVisibleSelected = visible.slice(0, limit).length > 0 && visible.slice(0, limit).every(r => selected.has(r.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><UserCheck className="w-5 h-5 text-[#0073ea]" /> Assign work</h2>
          <p className="text-sm text-slate-500">Assign job cards, set priority and due dates, and see who has opened and started each one</p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(STATUS_LABEL) as StatusKey[]).map(k => (
          <button key={k} onClick={() => setStatusFilter(f => (f === k ? '' : k))}
            className={`p-3 rounded-xl border text-center transition-all ${statusFilter === k ? 'border-[#0073ea] bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a] hover:border-slate-300'}`}>
            <p className={`text-2xl font-bold ${k === 'overdue' ? 'text-red-600' : k === 'unassigned' ? 'text-amber-600' : k === 'notopened' ? 'text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{counts[k]}</p>
            <p className="text-xs text-slate-500">{STATUS_LABEL[k]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Client or species…"
            className="text-xs pl-8 pr-3 py-2 w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <option value="">All departments</option>
          {depts.map(d => <option key={d} value={d}>{DEPT_LABELS[d] ?? d}</option>)}
        </select>
        <select value={workerFilter} onChange={e => setWorkerFilter(e.target.value)} className="text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <option value="">Everyone</option>
          <option value="none">Unassigned</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        {(deptFilter || workerFilter || statusFilter || q) && (
          <button onClick={() => { setDeptFilter(''); setWorkerFilter(''); setStatusFilter(''); setQ(''); }} className="text-xs text-slate-400 underline">Clear filters</button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{visible.length} job card{visible.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Bulk action bar */}
      <div className={`rounded-xl border p-3 space-y-2 ${selected.size ? 'border-[#0073ea] bg-blue-50/60 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {selected.size ? `${selected.size} selected — choose what to change` : 'Tick job cards below to assign, prioritise or push them in'}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)} className="text-xs px-2 py-2 rounded-lg border bg-white dark:bg-slate-900">
            <option value="">Assign to…</option>
            <option value="none">— Unassign (department pool) —</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value)} className="text-xs px-2 py-2 rounded-lg border bg-white dark:bg-slate-900">
            <option value="">Priority…</option>
            {[1, 2, 3, 4].map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="w-3.5 h-3.5" />
            <input type="date" value={bulkDue} onChange={e => setBulkDue(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-900" />
          </label>
          <input value={bulkNote} onChange={e => setBulkNote(e.target.value)} placeholder="Note for the worker (optional)"
            className="text-xs px-3 py-2 flex-1 min-w-[180px] rounded-lg border bg-white dark:bg-slate-900" />
          <Button size="sm" onClick={applyBulk} disabled={busy || !selected.size}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}</Button>
          <Button size="sm" onClick={pushUrgent} disabled={busy || !selected.size} className="bg-red-600 hover:bg-red-700 text-white gap-1"><Zap className="w-3.5 h-3.5" /> Push to top</Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading job cards…</div>
      ) : visible.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-12">No job cards match</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="hidden md:grid grid-cols-[28px_1.6fr_1fr_1.1fr_0.8fr_0.9fr_1.3fr] gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <input type="checkbox" checked={allVisibleSelected} onChange={e => {
              const ids = visible.slice(0, limit).map(r => r.id);
              setSelected(prev => { const n = new Set(prev); ids.forEach(i => (e.target.checked ? n.add(i) : n.delete(i))); return n; });
            }} />
            <span>Job card</span><span>Department</span><span>Assigned to</span><span>Priority</span><span>Due</span><span>Status</span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.slice(0, limit).map(r => {
              const st = rowStatus(r);
              const due = dueState(r.dueDate);
              return (
                <li key={r.id} className={`grid grid-cols-1 md:grid-cols-[28px_1.6fr_1fr_1.1fr_0.8fr_0.9fr_1.3fr] gap-2 px-3 py-2.5 items-center ${selected.has(r.id) ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''} ${r.priority === 1 ? 'border-l-4 border-l-red-500' : ''}`}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.species || '—'} <span className="font-normal text-slate-500">· {r.mount}</span></p>
                    <p className="text-xs text-slate-400 truncate">{r.clientNo && <span className="font-mono mr-1">{r.clientNo}</span>}{r.client}</p>
                    {r.note && <p className="text-[11px] text-red-600 dark:text-red-400 truncate">⚡ {r.note}</p>}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300">{DEPT_LABELS[r.dept] ?? r.dept}</span>
                  <select value={r.assignedTo ?? ''} disabled={busy}
                    onChange={e => assign([r.id], { assignee: e.target.value || 'none' }, e.target.value ? `Assigned to ${nameOf(e.target.value)}` : 'Returned to the department pool')}
                    className="text-xs px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-900 w-full">
                    <option value="">Unassigned</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                  <select value={r.priority} disabled={busy} onChange={e => assign([r.id], { priority: Number(e.target.value) }, 'Priority updated')}
                    className={`text-xs px-2 py-1.5 rounded-lg border font-semibold ${r.priority <= 2 ? 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-700 dark:text-red-300' : 'bg-white dark:bg-slate-900'}`}>
                    {[1, 2, 3, 4].map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                  </select>
                  <input type="date" value={r.dueDate ?? ''} disabled={busy}
                    onChange={e => e.target.value ? assign([r.id], { due: e.target.value }, 'Due date set') : assign([r.id], { clearDue: true }, 'Due date cleared')}
                    className={`text-xs px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-900 ${due?.label.startsWith('Overdue') ? 'border-red-400 text-red-600' : ''}`} />
                  <div className="text-xs">
                    {st === 'unassigned' && <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Unassigned</span>}
                    {st === 'notopened' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500 text-white font-semibold"><EyeOff className="w-3 h-3" />Not opened</span>}
                    {st === 'opened' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-black font-semibold"><Eye className="w-3 h-3" />Opened {ago(r.openedAt)}</span>}
                    {st === 'started' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-semibold"><Play className="w-3 h-3" />Started {ago(r.startedAt)}</span>}
                    {r.assignedTo && st !== 'started' && r.assignedAt && <p className="text-[10px] text-slate-400 mt-0.5">assigned {ago(r.assignedAt)}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          {visible.length > limit && (
            <button onClick={() => setLimit(l => l + 200)} className="w-full py-2.5 text-xs font-semibold text-[#0073ea] hover:bg-slate-50 dark:hover:bg-slate-800/50">
              Show more ({visible.length - limit} left)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
