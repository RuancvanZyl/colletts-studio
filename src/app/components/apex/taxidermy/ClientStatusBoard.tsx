import { useState, useMemo } from 'react';
import { Search, Users, ArrowRight } from 'lucide-react';
import { useClientBoard, type ClientBoardEntry } from '../../../../lib/hooks/useClientBoard';
import { DEPT_LABELS, DEPT_COLORS } from '../../../../lib/pipeline';

interface ClientStatusBoardProps {
  onNavigate: (view: string, clientId?: string) => void;
}

type FilterKey = 'active' | 'completed' | 'cancelled' | 'all';

function statusOf(e: ClientBoardEntry): FilterKey {
  if (e.activeHunts > 0) return 'active';
  if (e.completedHunts > 0) return 'completed';
  return 'cancelled';
}

export function ClientStatusBoard({ onNavigate }: ClientStatusBoardProps) {
  const { entries, loading } = useClientBoard();
  const [filter, setFilter] = useState<FilterKey>('active');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => ({
    active:    entries.filter(e => e.activeHunts > 0).length,
    completed: entries.filter(e => e.activeHunts === 0 && e.completedHunts > 0).length,
    cancelled: entries.filter(e => e.activeHunts === 0 && e.completedHunts === 0 && e.cancelledHunts > 0).length,
    all:       entries.length,
  }), [entries]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter(e => filter === 'all' || statusOf(e) === filter)
      .filter(e => !q || e.fullName.toLowerCase().includes(q) || (e.clientNumber ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        // Missing job cards float to the top within "active"
        if (a.missingJobCard !== b.missingJobCard) return a.missingJobCard ? -1 : 1;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [entries, filter, query]);

  const tabs: { key: FilterKey; label: string }[] = [
    { key: 'active',    label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'all',       label: 'All' },
  ];

  return (
    <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0073ea]" />Client Status Board
        </h2>
        <button onClick={() => onNavigate('clients')} className="text-xs text-[#0073ea] hover:underline flex items-center gap-1">
          Open Clients <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="px-5 pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === t.key
                  ? 'bg-[#0073ea] border-[#0073ea] text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.label} <span className="opacity-70">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search client name…"
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
          />
        </div>
      </div>

      <div className="p-5 pt-3">
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">No clients match</p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
            {rows.map(e => (
              <button
                key={e.clientId}
                onClick={() => onNavigate('clients', e.clientId)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#0073ea]/10 border border-[#0073ea]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0073ea] text-xs font-bold">{e.fullName.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{e.fullName}</p>
                  <p className="text-xs text-slate-400">{e.clientNumber ?? '—'} · {e.clientType}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end max-w-[45%]">
                  {e.activeHunts > 0 && e.departments.length > 0 && e.departments.map(d => (
                    <span
                      key={d}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: (DEPT_COLORS[d] ?? '#64748b') + '20', color: DEPT_COLORS[d] ?? '#64748b' }}
                    >
                      {DEPT_LABELS[d] ?? d}
                    </span>
                  ))}
                  {e.activeHunts > 0 && e.missingJobCard && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                      No job card
                    </span>
                  )}
                  {e.activeHunts > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                      {e.activeHunts} active
                    </span>
                  )}
                  {e.activeHunts === 0 && e.completedHunts > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                      Completed
                    </span>
                  )}
                  {e.activeHunts === 0 && e.completedHunts === 0 && e.cancelledHunts > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Cancelled
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
