/**
 * TrophyTrackingDashboard — Hunter's real-time view of all trophies.
 * Reads from hunt_documents via useHunterHunts. Shows live pipeline stages.
 */

import { useState } from 'react';
import { useHunterHunts, HunterTrophy, HunterHunt } from '../../../../lib/hooks/useHunterHunts';
import { DEPT_LABELS, DEPT_COLORS } from '../../../../lib/pipeline';
import { Badge } from '../../ui/badge';
import {
  Loader2, RefreshCw, ChevronDown, ChevronUp, CheckCircle2,
  Clock, Trophy, User, Package,
} from 'lucide-react';

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const hrs = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hrs < 1)  return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting Deposit',
  in_progress:     'In Progress',
  completed:       'Complete',
  flagged:         'Flagged',
};

function TrophyCard({ trophy }: { trophy: HunterTrophy }) {
  const [open, setOpen] = useState(false);

  const barColor =
    trophy.status === 'completed'       ? 'bg-green-500' :
    trophy.status === 'pending_payment' ? 'bg-slate-300 dark:bg-slate-600' :
    trophy.isStalled                    ? 'bg-red-500' :
                                          'bg-[#0073ea]';

  const deptColor = DEPT_COLORS[trophy.currentDept] ?? 'bg-slate-500';

  return (
    <div className={`border rounded-xl overflow-hidden bg-white dark:bg-slate-900 ${
      trophy.status === 'completed'       ? 'border-green-200 dark:border-green-800' :
      trophy.isStalled                    ? 'border-red-200 dark:border-red-800' :
      trophy.status === 'pending_payment' ? 'border-slate-200 dark:border-slate-700' :
                                            'border-slate-200 dark:border-slate-700'
    }`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">

        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ${
          trophy.status === 'completed' ? 'bg-green-500' :
          trophy.status === 'pending_payment' ? 'bg-slate-400' : deptColor
        }`}>
          {trophy.status === 'completed'
            ? <CheckCircle2 className="w-5 h-5" />
            : trophy.species.charAt(0)}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{trophy.species}</span>
              <span className="text-slate-400 text-xs ml-2">{trophy.mountType}</span>
              {trophy.tagNumber && <span className="text-slate-400 text-xs ml-2 font-mono">{trophy.tagNumber}</span>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              trophy.status === 'completed'       ? 'bg-green-100 text-green-700' :
              trophy.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
              trophy.isStalled                    ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
            }`}>
              {trophy.status === 'in_progress' && !trophy.isStalled
                ? DEPT_LABELS[trophy.currentDept] ?? trophy.currentDept
                : trophy.isStalled ? 'Delayed'
                : STATUS_LABEL[trophy.status] ?? trophy.status}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${trophy.pct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{trophy.stagesDone} of {trophy.pipeline.length} stages</span>
              <span>{trophy.pct}%</span>
            </div>
          </div>
        </div>

        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-3 space-y-3">
          {trophy.instructions && (
            <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
              <span className="font-medium">Your instructions:</span> {trophy.instructions}
            </div>
          )}
          <div className="space-y-1">
            {trophy.pipeline.map((stage, i) => {
              const done    = i < trophy.stagesDone;
              const current = stage === trophy.currentDept && trophy.status === 'in_progress';
              const history = trophy.stageHistory.find(h => h.dept === stage);
              return (
                <div key={stage} className={`flex items-center gap-2.5 py-1 ${done || current ? 'opacity-100' : 'opacity-35'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    done    ? 'bg-green-500' :
                    current ? 'bg-[#0073ea] ring-4 ring-[#0073ea]/20' :
                              'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {done
                      ? <CheckCircle2 className="w-3 h-3 text-white" />
                      : <div className={`w-2 h-2 rounded-full ${current ? 'bg-white' : 'bg-slate-400'}`} />}
                  </div>
                  <span className={`text-xs flex-1 ${current ? 'font-semibold text-[#0073ea]' : done ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>
                    {DEPT_LABELS[stage] ?? stage}
                  </span>
                  {history && <span className="text-[10px] text-slate-400">{timeAgo(history.completedAt)}</span>}
                  {current && trophy.lastMovedAt && (
                    <span className="text-[10px] text-blue-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />{timeAgo(trophy.lastMovedAt)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HuntSection({ hunt }: { hunt: HunterHunt }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 py-2 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-slate-100">Hunt {hunt.year}</span>
            {hunt.operator && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <User className="w-3 h-3" />{hunt.operator}
              </span>
            )}
            {hunt.farm && <span className="text-xs text-slate-400">{hunt.farm}</span>}
            <Badge className={`text-xs border-0 ${hunt.clientType === 'export' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {hunt.clientType}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {hunt.doneCount}/{hunt.totalCount} trophies complete · {hunt.pct}%
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${hunt.pct}%` }} />
      </div>
      {open && (
        <div className="space-y-2 pl-1">
          {hunt.trophies.map(t => <TrophyCard key={t.docId} trophy={t} />)}
        </div>
      )}
    </div>
  );
}

export function TrophyTrackingDashboard({ huntId }: { huntId?: string }) {
  const { hunts, loading, refresh } = useHunterHunts();

  const totalTrophies = hunts.reduce((s, h) => s + h.totalCount, 0);
  const doneTrophies  = hunts.reduce((s, h) => s + h.doneCount,  0);
  const inProgress    = hunts.reduce((s, h) => s + h.trophies.filter(t => t.status === 'in_progress').length, 0);
  const pending       = hunts.reduce((s, h) => s + h.trophies.filter(t => t.status === 'pending_payment').length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading your trophies…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> My Trophies
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Live progress from the Apex workshop</p>
        </div>
        <button onClick={refresh} className="text-slate-400 hover:text-slate-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {totalTrophies > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',      value: totalTrophies, color: 'text-slate-900 dark:text-slate-100' },
            { label: 'In Progress',value: inProgress,    color: 'text-[#0073ea]' },
            { label: 'Complete',   value: doneTrophies,  color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {pending > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <Package className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              {pending} trophy{pending !== 1 ? ' trophies are' : ' is'} awaiting deposit confirmation
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Processing begins once your deposit is confirmed by Apex Trophy Solutions.
            </p>
          </div>
        </div>
      )}

      {hunts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Trophy className="w-12 h-12 mx-auto text-slate-300" />
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">No trophies yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Your trophies will appear here once your outfitter links your hunt to your profile.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {hunts.map(h => <HuntSection key={h.id} hunt={h} />)}
        </div>
      )}
    </div>
  );
}
