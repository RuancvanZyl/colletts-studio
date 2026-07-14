import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { CheckCircle2, AlertTriangle, XCircle, Flag } from 'lucide-react';
import { useTimingSession } from '@/lib/hooks/useTimingSession';
import { useCategoryRoster } from '@/lib/hooks/useCategoryRoster';
import { ScannerInput } from '@/components/ScannerInput';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export function FinishStation() {
  const { categoryId } = useParams();
  const { session, recentScans, recordScan } = useTimingSession(categoryId);
  const { roster, total } = useCategoryRoster(categoryId);
  const { push } = useToast();
  const [liveElapsed, setLiveElapsed] = useState('00:00.0');

  const finishes = recentScans.filter((s) => s.scan_type === 'finish');
  const finishedCount = new Set(finishes.filter((s) => !s.is_duplicate && s.registration_id).map((s) => s.registration_id)).size;

  useEffect(() => {
    if (session?.status !== 'live' || !session.gun_time) return;
    const gun = new Date(session.gun_time).getTime();
    const interval = setInterval(() => {
      const ms = Date.now() - gun;
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLiveElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 250);
    return () => clearInterval(interval);
  }, [session?.status, session?.gun_time]);

  async function onScan(chipCode: string) {
    if (session?.status !== 'live') {
      push('error', 'Race has not started yet');
      return;
    }
    const result = await recordScan(chipCode, 'finish', 'finish-1');
    if (!result) return;
    if ('error' in result) {
      push('error', result.error);
      return;
    }
    if (!result.chip_known) {
      push('error', `Unknown chip: ${chipCode}`);
    } else if (result.is_duplicate) {
      push('info', `${result.full_name} (bib ${result.race_number}) already finished`);
    } else {
      push('success', `${result.full_name} (bib ${result.race_number}) finished — ${liveElapsed}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Finish scan</h2>
          <p className="text-white/50 text-sm">Swimmers scan out as they cross the finish line.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-teal-glow tabular-nums">{session?.status === 'live' ? liveElapsed : '—'}</p>
          <p className="text-xs text-white/40">{finishedCount} / {total || '—'} finished</p>
        </div>
      </div>

      {session?.status !== 'live' && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <Flag className="size-4" /> Race has not started — finish scans will be rejected until the gun fires.
        </div>
      )}

      <Card className="p-6 mb-6">
        <ScannerInput onScan={onScan} disabled={session?.status !== 'live'} placeholder="Scan swimmer chip at finish…" />
      </Card>

      <h3 className="text-sm font-medium text-white/60 mb-2">Recent finishes</h3>
      <div className="space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin">
        {finishes.map((s) => {
          const entry = s.registration_id ? roster[s.registration_id] : null;
          const elapsedMs = session?.gun_time ? new Date(s.scanned_at).getTime() - new Date(session.gun_time).getTime() : null;
          return (
            <div
              key={s.id}
              className={cn(
                'flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm border',
                s.is_duplicate ? 'bg-amber-500/[0.06] border-amber-500/20' : !entry ? 'bg-red-500/[0.06] border-red-500/20' : 'bg-emerald-500/[0.05] border-emerald-500/15',
              )}
            >
              <span className="flex items-center gap-2 text-white/85">
                {s.is_duplicate ? (
                  <AlertTriangle className="size-4 text-amber-400" />
                ) : entry ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <XCircle className="size-4 text-red-400" />
                )}
                {entry ? `Bib ${entry.race_number} — ${entry.full_name}` : `Unknown chip ${s.chip_code}`}
              </span>
              <span className="text-teal-glow text-xs font-mono tabular-nums">
                {elapsedMs != null && elapsedMs >= 0
                  ? `${String(Math.floor(elapsedMs / 60000)).padStart(2, '0')}:${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}`
                  : ''}
              </span>
            </div>
          );
        })}
        {finishes.length === 0 && <p className="text-white/30 text-sm">No finishers yet.</p>}
      </div>
    </div>
  );
}
