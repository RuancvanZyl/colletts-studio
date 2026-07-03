import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { getNextDepartment } from '../../../../lib/pipeline';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, Sparkles, ChevronDown, ChevronUp,
  Camera, CheckCircle2, X, Clock,
} from 'lucide-react';

interface StageHistory {
  dept: string;
  completedAt: string;
  completedBy: string;
}

interface JobCard {
  docId: string;
  huntId: string;
  clientNumber: string;
  clientName: string;
  tagNumber: string;
  species: string;
  mountType: string;
  instructions: string;
  specialRequests: string[];
  department: string;
  stageHistory: StageHistory[];
}

export function WorkshopInstructions() {
  const { profile } = useAuth();
  const [cards, setCards]       = useState<JobCard[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  // Per-card photo staging: docId → File[]
  const [photos, setPhotos] = useState<Record<string, File[]>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);

    const { data: docs } = await (supabase as any)
      .from('hunt_documents')
      .select('id, hunt_id, form_data, current_department')
      .eq('doc_type', 'job_card')
      .eq('status', 'in_progress')
      .order('created_at', { ascending: true });

    const { data: custDocs } = await (supabase as any)
      .from('hunt_documents')
      .select('hunt_id, title, form_data')
      .eq('doc_type', 'customisation');

    if (!docs) { setLoading(false); return; }

    const huntIds = [...new Set(docs.map((d: any) => d.hunt_id))];
    if (huntIds.length === 0) { setCards([]); setLoading(false); return; }

    const { data: hunts } = await (supabase as any)
      .from('client_hunts').select('id, client_id').in('id', huntIds);
    const clientIds = [...new Set((hunts ?? []).map((h: any) => h.client_id))];
    const { data: clients } = await (supabase as any)
      .from('clients').select('id, full_name, client_number').in('id', clientIds);

    const huntToClient: Record<string, string> = {};
    for (const h of hunts ?? []) huntToClient[h.id] = h.client_id;
    const clientMap: Record<string, any> = {};
    for (const c of clients ?? []) clientMap[c.id] = c;

    const custByHunt: Record<string, string[]> = {};
    for (const c of custDocs ?? []) {
      if (!custByHunt[c.hunt_id]) custByHunt[c.hunt_id] = [];
      const desc = c.form_data?.description
        ? `${c.title}: ${c.form_data.description}`
        : c.title;
      custByHunt[c.hunt_id].push(desc);
    }

    const result: JobCard[] = docs.map((doc: any) => {
      const clientId = huntToClient[doc.hunt_id];
      const cl = clientMap[clientId] ?? {};
      const fd = doc.form_data ?? {};
      return {
        docId:           doc.id,
        huntId:          doc.hunt_id,
        clientNumber:    cl.client_number ?? '—',
        clientName:      cl.full_name     ?? '—',
        tagNumber:       fd.tag_number    ?? '',
        species:         fd.species       ?? '—',
        mountType:       fd.mount_type    ?? '—',
        instructions:    fd.instructions  ?? '',
        specialRequests: custByHunt[doc.hunt_id] ?? [],
        department:      doc.current_department ?? '',
        stageHistory:    fd.stage_history ?? [],
      };
    });

    setCards(result);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  function addPhotos(docId: string, files: FileList | null) {
    if (!files) return;
    setPhotos(prev => ({
      ...prev,
      [docId]: [...(prev[docId] ?? []), ...Array.from(files)],
    }));
  }

  function removePhoto(docId: string, idx: number) {
    setPhotos(prev => ({
      ...prev,
      [docId]: (prev[docId] ?? []).filter((_, i) => i !== idx),
    }));
  }

  async function markDone(card: JobCard) {
    if (completing) return;
    setCompleting(card.docId);

    const now = new Date().toISOString();
    const by  = profile?.full_name ?? 'Staff';

    // Upload any staged photos
    const cardPhotos = photos[card.docId] ?? [];
    const uploadedPaths: string[] = [];

    for (const file of cardPhotos) {
      const ext  = file.name.split('.').pop();
      const path = `completion/${card.docId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await (supabase as any).storage.from('client-photos').upload(path, file, { upsert: true });
      if (!error) uploadedPaths.push(path);
    }

    // Build history entry
    const historyEntry: StageHistory & { photoPaths: string[] } = {
      dept:        card.department,
      completedAt: now,
      completedBy: by,
      photoPaths:  uploadedPaths,
    } as any;

    const newHistory = [...card.stageHistory, historyEntry];
    const next = getNextDepartment(card.mountType, card.department);

    // Fetch current form_data to merge
    const { data: doc } = await (supabase as any)
      .from('hunt_documents').select('form_data').eq('id', card.docId).single();

    const { error } = await (supabase as any).from('hunt_documents').update({
      current_department:     next ?? 'done',
      status:                 next ? 'in_progress' : 'completed',
      completion_photo_paths: uploadedPaths,
      completed_by_name:      by,
      form_data: { ...(doc?.form_data ?? {}), stage_history: newHistory },
    }).eq('id', card.docId);

    if (error) {
      toast.error('Could not mark as done — try again');
      setCompleting(null);
      return;
    }

    // Write to trophy_stage_history for time tracking
    await (supabase as any).from('trophy_stage_history').insert({
      hunt_doc_id:       card.docId,
      department:        card.department,
      completed_by:      profile?.id ?? null,
      completed_by_name: by,
      photo_paths:       uploadedPaths,
      notes:             null,
    });

    toast.success(`${card.species} marked done${next ? ` — moving to ${next.replace(/_/g, ' ')}` : ' — job complete!'}`);

    // Clear staged photos and reload
    setPhotos(prev => { const n = { ...prev }; delete n[card.docId]; return n; });
    setExpanded(null);
    setCompleting(null);
    load();
  }

  // Time spent in current department
  function timeInDept(card: JobCard): string | null {
    if (!card.stageHistory.length) return null;
    const last = card.stageHistory[card.stageHistory.length - 1];
    if (!last?.completedAt) return null;
    const mins = Math.round((Date.now() - new Date(last.completedAt).getTime()) / 60000);
    if (mins < 60)  return `${mins}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h`;
    return `${Math.round(mins / 1440)}d`;
  }

  const hasDetail = (c: JobCard) => c.instructions || c.specialRequests.length > 0;

  return (
    <div className="space-y-3 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Job Cards</h1>
          <p className="text-slate-500 text-sm">{cards.length} active — tap to expand, tick when done</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-20 text-center">
          <p className="text-slate-500 font-medium">No active job cards</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {cards.map(card => {
            const isOpen    = expanded === card.docId;
            const hasInfo   = hasDetail(card);
            const timeSpent = timeInDept(card);
            const cardPhotos = photos[card.docId] ?? [];
            const isDoing   = completing === card.docId;

            return (
              <div key={card.docId}>

                {/* Summary row */}
                <button
                  onClick={() => toggle(card.docId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    isOpen ? 'bg-slate-50 dark:bg-slate-800/40' : ''
                  }`}
                >
                  {/* Client number */}
                  <span className="font-mono text-xs font-bold text-white bg-slate-700 dark:bg-slate-600 px-2 py-0.5 rounded flex-shrink-0">
                    {card.clientNumber}
                  </span>

                  {/* Species */}
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm flex-1 truncate">
                    {card.species}
                  </span>

                  {/* Mount type — desktop only */}
                  <span className="text-xs text-slate-400 hidden sm:block flex-shrink-0">{card.mountType}</span>

                  {/* Tag */}
                  {card.tagNumber && (
                    <span className="font-mono text-xs text-slate-400 flex-shrink-0">#{card.tagNumber}</span>
                  )}

                  {/* Time in dept */}
                  {timeSpent && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 flex-shrink-0">
                      <Clock className="w-3 h-3" />{timeSpent}
                    </span>
                  )}

                  {/* Indicators */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {card.specialRequests.length > 0 && (
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    {card.instructions && (
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                    )}
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </button>

                {/* Expanded detail + completion */}
                {isOpen && (
                  <div className="px-4 pb-5 pt-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-3">

                    <p className="text-xs text-slate-400">{card.clientName} · {card.mountType}</p>

                    {/* Instructions */}
                    {card.instructions ? (
                      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">Client Instructions</p>
                        <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">{card.instructions}</p>
                      </div>
                    ) : (
                      !card.specialRequests.length && (
                        <p className="text-xs text-slate-400 italic">No special instructions — standard mount</p>
                      )
                    )}

                    {/* Special requests */}
                    {card.specialRequests.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="w-3 h-3" />Special Request — Price TBC
                        </p>
                        {card.specialRequests.map((r, i) => (
                          <p key={i} className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{r}</p>
                        ))}
                      </div>
                    )}

                    {/* ── Completion section ── */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-3">

                      {/* Photo upload */}
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                          Upload completion photo <span className="font-normal text-slate-400">(optional)</span>
                        </p>

                        {/* Staged photos */}
                        {cardPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {cardPhotos.map((f, i) => (
                              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                <img
                                  src={URL.createObjectURL(f)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => removePhoto(card.docId, i)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center"
                                >
                                  <X className="w-2.5 h-2.5 text-white" />
                                </button>
                              </div>
                            ))}

                            {/* Add more */}
                            <button
                              onClick={() => fileRefs.current[card.docId]?.click()}
                              className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:border-slate-400 transition-colors flex-shrink-0"
                            >
                              <Camera className="w-5 h-5" />
                            </button>
                          </div>
                        )}

                        {cardPhotos.length === 0 && (
                          <button
                            onClick={() => fileRefs.current[card.docId]?.click()}
                            className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-4 flex flex-col items-center gap-1.5 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                          >
                            <Camera className="w-5 h-5" />
                            <span className="text-xs">Tap to add photo</span>
                          </button>
                        )}

                        <input
                          ref={el => { fileRefs.current[card.docId] = el; }}
                          type="file"
                          accept="image/*"
                          multiple
                          capture="environment"
                          className="hidden"
                          onChange={e => addPhotos(card.docId, e.target.files)}
                        />
                      </div>

                      {/* Mark done button */}
                      <Button
                        onClick={() => markDone(card)}
                        disabled={!!isDoing}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3 rounded-xl"
                      >
                        {isDoing ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                        ) : (
                          <><CheckCircle2 className="w-5 h-5 mr-2" />Mark Done</>
                        )}
                      </Button>

                      <p className="text-[10px] text-center text-slate-400">
                        Time &amp; date stamp will be recorded automatically
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
