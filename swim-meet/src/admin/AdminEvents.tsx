import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Users, ScanLine, Trophy } from 'lucide-react';
import { useAllEvents, useEventCategories } from '@/lib/hooks/useEvents';
import { createEvent, updateEvent, createCategory, createAgeGroup, deleteAgeGroup } from '@/lib/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import type { EventRow, EventStatus } from '@/lib/database.types';

export function AdminEvents() {
  const { events, loading, refresh } = useAllEvents();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Events &amp; Races</h1>
          <p className="text-white/50">Create events, configure races, and set age-group medal brackets.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New event
        </Button>
      </div>

      {loading && <p className="text-white/40">Loading…</p>}

      <div className="space-y-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} onChanged={refresh} />
        ))}
      </div>

      <CreateEventModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refresh} />
    </div>
  );
}

function CreateEventModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { push } = useToast();
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name || !eventDate) return;
    setSubmitting(true);
    const { error } = await createEvent({ name, event_date: eventDate, location, description });
    setSubmitting(false);
    if (error) {
      push('error', error);
      return;
    }
    push('success', 'Event created');
    setName('');
    setEventDate('');
    setLocation('');
    setDescription('');
    onCreated();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New event">
      <div className="space-y-4">
        <div>
          <Label>Event name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2026 Open Water Championship" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Clifton 4th Beach" />
          </div>
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <Button className="w-full" onClick={submit} loading={submitting}>
          Create event
        </Button>
      </div>
    </Modal>
  );
}

function EventCard({ event, onChanged }: { event: EventRow; onChanged: () => void }) {
  const { categories, ageGroups, loading, refresh } = useEventCategories(event.id);
  const [expanded, setExpanded] = useState(false);
  const { push } = useToast();

  async function setStatus(status: EventStatus) {
    const { error } = await updateEvent(event.id, { status });
    if (error) push('error', error);
    else {
      push('success', `Event marked ${status.replace('_', ' ')}`);
      onChanged();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div>
          <CardTitle>{event.name}</CardTitle>
          <p className="text-sm text-white/50 mt-0.5">{new Date(event.event_date).toLocaleDateString()} · {event.location}</p>
        </div>
        <Badge tone={event.status === 'registration_open' ? 'success' : event.status === 'completed' ? 'neutral' : 'warning'}>
          {event.status.replace('_', ' ')}
        </Badge>
      </CardHeader>
      {expanded && (
        <CardContent className="border-t border-white/[0.07] pt-4">
          <div className="flex flex-wrap gap-2 mb-5">
            <Button size="sm" variant={event.status === 'draft' ? 'primary' : 'secondary'} onClick={() => setStatus('draft')}>Draft</Button>
            <Button size="sm" variant={event.status === 'registration_open' ? 'success' : 'secondary'} onClick={() => setStatus('registration_open')}>Open registration</Button>
            <Button size="sm" variant={event.status === 'registration_closed' ? 'primary' : 'secondary'} onClick={() => setStatus('registration_closed')}>Close registration</Button>
            <Button size="sm" variant={event.status === 'in_progress' ? 'primary' : 'secondary'} onClick={() => setStatus('in_progress')}>Race day live</Button>
            <Button size="sm" variant={event.status === 'completed' ? 'primary' : 'secondary'} onClick={() => setStatus('completed')}>Completed</Button>
            <Link to={`/admin/events/${event.id}/registrations`}>
              <Button size="sm" variant="secondary"><Users className="size-4" /> Registrations</Button>
            </Link>
            <Link to={`/admin/events/${event.id}/chips`}>
              <Button size="sm" variant="secondary"><ScanLine className="size-4" /> Assign chips</Button>
            </Link>
            <Link to={`/events/${event.id}/results`}>
              <Button size="sm" variant="secondary"><Trophy className="size-4" /> Results</Button>
            </Link>
          </div>

          {loading ? (
            <p className="text-white/40 text-sm">Loading…</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <RacesPanel eventId={event.id} categories={categories} onChanged={refresh} />
              <AgeGroupsPanel eventId={event.id} ageGroups={ageGroups} onChanged={refresh} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function RacesPanel({ eventId, categories, onChanged }: { eventId: string; categories: ReturnType<typeof useEventCategories>['categories']; onChanged: () => void }) {
  const { push } = useToast();
  const [name, setName] = useState('');
  const [distance, setDistance] = useState('1000');
  const [gender, setGender] = useState<'any' | 'male' | 'female'>('any');
  const [fee, setFee] = useState('0');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');

  async function add() {
    if (!name) return;
    const { error } = await createCategory({
      event_id: eventId,
      name,
      distance_m: Number(distance),
      gender_restriction: gender === 'any' ? null : gender,
      entry_fee: Number(fee) || 0,
      max_participants: maxParticipants ? Number(maxParticipants) : null,
      scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
    });
    if (error) {
      push('error', error);
      return;
    }
    push('success', 'Race added');
    setName('');
    onChanged();
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-white/80 mb-2">Races</h3>
      <div className="space-y-1.5 mb-3">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
            <span className="text-white/85">{c.name}</span>
            <div className="flex items-center gap-1.5">
              <Badge tone="ocean">{c.distance_m}m</Badge>
              <Link to={`/timing/${c.id}/staging`}>
                <Button size="sm" variant="secondary">Timing console</Button>
              </Link>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-xs text-white/35">No races yet.</p>}
      </div>
      <div className="space-y-2 rounded-lg border border-white/[0.07] p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Race name, e.g. 1km Open Water" />
        <div className="grid grid-cols-3 gap-2">
          <Input value={distance} onChange={(e) => setDistance(e.target.value)} type="number" placeholder="Metres" />
          <Select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
            <option value="any">Any gender</option>
            <option value="male">Male only</option>
            <option value="female">Female only</option>
          </Select>
          <Input value={fee} onChange={(e) => setFee(e.target.value)} type="number" placeholder="Fee (R)" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} type="number" placeholder="Max entries (optional)" />
          <Input value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} type="datetime-local" />
        </div>
        <Button size="sm" className="w-full" onClick={add}>
          <Plus className="size-4" /> Add race
        </Button>
      </div>
    </div>
  );
}

function AgeGroupsPanel({ eventId, ageGroups, onChanged }: { eventId: string; ageGroups: ReturnType<typeof useEventCategories>['ageGroups']; onChanged: () => void }) {
  const { push } = useToast();
  const [label, setLabel] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  async function add() {
    if (!label || !minAge || !maxAge) return;
    const { error } = await createAgeGroup({
      event_id: eventId,
      label,
      min_age: Number(minAge),
      max_age: Number(maxAge),
      sort_order: ageGroups.length,
    });
    if (error) {
      push('error', error);
      return;
    }
    setLabel('');
    setMinAge('');
    setMaxAge('');
    onChanged();
  }

  async function remove(id: string) {
    await deleteAgeGroup(id);
    onChanged();
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-white/80 mb-2">Age-group medal brackets</h3>
      <div className="space-y-1.5 mb-3">
        {ageGroups.map((ag) => (
          <div key={ag.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
            <span className="text-white/85">{ag.label} <span className="text-white/40">({ag.min_age}–{ag.max_age})</span></span>
            <button onClick={() => remove(ag.id)} className="text-white/35 hover:text-red-400 text-xs">Remove</button>
          </div>
        ))}
        {ageGroups.length === 0 && <p className="text-xs text-white/35">No age groups yet — overall ranking only.</p>}
      </div>
      <div className="flex gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="18-24" className="flex-1" />
        <Input value={minAge} onChange={(e) => setMinAge(e.target.value)} type="number" placeholder="Min" className="w-20" />
        <Input value={maxAge} onChange={(e) => setMaxAge(e.target.value)} type="number" placeholder="Max" className="w-20" />
        <Button size="sm" onClick={add}><Plus className="size-4" /></Button>
      </div>
    </div>
  );
}
