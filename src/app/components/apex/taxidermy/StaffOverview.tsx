/**
 * StaffOverview — admin view showing every active staff member,
 * their assigned trophies/tasks, and workload. Admin can assign
 * or reassign any job card to any staff member from here.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';
import { DEPT_LABELS } from '../../../../lib/pipeline';
import { RefreshCw, Loader2, ChevronDown, ChevronUp, User, Trophy, Plus, X } from 'lucide-react';
import { Button } from '../../ui/button';

interface AssignedJob {
  id: string;
  title: string;
  status: string;
  current_department: string;
  client_name: string;
  hunt_year: number;
  admin_notes: string | null;
}

interface StaffCard {
  id: string;
  full_name: string;
  role: string;
  avatar_color: string;
  is_active: boolean;
  assigned_jobs: AssignedJob[];
}

interface UnassignedJob {
  id: string;
  title: string;
  status: string;
  current_department: string;
  client_name: string;
  hunt_year: number;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const STATUS_COLOR: Record<string, string> = {
  pending_payment:  'bg-amber-100 text-amber-700',
  awaiting_arrival: 'bg-purple-100 text-purple-700',
  in_progress:      'bg-blue-100 text-blue-700',
  completed:        'bg-green-100 text-green-700',
};

export function StaffOverview() {
  const [staffCards, setStaffCards]       = useState<StaffCard[]>([]);
  const [unassigned, setUnassigned]       = useState<UnassignedJob[]>([]);
  const [loading, setLoading]             = useState(true);
  const [expanded, setExpanded]           = useState<Record<string, boolean>>({});
  const [assignModal, setAssignModal]     = useState<{ jobId: string; jobTitle: string } | null>(null);
  const [noteModal, setNoteModal]         = useState<{ jobId: string; currentNote: string } | null>(null);
  const [noteText, setNoteText]           = useState('');
  const [saving, setSaving]               = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    const [{ data: staffRows }, { data: docs }] = await Promise.all([
      (supabase as any).from('staff_profiles').select('id, full_name, role, avatar_color, is_active').eq('is_active', true).order('full_name'),
      (supabase as any).from('hunt_documents').select(`
        id, title, status, current_department, assigned_to, admin_notes,
        client_hunts!inner(year, clients!inner(full_name))
      `).eq('doc_type', 'job_card').neq('status', 'completed').order('created_at', { ascending: false }),
    ]);

    const allDocs: any[] = docs ?? [];
    const allStaff: any[] = staffRows ?? [];

    const cardMap: Record<string, StaffCard> = {};
    for (const s of allStaff) {
      cardMap[s.id] = { ...s, assigned_jobs: [] };
    }

    const unassignedList: UnassignedJob[] = [];

    for (const d of allDocs) {
      const job: AssignedJob = {
        id:                 d.id,
        title:              d.title,
        status:             d.status,
        current_department: d.current_department,
        client_name:        d.client_hunts?.clients?.full_name ?? 'Unknown',
        hunt_year:          d.client_hunts?.year ?? 0,
        admin_notes:        d.admin_notes ?? null,
      };
      if (d.assigned_to && cardMap[d.assigned_to]) {
        cardMap[d.assigned_to].assigned_jobs.push(job);
      } else {
        unassignedList.push(job);
      }
    }

    setStaffCards(Object.values(cardMap));
    setUnassigned(unassignedList);
    setLoading(false);
  }

  async function assignJob(jobId: string, staffId: string) {
    setSaving(true);
    const { error } = await (supabase as any).from('hunt_documents').update({ assigned_to: staffId }).eq('id', jobId);
    if (error) { toast.error(error.message); } else { toast.success('Task assigned'); setAssignModal(null); load(); }
    setSaving(false);
  }

  async function unassignJob(jobId: string) {
    const { error } = await (supabase as any).from('hunt_documents').update({ assigned_to: null }).eq('id', jobId);
    if (error) { toast.error(error.message); } else { toast.success('Task unassigned'); load(); }
  }

  async function saveNote() {
    if (!noteModal) return;
    setSaving(true);
    const { error } = await (supabase as any).from('hunt_documents').update({ admin_notes: noteText || null }).eq('id', noteModal.jobId);
    if (error) { toast.error(error.message); } else { toast.success('Note saved'); setNoteModal(null); load(); }
    setSaving(false);
  }

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading staff overview…
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Staff Overview</h2>
          <p className="text-sm text-slate-500">Workload and task assignments across the workshop</p>
        </div>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{staffCards.length}</p>
          <p className="text-xs text-slate-500">Active Staff</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{staffCards.reduce((s, c) => s + c.assigned_jobs.length, 0)}</p>
          <p className="text-xs text-slate-500">Assigned Tasks</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{unassigned.length}</p>
          <p className="text-xs text-slate-500">Unassigned</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{staffCards.reduce((s, c) => s + c.assigned_jobs.length, 0) + unassigned.length}</p>
          <p className="text-xs text-slate-500">Total Active Jobs</p>
        </div>
      </div>

      {/* Unassigned pool */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4" /> {unassigned.length} Unassigned Trophy{unassigned.length !== 1 ? 'ies' : ''}
          </h3>
          <div className="space-y-2">
            {unassigned.map(j => (
              <div key={j.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{j.title}</p>
                  <p className="text-xs text-slate-500">{j.client_name} · Hunt {j.hunt_year} · {DEPT_LABELS[j.current_department] ?? j.current_department}</p>
                </div>
                <button
                  onClick={() => setAssignModal({ jobId: j.id, jobTitle: j.title })}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  <Plus className="w-3 h-3" /> Assign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff cards */}
      <div className="space-y-3">
        {staffCards.map(staff => (
          <div key={staff.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button onClick={() => toggle(staff.id)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: staff.avatar_color }}>
                {initials(staff.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{staff.full_name}</p>
                <p className="text-xs text-slate-500">{staff.role.replace('_', ' ')} · {staff.assigned_jobs.length} active task{staff.assigned_jobs.length !== 1 ? 's' : ''}</p>
              </div>
              {/* Workload bar */}
              <div className="hidden md:flex items-center gap-2 w-32">
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${staff.assigned_jobs.length === 0 ? 'bg-slate-200' : staff.assigned_jobs.length <= 3 ? 'bg-green-500' : staff.assigned_jobs.length <= 6 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (staff.assigned_jobs.length / 8) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-4 text-right">{staff.assigned_jobs.length}</span>
              </div>
              {expanded[staff.id] ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>

            {expanded[staff.id] && (
              <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-2">
                {staff.assigned_jobs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No tasks assigned</p>
                ) : (
                  staff.assigned_jobs.map(j => (
                    <div key={j.id} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{j.title}</p>
                        <p className="text-xs text-slate-500">{j.client_name} · Hunt {j.hunt_year}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[j.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {DEPT_LABELS[j.current_department] ?? j.current_department}
                          </span>
                          {j.admin_notes && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 italic truncate max-w-[200px]">📝 {j.admin_notes}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { setNoteModal({ jobId: j.id, currentNote: j.admin_notes ?? '' }); setNoteText(j.admin_notes ?? ''); }}
                          className="text-xs text-slate-400 hover:text-amber-600 px-2 py-1 rounded transition-colors"
                          title="Add note"
                        >
                          📝
                        </button>
                        <button
                          onClick={() => setAssignModal({ jobId: j.id, jobTitle: j.title })}
                          className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded transition-colors"
                          title="Reassign"
                        >
                          ↔
                        </button>
                        <button
                          onClick={() => unassignJob(j.id)}
                          className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                          title="Unassign"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Assign new task to this staff member */}
                {unassigned.length > 0 && (
                  <p className="text-xs text-slate-400 text-center mt-2 py-2">
                  ↑ Assign unassigned tasks using the pool above
                </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Assign Task</h3>
              <button onClick={() => setAssignModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">{assignModal.jobTitle}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {staffCards.map(s => (
                <button
                  key={s.id}
                  onClick={() => assignJob(assignModal.jobId, s.id)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: s.avatar_color }}>
                    {initials(s.full_name)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{s.full_name}</p>
                    <p className="text-xs text-slate-500">{s.assigned_jobs.length} tasks currently</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Admin Note</h3>
              <button onClick={() => setNoteModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Instructions or notes for the staff member…"
              rows={4}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setNoteModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={saveNote} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
