import { Link } from 'react-router';
import { Waves, MapPin, Calendar, ShieldCheck, Timer, Trophy } from 'lucide-react';
import { usePublicEvents } from '@/lib/hooks/useEvents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventCategoryList } from './EventCategoryList';

export function Landing() {
  const { events, loading } = usePublicEvents();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Waves className="size-5 text-ocean-400" />
            Open Water Timing
          </div>
          <Link to="/staff/login" className="text-sm text-white/50 hover:text-white/90">
            Staff / Timing login
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
          Register. Race. <span className="bg-gradient-to-r from-ocean-300 to-teal-glow bg-clip-text text-transparent">See your time.</span>
        </h1>
        <p className="mt-4 text-lg text-white/60 max-w-xl mx-auto">
          Open water swim registration and live race-day timing — from sign-up to
          your finish time, in one place.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-emerald-400" /> Unique race number, guaranteed</span>
          <span className="inline-flex items-center gap-1.5"><Timer className="size-4 text-ocean-400" /> Server-clocked start &amp; finish</span>
          <span className="inline-flex items-center gap-1.5"><Trophy className="size-4 text-[var(--color-gold)]" /> Age-group &amp; gender medals</span>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        {loading && <p className="text-center text-white/40 py-12">Loading events…</p>}
        {!loading && events.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-white/60">No events are open for registration right now.</p>
            <p className="text-sm text-white/35 mt-1">Check back soon, or ask your meet organizer for a direct link.</p>
          </Card>
        )}
        <div className="grid gap-6">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{event.name}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {new Date(event.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {event.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {event.location}</span>}
                  </CardDescription>
                </div>
                <Link to={`/events/${event.id}/results`}>
                  <Button variant="secondary" size="sm">Results</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {event.description && <p className="text-sm text-white/55 mb-4">{event.description}</p>}
                <EventCategoryList eventId={event.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
