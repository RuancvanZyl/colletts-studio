import { useOutfitterStats } from '../../../../lib/hooks/useOutfitterStats';
import { Button } from '../../ui/button';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, TrendingUp, Target, Award, Users, Trophy, Crosshair, Loader2 } from 'lucide-react';

export function PerformanceAnalytics() {
  const { stats, loading, refresh } = useOutfitterStats();

  const avgTrophiesPerHunter = stats && stats.totalHunters > 0
    ? (stats.totalTrophies / stats.totalHunters).toFixed(1)
    : '0';

  const avgHuntsPerMonth = stats
    ? (stats.totalHunts / 12).toFixed(1)
    : '0';

  const completionRate = stats && stats.totalTrophies > 0
    ? Math.round((stats.completedTrophies / stats.totalTrophies) * 100)
    : 0;

  const kpis = [
    { label: 'Most Common Species', value: stats?.topSpecies[0]?.species ?? '—', icon: Target,  color: '#15803d' },
    { label: 'Trophies per Hunter', value: avgTrophiesPerHunter,                  icon: Award,   color: '#0073ea' },
    { label: 'Avg Hunts / Month',   value: avgHuntsPerMonth,                      icon: TrendingUp, color: '#7c3aed' },
    { label: 'Completion Rate',     value: `${completionRate}%`,                  icon: Trophy,  color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Insights & Reports</h1>
          <p className="text-slate-500 text-sm">Performance metrics across all hunts</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map(k => (
              <div key={k.label} className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 leading-tight">{k.label}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: k.color + '20' }}>
                    <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                  </div>
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate block">{k.value}</span>
              </div>
            ))}
          </div>

          {/* Monthly hunt trend — line chart */}
          <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Hunt Activity Trend — Last 12 Months</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats?.byMonth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" style={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} style={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#15803d" strokeWidth={2} dot={{ r: 4 }} name="Hunts" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Yearly hunt volume */}
          {(stats?.byYear.length ?? 0) > 0 && (
            <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Hunts by Year</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.byYear ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" style={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} style={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0073ea" radius={[3,3,0,0]} name="Hunts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Outfitter / PH leaderboard */}
          {(stats?.byOperator.length ?? 0) > 0 && (
            <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Hunts by Outfitter / PH
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(160, (stats?.byOperator.length ?? 1) * 36)}>
                <BarChart data={stats?.byOperator ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} style={{ fontSize: 11 }} />
                  <YAxis dataKey="operator" type="category" width={130} style={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#16a34a" radius={[0,3,3,0]} name="Hunts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trophy status breakdown */}
          {(stats?.statusBreakdown.length ?? 0) > 0 && (
            <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Trophy Status Breakdown</h3>
              <div className="space-y-2">
                {stats!.statusBreakdown.map(s => {
                  const colors: Record<string, string> = {
                    completed:       '#10b981',
                    in_progress:     '#0073ea',
                    pending_payment: '#f59e0b',
                    flagged:         '#ef4444',
                  };
                  const labels: Record<string, string> = {
                    completed:       'Completed',
                    in_progress:     'In Production',
                    pending_payment: 'Awaiting Payment',
                    flagged:         'Issue Flagged',
                  };
                  const pct = stats!.totalTrophies
                    ? Math.round((s.count / stats!.totalTrophies) * 100) : 0;
                  const color = colors[s.status] ?? '#64748b';
                  return (
                    <div key={s.status} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-slate-600 dark:text-slate-400 flex-shrink-0">
                        {labels[s.status] ?? s.status}
                      </div>
                      <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary card */}
          <div className="bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/30 dark:to-lime-950/30 rounded-xl border border-green-200 dark:border-green-800 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Summary</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>{stats?.totalHunters ?? 0} unique hunters processed — {stats?.totalIndependent ?? 0} hunted independently without an outfitter</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>{stats?.totalTrophies ?? 0} trophies across {stats?.totalHunts ?? 0} hunts — {stats?.completedTrophies ?? 0} fully completed</span>
              </li>
              {(stats?.topSpecies.length ?? 0) > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Top species: {stats!.topSpecies.map(s => `${s.species} (${s.count})`).join(', ')}</span>
                </li>
              )}
              {(stats?.byOperator.filter(o => o.operator !== 'Independent').length ?? 0) > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>
                    Most active outfitter: {stats!.byOperator.filter(o => o.operator !== 'Independent')[0]?.operator ?? '—'} with {stats!.byOperator.filter(o => o.operator !== 'Independent')[0]?.count ?? 0} hunts
                  </span>
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
