import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import {
  RefreshCw, Loader2, AlertTriangle, ChevronRight, Clock,
  CheckCircle2, Droplet, Skull, Warehouse, Scissors, Paintbrush,
  Camera, X, Upload, AlertCircle, Play, Square, CheckSquare,
} from 'lucide-react';
import { DEPT_LABELS, DEPT_COLORS, getPipeline, STALL_HOURS } from '../../../../lib/pipeline';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { toast } from 'sonner';
import { JobPhotosButton } from './TrophyPhotos';
import type { DeptJob } from '../../../../lib/hooks/useDeptJobs';
import { completeStage as completeStageAction } from '../../../../lib/offline/completeStage';
import { PRIORITY_META, dueState, taskStatus, useChecklists, markJobOpened, markJobStarted } from '../../../../lib/hooks/useTaskFlow';

type StepColor = 'blue' | 'amber' | 'slate' | 'green' | 'orange' | 'rose' | 'pink' | 'purple' | 'teal';
type EmptyIcon = 'droplet' | 'skull' | 'warehouse' | 'scissors' | 'paintbrush';

interface DeptJobListProps {
  title: string;
  subtitle: string;
  dept: string;
  jobs: DeptJob[];
  loading: boolean;
  completing: string | null;
  onRefresh: () => void;
  onAdvance: (job: DeptJob, photos: string[], notes: string) => Promise<{ error: string | null }>;
  steps: string[];
  stepsColor: StepColor;
  emptyIcon: EmptyIcon;
  emptyText: string;
  requirePhoto?: boolean;
}

const EMPTY_ICONS: Record<EmptyIcon, React.ComponentType<{ className?: string }>> = {
  droplet:    Droplet,
  skull:      Skull,
  warehouse:  Warehouse,
  scissors:   Scissors,
  paintbrush: Paintbrush,
};

const STEP_COLORS: Record<StepColor, { bg: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',     text: 'text-blue-900 dark:text-blue-100',   dot: 'bg-blue-200 dark:bg-blue-800' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-100', dot: 'bg-amber-200 dark:bg-amber-800' },
  slate:  { bg: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300',  dot: 'bg-slate-200 dark:bg-slate-700' },
  green:  { bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-100', dot: 'bg-green-200 dark:bg-green-800' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800', text: 'text-orange-900 dark:text-orange-100', dot: 'bg-orange-200 dark:bg-orange-800' },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800',     text: 'text-rose-900 dark:text-rose-100',   dot: 'bg-rose-200 dark:bg-rose-800' },
  pink:   { bg: 'bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800',     text: 'text-pink-900 dark:text-pink-100',   dot: 'bg-pink-200 dark:bg-pink-800' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800', text: 'text-purple-900 dark:text-purple-100', dot: 'bg-purple-200 dark:bg-purple-800' },
  teal:   { bg: 'bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800',     text: 'text-teal-900 dark:text-teal-100',   dot: 'bg-teal-200 dark:bg-teal-800' },
};

function hoursAgo(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000;
}

function stallBadge(dept: string, movedAt: string | null | undefined) {
  const hours = hoursAgo(movedAt);
  const threshold = STALL_HOURS[dept] ?? 48;
  if (hours < threshold * 0.75) return null;
  const days = Math.floor(hours / 24);
  const hrs  = Math.round(hours % 24);
  const label = days > 0 ? `${days}d ${hrs}h` : `${Math.round(hours)}h`;
  if (hours >= threshold * 2)  return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"><AlertCircle className="w-3 h-3" />URGENT {label}</span>;
  if (hours >= threshold)      return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"><Clock className="w-3 h-3" />{label} here</span>;
  return <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800"><Clock className="w-3 h-3" />{label}</span>;
}

// ── Complete-job panel (photo + notes per job) ───────────────────────────────

function CompletePanel({
  job, dept, requirePhoto, onDone, onCancel,
}: {
  job: DeptJob;
  dept: string;
  requirePhoto: boolean;
  onDone: (photos: File[], notes: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files,    setFiles]    = useState<File[]>([]);
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const newPreviews = picked.map(f => URL.createObjectURL(f));
    setFiles(prev => [...prev, ...picked]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }

  function removePhoto(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (requirePhoto && files.length === 0) {
      toast.error('Upload at least one completion photo before marking done.');
      return;
    }
    setSaving(true);
    try {
      await onDone(files, notes);
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
        Complete this stage
      </p>

      {/* Photo upload */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {requirePhoto ? 'Completion photo required *' : 'Add completion photo (optional)'}
          </span>
        </div>
        {previews.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                <button onClick={() => removePhoto(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
          <Upload className="w-3.5 h-3.5" /> Take / choose photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
          className="hidden" onChange={pickFiles} />
      </div>

      {/* Notes */}
      <Textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notes for next department (optional)…"
        className="text-sm h-16 resize-none" />

      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5 text-sm">
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> :
            <><CheckCircle2 className="w-3.5 h-3.5" />Mark Complete & Advance</>}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DeptJobList({
  title, subtitle, dept, jobs, loading, completing, onRefresh, onAdvance,
  steps, stepsColor, emptyIcon, emptyText, requirePhoto = true,
}: DeptJobListProps) {
  const EmptyIcon  = EMPTY_ICONS[emptyIcon];
  const colors     = STEP_COLORS[stepsColor];
  const deptColor  = DEPT_COLORS[dept] ?? 'bg-slate-600';
  const deptLabel  = DEPT_LABELS[dept] ?? dept;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const { profile } = useAuth();
  const checklist = useChecklists([dept], jobs.map(j => j.docId));
  const [flow, setFlow] = useState<Record<string, { openedAt?: string; startedAt?: string }>>({});
  const openedRef = useRef<Set<string>>(new Set());

  // Read receipt: cards assigned to me are marked as opened when they appear on my screen
  useEffect(() => {
    if (!profile?.id) return;
    const fresh = jobs.filter(j => j.assignedTo === profile.id && !j.openedAt && !openedRef.current.has(j.docId));
    if (fresh.length === 0) return;
    const now = new Date().toISOString();
    fresh.forEach(j => { openedRef.current.add(j.docId); markJobOpened(j.docId); });
    setFlow(prev => { const n = { ...prev }; fresh.forEach(j => { n[j.docId] = { ...n[j.docId], openedAt: now }; }); return n; });
  }, [jobs, profile?.id]);

  async function startJob(job: DeptJob) {
    const { error } = await markJobStarted(job.docId);
    if (error) { toast.error(error.message); return; }
    const now = new Date().toISOString();
    setFlow(prev => ({ ...prev, [job.docId]: { openedAt: now, startedAt: now } }));
    toast.success('Task started — the time has been recorded');
  }

  async function toggleStep(job: DeptJob, itemId: string, done: boolean) {
    const { error } = await checklist.setDone(job.docId, itemId, done);
    if (error) { toast.error(error); return; }
    if (done) setFlow(prev => ({ ...prev, [job.docId]: { ...prev[job.docId], startedAt: prev[job.docId]?.startedAt ?? new Date().toISOString() } }));
  }

  const liveJobs   = jobs.filter(j => !hidden.has(j.docId));
  const redJobs    = liveJobs.filter(j => hoursAgo(j.receivedAt) >= (STALL_HOURS[dept] ?? 48) * 2);
  const yellowJobs = liveJobs.filter(j => {
    const h = hoursAgo(j.receivedAt);
    const t = STALL_HOURS[dept] ?? 48;
    return h >= t && h < t * 2;
  });
  const greenJobs  = liveJobs.filter(j => hoursAgo(j.receivedAt) < (STALL_HOURS[dept] ?? 48));

  async function handleAdvance(job: DeptJob, files: File[], notes: string) {
    const r = await completeStageAction({
      doc: job.docId, dept: job.currentDept, mountType: job.mountType, notes,
      files, staffId: profile?.id ?? null, staffName: profile?.full_name ?? null,
    });
    if (r.error) { toast.error(r.error); return; }
    toast.success(r.queued ? 'Saved on this device — it will be sent when the connection returns' : 'Stage complete — moved to next department');
    setExpandedId(null);
    setHidden(prev => new Set(prev).add(job.docId));
    if (!r.queued) onRefresh();
  }

  function renderJob(job: DeptJob) {
    const pipeline  = getPipeline(job.mountType);
    const stageIdx  = pipeline.indexOf(job.currentDept);
    const progress  = stageIdx >= 0 ? Math.round((stageIdx / (pipeline.length - 1)) * 100) : 0;
    const isExpanded = expandedId === job.docId;
    const badge     = stallBadge(dept, job.receivedAt);

    return (
      <Card key={job.docId} className={`overflow-hidden ${
        badge && badge.props.className?.includes('red') ? 'ring-2 ring-red-400' :
        badge && badge.props.className?.includes('amber') ? 'ring-1 ring-amber-300' : ''
      }`}>
        {/* Coloured dept bar */}
        <div className={`${deptColor} px-4 py-2 flex items-center justify-between`}>
          <span className="text-white text-xs font-bold uppercase tracking-wide">{deptLabel}</span>
          <div className="flex items-center gap-2">
            {badge}
            <span className="text-white/80 text-xs font-mono">{job.tagNumber}</span>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Trophy info */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white text-lg">{job.species}</span>
                <span className="text-slate-500 text-sm">{job.mountType}</span>
                {job.condition === 'damaged' && (
                  <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" /> Damaged
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm">
                {job.clientNumber && <span className="font-bold text-slate-700 dark:text-slate-300 mr-1">{job.clientNumber}</span>}
                {job.clientName}
              </p>
              <JobPhotosButton className="mt-2" docId={job.docId} dept={job.currentDept} huntId={job.huntId} title={`${job.species} — ${job.clientName}`} />
            </div>
          </div>

          {/* Priority · due · status */}
          {(() => {
            const startedAt = flow[job.docId]?.startedAt ?? job.startedAt;
            const openedAt  = flow[job.docId]?.openedAt  ?? job.openedAt;
            const due = dueState(job.dueDate);
            const st = taskStatus({ assignedTo: job.assignedTo, openedAt, startedAt });
            return (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_META[job.priority]?.chip}`}>{PRIORITY_META[job.priority]?.label ?? 'Normal'} priority</span>
                  {due && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${due.className}`}>{due.label}</span>}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
                  {startedAt && <span className="text-[11px] text-slate-400">started {new Date(startedAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
                {job.priorityNote && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">⚡ Priority note</p>
                    <p className="text-sm text-red-800 dark:text-red-300">{job.priorityNote}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Department checklist */}
          {(() => {
            const items = checklist.forDept(dept);
            if (items.length === 0) return null;
            const left = checklist.remaining(job.docId, dept);
            return (
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{deptLabel} checklist</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${left === 0 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-black'}`}>
                    {left === 0 ? 'Complete' : `Not complete · ${items.length - left}/${items.length}`}
                  </span>
                </div>
                <ul className="divide-y">
                  {items.map(it => {
                    const pr = checklist.progress[`${job.docId}:${it.id}`];
                    const done = !!pr?.done;
                    return (
                      <li key={it.id}>
                        <button onClick={() => toggleStep(job, it.id, !done)} className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          {done ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                          <span className="flex-1 min-w-0">
                            <span className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{it.label}</span>
                            {it.requires_photo && !done && <Camera className="inline w-3 h-3 ml-1.5 text-slate-400" />}
                            {done && pr && <span className="block text-[10px] text-slate-400">{pr.done_by_name ?? 'Staff'} · {new Date(pr.done_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

          {/* Instructions */}
          {job.instructions && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Instructions</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{job.instructions}</p>
            </div>
          )}

          {/* Condition notes */}
          {job.conditionNotes && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">Condition Notes</p>
              <p className="text-sm text-red-800 dark:text-red-300">{job.conditionNotes}</p>
            </div>
          )}

          {/* Pipeline progress */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Pipeline</span>
              <span>{stageIdx + 1} / {pipeline.length}</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {pipeline.map((stage, i) => {
                const done    = i < stageIdx;
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
          {job.stageHistory.length > 0 && (
            <div className="text-xs text-slate-400 space-y-0.5">
              {job.stageHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span>{DEPT_LABELS[h.dept] ?? h.dept} — {h.completedBy} — {new Date(h.completedAt).toLocaleDateString('en-ZA')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action */}
          {isExpanded ? (
            <CompletePanel
              job={job}
              dept={dept}
              requirePhoto={requirePhoto}
              onDone={(photos, notes) => handleAdvance(job, photos, notes)}
              onCancel={() => setExpandedId(null)}
            />
          ) : (
            <div className="flex justify-end pt-1">
              {!(flow[job.docId]?.startedAt ?? job.startedAt) ? (
                <Button onClick={() => startJob(job)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <Play className="w-4 h-4" /> Start task
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const left = checklist.remaining(job.docId, dept);
                    if (left > 0) { toast.error(`Checklist not complete — ${left} step${left !== 1 ? 's' : ''} still to tick.`); return; }
                    setExpandedId(job.docId);
                  }}
                  disabled={completing === job.docId}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2">
                  {completing === job.docId ? 'Completing…' : <>Mark Complete <ChevronRight className="w-4 h-4" /></>}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {redJobs.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" /> {redJobs.length} URGENT
            </span>
          )}
          {yellowJobs.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              {yellowJobs.length} overdue
            </span>
          )}
          <Badge variant="secondary">{greenJobs.length} on track</Badge>
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} title="Refresh" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Photo requirement notice */}
      {requirePhoto && (
        <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
          <Camera className="w-3.5 h-3.5 shrink-0" />
          Photo proof required before advancing any trophy to the next department.
        </div>
      )}

      {/* Steps reference */}
      <div className={`border rounded-lg p-3 ${colors.bg}`}>
        <div className="flex flex-wrap gap-3">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-2 text-sm ${colors.text}`}>
              <span className={`w-5 h-5 ${colors.dot} rounded-full flex items-center justify-center text-xs font-bold shrink-0`}>{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
      ) : liveJobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <EmptyIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{emptyText}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Urgent (red) first */}
          {redJobs.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Urgent — needs attention now
              </p>
              {redJobs.map(renderJob)}
            </div>
          )}
          {/* Overdue (yellow) */}
          {yellowJobs.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Overdue — running behind schedule
              </p>
              {yellowJobs.map(renderJob)}
            </div>
          )}
          {/* On track (green) */}
          {greenJobs.length > 0 && (
            <div>
              {(redJobs.length + yellowJobs.length) > 0 && (
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> On track
                </p>
              )}
              {greenJobs.map(renderJob)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
