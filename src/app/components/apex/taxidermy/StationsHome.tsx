/**
 * StationsHome — one big button per workstation, with how many animals are waiting there.
 */
import { Loader2 } from 'lucide-react';
import { useWorkshopStats } from '../../../../lib/hooks/useWorkshopStats';

export interface StationTile { view: string; label: string; dept: string }

export function StationsHome({ stations, onOpen }: { stations: StationTile[]; onOpen: (view: string) => void }) {
  const { stats, loading } = useWorkshopStats();
  const count = (dept: string) => stats?.byDept.find(d => d.dept === dept)?.count ?? 0;
  const stalled = (dept: string) => stats?.byDept.find(d => d.dept === dept)?.stalled ?? 0;
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Stations</h1>
        <p className="text-base text-slate-400 mt-1">Tap the station you are working at.</p>
      </div>
      {loading && !stats && <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" />Loading…</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stations.map(s => (
          <button key={s.view} onClick={() => onOpen(s.view)}
            className="text-left rounded-2xl border border-slate-700 bg-[#111c26] hover:border-sky-500 px-5 py-4 min-h-20 flex items-center gap-4">
            <span className="text-4xl font-bold text-white tabular-nums w-14 shrink-0">{loading && !stats ? '–' : count(s.dept)}</span>
            <span className="flex-1">
              <span className="block text-xl font-semibold text-slate-100">{s.label}</span>
              <span className="block text-sm text-slate-400">{count(s.dept) === 1 ? 'animal here now' : 'animals here now'}</span>
            </span>
            {stalled(s.dept) > 0 && <span className="text-sm font-semibold text-red-300 bg-red-950/60 rounded-full px-2.5 py-0.5">{stalled(s.dept)} stuck</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
