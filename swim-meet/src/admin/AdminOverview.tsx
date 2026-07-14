import { Link } from 'react-router';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { useAllEvents } from '@/lib/hooks/useEvents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AdminOverview() {
  const { events, loading } = useAllEvents();

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
      <p className="text-white/50 mb-6">All events across the platform.</p>

      {loading && <p className="text-white/40">Loading…</p>}

      <div className="grid gap-4">
        {events.map((event) => (
          <Link key={event.id} to={`/admin/events/${event.id}/registrations`}>
            <Card className="hover:bg-white/[0.05] transition-colors">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-ocean-400" /> {event.name}
                  </CardTitle>
                  <CardDescription>{new Date(event.event_date).toLocaleDateString()}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={event.status === 'registration_open' ? 'success' : 'neutral'}>{event.status}</Badge>
                  <ArrowRight className="size-4 text-white/30" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {!loading && events.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-white/55">No events yet.</p>
            <Link to="/admin/events" className="text-ocean-400 text-sm hover:underline">
              Create your first event →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
