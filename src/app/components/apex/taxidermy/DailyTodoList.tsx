/**
 * DailyTodoList — personalised daily work list for the logged-in staff member.
 * Pulls their job cards from hunt_documents, prioritises by stall severity,
 * and groups into: Urgent (red) → Do Today (yellow) → On Track (green).
 */

import { useState } from 'react';
import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { useAuth } from '../../../../lib/auth';
import { getStaffDepartments, DEPT_LABELS, STALL_HOURS } from '../../../../lib/pipeline';
import { Badge } from '../../ui/badge';
import { AlertTriangle, Clock, CheckCircle2, Loader2, RefreshCw, ChevronRight } from 'lucide-react';

function stallLevel(dept: string, movedAt: string | null): 'red' | 'yellow' | 'green' {
  if (!movedAt) return 'green';
  const hrs       = (Date.now() - new Date(movedAt).getTime()) / 3_600_000;
  const threshold = STALL_HOURS[dept] ?? 72;
  if (hrs > threshold * 2) return 'red';
  if (hrs > threshold)     return 'yellow';
  return 'green';
}

function hoursIn(movedAt: string | null) {
  if (!movedAt) return 0;
  return Math.round((Date.now() - new Date(movedAt).getTime()) / 3_600_000);
}

function dueIn(dept: string, movedAt: string | null) {
  if (!movedAt) return null;
  const hrs = (Date.now() - new Date(movedAt).getTime()) / 3_600_000;
  const remaining = (STALL_HOURS[dept] ?? 72) - hrs;
  if (remaining <= 0) return 'overdue';
  if (remaining < 4)  return `< 4h left`;
  if (remaining < 24) return `${Math.round(remaining)}h left`;
  return `${Math.round(remaining / 24)}d left`;
}

// ── Todo row ──────────────────────────────────────────────────────────────────

function TodoRow({ job, level, onAdvance }: {
  job: ReturnType<typeof useDeptJobs>['jobs'][0];
  level: 'red' | 'yellow' | 'green';
  onAdvance: (job: any) => void;
}) {
  const hrs    = hoursIn(job.lastMovedAt);
  const due    = dueIn(job.currentDept, job.lastMovedAt);
  const border = level === 'red' ? 'border-l-red-500' : level === 'yellow' ? 'border-l-amber-400' : 'border-l-green-400';

  return (
    <div className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-l-4 ${border} rounded-xl`}>
      {/* Priority dot */}
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
        level === 'red' ? 'bg-red-500' : level === 'yellow' ? 'bg-amber-400' : 'bg-green-400'
      }`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {job.species || 'Trophy'}
          {job.mountType && <span className="font-normal text-slate-400"> — {job.mountType}</span>}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {job.clientName}
          {job.tagNumber && <span className="font-mono ml-1">{job.tagNumber}</span>}
        </p>
      </div>

      <div className="text-right shrink-0 space-y-0.5">
        <p className={`text-xs font-semibold ${
          level === 'red' ? 'text-red-600' : level === 'yellow' ? 'text-amber-600' : 'text-slate-400'
        }`}>{due ?? `${hrs}h`}</p>
        <p className="text-[10px] text-slate-400">{DEPT_LABELS[job.currentDept] ?? job.currentDept}</p>
      </div>

      <button onClick={() => onAdvance(job)}
        className="text-slate-300 hover:text-[#0073ea] transition-colors shrink-0">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DailyTodoList({ onNavigateDept }: { onNavigateDept?: (dept: string) => void }) {
  const { profile } = useAuth();
  const depts = getStaffDepartments(profile?.full_name ?? '', profile?.department_name);
  const { jobs, loading, load } = useDeptJobs(depts.length > 0 ? depts : ['receiving']);

  const red    = jobs.filter(j => stallLevel(j.currentDept, j.lastMovedAt) === 'red');
  const yellow = jobs.filter(j => stallLevel(j.currentDept, j.lastMovedAt) === 'yellow');
  const green  = jobs.filter(j => stallLevel(j.currentDept, j.lastMovedAt) === 'green');

  function handleAdvance(job: any) {
    if (onNavigateDept) {
      // Navigate to the department's station so they can properly complete with photo
      const deptToView: Record<string, string> = {
        receiving:       'receiving',
        skinning:        'skinning',
        salting:         'salting',
        cleaning_bleach: 'skull-processing',
        dip_pack:        'dip-pack',
        tannery:         'storage',
        mounting:        'mounting',
        finishing:       'finishing',
        quality_check:   'quality',
        photos:          'quality',
        packing:         'packing',
        administration:  'admin',
      };
      onNavigateDept(deptToView[job.currentDept] ?? 'tasks');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" /><span>Loading your tasks…</span>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{today}</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Good morning{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-sm text-slate-500">
            {jobs.length === 0 ? 'No jobs in your queue right now' : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} in your queue`}
          </p>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary badges */}
      {jobs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {red.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle className="w-3 h-3" />{red.length} urgent
            </div>
          )}
          {yellow.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <Clock className="w-3 h-3" />{yellow.length} due today
            </div>
          )}
          {green.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs font-semibold text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-3 h-3" />{green.length} on track
            </div>
          )}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-400" />
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">All clear!</p>
            <p className="text-sm text-slate-400 mt-1">No jobs waiting in your departments right now</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Urgent */}
          {red.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Urgent — Do first</p>
              </div>
              {red.map(j => <TodoRow key={j.docId} job={j} level="red" onAdvance={handleAdvance} />)}
            </div>
          )}

          {/* Due today */}
          {yellow.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Due Soon</p>
              </div>
              {yellow.map(j => <TodoRow key={j.docId} job={j} level="yellow" onAdvance={handleAdvance} />)}
            </div>
          )}

          {/* On track */}
          {green.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide">On Track</p>
              </div>
              {green.map(j => <TodoRow key={j.docId} job={j} level="green" onAdvance={handleAdvance} />)}
            </div>
          )}
        </div>
      )}

      {/* Dept coverage note */}
      {depts.length > 0 && (
        <p className="text-[10px] text-slate-400 text-center">
          Showing jobs for: {depts.map(d => DEPT_LABELS[d] ?? d).join(', ')}
        </p>
      )}
    </div>
  );
}
