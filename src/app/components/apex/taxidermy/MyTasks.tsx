import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { getStaffDepartments, getNextDepartment, getPipeline, DEPT_LABELS, DEPT_COLORS } from '../../../../lib/pipeline';
import { toast } from 'sonner';
import { CheckCircle2, Clock, ChevronRight, ListTodo, AlertTriangle, RefreshCw, Info, Camera, Upload, X, Bell, Play, Square, CheckSquare } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { AlertDashboard } from './AlertDashboard';
import { cachedFetch, pendingActions } from '../../../../lib/offline/outbox';
import { JobPhotosButton } from '../shared/TrophyPhotos';
import { IncomingCards } from './IncomingCards';
import { completeStage as completeStageAction } from '../../../../lib/offline/completeStage';
import { PRIORITY_META, dueState, taskStatus, useChecklists, markJobOpened, markJobStarted } from '../../../../lib/hooks/useTaskFlow';

// What each department needs to do with a trophy
const DEPT_INSTRUCTIONS: Record<string, { action: string; steps: string[] }> = {
  skinning: {
    action: 'Skin and flesh the trophy — remove cape or hide from the skull/carcass.',
    steps: [
      'Measure and photograph the trophy before skinning',
      'Make the correct incision for the mount type (Y-cut for shoulder, dorsal for full)',
      'Carefully skin around the face — eyes, ears, nose, lips',
      'Remove all flesh and membrane from the inside of the skin',
      'Clean and separate skull if required — label everything with the tag number',
      'Photograph completed skin and skull before moving to salting',
    ],
  },
  salting: {
    action: 'Salt the skin thoroughly to preserve and begin the curing process.',
    steps: [
      'Lay skin flesh-side up on a clean slanting surface',
      'Apply a thick, even layer of coarse salt over the entire flesh side',
      'Work salt into all folds — around ears, lips and feet',
      'Fold the skin flesh-side in (salt inside)',
      'Allow 24–48h to drain — do not stack salted skins',
      'Mark complete when skin is fully salted and drained',
    ],
  },
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
  dip_pack: {
    action: 'Treat skins with dip solution and prepare for overseas shipment.',
    steps: [
      'Rehydrate salted skins in clean water — 30–60 min',
      'Mix dip solution to correct concentration (follow CITES requirements)',
      'Submerge skins fully — minimum 20 minutes',
      'Remove, drain and allow to air dry on mesh',
      'Label each skin with tag number and species',
      'Pack in export-grade containers with moisture packs',
    ],
  },
  packing: {
    action: 'Pack finished mounts safely for delivery or export.',
    steps: [
      'Wrap mount in acid-free tissue, then bubble wrap',
      'Build a custom crate if required — no movement inside',
      'Attach client label with delivery address and contact',
      'Photograph packed crate before sealing',
      'Mark complete when crate is sealed and ready for collection',
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
  adminNotes: string;
  priority: number;
  dueDate: string | null;
  priorityNote: string;
  assignedTo: string | null;
  assignedAt: string | null;
  openedAt: string | null;
  startedAt: string | null;
  stageHistory: { dept: string; completedBy: string; completedAt: string; photoPaths?: string[] }[];
}

interface CompleteState {
  photos: File[];
  previews: string[];
  notes: string;
  uploading: boolean;
}

export function MyTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [loading, setLoading]     = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [offline, setOffline]     = useState(false);
  const [completeOpen, setCompleteOpen] = useState<string | null>(null);
  const [completeState, setCompleteState] = useState<Record<string, CompleteState>>({});
  const [showAlerts, setShowAlerts] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const myDepts = getStaffDepartments(profile?.full_name ?? '', profile?.department_name, profile?.works_in);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer assigned tasks; fall back to department-based tasks for unassigned jobs
      const userId = profile?.id ?? (await (supabase as any).auth.getUser()).data?.user?.id;
      let query = (supabase as any)
        .from('hunt_documents')
        .select('id, hunt_id, current_department, status, form_data, assigned_to, admin_notes, priority, due_date, priority_note, assigned_at, opened_at, started_at, client_hunts(clients(full_name, client_number))')
        .eq('doc_type', 'job_card')
        .eq('status', 'in_progress');

      if (userId) {
        // Show tasks assigned directly to this staff member OR (unassigned tasks in their department)
        const deptFilter = myDepts.length
          ? `assigned_to.eq.${userId},and(assigned_to.is.null,current_department.in.(${myDepts.join(',')}))`
          : `assigned_to.eq.${userId}`;
        query = query.or(deptFilter);
      } else if (myDepts.length) {
        query = query.in('current_department', myDepts);
      } else {
        setLoading(false);
        return;
      }

      const fetched = await cachedFetch<any[]>(`mytasks:${userId ?? 'dept'}:${myDepts.join(',')}`, async () => {
        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      });
      let docs = fetched.data;
      setOffline(fetched.stale);
      // starts / opens made offline that have not reached the server yet
      const completedOffline = new Set((await pendingActions('job_complete')).map(a => String(a.args.doc)));
      docs = docs.filter(d => !completedOffline.has(d.id));
      for (const a of await pendingActions()) {
        if (a.type !== 'job_start' && a.type !== 'job_open') continue;
        docs = docs.map(d => d.id !== a.args.doc ? d : {
          ...d, opened_at: d.opened_at ?? a.doneAt, ...(a.type === 'job_start' ? { started_at: d.started_at ?? a.doneAt, assigned_to: d.assigned_to ?? userId } : {}),
        });
      }

      const result: Task[] = [];
      for (const doc of docs ?? []) {
        const client = (doc as any).client_hunts?.clients ?? null;

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
          adminNotes:     doc.admin_notes ?? '',
          priority:       doc.priority ?? 3,
          dueDate:        doc.due_date ?? null,
          priorityNote:   doc.priority_note ?? '',
          assignedTo:     doc.assigned_to ?? null,
          assignedAt:     doc.assigned_at ?? null,
          openedAt:       doc.opened_at ?? null,
          startedAt:      doc.started_at ?? null,
          stageHistory:   fd.stage_history ?? [],
        });
      }
      // Priority list: urgent first, then earliest due date, then oldest
      result.sort((a, b) =>
        a.priority - b.priority ||
        (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') ||
        (a.receivedAt || '').localeCompare(b.receivedAt || ''));
      setTasks(result);
    } catch (err: any) {
      toast.error('Failed to load tasks: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [myDepts.join(',')]);

  useEffect(() => { load(); }, [load]);

  // ── Task flow: checklists, opened / started tracking ──────────────────────────
  const checklist = useChecklists(tasks.map(t => t.currentDept), tasks.map(t => t.docId));
  const openedRef = useRef<Set<string>>(new Set());

  // Read receipt: opening your own client's cards marks them as opened
  useEffect(() => {
    if (!selectedClient || !profile?.id) return;
    const fresh = tasks.filter(t =>
      (t.clientNumber || t.clientName) === selectedClient &&
      t.assignedTo === profile.id && !t.openedAt && !openedRef.current.has(t.docId));
    if (fresh.length === 0) return;
    fresh.forEach(t => { openedRef.current.add(t.docId); markJobOpened(t.docId); });
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => fresh.some(f => f.docId === t.docId) ? { ...t, openedAt: now } : t));
  }, [selectedClient, tasks.length, profile?.id]);

  async function startTask(task: Task) {
    const { error } = await markJobStarted(task.docId);
    if (error) { toast.error(error.message); return; }
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => t.docId === task.docId
      ? { ...t, startedAt: t.startedAt ?? now, openedAt: t.openedAt ?? now, assignedTo: t.assignedTo ?? profile?.id ?? null } : t));
    toast.success('Task started — the time has been recorded');
  }

  async function toggleItem(task: Task, itemId: string, done: boolean) {
    const { error } = await checklist.setDone(task.docId, itemId, done);
    if (error) { toast.error(error); return; }
    if (done && !task.startedAt) {
      const now = new Date().toISOString();
      setTasks(prev => prev.map(t => t.docId === task.docId ? { ...t, startedAt: now, openedAt: t.openedAt ?? now } : t));
    }
  }

  function getCS(docId: string): CompleteState {
    return completeState[docId] ?? { photos: [], previews: [], notes: '', uploading: false };
  }
  function setCS(docId: string, patch: Partial<CompleteState>) {
    setCompleteState(prev => ({ ...prev, [docId]: { ...getCS(docId), ...patch } }));
  }

  function addPhotos(docId: string, files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setCS(docId, {
      photos:   [...getCS(docId).photos, ...newFiles],
      previews: [...getCS(docId).previews, ...newPreviews],
    });
  }

  function removePhoto(docId: string, i: number) {
    const cs = getCS(docId);
    setCS(docId, {
      photos:   cs.photos.filter((_, j) => j !== i),
      previews: cs.previews.filter((_, j) => j !== i),
    });
  }

  async function completeStage(task: Task) {
    const cs = getCS(task.docId);
    if (cs.photos.length === 0) {
      toast.error('Upload at least one completion photo before marking done.');
      return;
    }
    setCompleting(task.docId);
    setCS(task.docId, { uploading: true });
    try {
      const next = getNextDepartment(task.mountType, task.currentDept);
      const r = await completeStageAction({
        doc: task.docId, dept: task.currentDept, mountType: task.mountType, notes: cs.notes,
        files: cs.photos, staffId: profile?.id ?? null, staffName: profile?.full_name ?? null,
      });
      if (r.error) { toast.error(r.error); return; }

      toast.success(r.queued
        ? 'Saved on this device — it will be sent when the connection returns'
        : next ? `✓ Handed off to ${DEPT_LABELS[next] ?? next}` : `✓ ${task.species} fully complete!`);
      setTasks(prev => prev.filter(t => t.docId !== task.docId));
      setCompleteOpen(null);
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setCompleting(null);
      setCS(task.docId, { uploading: false });
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
          {offline && <p className="text-amber-400 text-xs mt-1">Offline — showing the list as last loaded on this device.</p>}
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

      {/* Alert / Priority panel */}
      <div className="bg-[#0F1A1C] rounded-xl border border-[rgba(58,174,204,0.15)] overflow-hidden">
        <button
          onClick={() => setShowAlerts(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-[#3AAECC] text-sm font-bold flex items-center gap-2">
            <Bell className="w-4 h-4" /> Priority & Alerts
          </span>
          <ChevronRight className={`w-4 h-4 text-[#7AADB8] transition-transform ${showAlerts ? 'rotate-90' : ''}`} />
        </button>
        {showAlerts && (
          <div className="px-4 pb-4 border-t border-[rgba(58,174,204,0.1)]">
            <AlertDashboard />
          </div>
        )}
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

      {/* Cards waiting for the lead to accept (shows only for leads, only when there are some) */}
      <IncomingCards compact onChanged={load} />

      {/* Task count */}
      {!loading && tasks.length > 0 && (
        <p className="text-sm text-[#7AADB8]">
          <span className="text-[#3AAECC] font-bold">{tasks.length}</span> trophy{tasks.length !== 1 ? ' trophies' : ''} waiting for your attention
        </p>
      )}

      {/* Client picker — grouped so one big order doesn't bury everyone else */}
      {!loading && tasks.length > 0 && !selectedClient && (() => {
        const byClient: Record<string, { name: string; number: string; count: number; best: number; due: string | null; unopened: number }> = {};
        for (const t of tasks) {
          const key = t.clientNumber || t.clientName;
          if (!byClient[key]) byClient[key] = { name: t.clientName, number: t.clientNumber, count: 0, best: 9, due: null, unopened: 0 };
          const c = byClient[key];
          c.count++;
          c.best = Math.min(c.best, t.priority);
          if (t.dueDate && (!c.due || t.dueDate < c.due)) c.due = t.dueDate;
          if (!t.openedAt && t.assignedTo) c.unopened++;
        }
        // Priority list: most urgent / earliest due first
        const clients = Object.entries(byClient).sort((a, b) =>
          a[1].best - b[1].best || (a[1].due ?? '9999').localeCompare(b[1].due ?? '9999') || b[1].count - a[1].count);
        return (
          <div className="space-y-2">
            {clients.map(([key, c]) => (
              <button
                key={key}
                onClick={() => setSelectedClient(key)}
                className="w-full flex items-center justify-between bg-[#0F1A1C] rounded-xl border border-[rgba(58,174,204,0.15)] px-4 py-3.5 text-left hover:border-[#3AAECC]/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {c.number && <span className="font-bold text-[#3AAECC] text-sm">{c.number}</span>}
                  <span className="text-[#EDF6F9] font-semibold">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.best <= 2 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_META[c.best].chip}`}>{PRIORITY_META[c.best].label}</span>
                  )}
                  {c.due && (() => { const d = dueState(c.due); return d ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.className}`}>{d.label}</span> : null; })()}
                  {c.unopened > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white">{c.unopened} new</span>}
                  <span className="text-xs font-bold bg-[rgba(58,174,204,0.15)] text-[#3AAECC] px-2.5 py-1 rounded-full">
                    {c.count} trophy{c.count !== 1 ? 'ies' : ''}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#7AADB8]" />
                </div>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Back to client list */}
      {!loading && selectedClient && (
        <button
          onClick={() => setSelectedClient(null)}
          className="flex items-center gap-1.5 text-sm text-[#7AADB8] hover:text-[#EDF6F9] transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> All clients
        </button>
      )}

      {/* Task cards — only this client's, once one is picked */}
      {!loading && selectedClient && tasks.filter(t => (t.clientNumber || t.clientName) === selectedClient).map(task => {
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
                  <JobPhotosButton dark className="mt-2" docId={task.docId} dept={task.currentDept} title={`${task.species || 'Trophy'} — ${task.clientName}`} />
                </div>
                {task.receivedAt && (
                  <div className="flex items-center gap-1 text-xs text-[#7AADB8]/60 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(task.receivedAt).toLocaleDateString('en-ZA')}
                  </div>
                )}
              </div>

              {/* Priority · due date · status */}
              {(() => {
                const due = dueState(task.dueDate);
                const st = taskStatus(task);
                return (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_META[task.priority]?.chip}`}>
                        {PRIORITY_META[task.priority]?.label ?? 'Normal'} priority
                      </span>
                      {due && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${due.className}`}>{due.label}</span>}
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
                      {task.startedAt && (
                        <span className="text-[11px] text-[#7AADB8]">started {new Date(task.startedAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                    {task.priorityNote && (
                      <div className="bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-red-400 mb-0.5">⚡ Priority note</p>
                        <p className="text-sm text-red-200">{task.priorityNote}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                      {isExpanded && checklist.forDept(task.currentDept).length === 0 && (
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

              {/* Department checklist — must be complete before the job can move on */}
              {(() => {
                const items = checklist.forDept(task.currentDept);
                if (items.length === 0) return null;
                const left = checklist.remaining(task.docId, task.currentDept);
                return (
                  <div className="border border-[rgba(58,174,204,0.25)] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-[rgba(58,174,204,0.08)]">
                      <p className="text-xs font-bold text-[#3AAECC] uppercase tracking-wide">
                        {DEPT_LABELS[task.currentDept] ?? task.currentDept} checklist
                      </p>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${left === 0 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-black'}`}>
                        {left === 0 ? 'Complete' : `Not complete · ${items.length - left}/${items.length}`}
                      </span>
                    </div>
                    <ul className="divide-y divide-[rgba(58,174,204,0.1)]">
                      {items.map(it => {
                        const pr = checklist.progress[`${task.docId}:${it.id}`];
                        const done = !!pr?.done;
                        return (
                          <li key={it.id}>
                            <button
                              onClick={() => toggleItem(task, it.id, !done)}
                              className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-[rgba(58,174,204,0.05)]"
                            >
                              {done
                                ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                : <Square className="w-4 h-4 text-[#7AADB8] shrink-0 mt-0.5" />}
                              <span className="flex-1 min-w-0">
                                <span className={`text-sm ${done ? 'text-[#7AADB8] line-through' : 'text-[#EDF6F9]'}`}>{it.label}</span>
                                {it.requires_photo && !done && <Camera className="inline w-3 h-3 ml-1.5 text-[#7AADB8]" />}
                                {done && pr && (
                                  <span className="block text-[10px] text-[#7AADB8]/70">
                                    {pr.done_by_name ?? 'Staff'} · {new Date(pr.done_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}

              {/* Admin notes — shown prominently above client instructions */}
              {task.adminNotes && (
                <div className="bg-blue-950/40 border border-blue-500/40 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-blue-400 mb-0.5">📋 Admin Instructions</p>
                  <p className="text-sm text-blue-200">{task.adminNotes}</p>
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

              {/* Action / Complete panel */}
              <div className="pt-2 border-t border-[rgba(58,174,204,0.1)] space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-[#7AADB8]">
                    {next ? <>Next: <span className="text-[#3AAECC] font-medium">{DEPT_LABELS[next] ?? next}</span></> : <span className="text-green-400">Final stage</span>}
                  </p>
                  {!task.startedAt ? (
                    <button
                      onClick={() => startTask(task)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all"
                    >
                      <Play className="w-4 h-4" /> Start task
                    </button>
                  ) : completeOpen !== task.docId ? (
                    <button
                      onClick={() => {
                        const left = checklist.remaining(task.docId, task.currentDept);
                        if (left > 0) { toast.error(`Checklist not complete — ${left} step${left !== 1 ? 's' : ''} still to tick.`); return; }
                        setCompleteOpen(task.docId);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3AAECC] hover:bg-[#2E9EB8] text-[#080C0C] text-sm font-bold transition-all shadow-[0_0_12px_rgba(58,174,204,0.25)]"
                    >
                      Mark Complete <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => setCompleteOpen(null)} className="text-[#7AADB8] text-xs hover:text-red-400">Cancel</button>
                  )}
                </div>

                {completeOpen === task.docId && (() => {
                  const cs = getCS(task.docId);
                  return (
                    <div className="bg-[rgba(58,174,204,0.05)] border border-[rgba(58,174,204,0.2)] rounded-xl p-3 space-y-3">
                      <p className="text-xs font-semibold text-[#3AAECC] uppercase tracking-wide flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Photo proof required
                      </p>

                      {/* Photo previews */}
                      {cs.previews.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {cs.previews.map((src, i) => (
                            <div key={i} className="relative">
                              <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-[rgba(58,174,204,0.3)]" />
                              <button onClick={() => removePhoto(task.docId, i)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload button */}
                      <button
                        onClick={() => fileRefs.current[task.docId]?.click()}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[rgba(58,174,204,0.3)] text-xs text-[#7AADB8] hover:border-[#3AAECC] hover:text-[#3AAECC] transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Take / choose photo
                      </button>
                      <input
                        ref={el => { fileRefs.current[task.docId] = el; }}
                        type="file" accept="image/*" multiple capture="environment"
                        className="hidden"
                        onChange={e => addPhotos(task.docId, e.target.files)}
                      />

                      {/* Notes */}
                      <Textarea
                        value={cs.notes}
                        onChange={e => setCS(task.docId, { notes: e.target.value })}
                        placeholder="Notes for next department (optional)…"
                        className="text-sm h-14 resize-none bg-transparent border-[rgba(58,174,204,0.2)] text-[#EDF6F9] placeholder:text-[#7AADB8]/50"
                      />

                      {/* Confirm button */}
                      <button
                        onClick={() => completeStage(task)}
                        disabled={isCompleting || cs.photos.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isCompleting
                          ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Saving…</>
                          : cs.photos.length === 0
                            ? 'Add photo to complete'
                            : <><CheckCircle2 className="w-4 h-4" />Confirm Complete & Advance</>
                        }
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
