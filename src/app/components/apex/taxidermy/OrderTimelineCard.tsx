/**
 * OrderTimelineCard — production clock, order size and milestone schedule
 * for a single hunt. Management starts the clock (cash payments) or it starts
 * automatically once a Xero payment webhook is connected. Deadlines can only
 * be amended by management, and a reason is always required.
 */

import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { toast } from 'sonner';
import { ORDER_SIZE_LABELS, milestoneStatus, type OrderSize } from '../../../../lib/orderTimeline';
import { Button } from '../../ui/button';
import { Clock, CheckCircle2, AlertTriangle, Calendar, Pencil, PlayCircle, Loader2, X } from 'lucide-react';

interface MilestoneRow { key: string; label: string; due_date: string; completed: boolean }

interface HuntTimelineFields {
  id: string;
  order_size: OrderSize | null;
  timeline_started_at: string | null;
  timeline_started_via: 'xero' | 'cash_manual' | null;
  deadline_current: string | null;
  milestones: MilestoneRow[] | null;
  deadline_amendments: { amended_at: string; previous_deadline: string; new_deadline: string; reason: string }[] | null;
}

const STATUS_STYLE = {
  done:      { icon: CheckCircle2,  color: 'text-green-500',  chip: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  overdue:   { icon: AlertTriangle, color: 'text-red-500',    chip: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  'due-soon':{ icon: Clock,         color: 'text-amber-500',  chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  upcoming:  { icon: Calendar,      color: 'text-slate-400',  chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
} as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

export function OrderTimelineCard({ hunt, onRefresh }: { hunt: HuntTimelineFields; onRefresh: () => void }) {
  const { profile } = useAuth();
  const isManagement = ['admin', 'studio_manager'].includes(profile?.role ?? '');
  const [starting, setStarting] = useState(false);
  const [startDate, setStartDate] = useState(todayISO());
  const [amendOpen, setAmendOpen] = useState(false);
  const [newDate, setNewDate] = useState(hunt.deadline_current ?? '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function startTimeline() {
    if (!startDate) { toast.error('Pick the deposit-paid date'); return; }
    setStarting(true);
    const { data, error } = await (supabase as any).rpc('start_order_timeline', {
      p_hunt_id: hunt.id,
      p_start_at: new Date(startDate).toISOString(),
    });
    setStarting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Timeline started — classified as ${ORDER_SIZE_LABELS[data.order_size as OrderSize]}`);
    onRefresh();
  }

  async function submitAmendment() {
    if (!newDate) { toast.error('Pick a new deadline'); return; }
    if (!reason.trim()) { toast.error('A reason is required'); return; }
    setSaving(true);
    const { error } = await (supabase as any).rpc('amend_order_deadline', {
      p_hunt_id: hunt.id,
      p_new_date: newDate,
      p_reason: reason.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Deadline amended');
    setAmendOpen(false);
    setReason('');
    onRefresh();
  }

  // Not started yet
  if (!hunt.timeline_started_at) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3 space-y-2">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Production timeline not started</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Starts automatically once the deposit is confirmed via Xero, or manually below —
            pick the date the deposit was actually paid (defaults to today; use a past date to backfill an older hunt).
          </p>
        </div>
        {isManagement && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] text-slate-500 flex items-center gap-1.5">
              Deposit paid on
              <input
                type="date"
                value={startDate}
                max={todayISO()}
                onChange={e => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
              />
            </label>
            <Button size="sm" onClick={startTimeline} disabled={starting} className="gap-1.5 shrink-0">
              {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              Start Timeline
            </Button>
          </div>
        )}
      </div>
    );
  }

  const milestones = hunt.milestones ?? [];
  const amendments = hunt.deadline_amendments ?? [];

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {hunt.order_size ? ORDER_SIZE_LABELS[hunt.order_size] : 'Unclassified'}
          </span>
          <span className="text-[10px] text-slate-400">
            started {new Date(hunt.timeline_started_at).toLocaleDateString()} via {hunt.timeline_started_via === 'xero' ? 'Xero payment' : 'cash (manual)'}
          </span>
          {amendments.length > 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400">· amended {amendments.length}×</span>
          )}
        </div>
        {isManagement && (
          <button onClick={() => setAmendOpen(true)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600">
            <Pencil className="w-3 h-3" /> Amend deadline
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {milestones.map((m: MilestoneRow) => {
          const status = milestoneStatus(m.due_date, m.completed);
          const s = STATUS_STYLE[status];
          const Icon = s.icon;
          return (
            <div key={m.key} className="flex items-center gap-2.5">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${s.color}`} />
              <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">{m.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${s.chip}`}>
                {new Date(m.due_date).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </div>

      {hunt.deadline_current && (
        <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          Overall deadline: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(hunt.deadline_current).toLocaleDateString()}</span>
        </p>
      )}

      {amendments.length > 0 && (
        <div className="pt-1 space-y-1">
          {amendments.slice(-3).reverse().map((a, i) => (
            <p key={i} className="text-[10px] text-slate-400 italic">
              {new Date(a.amended_at).toLocaleDateString()}: moved to {new Date(a.new_deadline).toLocaleDateString()} — "{a.reason}"
            </p>
          ))}
        </div>
      )}

      {/* Amend dialog */}
      {amendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Amend Deadline</h3>
              <button onClick={() => setAmendOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-xs text-slate-500">New deadline</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Reason (required)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. client requested additional trophies added mid-order"
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAmendOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitAmendment} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
