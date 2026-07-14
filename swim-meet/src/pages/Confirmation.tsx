import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { CheckCircle2, Hash, Calendar, Loader2 } from 'lucide-react';
import { fetchRegistrationSummary } from '@/lib/hooks/useRegistration';
import type { RegistrationSummary } from '@/lib/database.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Confirmation() {
  const { registrationId } = useParams();
  const [summary, setSummary] = useState<RegistrationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!registrationId) return;
    fetchRegistrationSummary(registrationId).then((data) => {
      setSummary(data);
      setLoading(false);
    });
  }, [registrationId]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 text-center">
          {loading && <Loader2 className="size-8 animate-spin text-ocean-400 mx-auto" />}
          {!loading && !summary && (
            <p className="text-white/60">We couldn't find that registration.</p>
          )}
          {!loading && summary && (
            <>
              <div className="mx-auto size-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-8 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white">You're entered!</h1>
              <p className="text-white/55 text-sm mt-1">{summary.full_name}</p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Your race number</p>
                <p className="text-5xl font-bold text-teal-glow tabular-nums flex items-center justify-center gap-2">
                  <Hash className="size-8" />{summary.race_number}
                </p>
                <p className="mt-3 text-sm text-white/70">{summary.category_name}</p>
                <p className="text-sm text-white/50 flex items-center justify-center gap-1.5 mt-1">
                  <Calendar className="size-3.5" />
                  {summary.event_name} · {new Date(summary.event_date).toLocaleDateString()}
                </p>
                <div className="mt-3">
                  <Badge tone={summary.status === 'confirmed' ? 'success' : 'warning'}>{summary.status}</Badge>
                </div>
              </div>

              <p className="text-xs text-white/40 mt-5 leading-relaxed">
                Save this race number. On race day, collect your timing chip at registration —
                it will be linked to race number {summary.race_number}. Scan in at the start funnel
                before your race, and scan out at the finish.
              </p>

              <Link to="/">
                <Button variant="secondary" className="mt-6 w-full">Back to events</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
