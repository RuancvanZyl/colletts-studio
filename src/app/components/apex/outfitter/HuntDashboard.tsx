import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  Plus, Search, RefreshCw, Loader2, ChevronRight, Users,
  Calendar, MapPin, Crosshair, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export interface OutfitterHunt {
  id: string;
  year: number;
  operator: string | null;
  farm: string | null;
  region: string | null;
  status: string;
  client_type: string;
  process_type: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  client: { id: string; full_name: string; client_number: string | null; country: string | null } | null;
  trophyCount: number;
  awaitingCount: number;  // awaiting_arrival job cards
  inProgressCount: number;
  docCount: number;
  species: string[];
}

interface HuntDashboardProps {
  onCreateHunt: () => void;
  onOpenHunt: (hunt: OutfitterHunt) => void;
}

export function HuntDashboard({ onCreateHunt, onOpenHunt }: HuntDashboardProps) {
  const [hunts,        setHunts]        = useState<OutfitterHunt[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [yearFilter,   setYearFilter]   = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'awaiting' | 'active' | 'completed'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: huntRows, error } = await (supabase as any)
        .from('client_hunts')
        .select('id, year, operator, farm, region, status, client_type, process_type, start_date, end_date, created_at, client_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!huntRows || huntRows.length === 0) { setHunts([]); setLoading(false); return; }

      const clientIds = [...new Set(huntRows.map((h: any) => h.client_id).filter(Boolean))];
      const huntIds   = huntRows.map((h: any) => h.id);

      const [clientsRes, docsRes] = await Promise.all([
        clientIds.length > 0
          ? (supabase as any).from('clients').select('id, full_name, client_number, country').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        (supabase as any)
          .from('hunt_documents')
          .select('hunt_id, doc_type, status, title, form_data')
          .in('hunt_id', huntIds),
      ]);

      const clientMap: Record<string, any> = {};
      for (const c of clientsRes.data ?? []) clientMap[c.id] = c;

      const docsByHunt: Record<string, any[]> = {};
      for (const d of docsRes.data ?? []) {
        if (!docsByHunt[d.hunt_id]) docsByHunt[d.hunt_id] = [];
        docsByHunt[d.hunt_id].push(d);
      }

      const result: OutfitterHunt[] = huntRows.map((h: any) => {
        const docs           = docsByHunt[h.id] ?? [];
        const jobCards       = docs.filter((d: any) => d.doc_type === 'job_card');
        const awaitingCount  = jobCards.filter((d: any) => d.status === 'awaiting_arrival').length;
        const inProgressCount = jobCards.filter((d: any) => d.status === 'in_progress').length;
        const species        = [...new Set(jobCards.map((d: any) => d.form_data?.species).filter(Boolean))] as string[];
        return {
          ...h,
          client:       clientMap[h.client_id] ?? null,
          trophyCount:  jobCards.length,
          awaitingCount,
          inProgressCount,
          docCount:     docs.filter((d: any) => d.doc_type !== 'job_card').length,
          species,
        };
      });

      setHunts(result);
    } catch (err: any) {
      toast.error('Failed to load hunts: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const years = [...new Set(hunts.map(h => h.year.toString()))].sort((a, b) => Number(b) - Number(a));

  const awaitingTotal = hunts.filter(h => h.awaitingCount > 0).length;

  const filtered = hunts.filter(h => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || h.client?.full_name.toLowerCase().includes(q)
      || h.client?.client_number?.toLowerCase().includes(q)
      || h.operator?.toLowerCase().includes(q)
      || h.farm?.toLowerCase().includes(q)
      || h.species.some(s => s.toLowerCase().includes(q));
    const matchYear   = yearFilter === 'all' || h.year.toString() === yearFilter;
    const matchStatus =
      statusFilter === 'all'       ? true :
      statusFilter === 'awaiting'  ? h.awaitingCount > 0 :
      statusFilter === 'active'    ? h.inProgressCount > 0 :
      h.status === 'completed';
    return matchSearch && matchYear && matchStatus;
  });

  // Farm-wide species summary
  const speciesCounts = hunts.flatMap(h => h.species).reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1; return acc;
  }, {});
  const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const totalTrophies = hunts.reduce((s, h) => s + h.trophyCount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Hunt Management</h1>
          <p className="text-slate-500 text-sm">{hunts.length} hunts · {totalTrophies} trophies on record</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={onCreateHunt} className="bg-[#0073ea] hover:bg-[#0060c7] text-white gap-1.5">
            <Plus className="w-4 h-4" /> New Hunt
          </Button>
        </div>
      </div>

      {/* Farm species summary */}
      {topSpecies.length > 0 && (
        <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5" /> Animals Hunted on Farm
          </p>
          <div className="flex flex-wrap gap-2">
            {topSpecies.map(([species, count]) => (
              <button
                key={species}
                onClick={() => setSearch(species)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-[#0073ea]/10 border border-slate-200 dark:border-slate-700 rounded-full transition-colors"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{species}</span>
                <Badge className="bg-[#0073ea] text-white text-[10px] px-1.5 py-0 h-4">{count}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit flex-wrap">
        {([
          { key: 'all',       label: 'All' },
          { key: 'awaiting',  label: `Awaiting Arrival${awaitingTotal > 0 ? ` (${awaitingTotal})` : ''}` },
          { key: 'active',    label: 'In Workshop' },
          { key: 'completed', label: 'Completed' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === t.key
                ? t.key === 'awaiting'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + year filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hunter, operator, farm, species…"
            className="pl-9 h-9"
          />
        </div>
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a] text-sm px-3 text-slate-700 dark:text-slate-300"
        >
          <option value="all">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Hunt list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Crosshair className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{search ? 'No hunts match your search' : 'No hunts yet — create the first one'}</p>
          {!search && (
            <Button size="sm" onClick={onCreateHunt} className="mt-3 bg-[#0073ea] hover:bg-[#0060c7] text-white">
              <Plus className="w-4 h-4 mr-1" /> Create Hunt
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(hunt => (
            <button
              key={hunt.id}
              onClick={() => onOpenHunt(hunt)}
              className="w-full text-left bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-[#0073ea] hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {hunt.client?.full_name ?? 'Unknown Client'}
                    </span>
                    {hunt.client?.country && (
                      <span className="text-xs text-slate-400">{hunt.client.country}</span>
                    )}
                    {hunt.awaitingCount > 0 && hunt.inProgressCount === 0 ? (
                      <Badge className="text-[10px] px-1.5 h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0">
                        Awaiting Arrival
                      </Badge>
                    ) : (
                      <Badge className={`text-[10px] px-1.5 h-4 ${hunt.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-slate-100 text-slate-500'}`}>
                        {hunt.status}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 h-4">{hunt.year}</Badge>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mb-2">
                    {hunt.operator && (
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{hunt.operator}</span>
                    )}
                    {hunt.farm && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{hunt.farm}</span>
                    )}
                    {hunt.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(hunt.start_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        {hunt.end_date && ` – ${new Date(hunt.end_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`}
                      </span>
                    )}
                  </div>

                  {hunt.species.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hunt.species.slice(0, 6).map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full">
                          {s}
                        </span>
                      ))}
                      {hunt.species.length > 6 && (
                        <span className="text-[10px] text-slate-400">+{hunt.species.length - 6} more</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{hunt.trophyCount}</span>
                  <span className="text-[10px] text-slate-400">trophies</span>
                  {hunt.awaitingCount > 0 && (
                    <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                      {hunt.awaitingCount} awaiting
                    </span>
                  )}
                  {hunt.inProgressCount > 0 && (
                    <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">
                      {hunt.inProgressCount} in workshop
                    </span>
                  )}
                  {hunt.docCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-[#0073ea]">
                      <FileText className="w-3 h-3" />{hunt.docCount} docs
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 mt-1" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
