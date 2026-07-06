/**
 * HuntCreationWizard — Outfitter creates a hunt, links a client, lists trophies.
 * Result: client_hunts record + one hunt_documents job_card per trophy row.
 * Job cards start as 'pending_payment' until deposit is confirmed.
 *
 * Steps:
 *  1. Client — search existing or register new
 *  2. Hunt details — operator, dates, farm, process type
 *  3. Trophy list — species, mount type, quantity, tag, instructions
 *  4. Review & confirm
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { getPipeline, DEPT_LABELS } from '../../../../lib/pipeline';
import { toast } from 'sonner';
import {
  User, Calendar, Crosshair, CheckCircle2, ArrowLeft, ArrowRight,
  Search, Plus, Trash2, Loader2, ChevronRight, X, Send, Trophy,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const SPECIES_LIST = [
  'Baboon','Blesbok','Bontebok','Buffalo','Bushbuck','Bushpig','Caracal','Civet','Crocodile',
  'Duiker','Eland','Elephant','Fallow Deer','Gemsbok','Genet Cat','Giraffe','Grysbok',
  'Hartebeest','Hippo','Hyena','Impala','Jackal','Klipspringer','Kudu','Lechwe','Leopard',
  'Lion','Nguni','Nyala','Oribi','Ostrich','Reedbuck (Common)','Reedbuck (Mountain)',
  'Reedbuck (Vaal)','Sable','Serval','Springbok','Steenbok','Tsessebe','Warthog','Waterbuck',
  'Wild Cat','Wildebeest (Black)','Wildebeest (Blue)','Vervet Monkey','Zebra','Other',
];

const MOUNT_TYPES = [
  'Shoulder Mount','Offset Shoulder Mount','Pedestal Mount','Full Mount','Half Mount',
  'Euro Skull','Bleach Only','Artistic Skull','Rug Mount on Felt','Flat Skin',
  'Tan Only','Dip & Pack','Life Cast',
];

const PROCESS_TYPES = [
  { value: 'taxidermy',  label: 'Full Taxidermy — mounted in our workshop' },
  { value: 'dip_pack',   label: 'Dip & Pack — treated and shipped for overseas mounting' },
  { value: 'pre_tan',    label: 'Pre-tan only — tanned skin for overseas mounting' },
  { value: 'skulls',     label: 'Skulls & Euro mounts only' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientRow { id: string; full_name: string; client_number: string | null; email: string | null; country: string | null; outfitter_id: string | null; client_type: string | null }

interface TrophyRow {
  species:        string;
  mount_type:     string;
  quantity:       number;
  tag_number:     string;
  condition:      string;
  instructions:   string;
  price_usd:      string;
}

const EMPTY_TROPHY: TrophyRow = {
  species: '', mount_type: 'Shoulder Mount', quantity: 1,
  tag_number: '', condition: 'salted', instructions: '', price_usd: '',
};

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'client',   label: 'Client',   icon: User },
  { id: 'hunt',     label: 'Hunt',     icon: Calendar },
  { id: 'trophies', label: 'Trophies', icon: Crosshair },
  { id: 'review',   label: 'Confirm',  icon: CheckCircle2 },
];

// ── Main wizard ───────────────────────────────────────────────────────────────

export function HuntCreationWizard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step,     setStep]     = useState(0);
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState<{ huntId: string; trophyCount: number } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [invited,  setInvited]  = useState(false);

  // Step 1 state
  const [clientSearch, setClientSearch]   = useState('');
  const [clients,      setClients]        = useState<ClientRow[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);

  // Step 2 state
  const [huntForm, setHuntForm] = useState({
    year:         new Date().getFullYear().toString(),
    operator:     '',
    farm:         '',
    region:       '',
    start_date:   '',
    end_date:     '',
    process_type: 'taxidermy',
    client_type:  'export' as 'export' | 'local',
    notes:        '',
  });
  const [operatorMode, setOperatorMode]   = useState<'outfitter' | 'independent'>('outfitter');
  const [knownOperators, setKnownOperators] = useState<string[]>([]);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [showOperatorList, setShowOperatorList] = useState(false);

  // Step 3 state
  const [trophies, setTrophies] = useState<TrophyRow[]>([{ ...EMPTY_TROPHY }]);

  // Load known operators from past hunts
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('client_hunts')
        .select('operator')
        .not('operator', 'is', null)
        .neq('operator', 'Independent');
      const unique = [...new Set((data ?? []).map((r: any) => r.operator as string).filter(Boolean))].sort();
      setKnownOperators(unique);
    })();
  }, []);

  // Search clients
  useEffect(() => {
    if (clientSearch.length < 2) { setClients([]); return; }
    setLoadingClients(true);
    const t = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from('clients')
        .select('id, full_name, client_number, email, country, outfitter_id, client_type')
        .or(`full_name.ilike.%${clientSearch}%,client_number.ilike.%${clientSearch}%,email.ilike.%${clientSearch}%`)
        .limit(8);
      setClients(data ?? []);
      setLoadingClients(false);
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  // Trophy helpers
  function addTrophy()                { setTrophies(p => [...p, { ...EMPTY_TROPHY }]); }
  function removeTrophy(i: number)    { setTrophies(p => p.filter((_, j) => j !== i)); }
  function setTrophy(i: number, patch: Partial<TrophyRow>) {
    setTrophies(p => p.map((t, j) => j === i ? { ...t, ...patch } : t));
  }

  // Validate current step
  function canAdvance() {
    if (step === 0) return !!selectedClient;
    if (step === 1) return (operatorMode === 'independent' || !!huntForm.operator.trim()) && !!huntForm.year;
    if (step === 2) return trophies.length > 0 && trophies.every(t => t.species && t.mount_type);
    return true;
  }

  function next() { if (canAdvance()) setStep(s => s + 1); else toast.error('Fill in required fields first'); }
  function prev() { setStep(s => Math.max(s - 1, 0)); }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function submit() {
    if (!selectedClient) return;
    setSaving(true);
    try {
      // 1. Create client_hunts record
      const isExport = (selectedClient.client_type ?? huntForm.client_type) === 'export';
      const { data: hunt, error: huntErr } = await (supabase as any)
        .from('client_hunts')
        .insert({
          client_id:    selectedClient.id,
          year:         parseInt(huntForm.year),
          operator:     operatorMode === 'independent' ? 'Independent' : (huntForm.operator.trim() || null),
          client_type:  selectedClient.client_type ?? huntForm.client_type,
          process_type: huntForm.process_type,
          farm:         huntForm.farm.trim() || null,
          region:       huntForm.region.trim() || null,
          start_date:   huntForm.start_date || null,
          end_date:     huntForm.end_date || null,
          status:       'active',
          notes:        huntForm.notes.trim() || null,
          outfitter_id: selectedClient.outfitter_id ?? null,
        })
        .select()
        .single();
      if (huntErr) throw new Error(huntErr.message);

      // 2. Create hunt_documents job card for each trophy row
      // Export hunts pre-register as awaiting_arrival; local hunts go straight to pending_payment
      const jobCards = trophies.map(t => ({
        hunt_id:            hunt.id,
        doc_type:           'job_card',
        title:              `${t.species} — ${t.mount_type}`,
        status:             isExport ? 'awaiting_arrival' : 'pending_payment',
        current_department: 'receiving',
        process_type:       huntForm.process_type,
        form_data: {
          species:          t.species,
          mount_type:       t.mount_type,
          quantity:         t.quantity,
          tag_number:       t.tag_number,
          condition:        t.condition,
          instructions:     t.instructions,
          price_usd:        t.price_usd ? parseFloat(t.price_usd) : null,
          pipeline:         getPipeline(t.mount_type),
          stage_history:    [],
          created_at:       new Date().toISOString(),
        },
      }));

      const { error: docsErr } = await (supabase as any)
        .from('hunt_documents')
        .insert(jobCards);
      if (docsErr) throw new Error(docsErr.message);

      setDone({ huntId: hunt.id, trophyCount: trophies.length });
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Invite client to Hunter Portal ──────────────────────────────────────────

  async function sendPortalInvite() {
    if (!selectedClient?.email) return;
    setInviting(true);
    const { error } = await (supabase as any).auth.signInWithOtp({
      email: selectedClient.email,
      options: { shouldCreateUser: true },
    });
    setInviting(false);
    if (error) { toast.error('Invite failed: ' + error.message); return; }
    setInvited(true);
    toast.success(`Portal invite sent to ${selectedClient.email}`);
  }

  // ── Success screen ───────────────────────────────────────────────────────────

  if (done) {
    const hasEmail = !!selectedClient?.email;
    return (
      <div className="max-w-md mx-auto flex flex-col items-center text-center gap-6 py-10">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Hunt Created</h2>
          <p className="text-slate-500 text-sm mt-1">
            {done.trophyCount} job card{done.trophyCount !== 1 ? 's' : ''} created for{' '}
            <strong>{selectedClient?.full_name}</strong> — awaiting deposit confirmation.
          </p>
        </div>

        {/* Portal invite section */}
        <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2 justify-center">
            <Trophy className="w-4 h-4 text-[#0073ea]" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hunter Portal Access</p>
          </div>
          {invited ? (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <p className="text-sm">Invite sent to {selectedClient?.email}</p>
            </div>
          ) : hasEmail ? (
            <>
              <p className="text-xs text-slate-500">
                Send {selectedClient?.full_name} a magic link so they can log into the Hunter Portal and track their trophies in real time.
              </p>
              <Button
                onClick={sendPortalInvite}
                disabled={inviting}
                className="w-full bg-[#0073ea] hover:bg-[#0060c7] text-white gap-2"
              >
                {inviting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Send Portal Invite to {selectedClient?.email}</>
                }
              </Button>
            </>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              No email address on file — add one to the client record before sending a portal invite.
            </p>
          )}
        </div>

        <Button variant="outline" onClick={onDone} className="w-full">
          Done — back to hunts
        </Button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">New Hunt</h1>
          <p className="text-slate-500 text-sm">Link a client and create their trophy job cards</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const curr = i === step;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  done ? 'bg-green-500 text-white' :
                  curr ? 'bg-[#0073ea] text-white ring-4 ring-[#0073ea]/20' :
                         'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-medium ${curr ? 'text-[#0073ea]' : done ? 'text-green-600' : 'text-slate-400'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-4 rounded ${i < step ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">

        {/* ── Step 0: Client selection ── */}
        {step === 0 && (
          <>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0073ea]" /> Select Client
            </h2>

            {selectedClient ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-green-400 bg-green-50 dark:bg-green-950/20">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedClient.full_name}</p>
                  <div className="flex gap-2 text-xs text-slate-500 flex-wrap">
                    {selectedClient.client_number && <span className="font-mono">{selectedClient.client_number}</span>}
                    {selectedClient.email && <span>{selectedClient.email}</span>}
                    {selectedClient.country && <span>{selectedClient.country}</span>}
                  </div>
                </div>
                <button onClick={() => { setSelectedClient(null); setClientSearch(''); }}
                  className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Search by name, client number or email…"
                    className="pl-9"
                    autoFocus
                  />
                  {loadingClients && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
                </div>

                {clients.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {clients.map(c => (
                      <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-slate-500">{c.full_name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{c.full_name}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {[c.client_number, c.email, c.country].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {clientSearch.length >= 2 && clients.length === 0 && !loadingClients && (
                  <div className="text-center py-6 text-slate-400">
                    <p className="text-sm">No clients found for "{clientSearch}"</p>
                    <p className="text-xs mt-1">Register the client first via Clients → New Client</p>
                  </div>
                )}

                {clientSearch.length < 2 && (
                  <p className="text-xs text-slate-400 text-center py-4">Type at least 2 characters to search</p>
                )}
              </>
            )}
          </>
        )}

        {/* ── Step 1: Hunt details ── */}
        {step === 1 && (
          <>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0073ea]" /> Hunt Details
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Year *</Label>
                <Input value={huntForm.year} onChange={e => setHuntForm(p => ({ ...p, year: e.target.value }))} placeholder="2026" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Client Type</Label>
                <div className="flex gap-2">
                  {(['export','local'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setHuntForm(p => ({ ...p, client_type: t }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        huntForm.client_type === t ? 'bg-[#0073ea] text-white border-[#0073ea]' : 'border-slate-200 text-slate-600 hover:border-[#0073ea]'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Operator / PH selector */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Operator / Professional Hunter *</Label>
              <div className="flex gap-2">
                {(['outfitter', 'independent'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setOperatorMode(mode);
                      if (mode === 'independent') { setHuntForm(p => ({ ...p, operator: '' })); setOperatorSearch(''); }
                    }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      operatorMode === mode
                        ? 'bg-[#0073ea] text-white border-[#0073ea]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#0073ea]'
                    }`}
                  >
                    {mode === 'outfitter' ? 'Outfitter / PH' : 'Independent Hunter'}
                  </button>
                ))}
              </div>

              {operatorMode === 'outfitter' && (
                <div className="relative">
                  <Input
                    value={operatorSearch || huntForm.operator}
                    onChange={e => {
                      const v = e.target.value;
                      setOperatorSearch(v);
                      setHuntForm(p => ({ ...p, operator: v }));
                      setShowOperatorList(true);
                    }}
                    onFocus={() => setShowOperatorList(true)}
                    onBlur={() => setTimeout(() => setShowOperatorList(false), 150)}
                    placeholder="Type name or select from list…"
                    className="h-9"
                  />
                  {showOperatorList && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                      {knownOperators
                        .filter(op => !operatorSearch || op.toLowerCase().includes(operatorSearch.toLowerCase()))
                        .map(op => (
                          <button
                            key={op}
                            type="button"
                            onMouseDown={() => {
                              setHuntForm(p => ({ ...p, operator: op }));
                              setOperatorSearch('');
                              setShowOperatorList(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-[#0073ea]/10 hover:text-[#0073ea]"
                          >
                            {op}
                          </button>
                        ))}
                      {operatorSearch && !knownOperators.includes(operatorSearch) && (
                        <button
                          type="button"
                          onMouseDown={() => {
                            setHuntForm(p => ({ ...p, operator: operatorSearch }));
                            setShowOperatorList(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-[#0073ea] hover:bg-[#0073ea]/10 border-t border-slate-100 dark:border-slate-700"
                        >
                          + Add "{operatorSearch}" as new outfitter
                        </button>
                      )}
                      {knownOperators.length === 0 && !operatorSearch && (
                        <p className="px-3 py-2 text-xs text-slate-400">No previous outfitters — type to add one</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {operatorMode === 'independent' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500">Client hunted independently — no outfitter or PH involved</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Farm / Concession</Label>
                <Input value={huntForm.farm} onChange={e => setHuntForm(p => ({ ...p, farm: e.target.value }))} placeholder="Farm name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Region / Province</Label>
                <Input value={huntForm.region} onChange={e => setHuntForm(p => ({ ...p, region: e.target.value }))} placeholder="Limpopo" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Hunt Start</Label>
                <Input type="date" value={huntForm.start_date} onChange={e => setHuntForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Hunt End</Label>
                <Input type="date" value={huntForm.end_date} onChange={e => setHuntForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Processing Type</Label>
              <div className="space-y-2">
                {PROCESS_TYPES.map(pt => (
                  <button key={pt.value} onClick={() => setHuntForm(p => ({ ...p, process_type: pt.value }))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      huntForm.process_type === pt.value ? 'border-[#0073ea] bg-[#0073ea]/5' : 'border-slate-200 dark:border-slate-700 hover:border-[#0073ea]/50'
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      huntForm.process_type === pt.value ? 'border-[#0073ea]' : 'border-slate-300'
                    }`}>
                      {huntForm.process_type === pt.value && <div className="w-2 h-2 rounded-full bg-[#0073ea]" />}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{pt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Notes</Label>
              <Textarea value={huntForm.notes} onChange={e => setHuntForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Special requirements, delivery instructions…" className="h-16 resize-none" />
            </div>
          </>
        )}

        {/* ── Step 2: Trophies ── */}
        {step === 2 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#0073ea]" /> Trophy List
              </h2>
              <Button size="sm" onClick={addTrophy} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Trophy
              </Button>
            </div>

            <div className="space-y-4">
              {trophies.map((trophy, i) => (
                <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Trophy {i + 1}</span>
                    {trophies.length > 1 && (
                      <button onClick={() => removeTrophy(i)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Species *</Label>
                      <select value={trophy.species} onChange={e => setTrophy(i, { species: e.target.value })}
                        className="w-full h-9 text-sm rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]">
                        <option value="">Select species…</option>
                        {SPECIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Mount Type *</Label>
                      <select value={trophy.mount_type} onChange={e => setTrophy(i, { mount_type: e.target.value })}
                        className="w-full h-9 text-sm rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]">
                        {MOUNT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Qty</Label>
                      <Input type="number" min={1} max={99} value={trophy.quantity}
                        onChange={e => setTrophy(i, { quantity: parseInt(e.target.value) || 1 })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Tag / E-number</Label>
                      <Input value={trophy.tag_number} onChange={e => setTrophy(i, { tag_number: e.target.value })}
                        placeholder="E838" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Condition</Label>
                      <select value={trophy.condition} onChange={e => setTrophy(i, { condition: e.target.value })}
                        className="w-full h-8 text-sm rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]">
                        <option value="salted">Salted</option>
                        <option value="frozen">Frozen</option>
                        <option value="fresh">Fresh</option>
                        <option value="wet_salted">Wet Salted</option>
                        <option value="cape_only">Cape Only</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Client Instructions</Label>
                    <Input value={trophy.instructions} onChange={e => setTrophy(i, { instructions: e.target.value })}
                      placeholder="e.g. aggressive pose, open mouth, specific habitat…" className="h-8 text-sm" />
                  </div>

                  {/* Pipeline preview */}
                  {trophy.mount_type && (
                    <div className="flex gap-1 flex-wrap">
                      {getPipeline(trophy.mount_type).map((stage, si) => (
                        <span key={stage} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          si === 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {DEPT_LABELS[stage] ?? stage}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0073ea]" /> Review & Confirm
            </h2>

            {/* Client */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Client</p>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedClient?.full_name}</span>
                {selectedClient?.client_number && <Badge variant="secondary" className="text-xs">{selectedClient.client_number}</Badge>}
              </div>
            </div>

            {/* Hunt details */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Hunt</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-slate-500">Year</span><span className="text-slate-900 dark:text-slate-100">{huntForm.year}</span>
                <span className="text-slate-500">Operator / PH</span><span className="text-slate-900 dark:text-slate-100">{operatorMode === 'independent' ? 'Independent Hunter' : huntForm.operator}</span>
                {huntForm.farm && <><span className="text-slate-500">Farm</span><span className="text-slate-900 dark:text-slate-100">{huntForm.farm}</span></>}
                <span className="text-slate-500">Process</span><span className="text-slate-900 dark:text-slate-100 capitalize">{huntForm.process_type.replace(/_/g,' ')}</span>
                <span className="text-slate-500">Type</span><span className="text-slate-900 dark:text-slate-100 capitalize">{huntForm.client_type}</span>
              </div>
            </div>

            {/* Trophies */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{trophies.length} Trophy Job Card{trophies.length !== 1 ? 's' : ''}</p>
              <div className="space-y-2">
                {trophies.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{t.species}</span>
                      <span className="text-slate-400 text-sm ml-2">{t.mount_type}</span>
                      {t.quantity > 1 && <span className="text-xs text-slate-400 ml-1">×{t.quantity}</span>}
                    </div>
                    {t.tag_number && <span className="text-xs font-mono text-slate-400">{t.tag_number}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Job cards will be created with status <strong>Pending Payment</strong>. They will only enter the production pipeline once the deposit is confirmed.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={prev} className="flex-1 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        ) : (
          <Button variant="outline" onClick={onCancel} className="flex-1 gap-2">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button onClick={next} className="flex-1 bg-[#0073ea] hover:bg-[#0060c7] text-white gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> :
              <><CheckCircle2 className="w-4 h-4" />Create Hunt & Job Cards</>}
          </Button>
        )}
      </div>
    </div>
  );
}
