import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { getStaffDepartments, getNextDepartment, getPipeline, DEPT_LABELS, DEPT_COLORS } from '../../../../lib/pipeline';
import { toast } from 'sonner';
import { CheckCircle2, Clock, ChevronRight, ListTodo, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { Button } from '../../ui/button';

// What each department needs to do with a trophy
const DEPT_INSTRUCTIONS: Record<string, { action: string; steps: string[] }> = {
  receiving: {
    action: 'Complete the receiving sheet, tag the trophy and photograph it.',
    steps: [
      'Weigh and measure the trophy',
      'Assign tag number and attach physical tag',
      'Photograph all angles — intake reference shots',
      'Note condition and any damage',
      'Complete the Receiving Sheet and advance to next stage',
    ],
  },
  cleaning_bleach: {
    action: 'Clean, flesh, salt the skin and bleach horns/skull where applicable.',
    steps: [
      'Flesh and clean skin thoroughly — remove all fat and membrane',
      'Salt the skin side liberally and fold flesh-side in',
      'Allow 24h to drain before moving',
      'Bleach horns or skull if required for this mount type',
      'Mark complete when cured and ready',
    ],
  },
  tannery: {
    action: 'Run the skin through the full tannery process.',
    steps: [
      'Rehydrate salted skin in pickle bath',
      'Shave skin to even thickness',
      'Tan in appropriate tan solution (chrome or vegetable)',
      'Neutralise and oil skin',
      'Mark complete when tanned, soft and dry',
    ],
  },
  storage: {
    action: 'Confirm the item is clean, dry and correctly labelled before storing.',
    steps: [
      'Check skin/cape is fully dry and free of odour',
      'Confirm tag number matches job card',
      'Store in designated rack or shelf',
      'Mark complete when ready for collection or dispatch',
    ],
  },
  mounting: {
    action: 'Mount the trophy on the correct form according to client instructions.',
    steps: [
      'Select correct mannequin or form for species and size',
      'Fit and adjust skin on form — no wrinkles or gaps',
      'Set glass eyes — check expression matches reference photos',
      'Sew all seams tight and blend into skin',
      'Position and secure on habitat base or plaque',
    ],
  },
  finishing: {
    action: 'Complete all detail painting and finishing touches.',
    steps: [
      'Paint nose leather, lips and gums to match reference',
      'Detail eye rims and surrounding skin',
      'Finish ear linings — paint and texture',
      'Complete habitat base or plaque finish',
      'Attach client nameplate if required',
    ],
  },
  quality_check: {
    action: 'Inspect the finished mount against the QC checklist before photos.',
    steps: [
      'Check facial symmetry and overall proportion',
      'Inspect all stitching — must be hidden and tight',
      'Verify paint colour accuracy against reference photos',
      'Confirm eye positioning and natural expression',
      'Check base/habitat finish — no rough edges or gaps',
    ],
  },
  photos: {
    action: 'Take professional photographs of the completed mount.',
    steps: [
      'Set up on clean, neutral background',
      'Shoot front, left side, right side and three-quarter views',
      'Capture close-up of face and detail work',
      'Upload photos to the client file',
      'Mark complete to advance to Administration',
    ],
  },
  administration: {
    action: 'Finalise the invoice, confirm delivery details and arrange dispatch.',
    steps: [
      'Confirm client delivery address and contact details',
      'Generate and send final invoice',
      'Confirm payment received before releasing trophy',
      'Book courier or arrange self-collection appointment',
      'Mark complete when trophy has left the workshop',
    ],
  },
};

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
  stageHistory: { dept: string; completedBy: string; completedAt: string }[];
}

export function MyTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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

      const result: Task[] = [];
      for (const doc of docs ?? []) {
        const { data: hunt } = await (supabase as any)
          .from('client_hunts').select('client_id').eq('id', doc.hunt_id).single();
        const { data: client } = hunt
          ? await (supabase as any).from('clients').select('full_name, client_number').eq('id', hunt.client_id).single()
          : { data: null };

        const fd = doc.form_data ?? {};
        result.push({
          docId:          doc.id,
          clientName:     client?.full_name ?? 'Unknown',
          clientNumber:   client?.client_number ?? '',
          species:        fd.species ?? '',
          mountType:      fd.mount_type ?? '',
          tagNumber:      fd.tag_number ?? '',
          condition:      fd.condition ?? '',
          conditionNotes: fd.condition_notes ?? '',
          instructions:   fd.instructions ?? '',
          currentDept:    doc.current_department,
          receivedAt:     fd.received_at ?? '',
          stageHistory:   fd.stage_history ?? [],
        });
      }
      setTasks(result);
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

      const { error } = await (supabase as any).from('hunt_documents').update({
        current_department: next ?? 'done',
        status: next ? 'in_progress' : 'complete',
        form_data: { ...(doc?.form_data ?? {}), stage_history: newHistory },
      }).eq('id', task.docId);

      if (error) throw error;

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

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Staff';

  if (!myDepts.length) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <ListTodo className="w-12 h-12 mx-auto mb-3 text-[#3AAECC]/30" />
        <p className="font-semibold text-[#EDF6F9]">No departments assigned</p>
        <p className="text-sm mt-1 text-[#7AADB8]">Your account isn't linked to any production department yet. Ask an admin to update your profile.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#EDF6F9] flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#3AAECC]" />
            Good day, {firstName}
          </h1>
          <p className="text-[#7AADB8] text-sm mt-0.5">
            Your queue · {myDepts.map(d => DEPT_LABELS[d] ?? d).join(' · ')}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-[#7AADB8] hover:text-[#3AAECC] transition-colors px-3 py-1.5 rounded-lg border border-[rgba(58,174,204,0.2)] hover:border-[rgba(58,174,204,0.4)]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-[#7AADB8]">
          <RefreshCw className="w-7 h-7 mx-auto mb-2 animate-spin opacity-40" />
          <p className="text-sm">Loading your tasks…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && (
        <div className="text-center py-16 bg-[#0F1A1C] rounded-2xl border border-[rgba(58,174,204,0.15)]">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-[#3AAECC]/40" />
          <p className="font-semibold text-[#EDF6F9]">All clear — nothing waiting</p>
          <p className="text-sm mt-1 text-[#7AADB8]">No trophies in your queue right now. Check back after new arrivals.</p>
        </div>
      )}

      {/* Task count */}
      {!loading && tasks.length > 0 && (
        <p className="text-sm text-[#7AADB8]">
          <span className="text-[#3AAECC] font-bold">{tasks.length}</span> trophy{tasks.length !== 1 ? ' trophies' : ''} waiting for your attention
        </p>
      )}

      {/* Task cards */}
      {!loading && tasks.map(task => {
        const pipeline = getPipeline(task.mountType);
        const stageIdx = pipeline.indexOf(task.currentDept);
        const progress = stageIdx >= 0 ? Math.round((stageIdx / (pipeline.length - 1)) * 100) : 0;
        const deptColor = DEPT_COLORS[task.currentDept] ?? 'bg-[#1E7A96]';
        const isCompleting = completing === task.docId;
        const isExpanded = expanded === task.docId;
        const deptInfo = DEPT_INSTRUCTIONS[task.currentDept];
        const next = getNextDepartment(task.mountType, task.currentDept);

        return (
          <div key={task.docId} className="bg-[#0F1A1C] rounded-xl border border-[rgba(58,174,204,0.15)] overflow-hidden">

            {/* Coloured top bar */}
            <div className={`${deptColor} px-4 py-2 flex items-center justify-between`}>
              <span className="text-white text-xs font-bold uppercase tracking-widest">
                {DEPT_LABELS[task.currentDept] ?? task.currentDept}
              </span>
              <span className="text-white/70 text-xs font-mono">{task.tagNumber}</span>
            </div>

            <div className="p-4 space-y-3">
              {/* Trophy identity */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#EDF6F9] text-lg">{task.species || '—'}</span>
                    <span className="text-[#7AADB8] text-sm">{task.mountType}</span>
                    {task.condition === 'damaged' && (
                      <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" /> Damaged
                      </span>
                    )}
                  </div>
                  <p className="text-[#7AADB8] text-sm mt-0.5">
                    {task.clientNumber && <span className="font-bold text-[#3AAECC] mr-1.5">{task.clientNumber}</span>}
                    {task.clientName}
                  </p>
                </div>
                {task.receivedAt && (
                  <div className="flex items-center gap-1 text-xs text-[#7AADB8]/60 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(task.receivedAt).toLocaleDateString('en-ZA')}
                  </div>
                )}
              </div>

              {/* What to do banner */}
              {deptInfo && (
                <div className="bg-[rgba(58,174,204,0.08)] border border-[rgba(58,174,204,0.2)] rounded-lg px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-[#3AAECC] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#3AAECC] text-xs font-semibold mb-1">Your job for this trophy</p>
                      <p className="text-[#EDF6F9] text-sm">{deptInfo.action}</p>
                      {/* Expandable steps */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : task.docId)}
                        className="text-[#7AADB8] text-xs mt-1.5 hover:text-[#3AAECC] transition-colors"
                      >
                        {isExpanded ? '▲ Hide steps' : '▼ Show step-by-step'}
                      </button>
                      {isExpanded && (
                        <ol className="mt-2 space-y-1">
                          {deptInfo.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#7AADB8]">
                              <span className="text-[#3AAECC] font-bold shrink-0">{i + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Client instructions */}
              {task.instructions && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-amber-400 mb-0.5">Client Instructions</p>
                  <p className="text-sm text-amber-200">{task.instructions}</p>
                </div>
              )}

              {/* Condition notes */}
              {task.conditionNotes && (
                <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-red-400 mb-0.5">Condition Notes</p>
                  <p className="text-sm text-red-200">{task.conditionNotes}</p>
                </div>
              )}

              {/* Pipeline progress */}
              <div>
                <div className="flex justify-between text-xs text-[#7AADB8]/60 mb-1">
                  <span>Pipeline progress</span>
                  <span>Stage {stageIdx + 1} of {pipeline.length}</span>
                </div>
                <div className="h-1 bg-[#142028] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3AAECC] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {pipeline.map((stage, i) => {
                    const done = i < stageIdx;
                    const current = i === stageIdx;
                    return (
                      <span key={stage} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        done    ? 'bg-[#3AAECC]/15 text-[#3AAECC]' :
                        current ? `${deptColor} text-white` :
                                  'bg-[#142028] text-[#7AADB8]/50'
                      }`}>
                        {DEPT_LABELS[stage] ?? stage}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Stage history */}
              {task.stageHistory.length > 0 && (
                <div className="space-y-0.5">
                  {task.stageHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#7AADB8]/50">
                      <CheckCircle2 className="w-3 h-3 text-[#3AAECC]/50" />
                      <span>{DEPT_LABELS[h.dept] ?? h.dept} — {h.completedBy} — {new Date(h.completedAt).toLocaleDateString('en-ZA')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action */}
              <div className="flex justify-between items-center pt-2 border-t border-[rgba(58,174,204,0.1)]">
                <p className="text-xs text-[#7AADB8]">
                  {next ? <>Next: <span className="text-[#3AAECC] font-medium">{DEPT_LABELS[next] ?? next}</span></> : <span className="text-green-400">Final stage</span>}
                </p>
                <button
                  onClick={() => completeStage(task)}
                  disabled={isCompleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3AAECC] hover:bg-[#2E9EB8] text-[#080C0C] text-sm font-bold transition-all disabled:opacity-50 shadow-[0_0_12px_rgba(58,174,204,0.25)] hover:shadow-[0_0_20px_rgba(58,174,204,0.35)]"
                >
                  {isCompleting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>Mark Complete <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
