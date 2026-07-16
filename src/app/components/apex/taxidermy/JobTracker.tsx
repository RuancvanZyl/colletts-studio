/**
 * JobTracker — Management view of all active hunts and their trophy pipelines.
 * Groups job cards by hunt. Shows pipeline progress, stall status, and filters.
 * Replaces the mock InventoryView.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { getPipeline, DEPT_LABELS, DEPT_COLORS, STALL_HOURS } from '../../../../lib/pipeline';
import {
  Search, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Clock, CheckCircle2, AlertTriangle, Filter, Crosshair,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobCard {
  id:                 string;
  title:              string;
  status:             string;
  current_department: string;
  last_moved_at:      string | null;
  form_data:          { mount_type?: string; species?: string; quantity?: number; tag_number?: string } | null;
}

interface HuntRow {
  id:            string;
  year:          number;
  client_type:   string;
  operator:      string | null;
  client_name:   string;
  client_number: string | null;
  created_at:    string;
  job_cards:     JobCard[];
}

type StatusFilter = 'all' | 'active' | 'pending_payment' | 'completed';

// ── Stall helper ──────────────────────────────────────────────────────────────

function stallInfo(dept: string, movedAt: string | null): { level: 'red' | 'yellow' | 'green'; hours: number } {
  if (!movedAt) return { level: 'green', hours: 0 };
  const hours = (Date.now() - new Date(movedAt).getTime()) / 3_600_000;
  const threshold = STALL_HOURS[dept] ?? 72;
  if (hours > threshold * 2) return { level: 'red',    hours: Math.round(hours) };
  if (hours > threshold)      return { level: 'yellow', hours: Math.round(hours) };
  return                              { level: 'green',  hours: Math.round(hours) };
}

// ── Pipeline mini-bar ─────────────────────────────────────────────────────────

function PipelineBar({ job }: { job: JobCard }) {
  const mountType = job.form_data?.mount_type ?? 'Shoulder Mount';
  const stages    = getPipeline(mountType);
  const currIdx   = stages.indexOf(job.current_department);
  const progress  = job.status === 'completed' ? stages.length : currIdx + 1;
  const pct       = Math.round((progress / stages.length) * 100);
  const stall     = stallInfo(job.current_department, job.last_moved_at);

  const barColor =
    job.status === 'completed'      ? 'bg-green-500' :
    job.status === 'pending_payment' ? 'bg-slate-300 dark:bg-slate-600' :
    stall.level === 'red'           ? 'bg-red-500' :
    stall.level === 'yellow'        ? 'bg-amber-400' :
                                      'bg-[#0073ea]';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 truncate max-w-[160px]">{job.title}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {job.status === 'pending_payment' ? (
            <Badge className="text-[10px] h-4 bg-amber-100 text-amber-700 border-0 px-1.5">Awaiting Payment</Badge>
          ) : job.status === 'completed' ? (
            <Badge className="text-[10px] h-4 bg-green-100 text-green-700 border-0 px-1.5">Done</Badge>
          ) : (
            <>
              {stall.level === 'red' && (
                <AlertTriangle className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                DEPT_COLORS[job.current_department] ?? 'bg-slate-500'
              } text-white`}>
                {DEPT_LABELS[job.current_department] ?? job.current_department}
              </span>
              <span className="text-slate-400 text-[10px]">{pct}%</span>
            </>
          )}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Hunt card ─────────────────────────────────────────────────────────────────

function HuntCard({ hunt }: { hunt: HuntRow }) {
  const [open, setOpen] = useState(false);

  const active    = hunt.job_cards.filter(j => j.status === 'in_progress');
  const done      = hunt.job_cards.filter(j => j.status === 'completed');
  const pending   = hunt.job_cards.filter(j => j.status === 'pending_payment');
  const stalledRed = active.filter(j => stallInfo(j.current_department, j.last_moved_at).level === 'red');

  const overallPct = hunt.job_cards.length === 0 ? 0 :
    Math.round((done.length / hunt.job_cards.length) * 100);

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
      stalledRed.length > 0 ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'
    }`}>
      {/* Hunt header */}
      <button className="w-full p-4 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setOpen(o => !o)}>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-slate-500">{hunt.client_name.charAt(0)}</span>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{hunt.client_name}</span>
            {hunt.client_number && <Badge variant="secondary" className="text-xs">{hunt.client_number}</Badge>}
            <Badge className={`text-xs border-0 ${hunt.client_type === 'export' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {hunt.client_type}
            </Badge>
            {hunt.operator && <span className="text-xs text-slate-400">{hunt.operator} · {hunt.year}</span>}
          </div>

          {/* Overall progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{hunt.job_cards.length} trophies · {done.length} complete · {active.length} in progress{pending.length > 0 ? ` · ${pending.length} awaiting payment` : ''}</span>
              <span className="font-medium">{overallPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {stalledRed.length > 0 && (
            <Badge className="text-xs bg-red-100 text-red-700 border-red-200 gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />{stalledRed.length} stalled
            </Badge>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Expanded trophy list */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-3 space-y-3">
          {hunt.job_cards.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No job cards yet</p>
          ) : (
            hunt.job_cards.map(j => <PipelineBar key={j.id} job={j} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── Main tracker ──────────────────────────────────────────────────────────────

export function JobTracker() {
  const [hunts,    setHunts]   = useState<HuntRow[]>([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState('');
  const [filter,   setFilter]  = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    const { data: docs } = await (supabase as any)
      .from('hunt_documents')
      .select(`
        id, title, status, current_department, last_moved_at, form_data,
        client_hunts!inner(
          id, year, client_type, operator, created_at,
          clients!inner(full_name, client_number)
        )
      `)
      .eq('doc_type', 'job_card')
      .order('created_at', { ascending: false });

    if (!docs) { setLoading(false); return; }

    // Group by hunt
    const huntMap: Record<string, HuntRow> = {};
    for (const d of docs) {
      const h = d.client_hunts;
      if (!huntMap[h.id]) {
        huntMap[h.id] = {
          id:            h.id,
          year:          h.year,
          client_type:   h.client_type ?? 'export',
          operator:      h.operator ?? null,
          client_name:   h.clients?.full_name ?? 'Unknown',
          client_number: h.clients?.client_number ?? null,
          created_at:    h.created_at,
          job_cards:     [],
        };
      }
      huntMap[h.id].job_cards.push({
        id:                 d.id,
        title:              d.title,
        status:             d.status,
        current_department: d.current_department,
        last_moved_at:      d.last_moved_at,
        form_data:          d.form_data,
      });
    }

    setHunts(Object.values(huntMap).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    setLoading(false);
  }

  // Derived filters
  const years = [...new Set(hunts.map(h => h.year.toString()))].sort((a, b) => parseInt(b) - parseInt(a));

  const filtered = hunts.filter(h => {
    // year filter
    if (yearFilter !== 'all' && h.year.toString() !== yearFilter) return false;
    // status filter
    if (filter === 'active' && !h.job_cards.some(j => j.status === 'in_progress')) return false;
    if (filter === 'pending_payment' && !h.job_cards.some(j => j.status === 'pending_payment')) return false;
    if (filter === 'completed' && !h.job_cards.every(j => j.status === 'completed')) return false;
    // text search
    if (search) {
      const q = search.toLowerCase();
      return h.client_name.toLowerCase().includes(q) ||
             (h.client_number?.toLowerCase().includes(q) ?? false) ||
             (h.operator?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  // Summary counts
  const totalActive   = hunts.filter(h => h.job_cards.some(j => j.status === 'in_progress')).length;
  const totalPending  = hunts.filter(h => h.job_cards.some(j => j.status === 'pending_payment')).length;
  const totalStalled  = hunts.filter(h => h.job_cards.some(j =>
    j.status === 'in_progress' && stallInfo(j.current_department, j.last_moved_at).level === 'red'
  )).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Job Tracker</h2>
          <p className="text-sm text-slate-500">All hunts and trophy pipeline status</p>
        </div>
        <button onClick={load} disabled={loading} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <Crosshair className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{totalActive} active</span>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{totalPending} awaiting payment</span>
          </div>
        )}
        {totalStalled > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">{totalStalled} stalled</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search client, number, operator…" className="pl-8 h-8 text-sm" />
        </div>

        {/* Status tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs gap-0.5">
          {(['all','active','pending_payment','completed'] as StatusFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                filter === f ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              {f === 'pending_payment' ? 'Pending' : f}
            </button>
          ))}
        </div>

        {/* Year filter */}
        {years.length > 1 && (
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            className="h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0073ea]">
            <option value="all">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No hunts match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">{filtered.length} hunt{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.map(h => <HuntCard key={h.id} hunt={h} />)}
        </div>
      )}
    </div>
  );
}
