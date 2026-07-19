import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  RefreshCw, TrendingUp, AlertTriangle, Clock, Package,
  CheckCircle2, Users, ArrowRight, Loader2,
  BarChart3, Activity, Plane, MapPin, FolderOpen, FileText,
  ClipboardList, ShieldCheck, CreditCard, Timer, UserCheck,
} from 'lucide-react';
import { useWorkshopStats } from '../../../../lib/hooks/useWorkshopStats';
import { useHuntDashboard } from '../../../../lib/hooks/useHuntDashboard';
import { useFloorTime } from '../../../../lib/hooks/useFloorTime';
import { useAttentionItems } from '../../../../lib/hooks/useAttentionItems';
import { DEPT_COLORS } from '../../../../lib/pipeline';

interface SummarySheetProps {
  onNavigate: (view: string) => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SummarySheet({ onNavigate }: SummarySheetProps) {
  const { stats, loading, refresh } = useWorkshopStats();
  const { stats: huntStats, loading: huntLoading } = useHuntDashboard();
  const { data: floorTime, loading: floorLoading } = useFloorTime();
  const { items: attention } = useAttentionItems();

  const attentionCards = [
    { count: attention?.newHunterSubmissions ?? 0, label: 'new hunter submission',  plural: 'new hunter submissions',  action: 'Review in Job Tracker',    view: 'inventory',       color: '#8b5cf6' },
    { count: attention?.unassignedActive ?? 0,     label: 'unassigned active job',  plural: 'unassigned active jobs',  action: 'Assign in Staff Overview', view: 'staff-overview',  color: '#f59e0b' },
    { count: attention?.unreadMessages ?? 0,       label: 'unread client message',  plural: 'unread client messages',  action: 'Open Client Messages',     view: 'client-inbox',    color: '#0073ea' },
    { count: attention?.stalledRed ?? 0,           label: 'critically stalled job', plural: 'critically stalled jobs', action: 'View Daily Tasks',         view: 'daily-todo',      color: '#ef4444' },
  ].filter(c => c.count > 0);

  const kpiCards = [
    { label: 'Active Job Cards',    value: stats?.totalActive        ?? 0, icon: TrendingUp,  color: '#0073ea' },
    { label: 'Completed This Month',value: stats?.completedThisMonth ?? 0, icon: CheckCircle2,color: '#10b981' },
    { label: 'Awaiting Payment',    value: stats?.pendingPayment     ?? 0, icon: CreditCard,  color: '#f59e0b' },
    { label: 'Critically Stalled',  value: stats?.stalledRed         ?? 0, icon: AlertTriangle, color: stats?.stalledRed ? '#ef4444' : '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold">Workshop Whiteboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {/* Needs Attention */}
      {attentionCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Needs Attention</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attentionCards.map(c => (
              <button
                key={c.label}
                onClick={() => onNavigate(c.view)}
                className="flex items-center gap-3 p-3 rounded-xl border-2 text-left hover:shadow-md transition-all bg-white dark:bg-[#1c2b3a]"
                style={{ borderColor: c.color + '60' }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.color + '20' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {c.count} {c.count === 1 ? c.label : c.plural}
                  </p>
                  <p className="text-xs" style={{ color: c.color }}>{c.action} →</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{kpi.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: kpi.color + '20' }}>
                <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              </div>
            </div>
            {loading
              ? <div className="h-7 w-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              : <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpi.value}</span>
            }
          </div>
        ))}
      </div>

      {/* Dept pipeline board */}
      <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0073ea]" />Pipeline by Department
          </h2>
          <span className="text-xs text-slate-400">{stats?.totalActive ?? 0} active job cards</span>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex gap-2">{[...Array(6)].map((_, i) => <div key={i} className="flex-1 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
          ) : (stats?.byDept.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">No active jobs in production</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(stats?.byDept ?? []).map(d => {
                  const color = DEPT_COLORS[d.dept] ?? '#64748b';
                  return (
                    <button
                      key={d.dept}
                      onClick={() => onNavigate(d.dept.replace('_', '-'))}
                      className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 hover:shadow-md transition-all min-w-[88px]"
                      style={{ borderColor: color, backgroundColor: color + '15' }}
                    >
                      <span className="text-2xl font-bold" style={{ color }}>{d.count}</span>
                      <span className="text-xs text-center leading-tight text-slate-600 dark:text-slate-400">{d.label}</span>
                      {d.stalled > 0 && (
                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{d.stalled} stalled</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1.5">
                {(stats?.byDept ?? []).map(d => {
                  const color = DEPT_COLORS[d.dept] ?? '#64748b';
                  const max = Math.max(...(stats?.byDept.map(x => x.count) ?? [1]), 1);
                  return (
                    <div key={d.dept} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-28 text-right flex-shrink-0 truncate">{d.label}</span>
                      <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.count / max) * 100}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-6">{d.count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hunt & Client Summary */}
      <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#0073ea]" />Hunts &amp; Clients
          </h2>
          <button onClick={() => onNavigate('clients')} className="text-xs text-[#0073ea] hover:underline flex items-center gap-1">
            Open Clients <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-5">
          {huntLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Clients',  value: huntStats?.total_clients  ?? 0, icon: Users,      color: '#0073ea' },
                  { label: 'Export Clients', value: huntStats?.export_clients ?? 0, icon: Plane,      color: '#6366f1' },
                  { label: 'Local Clients',  value: huntStats?.local_clients  ?? 0, icon: MapPin,     color: '#10b981' },
                  { label: 'Total Hunts',    value: huntStats?.total_hunts    ?? 0, icon: FolderOpen, color: '#f59e0b' },
                ].map(card => (
                  <div key={card.label} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: card.color + '20' }}>
                      <card.icon className="w-4 h-4" style={{ color: card.color }} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{card.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Trophies Received', value: huntStats?.hunts_with_receiving ?? 0, icon: Package,       color: '#10b981', total: huntStats?.total_hunts ?? 0 },
                  { label: 'Job Cards Created',  value: huntStats?.hunts_with_job_card  ?? 0, icon: ClipboardList, color: '#0073ea', total: huntStats?.total_hunts ?? 0 },
                  { label: 'Invoiced',           value: huntStats?.hunts_with_invoice   ?? 0, icon: FileText,      color: '#f59e0b', total: huntStats?.total_hunts ?? 0 },
                  { label: 'Permits Filed',      value: huntStats?.hunts_with_permit    ?? 0, icon: ShieldCheck,   color: '#6366f1', total: huntStats?.total_hunts ?? 0 },
                ].map(card => {
                  const pct = card.total ? Math.round((card.value / card.total) * 100) : 0;
                  return (
                    <div key={card.label} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <card.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: card.color }} />
                        <span className="text-[10px] text-slate-500 leading-tight">{card.label}</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                      <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: card.color }} />
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1">{pct}% of {card.total} hunts</p>
                    </div>
                  );
                })}
              </div>

              {huntStats?.hunts_by_year && Object.keys(huntStats.hunts_by_year).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hunts by Year</p>
                  <div className="flex items-end gap-1.5 h-14">
                    {Object.entries(huntStats.hunts_by_year)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([yr, cnt]) => {
                        const max = Math.max(...Object.values(huntStats.hunts_by_year));
                        const h = Math.round((cnt / max) * 100);
                        return (
                          <div key={yr} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                            <span className="text-[9px] text-slate-500 font-bold">{cnt}</span>
                            <div className="w-full rounded-t-sm bg-[#0073ea] transition-all" style={{ height: `${h}%`, minHeight: 4 }} />
                            <span className="text-[9px] text-slate-400 truncate w-full text-center">{yr.slice(2)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {((huntStats?.hunts_missing_receiving ?? 0) > 0 || (huntStats?.hunts_missing_job_card ?? 0) > 0) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {(huntStats?.hunts_missing_receiving ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-700 dark:text-amber-300">
                        {huntStats!.hunts_missing_receiving} active hunts missing receiving sheet
                      </span>
                    </div>
                  )}
                  {(huntStats?.hunts_missing_job_card ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-full">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-700 dark:text-red-300">
                        {huntStats!.hunts_missing_job_card} active hunts missing job card
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stalled alerts + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Stalled */}
        <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Stalled Jobs</h3>
            {(stats?.stalledRed ?? 0) > 0 && (
              <Badge className="bg-red-500 ml-auto text-xs">{stats!.stalledRed} critical</Badge>
            )}
            {(stats?.stalledYellow ?? 0) > 0 && (
              <Badge className="bg-amber-500 ml-auto text-xs">{stats!.stalledYellow} warning</Badge>
            )}
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
            ) : (stats?.stalledRed ?? 0) === 0 && (stats?.stalledYellow ?? 0) === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">All jobs on track</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(stats?.byDept ?? []).filter(d => d.stalled > 0).map(d => (
                  <div key={d.dept} className="flex items-center justify-between p-2.5 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</p>
                      <p className="text-xs text-slate-500">{d.count} total · {d.stalled} stalled</p>
                    </div>
                    <button onClick={() => onNavigate(d.dept.replace('_', '-'))} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                      View <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
            <button onClick={() => onNavigate('inventory')} className="text-xs text-[#0073ea] hover:underline flex items-center gap-1">
              View all jobs <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <Activity className="w-4 h-4 text-[#0073ea]" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
            ) : (stats?.recentActivity.length ?? 0) === 0 ? (
              <div className="py-8 text-center">
                <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No activity yet</p>
              </div>
            ) : (stats?.recentActivity ?? []).map((a, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0073ea] mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug truncate">
                    {a.title}{a.clientName ? ` · ${a.clientName}` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.dept} · {timeAgo(a.movedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Floor Time Tracking ─────────────────────────── */}
      <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <Timer className="w-4 h-4 text-[#0073ea]" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Floor Time Tracking</h2>
          <span className="text-xs text-slate-400 ml-auto">Time per department — from job cards marked done</span>
        </div>

        {floorLoading ? (
          <div className="p-5 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : !floorTime || floorTime.byDept.length === 0 ? (
          <div className="py-10 text-center">
            <Clock className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No completions recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">Time data appears once staff mark job cards done</p>
          </div>
        ) : (
          <div className="p-5 space-y-6">

            {/* Avg time per department */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Average Time per Department</p>
              <div className="space-y-2">
                {floorTime.byDept.map(d => {
                  const color = DEPT_COLORS[d.dept] ?? '#64748b';
                  const maxMins = Math.max(...floorTime.byDept.map(x => x.avgMins), 1);
                  return (
                    <div key={d.dept} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-28 text-right flex-shrink-0 truncate">{d.label}</span>
                      <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                          style={{ width: `${Math.max((d.avgMins / maxMins) * 100, 4)}%`, backgroundColor: color }}
                        >
                          <span className="text-[10px] text-white font-bold">{fmtMins(d.avgMins)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 w-10 flex-shrink-0">{d.count} done</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staff throughput */}
            {floorTime.byStaff.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />Staff Throughput — completions this month
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {floorTime.byStaff.map(s => (
                    <div key={s.name} className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="w-8 h-8 rounded-full bg-[#0073ea]/10 border border-[#0073ea]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#0073ea] text-xs font-bold">{s.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.count} completed · avg {fmtMins(s.avgMins)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slowest in progress */}
            {floorTime.slowest.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />Longest Active — trophies still in progress
                </p>
                <div className="space-y-2">
                  {floorTime.slowest.map(t => (
                    <div key={t.docId} className="flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t.species}</p>
                        <p className="text-xs text-slate-500">{t.clientNumber} · {t.dept.replace(/_/g, ' ')}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex-shrink-0 ml-3">
                        {fmtMins(t.ageMins)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}

function fmtMins(mins: number): string {
  if (mins < 60)   return `${Math.round(mins)}m`;
  if (mins < 1440) return `${(mins / 60).toFixed(1)}h`;
  return `${(mins / 1440).toFixed(1)}d`;
}
