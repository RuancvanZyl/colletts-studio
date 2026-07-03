import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useHunterClient } from '../../../../lib/hooks/useHunterClient';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import {
  Sparkles, Plus, X, Send, Loader2, CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';

interface Trophy {
  docId: string;
  tagNumber: string;
  species: string;
  mountType: string;
}

interface Request {
  id: string;
  type: string;
  trophyIds: string[];
  description: string;
}

const REQUEST_TYPES = [
  { label: 'Combined Mount', description: 'Two or more animals mounted together on a single base or scene' },
  { label: 'Custom Pose / Action Scene', description: 'A specific body position, fight scene, or dynamic pose' },
  { label: 'Habitat / Scene Addition', description: 'Rocks, branches, water, grass, or other natural elements added' },
  { label: 'Dual Species Group', description: 'Two different species displayed together as a group piece' },
  { label: 'Family Group / Herd Display', description: 'Multiple animals of the same species shown as a family or herd' },
  { label: 'Artistic / Painted Skull', description: 'A skull cleaned and painted with artistic designs or patterns' },
  { label: 'Life-Size Scene / Diorama', description: 'A full environment scene — the animal in its natural habitat' },
  { label: 'Trophy Room Feature Piece', description: 'A large-scale centrepiece designed for a specific wall or space' },
  { label: 'I Have Reference Photos', description: 'I have images or inspiration I want to share with the taxidermist' },
  { label: 'Furniture from the Hide', description: 'A chair, stool, cushion, throw, or other furnishing from the skin' },
  { label: 'Leather Item from the Hide', description: 'Hat band, knife sheath, biltong bag, or other leather product' },
  { label: 'Something Completely Unique', description: 'My own creative idea — I\'ll describe it below' },
];

function emptyRequest(): Request {
  return { id: crypto.randomUUID(), type: REQUEST_TYPES[0].label, trophyIds: [], description: '' };
}

interface SavedRequest {
  id: string;
  type: string;
  species: string[];
  description: string;
  createdAt: string;
}

export function SpecialRequests() {
  const { client } = useHunterClient();
  const [trophies, setTrophies]     = useState<Trophy[]>([]);
  const [requests, setRequests]     = useState<Request[]>([emptyRequest()]);
  const [saved, setSaved]           = useState<SavedRequest[]>([]);
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [expandType, setExpandType] = useState<string | null>(null);

  async function load() {
    if (!client?.id) return;
    setLoading(true);

    const { data: hunts } = await (supabase as any)
      .from('client_hunts').select('id').eq('client_id', client.id);
    const huntIds = (hunts ?? []).map((h: any) => h.id);

    if (huntIds.length > 0) {
      const { data: docs } = await (supabase as any)
        .from('hunt_documents')
        .select('id, form_data, current_department')
        .in('hunt_id', huntIds)
        .eq('doc_type', 'job_card')
        .neq('status', 'pending_payment');

      setTrophies((docs ?? []).map((d: any) => ({
        docId:     d.id,
        tagNumber: d.form_data?.tag_number ?? '—',
        species:   d.form_data?.species    ?? '—',
        mountType: d.form_data?.mount_type ?? '—',
      })));

      const { data: custDocs } = await (supabase as any)
        .from('hunt_documents')
        .select('id, title, form_data, created_at')
        .in('hunt_id', huntIds)
        .eq('doc_type', 'customisation')
        .order('created_at', { ascending: false });

      setSaved((custDocs ?? []).map((d: any) => ({
        id:          d.id,
        type:        d.form_data?.customisation_type ?? d.title ?? '—',
        species:     d.form_data?.linked_species ?? [],
        description: d.form_data?.description ?? '',
        createdAt:   d.created_at,
      })));
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, [client?.id]);

  function addRequest() {
    setRequests(prev => [...prev, emptyRequest()]);
  }

  function updateRequest(id: string, patch: Partial<Request>) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function removeRequest(id: string) {
    setRequests(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }

  function toggleTrophy(reqId: string, docId: string) {
    setRequests(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      const has = r.trophyIds.includes(docId);
      return { ...r, trophyIds: has ? r.trophyIds.filter(t => t !== docId) : [...r.trophyIds, docId] };
    }));
  }

  async function submit() {
    if (!client?.id) return;
    const invalid = requests.find(r => !r.description.trim());
    if (invalid) { toast.error('Please describe each request'); return; }

    setSending(true);

    const { data: hunts } = await (supabase as any)
      .from('client_hunts').select('id').eq('client_id', client.id).order('created_at', { ascending: false }).limit(1);
    const huntId = hunts?.[0]?.id;

    const docs = requests.map(r => {
      const linked = trophies.filter(t => r.trophyIds.includes(t.docId));
      return {
        hunt_id:            huntId ?? null,
        doc_type:           'customisation',
        title:              r.type,
        status:             'in_progress',
        current_department: 'receiving',
        form_data: {
          customisation_type: r.type,
          description:        r.description.trim(),
          linked_job_cards:   r.trophyIds,
          linked_species:     linked.map(t => t.species),
          submitted_by:       'client',
          client_id:          client.id,
        },
      };
    });

    const { error } = await (supabase as any).from('hunt_documents').insert(docs);
    setSending(false);

    if (error) { toast.error('Could not submit — please try again'); return; }

    toast.success('Your requests have been sent to the workshop!');
    setRequests([emptyRequest()]);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Special Requests
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Want something unique? Tell us exactly what you have in mind — combined mounts, custom scenes, furniture from your hide, or anything creative. We'll make it happen.
        </p>
      </div>

      {/* Price TBC notice */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">💡</span>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pricing is confirmed after review</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
            All special requests are custom work — the price depends on the size, complexity, and materials involved. There is <strong>no fixed price</strong> for these items. Once you submit your request, a member of our team will review it and come back to you with a detailed quote before any work begins.
          </p>
        </div>
      </div>

      {/* Previously submitted */}
      {saved.length > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 rounded-2xl border border-green-200 dark:border-green-800 p-5 space-y-3">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Requests Already Submitted
          </p>
          {saved.map(s => (
            <div key={s.id} className="bg-white/70 dark:bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.type}</p>
                <p className="text-[10px] text-slate-400 shrink-0">{new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
              {s.species.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {s.species.map(sp => (
                    <Badge key={sp} variant="outline" className="text-xs">{sp}</Badge>
                  ))}
                </div>
              )}
              {s.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{s.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New requests */}
      <div className="space-y-4">
        {requests.map((req, idx) => {
          const typeInfo = REQUEST_TYPES.find(t => t.label === req.type);
          const isExpanded = expandType === req.id;

          return (
            <div key={req.id} className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Request {idx + 1}
                </span>
                {requests.length > 1 && (
                  <button onClick={() => removeRequest(req.id)} className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Type picker */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">What kind of request is this?</p>
                  <div className="space-y-1.5">
                    {REQUEST_TYPES.map(t => (
                      <button
                        key={t.label}
                        onClick={() => updateRequest(req.id, { type: t.label })}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                          req.type === t.label
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                            req.type === t.label ? 'border-amber-500 bg-amber-500' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {req.type === t.label && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${req.type === t.label ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              {t.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 leading-snug">{t.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Which trophies */}
                {trophies.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Which trophies does this involve? <span className="text-slate-400 font-normal">(optional)</span></p>
                    <div className="flex flex-wrap gap-1.5">
                      {trophies.map(t => {
                        const on = req.trophyIds.includes(t.docId);
                        return (
                          <button
                            key={t.docId}
                            onClick={() => toggleTrophy(req.id, t.docId)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              on
                                ? 'bg-amber-500 border-amber-500 text-white font-medium'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                            }`}
                          >
                            {t.tagNumber !== '—' ? `${t.tagNumber} · ` : ''}{t.species}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">
                    Describe exactly what you want *
                  </p>
                  <textarea
                    value={req.description}
                    onChange={e => updateRequest(req.id, { description: e.target.value })}
                    rows={4}
                    placeholder="Be as detailed as you like — poses, which animals, reference images you can share, dimensions, where it will be displayed, the feeling you want it to have…"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1e2b] px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Add another */}
        <button
          onClick={addRequest}
          className="w-full border-2 border-dashed border-amber-200 dark:border-amber-800/60 rounded-2xl py-5 flex items-center justify-center gap-2 text-amber-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add another request
        </button>
      </div>

      {/* Submit */}
      <div className="bg-gradient-to-br from-amber-50 to-lime-50 dark:from-amber-950/30 dark:to-lime-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          Once submitted, your request goes directly to the workshop. A member of our team will be in touch to discuss details and provide a quote.
        </p>
        <Button
          onClick={submit}
          disabled={sending}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
        >
          {sending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
            : <><Send className="w-4 h-4 mr-2" />Submit {requests.length > 1 ? `${requests.length} Requests` : 'Request'}</>
          }
        </Button>
      </div>
    </div>
  );
}
