import { useWorkshopStats } from '../../../../lib/hooks/useWorkshopStats';
import { DEPT_COLORS } from '../../../../lib/pipeline';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  RefreshCw, AlertTriangle, CheckCircle2, Activity,
  ClipboardCheck, TrendingUp, Package, Clock, CreditCard,
} from 'lucide-react';

interface WorkshopDashboardProps {
  onNavigate: (view: string) => void;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function WorkshopDashboard({ onNavigate }: WorkshopDashboardProps) {
  const { stats, loading, refresh } = useWorkshopStats();

  const kpis = [
    { label: 'Active Job Cards',    value: stats?.totalActive        ?? '—', color: 'text-[#0073ea]',  bg: 'bg-blue-50 dark:bg-blue-950/30',   icon: TrendingUp,    nav: 'inventory' },
    { label: 'Completed This Month',value: stats?.completedThisMonth ?? '—', color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/30',  icon: CheckCircle2,  nav: null },
    { label: 'Awaiting Payment',    value: stats?.pendingPayment     ?? '—', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/30',  icon: CreditCard,    nav: 'payment-confirmation' },
    { label: 'Critically Stalled',  value: stats?.stalledRed         ?? '—', color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/30',      icon: AlertTriangle, nav: 'inventory' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 font-bold text-xl">Workshop Dashboard</h1>
          <p className="text-slate-500 text-sm">Live production overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={loading}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button size="sm" onClick={() => onNavigate('receiving')} className="gap-1.5 bg-[#0073ea] hover:bg-[#0060c7] text-white">
            <ClipboardCheck className="w-3.5 h-3.5" /> New Receiving
          </Button>
        </div>
      </div>

      {/* Red alert banner */}
      {(stats?.stalledRed ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300 flex-1">
            {stats!.stalledRed} job card{stats!.stalledRed !== 1 ? 's are' : ' is'} critically stalled — past 2× the allowed time in their department
          </p>
          <Button size="sm" variant="outline" onClick={() => onNavigate('inventory')}
            className="border-red-300 text-red-700 hover:bg-red-100 shrink-0">
            View
          </Button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <button key={k.label} onClick={() => k.nav && onNavigate(k.nav)}
            className={`text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 ${k.nav ? 'hover:border-[#0073ea]/50 transition-colors cursor-pointer' : 'cursor-default'}`}>
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center`}>
              <k.icon className={`w-4.5 h-4.5 ${k.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${k.color}`}>
                {loading ? <span className="inline-block w-8 h-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /> : k.value}
              </p>
              <p className="text-xs text-slate-500">{k.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Body: dept breakdown + activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Dept breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            Jobs by Department
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (stats?.byDept ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No active jobs</p>
          ) : (
            <div className="space-y-2">
              {(stats?.byDept ?? []).map(d => (
                <div key={d.dept} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${DEPT_COLORS[d.dept] ?? 'bg-slate-400'}`} />
                  <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{d.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.stalled > 0 && (
                      <Badge className="text-[10px] h-4 bg-red-100 text-red-700 border-0 px-1.5">
                        {d.stalled} stalled
                      </Badge>
                    )}
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 w-5 text-right">{d.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            Recent Activity
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-9 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (stats?.recentActivity ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No activity yet</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-72">
              {(stats?.recentActivity ?? []).map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${DEPT_COLORS[a.dept] ?? 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{a.title}</p>
                    <p className="text-xs text-slate-400">
                      {a.clientName && <span>{a.clientName} · </span>}
                      {timeAgo(a.movedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick nav shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Job Tracker',   nav: 'inventory',             color: 'border-blue-200 hover:border-[#0073ea]' },
          { label: 'Payments',      nav: 'payment-confirmation',  color: 'border-amber-200 hover:border-amber-500' },
          { label: 'Clients',       nav: 'clients',               color: 'border-slate-200 hover:border-slate-400' },
          { label: 'My Tasks',      nav: 'tasks',                 color: 'border-green-200 hover:border-green-500' },
        ].map(s => (
          <button key={s.label} onClick={() => onNavigate(s.nav)}
            className={`p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors text-center ${s.color}`}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
