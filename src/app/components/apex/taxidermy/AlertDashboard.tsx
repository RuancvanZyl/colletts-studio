import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { getStaffDepartments, DEPT_LABELS, DEPT_COLORS, STALL_HOURS } from '../../../../lib/pipeline';
import {
  AlertCircle, Clock, CheckCircle2, RefreshCw, Loader2,
  ChevronRight, Bell, Package, Layers,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertJob {
  docId: string;
  huntId: string;
  title: string;
  species: string;
  mountType: string;
  clientName: string;
  clientNumber: string;
  currentDept: string;
  lastMovedAt: string | null;
  status: string;
  hoursStalled: number;
  priority: 'red' | 'yellow' | 'green';
}

interface IncomingJob {
  docId: string;
  species: string;
  mountType: string;
  clientName: string;
  clientNumber: string;
  completedDept: string;
  completedAt: string;
}

// ── Priority grouping ─────────────────────────────────────────────────────────

function prioritise(job: AlertJob): 'red' | 'yellow' | 'green' {
  const threshold = STALL_HOURS[job.currentDept] ?? 48;
  if (job.hoursStalled >= threshold * 2) return 'red';
  if (job.hoursStalled >= threshold)     return 'yellow';
  return 'green';
}

function daysHours(hours: number) {
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return d > 0 ? `${d}d ${h}h` : `${Math.round(hours)}h`;
}

// ── Main component ────────────────────────────────────────────────────────────

export function AlertDashboard({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { profile } = useAuth();
  const [myJobs,    setMyJobs]    = useState<AlertJob[]>([]);
  const [incoming,  setIncoming]  = useState<IncomingJob[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const myDepts = profile?.full_name ? getStaffDepartments(profile.full_name) : [];

  useEffect(() => { load(); }, [profile?.full_name]);

  async function load() {
    if (!myDepts.length) { setLoading(false); return; }
    setLoading(true);
    try {
      // My active jobs (in my departments)
      const { data: docs } = await (supabase as any)
        .from('hunt_documents')
        .select('id, hunt_id, title, current_department, status, form_data, last_moved_at')
        .eq('doc_type', 'job_card')
        .in('current_department', myDepts)
        .not('status', 'in', '("complete","cancelled")');

      const jobs: AlertJob[] = [];
      for (const doc of docs ?? []) {
        const { data: hunt } = await (supabase as any)
          .from('client_hunts').select('clients!inner(full_name,client_number)').eq('id', doc.hunt_id).single();
        const fd = doc.form_data ?? {};
        const movedAt   = doc.last_moved_at ?? fd.received_at ?? null;
        const hoursAgo  = movedAt ? (Date.now() - new Date(movedAt).getTime()) / 3_600_000 : 0;

        const job: AlertJob = {
          docId:        doc.id,
          huntId:       doc.hunt_id,
          title:        doc.title ?? `${fd.species} ${fd.mount_type}`,
          species:      fd.species ?? '',
          mountType:    fd.mount_type ?? '',
          clientName:   hunt?.clients?.full_name ?? 'Unknown',
          clientNumber: hunt?.clients?.client_number ?? '',
          currentDept:  doc.current_department,
          lastMovedAt:  movedAt,
          status:       doc.status,
          hoursStalled: hoursAgo,
          priority:     'green',
        };
        job.priority = prioritise(job);
        jobs.push(job);
      }

      // Sort: red first, then yellow, then green; within each by hoursStalled desc
      jobs.sort((a, b) => {
        const order = { red: 0, yellow: 1, green: 2 };
        if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
        return b.hoursStalled - a.hoursStalled;
      });
      setMyJobs(jobs);

      // Incoming — jobs about to arrive at my first dept from previous dept
      // Find all job cards in the dept just before each of my depts
      const prevDeptJobs: IncomingJob[] = [];
      // We just highlight jobs in 'finishing' if I'm quality_check, etc.
      // Simple approach: query trophy_stage_history for recent completions into my depts
      const { data: history } = await (supabase as any)
        .from('trophy_stage_history')
        .select('hunt_doc_id, department, completed_at, hunt_documents!inner(form_data, hunt_id, current_department, title)')
        .in('department', myDepts.map(d => {
          // find the department that feeds into d
          return d; // placeholder — we look for docs arriving at my depts
        }))
        .order('completed_at', { ascending: false })
        .limit(20);

      // Simpler: incoming = docs currently in dept just before mine
      setIncoming(prevDeptJobs);
    } catch (err: any) {
      toast.error('Could not load alerts: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const red    = myJobs.filter(j => j.priority === 'red');
  const yellow = myJobs.filter(j => j.priority === 'yellow');
  const green  = myJobs.filter(j => j.priority === 'green');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" /> My Priority List
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {myDepts.map(d => DEPT_LABELS[d] ?? d).join(', ')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-8"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
      ) : myJobs.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">All clear — no active jobs in your departments</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* RED — urgent */}
          {red.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h2 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
                  Urgent — needs attention NOW ({red.length})
                </h2>
              </div>
              <div className="space-y-2">
                {red.map(job => <JobRow key={job.docId} job={job} onNavigate={onNavigate} />)}
              </div>
            </section>
          )}

          {/* YELLOW — overdue */}
          {yellow.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Overdue — running behind ({yellow.length})
                </h2>
              </div>
              <div className="space-y-2">
                {yellow.map(job => <JobRow key={job.docId} job={job} onNavigate={onNavigate} />)}
              </div>
            </section>
          )}

          {/* GREEN — on track */}
          {green.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <h2 className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                  On Track ({green.length})
                </h2>
              </div>
              <div className="space-y-2">
                {green.map(job => <JobRow key={job.docId} job={job} onNavigate={onNavigate} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Single job row ─────────────────────────────────────────────────────────────

function JobRow({ job, onNavigate }: { job: AlertJob; onNavigate?: (v: string) => void }) {
  const deptColor = DEPT_COLORS[job.currentDept] ?? 'bg-slate-600';
  const deptLabel = DEPT_LABELS[job.currentDept] ?? job.currentDept;
  const threshold = STALL_HOURS[job.currentDept] ?? 48;

  const borderCls =
    job.priority === 'red'    ? 'border-l-4 border-l-red-500' :
    job.priority === 'yellow' ? 'border-l-4 border-l-amber-400' :
                                'border-l-4 border-l-green-400';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ${borderCls} hover:shadow-sm transition-shadow`}>
      {/* Dept badge */}
      <span className={`${deptColor} text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap`}>
        {deptLabel}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{job.species}</span>
          <span className="text-xs text-slate-400">{job.mountType}</span>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {job.clientNumber && <span className="font-mono font-bold mr-1">{job.clientNumber}</span>}
          {job.clientName}
        </p>
      </div>

      {/* Stall time */}
      <div className="text-right shrink-0">
        <span className={`text-xs font-bold ${
          job.priority === 'red'    ? 'text-red-600' :
          job.priority === 'yellow' ? 'text-amber-600' : 'text-green-600'
        }`}>
          {daysHours(job.hoursStalled)}
        </span>
        <p className="text-[10px] text-slate-400">of {daysHours(threshold)} allowed</p>
      </div>
    </div>
  );
}
