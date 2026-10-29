/**
 * DeadlineWatch — strict, can't-miss view of every active export hunt's
 * production deadline. Overdue hunts are flagged in red and impossible to
 * scroll past unnoticed. Alphabetical by client, per management's request,
 * so anyone reviewing knows exactly where to find who.
 */

import { useState } from 'react';
import { useDeadlineWatch, type DeadlineWatchHunt } from '../../../../lib/hooks/useDeadlineWatch';
import { ORDER_SIZE_LABELS, milestoneStatus, type OrderSize } from '../../../../lib/orderTimeline';
import { DOC_META, dropboxUrl } from './HuntTimeline';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, AlertTriangle, Clock, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Users, FolderOpen, ExternalLink, UserRound,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

const STATUS_META = {
  overdue:       { label: 'OVERDUE',     chip: 'bg-red-600 text-white',       row: 'border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20', icon: AlertTriangle },
  'due-soon':    { label: 'Due soon',    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', row: 'border-slate-200 dark:border-slate-700', icon: Clock },
  'on-track':    { label: 'On track',    chip: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', row: 'border-slate-200 dark:border-slate-700', icon: CheckCircle2 },
  'not-started': { label: 'Not started', chip: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', row: 'border-slate-200 dark:border-slate-700', icon: Circle },
} as const;

interface DeadlineWatchProps {
  onOpenHunt?: (clientId: string) => void;
}

export function DeadlineWatch({ onOpenHunt }: DeadlineWatchProps) {
  const { hunts, loading, overdue, dueSoon, notStarted, refresh } = useDeadlineWatch();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due-soon' | 'not-started'>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function openDoc(d: DeadlineWatchHunt['documents'][number]) {
    if (d.storage_path) {
      const { data } = await supabase.storage.from('client-photos').createSignedUrl(d.storage_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
      else toast.error('Could not open file');
    } else if (d.dropbox_path) {
      window.open(dropboxUrl(d.dropbox_path), '_blank');
    }
  }

  const visible = hunts
    .filter(h => filter === 'all' || h.status === filter)
    .filter(h => !search ||
      h.clientName.toLowerCase().includes(search.toLowerCase()) ||
      h.refNumber?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Past deadline</h2>
          <p className="text-sm text-slate-500">Every active export order, checked against its deadline</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading} title="Refresh" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Strict overdue banner — cannot be missed */}
      {overdue.length > 0 && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 dark:text-red-300">
              {overdue.length} hunt{overdue.length !== 1 ? 's are' : ' is'} past deadline
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
              These clients are waiting longer than promised. Review each one below — either speed up the work,
              or amend the deadline with a reason so the client can be told honestly.
            </p>
          </div>
        </div>
      )}

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overdue',     value: overdue.length,    f: 'overdue' as const,     color: 'text-red-600' },
          { label: 'Due soon',    value: dueSoon.length,    f: 'due-soon' as const,    color: 'text-amber-600' },
          { label: 'Not started', value: notStarted.length, f: 'not-started' as const, color: 'text-slate-500' },
          { label: 'All active',  value: hunts.length,      f: 'all' as const,         color: 'text-slate-900 dark:text-slate-100' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(s.f)}
            className={`p-3 rounded-xl border text-center transition-all ${
              filter === s.f
                ? 'border-[#0073ea] bg-blue-50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a] hover:border-slate-300'
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </button>
        ))}
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search client or reference…"
        className="max-w-md"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading deadlines…
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">Nobody in this group</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(h => {
            const meta = STATUS_META[h.status];
            const Icon = meta.icon;
            const isOpen = expanded.has(h.huntId);
            const lateMilestones = h.milestones.filter(m => milestoneStatus(m.due_date, m.completed) === 'overdue');
            const docs = [...h.documents].sort((a, b) =>
              (a.doc_type === 'other' ? 1 : 0) - (b.doc_type === 'other' ? 1 : 0) || a.title.localeCompare(b.title));
            return (
              <div key={h.huntId} className={`rounded-xl border transition-all ${meta.row}`}>
                <div className="w-full flex items-center gap-3 p-4">
                <button onClick={() => (onOpenHunt ? onOpenHunt(h.clientId) : toggle(h.huntId))}
                        title="Open client profile" className="flex-1 min-w-0 flex items-center gap-4 text-left">
                  <Icon className={`w-5 h-5 shrink-0 ${h.status === 'overdue' ? 'text-red-600' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{h.clientName}</span>
                      <span className="text-xs font-mono text-slate-400">{h.refNumber}</span>
                      {h.orderSize && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {ORDER_SIZE_LABELS[h.orderSize as OrderSize] ?? h.orderSize}
                        </span>
                      )}
                      {h.amendedCount > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">amended {h.amendedCount}×</span>
                      )}
                      <span className="text-xs text-slate-400">{h.documents.length} doc{h.documents.length !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {h.status === 'not-started' && 'Timeline not started yet'}
                      {h.status !== 'not-started' && h.deadline && (
                        h.status === 'overdue'
                          ? `Deadline was ${new Date(h.deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} — ${h.daysOverdue} day${h.daysOverdue !== 1 ? 's' : ''} overdue`
                          : `Due ${new Date(h.deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}${h.daysOverdue < 0 ? ` — ${-h.daysOverdue} days left` : ''}`
                      )}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${meta.chip}`}>{meta.label}</span>
                </button>
                <button onClick={() => toggle(h.huntId)} title={isOpen ? 'Hide details' : 'Quick look: what is overdue + documents'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t border-slate-200/70 dark:border-slate-700 pt-3">
                    {/* What is overdue */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">What is overdue</p>
                      {h.milestones.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {h.status === 'not-started'
                            ? 'No production clock yet — it starts once the deposit is confirmed and a job card exists.'
                            : 'No milestone schedule recorded for this hunt.'}
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {h.milestones.map(m => {
                            const st = milestoneStatus(m.due_date, m.completed);
                            const late = Math.floor((Date.now() - new Date(m.due_date).getTime()) / 86_400_000);
                            return (
                              <li key={m.key} className="flex items-center gap-2 text-sm">
                                {st === 'done' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                  : st === 'overdue' ? <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                                  : <Clock className="w-4 h-4 text-slate-400 shrink-0" />}
                                <span className={st === 'overdue' ? 'font-semibold text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}>{m.label}</span>
                                <span className="text-xs text-slate-500">
                                  {st === 'done' ? 'done' : `due ${new Date(m.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                  {st === 'overdue' && ` — ${late} day${late !== 1 ? 's' : ''} late`}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {lateMilestones.length === 0 && h.status === 'overdue' && (
                        <p className="text-sm text-red-600 mt-1">Final deadline passed {h.daysOverdue} days ago.</p>
                      )}
                    </div>

                    {/* All documents */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Documents ({docs.length})</p>
                        {h.dropboxPath && (
                          <a href={dropboxUrl(h.dropboxPath)} target="_blank" rel="noopener noreferrer"
                             className="flex items-center gap-1 text-xs text-[#0073ea] hover:underline">
                            <FolderOpen className="w-3.5 h-3.5" /> Open Dropbox folder
                          </a>
                        )}
                      </div>
                      {docs.length === 0 ? (
                        <p className="text-sm text-slate-500">No documents linked to this hunt yet.</p>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
                          {docs.map(d => {
                            const dm = DOC_META[d.doc_type] ?? DOC_META.other;
                            const DIcon = dm.icon;
                            return (
                              <button key={d.id} onClick={() => openDoc(d)} disabled={!d.storage_path && !d.dropbox_path}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a] hover:border-[#0073ea] text-left disabled:opacity-50">
                                <DIcon className={`w-4 h-4 shrink-0 ${dm.color}`} />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{d.title}</span>
                                  <span className="block text-[10px] text-slate-400">{dm.label}</span>
                                </span>
                                <ExternalLink className="w-3 h-3 text-slate-300 shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {onOpenHunt && (
                      <Button size="sm" variant="outline" onClick={() => onOpenHunt(h.clientId)}>
                        <UserRound className="w-3.5 h-3.5 mr-1.5" /> Open full client profile
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
