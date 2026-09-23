import { useState, useMemo } from 'react';
import { Search, Users, ArrowRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useClientBoard, type ClientBoardEntry } from '../../../../lib/hooks/useClientBoard';
import { DEPT_LABELS, DEPT_COLORS } from '../../../../lib/pipeline';

interface ClientStatusBoardProps {
  onNavigate: (view: string, clientId?: string) => void;
}

function orderStatus(e: ClientBoardEntry): { label: string; className: string } {
  if (e.activeHunts > 0) {
    if (e.missingJobCard) return { label: 'Awaiting job card', className: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' };
    if (e.departments.length > 0) return { label: 'In production', className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' };
    return { label: 'Active', className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' };
  }
  if (e.completedHunts > 0) return { label: 'Completed', className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' };
  return { label: 'Cancelled', className: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
}

function ClientRow({ e, onClick }: { e: ClientBoardEntry; onClick: () => void }) {
  const status = orderStatus(e);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-full bg-[#0073ea]/10 border border-[#0073ea]/20 flex items-center justify-center flex-shrink-0">
        <span className="text-[#0073ea] text-xs font-bold">{e.fullName.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{e.fullName}</p>
        <p className="text-xs text-slate-400">{e.clientNumber ?? '—'} · {e.clientType}</p>
      </div>

      {/* Process column */}
      <div className="w-36 flex-shrink-0 hidden sm:flex flex-wrap gap-1 justify-start">
        {e.departments.length > 0 ? (
          e.departments.map(d => (
            <span
              key={d}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: (DEPT_COLORS[d] ?? '#64748b') + '20', color: DEPT_COLORS[d] ?? '#64748b' }}
            >
              {DEPT_LABELS[d] ?? d}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-slate-400">—</span>
        )}
      </div>

      {/* Status column */}
      <div className="w-32 flex-shrink-0 flex items-center justify-end gap-1.5">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${status.className}`}>
          {status.label}
        </span>
        {e.activeHunts > 1 && (
          <span className="text-[10px] text-slate-400 whitespace-nowrap">×{e.activeHunts}</span>
        )}
      </div>
    </button>
  );
}

export function ClientStatusBoard({ onNavigate }: ClientStatusBoardProps) {
  const { entries, loading } = useClientBoard();
  const [query, setQuery] = useState('');
  const [showOthers, setShowOthers] = useState(false);

  const active = useMemo(
    () => entries.filter(e => e.activeHunts > 0),
    [entries]
  );
  const others = useMemo(
    () => entries.filter(e => e.activeHunts === 0),
    [entries]
  );

  function filterAndSort(list: ClientBoardEntry[]) {
    const q = query.trim().toLowerCase();
    return list
      .filter(e => !q || e.fullName.toLowerCase().includes(q) || (e.clientNumber ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.missingJobCard !== b.missingJobCard) return a.missingJobCard ? -1 : 1;
        return a.fullName.localeCompare(b.fullName);
      });
  }

  const activeRows = filterAndSort(active);
  const otherRows = filterAndSort(others);

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

      <div className="px-5 pt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Active <span className="opacity-70">{active.length}</span>
        </p>
        <div className="relative w-56">
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
        ) : activeRows.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">No active clients match</p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
            {activeRows.map(e => (
              <ClientRow key={e.clientId} e={e} onClick={() => onNavigate('clients', e.clientId)} />
            ))}
          </div>
        )}

        {/* Completed / Cancelled — collapsed by default */}
        {!loading && others.length > 0 && (
          <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
            <button
              onClick={() => setShowOthers(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-wider"
            >
              {showOthers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
              Completed &amp; Cancelled <span className="opacity-70">{others.length}</span>
            </button>
            {showOthers && (
              <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1 mt-3">
                {otherRows.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-4">No matches</p>
                ) : otherRows.map(e => (
                  <ClientRow key={e.clientId} e={e} onClick={() => onNavigate('clients', e.clientId)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
