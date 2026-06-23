import { useEffect, useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  RefreshCw, TrendingUp, AlertTriangle, Clock, Package,
  CheckCircle2, Users, DollarSign, ArrowRight, Loader2,
  BarChart3, Activity,
} from 'lucide-react';
import { useDashboard } from '../../../../lib/hooks/useDashboard';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { useInvoices } from '../../../../lib/hooks/useInvoices';
import { PHASE_LABELS } from '../shared/PhaseAdvanceDialog';
import type { JobPhase } from '../../../../lib/database.types';

const PHASE_SEQUENCE: { phase: JobPhase; label: string; color: string; bg: string }[] = [
  { phase: 'intake',          label: 'Intake',         color: '#f59e0b', bg: '#fef3c7' },
  { phase: 'skin_processing', label: 'Skin',           color: '#3b82f6', bg: '#dbeafe' },
  { phase: 'skull_processing',label: 'Skull',          color: '#f97316', bg: '#ffedd5' },
  { phase: 'storage_pre',     label: 'Storage (Pre)',  color: '#8b5cf6', bg: '#ede9fe' },
  { phase: 'tannery',         label: 'Tannery',        color: '#7c3aed', bg: '#ddd6fe' },
  { phase: 'storage_post',    label: 'Storage (Post)', color: '#6366f1', bg: '#e0e7ff' },
  { phase: 'mounting',        label: 'Mounting',       color: '#0ea5e9', bg: '#e0f2fe' },
  { phase: 'finishing',       label: 'Finishing',      color: '#10b981', bg: '#d1fae5' },
  { phase: 'quality_check',   label: 'QC',             color: '#059669', bg: '#a7f3d0' },
  { phase: 'packing',         label: 'Packing',        color: '#06b6d4', bg: '#cffafe' },
  { phase: 'shipped',         label: 'Shipped',        color: '#64748b', bg: '#f1f5f9' },
];

interface SummarySheetProps {
  onNavigate: (view: string) => void;
}

export function SummarySheet({ onNavigate }: SummarySheetProps) {
  const { summary, alerts, recentActivity, loading: dashLoading, refresh } = useDashboard();
  const { jobs, loading: jobsLoading } = useJobs();
  const { invoices, loading: invLoading } = useInvoices();

  const loading = dashLoading || jobsLoading;

  // Phase counts
  const phaseCounts = PHASE_SEQUENCE.map(p => ({
    ...p,
    count: jobs.filter(j => j.current_phase === p.phase).length,
  }));

  // Financial summary
  const totalInvoiced = invoices.reduce((s, inv) => s + inv.invoice_line_items.reduce((ls, li) => ls + li.line_total, 0), 0);
  const totalPaid = invoices.reduce((s, inv) => s + inv.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const outstanding = totalInvoiced - totalPaid;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

  // Rush jobs
  const rushJobs = jobs.filter(j => j.rush && !['shipped', 'delivered'].includes(j.current_phase));

  const kpiCards = [
    { label: 'Total Active Jobs', value: summary?.jobs_in_progress ?? jobs.length, icon: TrendingUp, color: '#0ea5e9', trend: null },
    { label: 'Overdue / Paid', value: summary?.jobs_overdue ?? 0, icon: AlertTriangle, color: summary?.jobs_overdue ? '#ef4444' : '#10b981', trend: null },
    { label: 'Stalled Jobs', value: summary?.jobs_stalled ?? 0, icon: Clock, color: summary?.jobs_stalled ? '#f59e0b' : '#10b981', trend: null },
    { label: 'Rush Jobs', value: rushJobs.length, icon: Zap, color: rushJobs.length ? '#ef4444' : '#10b981', trend: null },
    { label: 'Received Today', value: summary?.specimens_received_today ?? 0, icon: Package, color: '#10b981', trend: null },
    { label: 'Shipping Today', value: summary?.shipments_today ?? 0, icon: CheckCircle2, color: '#0ea5e9', trend: null },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold">Workshop Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button size="sm" onClick={() => onNavigate('arrival')} className="bg-[#0073ea] hover:bg-[#0060c0] text-white">
            <Package className="w-4 h-4 mr-2" />New Check-In
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Pipeline board */}
      <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0073ea]" />Pipeline
          </h2>
          <span className="text-xs text-slate-400">{phaseCounts.filter(p => p.count > 0).reduce((s, p) => s + p.count, 0)} jobs in production</span>
        </div>
        <div className="p-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {phaseCounts.map(p => (
              <button
                key={p.phase}
                onClick={() => {
                  if (['skin_processing', 'skull_processing'].includes(p.phase)) onNavigate(p.phase === 'skin_processing' ? 'skin-processing' : 'skull-processing');
                  else if (p.phase === 'storage_pre' || p.phase === 'storage_post') onNavigate('storage');
                  else if (p.phase === 'mounting') onNavigate('mounting');
                  else if (p.phase === 'finishing') onNavigate('finishing');
                  else if (p.phase === 'quality_check') onNavigate('quality');
                  else if (p.phase === 'packing' || p.phase === 'shipped') onNavigate('packing');
                  else onNavigate('inventory');
                }}
                className="flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 hover:shadow-md transition-all min-w-[80px]"
                style={{ borderColor: p.count > 0 ? p.color : '#e2e8f0', backgroundColor: p.count > 0 ? p.bg : 'transparent' }}
              >
                <span className="text-2xl font-bold" style={{ color: p.count > 0 ? p.color : '#94a3b8' }}>{loading ? '—' : p.count}</span>
                <span className="text-xs text-center leading-tight text-slate-600 dark:text-slate-400">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Simple bar chart */}
          {!loading && phaseCounts.some(p => p.count > 0) && (
            <div className="mt-4 space-y-1.5">
              {phaseCounts.filter(p => p.count > 0).map(p => {
                const max = Math.max(...phaseCounts.map(p => p.count), 1);
                return (
                  <div key={p.phase} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-24 text-right flex-shrink-0">{p.label}</span>
                    <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(p.count / max) * 100}%`, backgroundColor: p.color }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-6">{p.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3-column grid: Alerts · Financials · Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Alerts */}
        <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Needs Attention</h3>
            {alerts.length > 0 && <Badge className="bg-red-500 ml-auto text-xs">{alerts.length}</Badge>}
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
            ) : alerts.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">All jobs on track</p>
              </div>
            ) : alerts.map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.is_overdue_paid ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{a.client_name}</p>
                  <p className="text-xs text-slate-500">{a.species_name ?? 'Trophy'} · {a.current_phase?.replace(/_/g, ' ')}</p>
                  {a.due_date && <p className="text-xs text-red-500 mt-0.5">Due {new Date(a.due_date).toLocaleDateString()}</p>}
                </div>
              </div>
            ))}
          </div>
          {alerts.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => onNavigate('inventory')} className="text-xs text-[#0073ea] hover:underline flex items-center gap-1">
                View all jobs <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Financials */}
        <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <DollarSign className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Financials</h3>
            <Badge variant="outline" className="ml-auto text-xs">Xero</Badge>
          </div>
          <div className="p-4 space-y-3">
            {invLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
            ) : (
              <>
                {[
                  { label: 'Total Invoiced', value: `R ${totalInvoiced.toLocaleString()}`, color: 'text-slate-900 dark:text-slate-100' },
                  { label: 'Total Collected', value: `R ${totalPaid.toLocaleString()}`, color: 'text-green-600' },
                  { label: 'Outstanding', value: `R ${outstanding.toLocaleString()}`, color: outstanding > 0 ? 'text-amber-600 font-bold' : 'text-green-600' },
                  { label: 'Overdue Invoices', value: overdueInvoices, color: overdueInvoices > 0 ? 'text-red-600 font-bold' : 'text-slate-500' },
                ].map(f => (
                  <div key={f.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <span className="text-xs text-slate-500">{f.label}</span>
                    <span className={`text-sm ${f.color}`}>{f.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
            <button onClick={() => onNavigate('invoices')} className="text-xs text-[#0073ea] hover:underline flex items-center gap-1">
              Open invoicing <ArrowRight className="w-3 h-3" />
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
            {dashLoading ? (
              <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}</div>
            ) : recentActivity.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No activity yet</p>
              </div>
            ) : recentActivity.map(a => (
              <div key={a.id} className="px-4 py-2.5 flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0073ea] mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{a.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Rush jobs banner */}
      {rushJobs.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-900 dark:text-red-100 text-sm">
                {rushJobs.length} RUSH job{rushJobs.length !== 1 ? 's' : ''} in production
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {rushJobs.slice(0, 6).map(j => (
                  <span key={j.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                    {j.specimens?.tag_number ?? j.id.slice(0, 6)} · {PHASE_LABELS[j.current_phase as JobPhase]}
                  </span>
                ))}
                {rushJobs.length > 6 && <span className="text-xs text-red-600">+{rushJobs.length - 6} more</span>}
              </div>
            </div>
            <button onClick={() => onNavigate('inventory')} className="text-xs text-red-600 hover:underline flex items-center gap-1 flex-shrink-0">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Fix missing Zap import
function Zap({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
