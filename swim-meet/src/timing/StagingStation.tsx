import { useParams } from 'react-router';
import { CheckCircle2, AlertTriangle, XCircle, Users } from 'lucide-react';
import { useTimingSession } from '@/lib/hooks/useTimingSession';
import { useCategoryRoster } from '@/lib/hooks/useCategoryRoster';
import { ScannerInput } from '@/components/ScannerInput';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export function StagingStation() {
  const { categoryId } = useParams();
  const { session, recentScans, recordScan } = useTimingSession(categoryId);
  const { roster, total } = useCategoryRoster(categoryId);
  const { push } = useToast();

  const checkins = recentScans.filter((s) => s.scan_type === 'checkin');
  const checkedInCount = new Set(checkins.filter((s) => !s.is_duplicate && s.registration_id).map((s) => s.registration_id)).size;

  async function onScan(chipCode: string) {
    const result = await recordScan(chipCode, 'checkin', 'staging-1');
    if (!result) return;
    if ('error' in result) {
      push('error', result.error);
      return;
    }
    if (!result.chip_known) {
      push('error', `Unknown chip: ${chipCode}`);
    } else if (result.is_duplicate) {
      push('info', `${result.full_name} (bib ${result.race_number}) already checked in`);
    } else {
      push('success', `${result.full_name} (bib ${result.race_number}) checked in — ready in the water`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Funnel scan-in</h2>
          <p className="text-white/50 text-sm">Swimmers scan their chip as they enter the water / start zone.</p>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Users className="size-4" />
          {checkedInCount} / {total || '—'} checked in
        </div>
      </div>

      <Card className="p-6 mb-6">
        <ScannerInput onScan={onScan} disabled={!session} placeholder="Scan swimmer chip…" />
      </Card>

      <h3 className="text-sm font-medium text-white/60 mb-2">Recent scans</h3>
      <div className="space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin">
        {checkins.map((s) => {
          const entry = s.registration_id ? roster[s.registration_id] : null;
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
                {s.is_duplicate && <span className="text-amber-300/70 text-xs">(duplicate)</span>}
              </span>
              <span className="text-white/35 text-xs tabular-nums">{new Date(s.scanned_at).toLocaleTimeString()}</span>
            </div>
          );
        })}
        {checkins.length === 0 && <p className="text-white/30 text-sm">No scans yet.</p>}
      </div>
    </div>
  );
}
