import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ChevronLeft, Download, Search } from 'lucide-react';
import { useEventRegistrations, updateRegistrationStatus } from '@/lib/hooks/useAdmin';
import { useAllEvents } from '@/lib/hooks/useEvents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export function AdminRegistrations() {
  const { eventId } = useParams();
  const { registrations, loading, refresh } = useEventRegistrations(eventId);
  const { events } = useAllEvents();
  const event = events.find((e) => e.id === eventId);
  const [query, setQuery] = useState('');
  const { push } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter(
      (r) =>
        r.swimmers.full_name.toLowerCase().includes(q) ||
        String(r.race_number).includes(q) ||
        r.swimmers.email.toLowerCase().includes(q),
    );
  }, [registrations, query]);

  async function changeStatus(id: string, status: Parameters<typeof updateRegistrationStatus>[1]) {
    const { error } = await updateRegistrationStatus(id, status);
    if (error) push('error', error);
    else {
      push('success', 'Updated');
      refresh();
    }
  }

  function exportStartList() {
    const headers = ['race_number', 'full_name', 'gender', 'date_of_birth', 'club', 'category', 'chip_code', 'status'];
    const rows = filtered.map((r) => [
      r.race_number,
      r.swimmers.full_name,
      r.swimmers.gender,
      r.swimmers.date_of_birth,
      r.swimmers.club ?? '',
      r.category_id,
      r.timing_chips?.[0]?.chip_code ?? '',
      r.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `start-list-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-5xl">
      <Link to="/admin/events" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 mb-4">
        <ChevronLeft className="size-4" /> Events
      </Link>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Registrations</h1>
          <p className="text-white/50">{event?.name}</p>
        </div>
        <Button variant="secondary" onClick={exportStartList}>
          <Download className="size-4" /> Export start list
        </Button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, bib, email…" className="pl-9" />
      </div>

      {loading && <p className="text-white/40">Loading…</p>}

      <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/[0.08] bg-white/[0.02]">
              <th className="px-4 py-3 font-medium">Bib</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Chip</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-2.5 tabular-nums text-white/70">{r.race_number}</td>
                <td className="px-4 py-2.5 text-white font-medium">{r.swimmers.full_name}</td>
                <td className="px-4 py-2.5 text-white/50">{r.swimmers.email}<br /><span className="text-xs">{r.swimmers.phone}</span></td>
                <td className="px-4 py-2.5">
                  {r.timing_chips?.[0]?.chip_code ? (
                    <Badge tone="ocean">{r.timing_chips[0].chip_code}</Badge>
                  ) : (
                    <Badge tone="warning">Unassigned</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    tone={
                      r.status === 'confirmed' ? 'success' : r.status === 'cancelled' ? 'danger' : r.status === 'disqualified' ? 'danger' : 'neutral'
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex gap-1.5">
                    {r.status !== 'confirmed' && (
                      <Button size="sm" variant="secondary" onClick={() => changeStatus(r.id, 'confirmed')}>Confirm</Button>
                    )}
                    {r.status !== 'cancelled' && (
                      <Button size="sm" variant="secondary" onClick={() => changeStatus(r.id, 'cancelled')}>Cancel</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/35">No registrations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
