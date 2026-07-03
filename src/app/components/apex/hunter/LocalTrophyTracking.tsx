import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useHunterClient } from '../../../../lib/hooks/useHunterClient';
import { DEPT_LABELS } from '../../../../lib/pipeline';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Clock, MapPin, Phone, Package, Sparkles } from 'lucide-react';

const COLLECTION_STAGES = [
  { key: 'receiving',       label: 'Received' },
  { key: 'skinning',        label: 'Skinning' },
  { key: 'salting',         label: 'Salting' },
  { key: 'tannery',         label: 'Tannery' },
  { key: 'mounting',        label: 'Mounting' },
  { key: 'finishing',       label: 'Finishing' },
  { key: 'quality_check',   label: 'Quality Check' },
  { key: 'packing',         label: 'Ready for Collection' },
  { key: 'done',            label: 'Collected' },
];

interface Trophy {
  docId: string;
  species: string;
  mountType: string;
  tagNumber: string;
  department: string;
  status: string;
  instructions: string;
}

export function LocalTrophyTracking() {
  const { client } = useHunterClient();
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading]   = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function load() {
    if (!client?.id) return;
    setLoading(true);

    const { data: hunts } = await (supabase as any)
      .from('client_hunts').select('id').eq('client_id', client.id);
    const huntIds = (hunts ?? []).map((h: any) => h.id);

    if (huntIds.length === 0) { setTrophies([]); setLoading(false); return; }

    const { data: docs } = await (supabase as any)
      .from('hunt_documents')
      .select('id, form_data, current_department, status')
      .in('hunt_id', huntIds)
      .eq('doc_type', 'job_card')
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: true });

    setTrophies((docs ?? []).map((d: any) => ({
      docId:       d.id,
      species:     d.form_data?.species    ?? '—',
      mountType:   d.form_data?.mount_type ?? '—',
      tagNumber:   d.form_data?.tag_number ?? '',
      department:  d.current_department    ?? '',
      status:      d.status                ?? '',
      instructions: d.form_data?.instructions ?? '',
    })));

    setLoading(false);
  }

  useEffect(() => { load(); }, [client?.id]);

  async function confirmCollection(trophy: Trophy) {
    setConfirming(trophy.docId);
    const { error } = await (supabase as any)
      .from('hunt_documents')
      .update({ status: 'completed', current_department: 'done' })
      .eq('id', trophy.docId);
    setConfirming(null);
    if (error) { toast.error('Could not confirm — please try again'); return; }
    toast.success(`${trophy.species} marked as collected!`);
    load();
  }

  function stageIndex(dept: string, status: string) {
    if (status === 'completed' || dept === 'done') return COLLECTION_STAGES.length - 1;
    return COLLECTION_STAGES.findIndex(s => s.key === dept);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (trophies.length === 0) {
    return (
      <div className="text-center py-20">
        <Package className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No trophies in production yet</p>
        <p className="text-slate-400 text-sm mt-1">Your trophies will appear here once processing begins</p>
      </div>
    );
  }

  const readyCount = trophies.filter(t => t.department === 'packing' || t.department === 'administration').length;
  const doneCount  = trophies.filter(t => t.status === 'completed' || t.department === 'done').length;

  return (
    <div className="space-y-6">

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',    value: trophies.length,   color: '#64748b' },
          { label: 'Ready',    value: readyCount,         color: '#10b981' },
          { label: 'Collected',value: doneCount,          color: '#6366f1' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ready for collection banner */}
      {readyCount > 0 && (
        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800 dark:text-green-300">
              {readyCount} trophy{readyCount !== 1 ? 'ies' : ''} ready for collection!
            </p>
            <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
              Please contact us to arrange a collection time.
            </p>
          </div>
        </div>
      )}

      {/* Trophy cards */}
      <div className="space-y-4">
        {trophies.map(trophy => {
          const idx       = stageIndex(trophy.department, trophy.status);
          const isReady   = trophy.department === 'packing' || trophy.department === 'administration';
          const isDone    = trophy.status === 'completed' || trophy.department === 'done';
          const pct       = Math.round((Math.max(idx, 0) / (COLLECTION_STAGES.length - 1)) * 100);

          return (
            <div key={trophy.docId} className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

              {/* Header */}
              <div className={`px-5 py-4 flex items-center gap-3 ${
                isDone   ? 'bg-indigo-600' :
                isReady  ? 'bg-green-600'  :
                'bg-slate-800'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base">{trophy.species}</p>
                  <p className="text-white/70 text-xs">{trophy.mountType}{trophy.tagNumber ? ` · ${trophy.tagNumber}` : ''}</p>
                </div>
                <Badge className={`border-0 text-xs font-semibold ${
                  isDone  ? 'bg-white/20 text-white' :
                  isReady ? 'bg-white/20 text-white' :
                  'bg-white/10 text-white/80'
                }`}>
                  {isDone ? 'Collected' : isReady ? 'Ready for Collection' : (DEPT_LABELS[trophy.department] ?? trophy.department)}
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="px-5 pt-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Progress</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isDone ? 'bg-indigo-500' : isReady ? 'bg-green-500' : 'bg-[#0073ea]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Stage dots */}
                <div className="flex items-center justify-between mt-3 mb-1">
                  {COLLECTION_STAGES.map((stage, i) => (
                    <div key={stage.key} className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-2 h-2 rounded-full transition-all ${
                        i <= idx
                          ? isDone   ? 'bg-indigo-500'
                          : isReady  ? 'bg-green-500'
                          : 'bg-[#0073ea]'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                      {(i === 0 || i === Math.floor(COLLECTION_STAGES.length / 2) || i === COLLECTION_STAGES.length - 1) && (
                        <span className="text-[8px] text-slate-400 text-center leading-tight hidden sm:block">{stage.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions if any */}
              {trophy.instructions && (
                <div className="mx-5 mt-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Your Instructions</p>
                  <p className="text-xs text-blue-900 dark:text-blue-200">{trophy.instructions}</p>
                </div>
              )}

              {/* Collect button */}
              {isReady && !isDone && (
                <div className="px-5 pb-5 pt-3">
                  <Button
                    onClick={() => confirmCollection(trophy)}
                    disabled={confirming === trophy.docId}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
                  >
                    {confirming === trophy.docId
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirming…</>
                      : <><CheckCircle2 className="w-5 h-5 mr-2" />Confirm Collection</>
                    }
                  </Button>
                </div>
              )}

              {isDone && (
                <div className="px-5 pb-4 pt-2">
                  <p className="text-xs text-center text-indigo-500 font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />Collected — thank you!
                  </p>
                </div>
              )}

              {!isReady && !isDone && (
                <div className="px-5 pb-4 pt-2">
                  <p className="text-xs text-slate-400 text-center">We'll notify you when ready for collection</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact card */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact Us</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>Apex Trophy Solutions</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>Visit us to collect your trophies</span>
          </div>
        </div>
      </div>

    </div>
  );
}
