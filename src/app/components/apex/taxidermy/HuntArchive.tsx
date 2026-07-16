/**
 * HuntArchive — workshop-wide archive of every hunt, organised by
 * Year → Hunter. Clicking a hunter opens their full HuntTimeline with
 * live, editable documents (job cards, receiving sheets, packing lists).
 * This is the primary browse view for all Dropbox-imported work.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { HuntTimeline } from './HuntTimeline';
import { Input } from '../../ui/input';
import {
  Loader2, RefreshCw, Search, ChevronLeft, User,
  FolderOpen, Plane, MapPin,
} from 'lucide-react';

interface ArchiveHunt {
  id: string;
  year: string;
  ref_number: string;
  operator: string | null;
  client_type: string;
  doc_count: number;
}

interface ArchiveHunter {
  clientId: string;
  name: string;
  clientNumber: string | null;
  clientType: string;
  hunts: ArchiveHunt[];
}

export function HuntArchive() {
  const [loading, setLoading]           = useState(true);
  const [years, setYears]               = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [byYear, setByYear]             = useState<Record<string, ArchiveHunter[]>>({});
  const [search, setSearch]             = useState('');
  const [openClient, setOpenClient]     = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    const { data: hunts } = await (supabase as any)
      .from('client_hunts')
      .select(`
        id, year, ref_number, operator, client_type, client_id,
        clients!inner(id, full_name, client_number, client_type),
        hunt_documents(id)
      `)
      .order('year', { ascending: false });

    const yearMap: Record<string, Record<string, ArchiveHunter>> = {};

    for (const h of hunts ?? []) {
      const y = String(h.year);
      if (!yearMap[y]) yearMap[y] = {};
      const c = h.clients;
      if (!yearMap[y][c.id]) {
        yearMap[y][c.id] = {
          clientId:     c.id,
          name:         c.full_name,
          clientNumber: c.client_number ?? null,
          clientType:   c.client_type ?? 'export',
          hunts:        [],
        };
      }
      yearMap[y][c.id].hunts.push({
        id:          h.id,
        year:        y,
        ref_number:  h.ref_number,
        operator:    h.operator ?? null,
        client_type: h.client_type ?? 'export',
        doc_count:   (h.hunt_documents ?? []).length,
      });
    }

    const sortedYears = Object.keys(yearMap).sort((a, b) => Number(b) - Number(a));
    const grouped: Record<string, ArchiveHunter[]> = {};
    for (const y of sortedYears) {
      grouped[y] = Object.values(yearMap[y]).sort((a, b) => a.name.localeCompare(b.name));
    }

    setYears(sortedYears);
    setByYear(grouped);
    if (sortedYears.length && !selectedYear) setSelectedYear(sortedYears[0]);
    setLoading(false);
  }

  // ── Detail view: one hunter's full timeline with editable documents ────────
  if (openClient) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setOpenClient(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Archive
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0073ea]/15 flex items-center justify-center">
            <User className="w-5 h-5 text-[#0073ea]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{openClient.name}</h2>
        </div>
        <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <HuntTimeline clientId={openClient.id} />
        </div>
      </div>
    );
  }

  const hunters = (byYear[selectedYear] ?? []).filter(h =>
    !search ||
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.clientNumber?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    h.hunts.some(x => x.ref_number?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Hunt Archive</h2>
          <p className="text-sm text-slate-500">All hunts by year and hunter — documents are live and editable</p>
        </div>
        <button onClick={load} disabled={loading} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading archive…
        </div>
      ) : years.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FolderOpen className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No hunts yet — import from Dropbox or create via Quick Job Entry</p>
        </div>
      ) : (
        <>
          {/* Year tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {years.map(y => {
              const count = byYear[y]?.reduce((s, h) => s + h.hunts.length, 0) ?? 0;
              return (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    selectedYear === y
                      ? 'bg-[#0073ea] text-white shadow-md'
                      : 'bg-white dark:bg-[#1c2b3a] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#0073ea]'
                  }`}
                >
                  {y}
                  <span className={`ml-1.5 text-xs ${selectedYear === y ? 'text-blue-200' : 'text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search hunter, client number, or reference…"
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Hunter cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {hunters.map(h => (
              <button
                key={h.clientId}
                onClick={() => setOpenClient({ id: h.clientId, name: h.name })}
                className="text-left bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-[#0073ea] hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#0073ea]/15 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#0073ea]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{h.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      {h.clientNumber && <span className="font-mono">{h.clientNumber}</span>}
                      {h.clientType === 'export'
                        ? <span className="flex items-center gap-0.5"><Plane className="w-3 h-3" /> Export</span>
                        : <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> Local</span>}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  {h.hunts.map(hunt => (
                    <div key={hunt.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 rounded-lg px-2.5 py-1.5">
                      <span className="font-mono text-slate-600 dark:text-slate-300 truncate">{hunt.ref_number}</span>
                      <span className="text-slate-400 shrink-0 ml-2">{hunt.doc_count} doc{hunt.doc_count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
          {hunters.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">No hunters match your search in {selectedYear}</p>
          )}
        </>
      )}
    </div>
  );
}
