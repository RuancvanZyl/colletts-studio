import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  AlertTriangle, Clock, X, Bell, ChevronRight,
  Zap, Package, DollarSign, RefreshCw,
} from 'lucide-react';
import { useDashboard } from '../../../../lib/hooks/useDashboard';

interface Notice {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'overdue' | 'stalled' | 'missing_date' | 'low_stock' | 'alert';
  title: string;
  detail: string;
  action?: string;
  navigateTo?: string;
}

const TYPE_STYLES = {
  critical: 'border-l-red-500 bg-red-50 dark:bg-red-950/40',
  warning:  'border-l-amber-500 bg-amber-50 dark:bg-amber-950/40',
  info:     'border-l-blue-500 bg-blue-50 dark:bg-blue-950/40',
};

const TYPE_ICON = {
  critical: AlertTriangle,
  warning:  Clock,
  info:     Bell,
};

const TYPE_ICON_COLOR = {
  critical: 'text-red-500',
  warning:  'text-amber-500',
  info:     'text-blue-500',
};

interface NoticeBoardProps {
  onNavigate: (view: string) => void;
}

export function NoticeBoard({ onNavigate }: NoticeBoardProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { summary, alerts, loading, refresh } = useDashboard();

  // Auto-open on load if there are criticals
  useEffect(() => {
    if (!loading && ((summary?.jobs_overdue ?? 0) > 0 || (summary?.jobs_stalled ?? 0) > 0)) {
      setOpen(true);
    }
  }, [loading]);

  const notices: Notice[] = [];

  if ((summary?.jobs_overdue ?? 0) > 0) {
    notices.push({
      id: 'overdue',
      type: 'critical',
      category: 'overdue',
      title: `${summary!.jobs_overdue} job${summary!.jobs_overdue !== 1 ? 's' : ''} overdue — client has paid`,
      detail: 'These clients have paid their deposit and work has not started or is behind schedule.',
      action: 'View overdue jobs',
      navigateTo: 'inventory',
    });
  }

  if ((summary?.jobs_stalled ?? 0) > 0) {
    notices.push({
      id: 'stalled',
      type: 'critical',
      category: 'stalled',
      title: `${summary!.jobs_stalled} job${summary!.jobs_stalled !== 1 ? 's' : ''} stalled in phase`,
      detail: 'Jobs that have not moved in 7+ days. Check these immediately — they may be lost or forgotten.',
      action: 'View stalled jobs',
      navigateTo: 'inventory',
    });
  }

  if ((summary?.jobs_missing_date ?? 0) > 0) {
    notices.push({
      id: 'missing_date',
      type: 'warning',
      category: 'missing_date',
      title: `${summary!.jobs_missing_date} job${summary!.jobs_missing_date !== 1 ? 's' : ''} have no due date set`,
      detail: 'Without a due date these jobs will never be flagged as overdue. Assign due dates now.',
      action: 'View jobs',
      navigateTo: 'inventory',
    });
  }

  if ((summary?.low_stock_items ?? 0) > 0) {
    notices.push({
      id: 'low_stock',
      type: 'warning',
      category: 'low_stock',
      title: `${summary!.low_stock_items} supply item${summary!.low_stock_items !== 1 ? 's' : ''} below reorder threshold`,
      detail: 'Running low on critical supplies. Place orders before stock runs out.',
      action: 'View inventory',
      navigateTo: 'inventory',
    });
  }

  // Individual alert detail rows (first 5)
  alerts.slice(0, 5).forEach((a, i) => {
    const id = `alert-${i}`;
    if (a.is_overdue_paid) {
      notices.push({
        id, type: 'critical', category: 'alert',
        title: `${a.client_name} — ${a.species_name ?? 'Trophy'} overdue`,
        detail: a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString()}` : 'No due date',
        navigateTo: 'inventory',
      });
    } else if (a.is_stalled) {
      notices.push({
        id, type: 'warning', category: 'alert',
        title: `${a.client_name} — ${a.species_name ?? 'Trophy'} stalled`,
        detail: `Stuck in ${a.current_phase?.replace(/_/g, ' ')}`,
        navigateTo: 'inventory',
      });
    }
  });

  const visible = notices.filter(n => !dismissed.has(n.id));
  const criticalCount = visible.filter(n => n.type === 'critical').length;
  const hasAny = visible.length > 0;

  if (!hasAny && !open) return null;

  return (
    <>
      {/* Bell trigger button — always visible in header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#2c3d5b] transition-colors"
        title="Priority notices"
      >
        <Bell className="w-5 h-5 text-[#c5cfe0]" />
        {criticalCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {criticalCount > 9 ? '9+' : criticalCount}
          </span>
        )}
      </button>

      {/* Slide-in panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="fixed top-14 right-4 z-50 w-full max-w-md bg-white dark:bg-[#1c2b3a] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1c2b3a] dark:bg-[#141e2b]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-white text-sm">Priority Notices</span>
                {criticalCount > 0 && (
                  <Badge className="bg-red-500 text-xs">{criticalCount} critical</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={refresh} className="p-1 hover:bg-white/10 rounded transition-colors" disabled={loading}>
                  <RefreshCw className={`w-3.5 h-3.5 text-[#c5cfe0] ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded transition-colors">
                  <X className="w-4 h-4 text-[#c5cfe0]" />
                </button>
              </div>
            </div>

            {/* Notice list */}
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {visible.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Bell className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All clear — no urgent items</p>
                  <p className="text-xs text-slate-400 mt-1">Great job keeping on top of things!</p>
                </div>
              ) : (
                visible.map(notice => {
                  const Icon = TYPE_ICON[notice.type];
                  return (
                    <div key={notice.id} className={`border-l-4 ${TYPE_STYLES[notice.type]} p-4`}>
                      <div className="flex gap-3">
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${TYPE_ICON_COLOR[notice.type]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{notice.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">{notice.detail}</p>
                          {notice.action && notice.navigateTo && (
                            <button
                              onClick={() => { onNavigate(notice.navigateTo!); setOpen(false); }}
                              className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {notice.action} <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => setDismissed(prev => new Set([...prev, notice.id]))}
                          className="p-0.5 hover:bg-black/5 rounded flex-shrink-0"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {visible.length > 0 && (
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#141e2b] border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-400">{visible.length} notice{visible.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => setDismissed(new Set(visible.map(n => n.id)))}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Dismiss all
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
