import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ChevronLeft, Search, CheckCircle2 } from 'lucide-react';
import { useEventRegistrations, assignChip, type RegistrationWithSwimmer } from '@/lib/hooks/useAdmin';
import { ScannerInput } from '@/components/ScannerInput';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

export function AdminChips() {
  const { eventId } = useParams();
  const { registrations, refresh } = useEventRegistrations(eventId);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RegistrationWithSwimmer | null>(null);
  const { push } = useToast();

  const matches = registrations.filter(
    (r) =>
      query.length > 0 &&
      (String(r.race_number) === query.trim() || r.swimmers.full_name.toLowerCase().includes(query.toLowerCase())),
  );

  async function onScan(chipCode: string) {
    if (!selected) {
      push('error', 'Select a swimmer by bib number first');
      return;
    }
    const { error } = await assignChip(chipCode, selected.id);
    if (error) {
      push('error', error);
      return;
    }
    push('success', `Chip ${chipCode} → bib ${selected.race_number} (${selected.swimmers.full_name})`);
    setSelected(null);
    setQuery('');
    refresh();
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link to="/admin/events" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 mb-4">
        <ChevronLeft className="size-4" /> Events
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Assign timing chips</h1>
      <p className="text-white/50 mb-6">Find the swimmer by bib number, then scan their chip.</p>

      <Card className="p-5 mb-4">
        <div className="relative mb-3">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Bib number or name…"
            className="pl-9"
            autoFocus
          />
        </div>
        {!selected && matches.length > 0 && (
          <div className="space-y-1.5">
            {matches.slice(0, 6).map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full flex items-center justify-between rounded-lg bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-sm text-left"
              >
                <span className="text-white">Bib {r.race_number} — {r.swimmers.full_name}</span>
                {r.timing_chips?.[0]?.chip_code && <Badge tone="ocean">{r.timing_chips[0].chip_code}</Badge>}
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <Card className="p-5">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 mb-4 text-emerald-300">
              <CheckCircle2 className="size-5" />
              <span className="font-medium">Bib {selected.race_number} — {selected.swimmers.full_name}</span>
            </div>
            <ScannerInput onScan={onScan} placeholder="Scan the chip to assign…" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
