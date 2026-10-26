import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { fetchAllRows, selectIn } from '../../../../lib/supabaseHelpers';
import { PackingList } from './PackingList';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { RefreshCw, Package, CheckCircle2, ClipboardList, Loader2, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface ShipHunt {
  huntId: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  huntYear: number;
  species: string[];
  totalTrophies: number;
  completedTrophies: number;
  hasPackingList: boolean;
  operator: string | null;
}

interface PackingTarget {
  huntId: string;
  clientName: string;
  clientNumber: string;
}

export function ReadyToShip({ onOpenClient, onOpenDocs }: { onOpenClient?: (clientId: string) => void; onOpenDocs?: (huntId: string) => void } = {}) {
  const [paper, setPaper] = useState<Record<string, { required: number; approved: number; waiting_outfitter: number; waiting_hunter: number; outfitter_name: string | null }>>({});
  const [hunts, setHunts]           = useState<ShipHunt[]>([]);
  const [loading, setLoading]       = useState(true);
  const [packingTarget, setPackingTarget] = useState<PackingTarget | null>(null);

  async function load() {
    setLoading(true);

    // Load all job cards that are in_progress or completed
    const docs = await fetchAllRows(() => (supabase as any)
      .from('hunt_documents')
      .select('id, hunt_id, status, form_data')
      .eq('doc_type', 'job_card')
      .neq('status', 'pending_payment')
      .order('id'));

    const packingLists = await fetchAllRows(() => (supabase as any)
      .from('hunt_documents')
      .select('id, hunt_id')
      .eq('doc_type', 'packing_list')
      .order('id'));

    const plHuntIds = new Set(packingLists.map((p: any) => p.hunt_id));

    // Group by hunt
    const huntMap: Record<string, { total: number; completed: number; species: Set<string> }> = {};
    for (const doc of docs) {
      if (!huntMap[doc.hunt_id]) huntMap[doc.hunt_id] = { total: 0, completed: 0, species: new Set() };
      huntMap[doc.hunt_id].total++;
      if (doc.status === 'completed') huntMap[doc.hunt_id].completed++;
      const sp = doc.form_data?.species;
      if (sp) huntMap[doc.hunt_id].species.add(sp);
    }

    // Only keep hunts where ALL trophies are completed
    const completedHuntIds = Object.entries(huntMap)
      .filter(([, v]) => v.total > 0 && v.completed === v.total)
      .map(([id]) => id);

    if (completedHuntIds.length === 0) { setHunts([]); setLoading(false); return; }

    // Load hunt + client info
    const huntRows = await selectIn('client_hunts', 'id, year, operator, client_id', 'id', completedHuntIds);

    const clientIds = [...new Set(huntRows.map((h: any) => h.client_id))] as string[];
    const clientRows = await selectIn('clients', 'id, full_name, client_number', 'id', clientIds);

    const clientMap: Record<string, { full_name: string; client_number: string }> = {};
    for (const c of clientRows ?? []) clientMap[c.id] = c;

    const result: ShipHunt[] = (huntRows ?? []).map((h: any) => {
      const stats = huntMap[h.id];
      const client = clientMap[h.client_id] ?? {};
      return {
        huntId:           h.id,
        clientId:         h.client_id,
        clientName:       client.full_name   ?? '—',
        clientNumber:     client.client_number ?? '',
        huntYear:         h.year,
        species:          [...(stats?.species ?? [])],
        totalTrophies:    stats?.total   ?? 0,
        completedTrophies: stats?.completed ?? 0,
        hasPackingList:   plHuntIds.has(h.id),
        operator:         h.operator,
      };
    });

    const { data: pv } = await (supabase as any).from('v_hunt_documents').select('hunt_id, required, approved, waiting_outfitter, waiting_hunter, outfitter_name').in('hunt_id', completedHuntIds);
    const pm: typeof paper = {};
    for (const r of pv ?? []) pm[r.hunt_id] = { required: +r.required, approved: +r.approved, waiting_outfitter: +r.waiting_outfitter, waiting_hunter: +r.waiting_hunter, outfitter_name: r.outfitter_name };
    setPaper(pm);

    setHunts(result);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Ready to Ship</h1>
          <p className="text-slate-500 text-sm">Hunts with all trophies completed — generate packing lists and arrange dispatch</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : hunts.length === 0 ? (
        <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-24 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hunts ready to ship yet</p>
          <p className="text-slate-400 text-sm mt-1">Hunts appear here once every trophy is marked completed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hunts.map(hunt => (
            <div
              key={hunt.huntId}
              className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {onOpenClient
                      ? <h3 className="font-bold text-slate-900 dark:text-slate-100"><button onClick={() => onOpenClient(hunt.clientId)} title="Open this client's profile" className="text-left hover:underline hover:text-[#0073ea] cursor-pointer">{hunt.clientName}</button></h3>
                      : <h3 className="font-bold text-slate-900 dark:text-slate-100">{hunt.clientName}</h3>}
                    {hunt.clientNumber && (
                      <span className="text-xs text-slate-500 font-mono">{hunt.clientNumber}</span>
                    )}
                    <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      All {hunt.totalTrophies} complete
                    </Badge>
                    {hunt.hasPackingList && (
                      <Badge variant="outline" className="border-blue-400 text-blue-600 dark:text-blue-400 text-xs">
                        <ClipboardList className="w-3 h-3 mr-1" />Packing list done
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {hunt.huntYear} hunt{hunt.operator ? ` · ${hunt.operator}` : ''}
                  </p>
                  {paper[hunt.huntId] && paper[hunt.huntId].required > 0 && (() => {
                    const d = paper[hunt.huntId]; const open = d.required - d.approved;
                    return (
                      <button onClick={() => onOpenDocs?.(hunt.huntId)} className={`mt-2 text-left text-sm font-semibold rounded-lg px-3 py-2 min-h-10 ${open === 0 ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'}`}>
                        {open === 0 ? 'Documents complete. Ready to dispatch.' : `Cannot ship yet: ${open} document${open > 1 ? 's' : ''} not approved${d.waiting_outfitter ? `, ${d.waiting_outfitter} waiting on ${d.outfitter_name ?? 'the outfitter'}` : ''}${d.waiting_hunter ? `, ${d.waiting_hunter} waiting on the hunter` : ''}`}
                      </button>
                    );
                  })()}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hunt.species.map(sp => (
                      <Badge key={sp} variant="outline" className="text-xs">{sp}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={hunt.hasPackingList ? 'outline' : 'default'}
                    className={hunt.hasPackingList ? '' : 'bg-lime-600 hover:bg-lime-700 text-white'}
                    onClick={() => setPackingTarget({
                      huntId: hunt.huntId,
                      clientName: hunt.clientName,
                      clientNumber: hunt.clientNumber,
                    })}
                  >
                    <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                    {hunt.hasPackingList ? 'Edit Packing List' : 'Create Packing List'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {packingTarget && (
        <PackingList
          huntId={packingTarget.huntId}
          clientName={packingTarget.clientName}
          clientNumber={packingTarget.clientNumber}
          onClose={() => { setPackingTarget(null); load(); }}
        />
      )}
    </div>
  );
}
