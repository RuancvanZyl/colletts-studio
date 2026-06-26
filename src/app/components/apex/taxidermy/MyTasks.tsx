import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { getStaffDepartments, getNextDepartment, getPipeline, DEPT_LABELS, DEPT_COLORS } from '../../../../lib/pipeline';
import { toast } from 'sonner';
import { CheckCircle2, Clock, ChevronRight, ListTodo, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface Task {
  docId: string;
  clientName: string;
  clientNumber: string;
  species: string;
  mountType: string;
  tagNumber: string;
  condition: string;
  conditionNotes: string;
  instructions: string;
  currentDept: string;
  receivedAt: string;
  intakePhotoPaths: string[];
  stageHistory: { dept: string; completedBy: string; completedAt: string }[];
}

export function MyTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const myDepts = getStaffDepartments(profile?.full_name ?? '');

  const load = useCallback(async () => {
    if (!myDepts.length) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: docs, error } = await (supabase as any)
        .from('hunt_documents')
        .select('id, hunt_id, current_department, status, form_data')
        .eq('doc_type', 'job_card')
        .in('current_department', myDepts)
        .neq('status', 'complete');

      if (error) throw error;

      const tasks: Task[] = [];
      for (const doc of docs ?? []) {
        // Load client info via hunt
        const { data: hunt } = await (supabase as any)
          .from('client_hunts').select('client_id').eq('id', doc.hunt_id).single();
        const { data: client } = hunt
          ? await (supabase as any).from('clients').select('full_name, client_number').eq('id', hunt.client_id).single()
          : { data: null };

        const fd = doc.form_data ?? {};
        tasks.push({
          docId:            doc.id,
          clientName:       client?.full_name ?? 'Unknown',
          clientNumber:     client?.client_number ?? '',
          species:          fd.species ?? '',
          mountType:        fd.mount_type ?? '',
          tagNumber:        fd.tag_number ?? '',
          condition:        fd.condition ?? '',
          conditionNotes:   fd.condition_notes ?? '',
          instructions:     fd.instructions ?? '',
          currentDept:      doc.current_department,
          receivedAt:       fd.received_at ?? '',
          intakePhotoPaths: fd.intake_photo_paths ?? [],
          stageHistory:     fd.stage_history ?? [],
        });
      }
      setTasks(tasks);
    } catch (err: any) {
      toast.error('Failed to load tasks: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [myDepts.join(',')]);

  useEffect(() => { load(); }, [load]);

  async function completeStage(task: Task) {
    setCompleting(task.docId);
    try {
      const next = getNextDepartment(task.mountType, task.currentDept);
      const newHistory = [
        ...task.stageHistory,
        { dept: task.currentDept, completedBy: profile?.full_name ?? '', completedAt: new Date().toISOString() },
      ];

      const { data: doc } = await (supabase as any)
        .from('hunt_documents').select('form_data').eq('id', task.docId).single();

      await (supabase as any).from('hunt_documents').update({
        current_department: next ?? 'done',
        status: next ? 'in_progress' : 'complete',
        form_data: {
          ...(doc?.form_data ?? {}),
          stage_history: newHistory,
        },
      }).eq('id', task.docId);

      toast.success(next
        ? `Handed off to ${DEPT_LABELS[next] ?? next}`
        : `${task.species} fully complete!`
      );
      setTasks(prev => prev.filter(t => t.docId !== task.docId));
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setCompleting(null);
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  if (!myDepts.length) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20 text-slate-400">
        <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No departments assigned</p>
        <p className="text-sm mt-1">Your account isn't linked to any production department yet. Ask an admin to update your profile.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-blue-500" />
            My Tasks — {firstName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Departments: {myDepts.map(d => DEPT_LABELS[d] ?? d).join(', ')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-40" />
          <p>Loading your tasks…</p>
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-60" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">All clear!</p>
          <p className="text-sm mt-1">No trophies waiting for your department right now.</p>
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{tasks.length} trophy{tasks.length !== 1 ? ' trophies' : ''} waiting</p>

          {tasks.map(task => {
            const pipeline = getPipeline(task.mountType);
            const stageIdx = pipeline.indexOf(task.currentDept);
            const progress = stageIdx >= 0 ? Math.round((stageIdx / (pipeline.length - 1)) * 100) : 0;
            const deptColor = DEPT_COLORS[task.currentDept] ?? 'bg-slate-500';
            const isCompleting = completing === task.docId;

            return (
              <div key={task.docId} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Top bar */}
                <div className={`${deptColor} px-4 py-2 flex items-center justify-between`}>
                  <span className="text-white text-xs font-bold uppercase tracking-wide">
                    {DEPT_LABELS[task.currentDept] ?? task.currentDept}
                  </span>
                  <span className="text-white/80 text-xs font-mono">{task.tagNumber}</span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Trophy info */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-lg">{task.species}</span>
                        <span className="text-slate-500 text-sm">{task.mountType}</span>
                        {task.condition === 'damaged' && (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Damaged
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">
                        {task.clientNumber && <span className="font-bold text-slate-700 dark:text-slate-300 mr-1">{task.clientNumber}</span>}
                        {task.clientName}
                      </p>
                    </div>
                    {task.receivedAt && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(task.receivedAt).toLocaleDateString('en-ZA')}
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  {task.instructions && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Instructions</p>
                      <p className="text-sm text-amber-800 dark:text-amber-300">{task.instructions}</p>
                    </div>
                  )}

                  {/* Condition notes */}
                  {task.conditionNotes && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">Condition Notes</p>
                      <p className="text-sm text-red-800 dark:text-red-300">{task.conditionNotes}</p>
                    </div>
                  )}

                  {/* Pipeline progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Pipeline progress</span>
                      <span>{stageIdx + 1} / {pipeline.length}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {pipeline.map((stage, i) => {
                        const done = i < stageIdx;
                        const current = i === stageIdx;
                        return (
                          <span key={stage} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            done    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                            current ? `${deptColor} text-white` :
                                      'bg-slate-100 text-slate-400 dark:bg-slate-700'
                          }`}>
                            {DEPT_LABELS[stage] ?? stage}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage history */}
                  {task.stageHistory.length > 0 && (
                    <div className="text-xs text-slate-400 space-y-0.5">
                      {task.stageHistory.map((h, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span>{DEPT_LABELS[h.dept] ?? h.dept} — {h.completedBy} — {new Date(h.completedAt).toLocaleDateString('en-ZA')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={() => completeStage(task)}
                      disabled={isCompleting}
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    >
                      {isCompleting ? 'Completing…' : (
                        <>
                          Mark Complete
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
