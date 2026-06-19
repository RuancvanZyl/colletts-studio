import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Scan,
  ClipboardCheck,
  TrendingUp,
  RotateCw,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  Activity,
  List,
  RefreshCw,
} from 'lucide-react';
import { useDashboard } from '../../../../../lib/hooks/useDashboard';

interface WorkshopDashboardProps {
  onNavigate: (view: string) => void;
}

const PHASE_ICON_MAP: Record<string, string> = {
  intake: 'text-amber-600',
  skin_processing: 'text-blue-600',
  skull_processing: 'text-blue-600',
  storage_pre: 'text-purple-600',
  tannery: 'text-purple-600',
  storage_post: 'text-indigo-600',
  mounting: 'text-indigo-600',
  finishing: 'text-green-600',
  quality_check: 'text-emerald-600',
  packing: 'text-cyan-600',
  shipped: 'text-cyan-600',
};

export function WorkshopDashboard({ onNavigate }: WorkshopDashboardProps) {
  const { summary, recentActivity, alerts, loading, refresh } = useDashboard();

  const summaryStats = [
    {
      label: 'In Progress',
      value: summary?.jobs_in_progress ?? '—',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Returning From Tannery',
      value: '—',
      icon: RotateCw,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: 'Received Today',
      value: summary?.specimens_received_today ?? '—',
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      label: 'Shipping Today',
      value: summary?.shipments_today ?? '—',
      icon: Package,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    },
    {
      label: 'Low Stock Items',
      value: summary?.low_stock_items ?? '—',
      icon: List,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    },
    {
      label: 'Unacknowledged Alerts',
      value: summary?.unacked_alerts ?? '—',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
  ];

  const alertStats = [
    {
      label: 'Stalled Jobs',
      value: summary?.jobs_stalled ?? '—',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      label: 'Overdue (Paid)',
      value: summary?.jobs_overdue ?? '—',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: 'Missing Due Date',
      value: summary?.jobs_missing_date ?? '—',
      icon: Scan,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Workshop Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Production workflow overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={refresh} variant="ghost" size="icon" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => onNavigate('scan')} className="bg-blue-600 hover:bg-blue-700">
            <Scan className="w-4 h-4 mr-2" />
            Scan Parts
          </Button>
          <Button onClick={() => onNavigate('arrival')} variant="outline">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            New Check-In
          </Button>
        </div>
      </div>

      {/* Alert Banner — only shown when there are active alerts */}
      {((summary?.jobs_overdue ?? 0) > 0 || (summary?.jobs_stalled ?? 0) > 0 || (summary?.jobs_missing_date ?? 0) > 0) && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Action required: {summary?.jobs_overdue} overdue, {summary?.jobs_stalled} stalled, {summary?.jobs_missing_date} missing due dates
            </p>
          </div>
          <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" onClick={() => onNavigate('inventory')}>
            View All
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {loading ? <span className="inline-block w-8 h-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /> : stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {alertStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {loading ? <span className="inline-block w-8 h-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /> : stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No activity yet — check in some trophies to get started.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="w-8 h-8 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <Activity className={`w-4 h-4 ${PHASE_ICON_MAP[activity.phase] ?? 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-slate-100">{activity.text}</p>
                      <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500">All jobs on track</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 8).map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{alert.client_name}</p>
                      <p className="text-xs text-slate-500">
                        {alert.species_name} ·{' '}
                        {alert.is_overdue_paid && 'Overdue'}
                        {alert.is_stalled && 'Stalled in phase'}
                        {alert.is_missing_target_date && 'Missing due date'}
                        {alert.due_date && ` · Due ${new Date(alert.due_date).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                ))}
                {alerts.length > 8 && (
                  <p className="text-xs text-slate-400 text-center">+{alerts.length - 8} more</p>
                )}
              </div>
            )}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
              <Button className="w-full" variant="outline" onClick={() => onNavigate('inventory')}>
                <List className="w-4 h-4 mr-2" />
                View Full Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
