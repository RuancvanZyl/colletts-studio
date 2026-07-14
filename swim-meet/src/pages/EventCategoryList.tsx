import { Link } from 'react-router';
import { useEventCategories } from '@/lib/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function EventCategoryList({ eventId }: { eventId: string }) {
  const { categories, loading } = useEventCategories(eventId);

  if (loading) return <p className="text-sm text-white/35">Loading races…</p>;
  if (categories.length === 0) return <p className="text-sm text-white/35">No races configured yet.</p>;

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {categories.map((cat) => {
        const spotsLeft = cat.max_participants != null ? cat.max_participants - (cat.next_race_number - 1) : null;
        const full = spotsLeft !== null && spotsLeft <= 0;
        return (
          <div
            key={cat.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
          >
            <div>
              <p className="font-medium text-white text-sm">{cat.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge tone="ocean">{cat.distance_m >= 1000 ? `${cat.distance_m / 1000}km` : `${cat.distance_m}m`}</Badge>
                {cat.gender_restriction && <Badge tone="neutral">{cat.gender_restriction}</Badge>}
                {cat.entry_fee > 0 && <Badge tone="neutral">R{cat.entry_fee.toFixed(0)}</Badge>}
                {full && <Badge tone="danger">Full</Badge>}
              </div>
            </div>
            <Link to={`/events/${eventId}/register/${cat.id}`}>
              <Button size="sm" disabled={full}>{full ? 'Full' : 'Register'}</Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
