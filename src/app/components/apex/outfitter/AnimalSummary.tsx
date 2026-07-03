import { useState } from 'react';
import { useOutfitterStats } from '../../../../lib/hooks/useOutfitterStats';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, Trophy, TrendingUp, Users, Crosshair, Loader2, UserCheck } from 'lucide-react';

const COLORS = ['#15803d','#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0','#f59e0b'];

export function AnimalSummary() {
  const { stats, loading, refresh } = useOutfitterStats();
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

  const years = stats?.byYear.map(y => y.year) ?? [];

  const kpis = [
    { label: 'Total Trophies',    value: stats?.totalTrophies   ?? 0, icon: Trophy,    color: '#15803d' },
    { label: 'Total Hunts',       value: stats?.totalHunts      ?? 0, icon: Crosshair, color: '#0073ea' },
    { label: 'Unique Hunters',    value: stats?.totalHunters    ?? 0, icon: Users,     color: '#7c3aed' },
    { label: 'Independent Hunts', value: stats?.totalIndependent ?? 0, icon: UserCheck, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Farm Summary</h1>
          <p className="text-slate-500 text-sm">All hunting activity across the farm</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a] text-sm px-3 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
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
                  <span className="text-xs text-slate-500">{k.label}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.color + '20' }}>
                    <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                  </div>
                </div>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{k.value}</span>
              </div>
            ))}
          </div>

          {/* Species bar chart + pie side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar chart — all species */}
            <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Animals by Species</h3>
              {stats!.allSpecies.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No trophy data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats!.allSpecies.slice(0, 12)} margin={{ bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="species" angle={-40} textAnchor="end" height={80} style={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} style={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16a34a" radius={[3,3,0,0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie — top species distribution */}
            <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Species Distribution</h3>
              {stats!.topSpecies.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No trophy data yet</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={stats!.topSpecies}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        nameKey="species"
                        label={({ species, percent }) => `${species} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stats!.topSpecies.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [v, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {stats!.topSpecies.map((s, i) => (
                      <div key={s.species} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{s.species} ({s.count})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hunts per month */}
          <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Hunt Activity — Last 12 Months</h3>
            {stats!.byMonth.every(m => m.count === 0) ? (
              <p className="text-xs text-slate-400 text-center py-8">No hunt data in the last 12 months</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats!.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" style={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} style={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0073ea" radius={[3,3,0,0]} name="Hunts" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Outfitter / PH breakdown */}
          {stats!.byOperator.length > 0 && (
            <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Hunts by Outfitter / PH</h3>
              <div className="space-y-2">
                {stats!.byOperator.map(op => {
                  const pct = stats!.totalHunts ? Math.round((op.count / stats!.totalHunts) * 100) : 0;
                  const isIndependent = op.operator === 'Independent';
                  return (
                    <div key={op.operator} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-slate-600 dark:text-slate-400 truncate flex-shrink-0">
                        {op.operator}
                        {isIndependent && <span className="ml-1 text-amber-500 text-[10px]">(no PH)</span>}
                      </div>
                      <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: isIndependent ? '#f59e0b' : '#15803d' }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{op.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full species table */}
          {stats!.allSpecies.length > 0 && (
            <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Full Species Record</h3>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {stats!.allSpecies.map((s, i) => (
                  <div key={s.species} className="flex items-center px-5 py-2.5">
                    <span className="text-xs text-slate-400 w-6">{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">{s.species}</span>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">{s.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
