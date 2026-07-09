/**
 * HunterHuntCreationWizard — self-service flow for hunters to register
 * their hunt and trophies. Writes directly to client_hunts + hunt_documents.
 *
 * Steps: Hunt Details → Add Trophies → Review & Submit
 */

import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import {
  ChevronRight, ChevronLeft, Plus, Trash2, CheckCircle2,
  Loader2, MapPin, User, Calendar, Trophy, Crosshair, Package,
} from 'lucide-react';
import { createHunt, addTrophyToHunt, notifyAdminOfNewHunt, HuntDetails, TrophyEntry } from '../../../../lib/hooks/useHunterSelfService';

const SPECIES = [
  'Kudu', 'Impala', 'Springbok', 'Gemsbok', 'Eland', 'Sable Antelope',
  'Roan Antelope', 'Wildebeest', 'Blue Wildebeest', 'Zebra', 'Warthog',
  'Bushbuck', 'Nyala', 'Waterbuck', 'Tsessebe', 'Hartebeest', 'Blesbok',
  'Bontebok', 'Steenbok', 'Duiker', 'Klipspringer', 'Lion', 'Leopard',
  'Cheetah', 'Buffalo', 'Elephant', 'Hippo', 'Crocodile', 'Rhino',
  'Giraffe', 'Other',
];

const MOUNT_TYPES = [
  { id: 'Shoulder Mount',    icon: '🦌', desc: 'Head and shoulders' },
  { id: 'Full Body Mount',   icon: '🦁', desc: 'Complete lifelike pose' },
  { id: 'Pedestal Mount',    icon: '🏛️', desc: 'Full body on base' },
  { id: 'Euro Mount',        icon: '💀', desc: 'Cleaned skull' },
  { id: 'Flat Skin / Rug',   icon: '🧸', desc: 'Full hide rug' },
  { id: 'Tan Only',          icon: '🪵', desc: 'Tanned skin only' },
  { id: 'Half Mount',        icon: '🎯', desc: 'From chest up' },
  { id: 'Custom',            icon: '✨', desc: 'Your unique vision' },
];

const EXTRAS = [
  'Leather cushion insert',
  'Driftwood base',
  'Rock base',
  'Salt & Pepper skull',
  'Gold/Silver painted skull',
  'Plaque engraving',
  'Habitat base',
  'Open mouth',
  'Glass eyes upgrade',
];

type Step = 'hunt' | 'trophies' | 'review';

interface Props {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientType: 'local' | 'export';
  onComplete: () => void;
  onCancel?: () => void;
}

export function HunterHuntCreationWizard({ clientId, clientName, clientEmail, clientType, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<Step>('hunt');
  const [submitting, setSubmitting] = useState(false);

  const [hunt, setHunt] = useState<HuntDetails>({
    clientType,
    year: new Date().getFullYear(),
    operator: '',
    farm: '',
    country: '',
    notes: '',
  });

  const [trophies, setTrophies] = useState<TrophyEntry[]>([]);
  const [draftTrophy, setDraftTrophy] = useState<TrophyEntry>({
    species: '',
    mountType: '',
    quantity: 1,
    instructions: '',
    extras: [],
  });
  const [addingTrophy, setAddingTrophy] = useState(false);

  // ── Hunt details step ──────────────────────────────────────────────────────

  function huntValid() {
    return hunt.year > 2000 && hunt.year <= new Date().getFullYear() + 1;
  }

  // ── Trophy draft helpers ───────────────────────────────────────────────────

  function toggleExtra(extra: string) {
    setDraftTrophy(prev => ({
      ...prev,
      extras: prev.extras.includes(extra)
        ? prev.extras.filter(e => e !== extra)
        : [...prev.extras, extra],
    }));
  }

  function addDraftTrophy() {
    if (!draftTrophy.species || !draftTrophy.mountType) {
      toast.error('Select a species and mount type');
      return;
    }
    setTrophies(prev => [...prev, { ...draftTrophy }]);
    setDraftTrophy({ species: '', mountType: '', quantity: 1, instructions: '', extras: [] });
    setAddingTrophy(false);
    toast.success('Trophy added');
  }

  function removeTrophy(i: number) {
    setTrophies(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── Final submit ───────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (trophies.length === 0) {
      toast.error('Add at least one trophy before submitting');
      return;
    }
    setSubmitting(true);
    try {
      const { data: huntData, error: huntErr } = await createHunt(clientId, hunt);
      if (huntErr || !huntData) throw new Error(huntErr?.message ?? 'Failed to create hunt');

      for (const trophy of trophies) {
        const { error: tErr } = await addTrophyToHunt(huntData.id, trophy);
        if (tErr) throw new Error(tErr.message);
      }

      // Notify admin — fire and forget
      notifyAdminOfNewHunt(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          clientName,
          clientEmail,
          huntYear: hunt.year,
          operator: hunt.operator,
          trophyCount: trophies.length,
          clientType: hunt.clientType,
        },
      );

      toast.success('Hunt registered! Our team will be in touch shortly.');
      onComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 max-w-2xl mx-auto">

      {/* Back button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      )}

      {/* Progress bar */}
      <div className="flex gap-1 mb-8 mt-2">
        {(['hunt', 'trophies', 'review'] as Step[]).map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${
            step === s ? 'bg-[#0073ea]' :
            (['hunt', 'trophies', 'review'].indexOf(step) > i) ? 'bg-green-500' :
            'bg-slate-200 dark:bg-slate-700'
          }`} />
        ))}
      </div>

      {/* ── Step 1: Hunt Details ── */}
      {step === 'hunt' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Hunt Details</h2>
            <p className="text-sm text-slate-500 mt-1">Tell us about your hunt so we can set up your trophies correctly.</p>
          </div>

          {/* Local / Export */}
          <div>
            <Label className="mb-2 block">Hunt Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['local', 'export'] as const).map(t => (
                <button key={t} onClick={() => setHunt(h => ({ ...h, clientType: t }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    hunt.clientType === t
                      ? 'border-[#0073ea] bg-blue-50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}>
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 capitalize">{t}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {t === 'local' ? 'Trophies stay in South Africa' : 'Trophies shipped internationally'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Hunt Year *</Label>
              <Input id="year" type="number" min={2000} max={new Date().getFullYear() + 1}
                value={hunt.year}
                onChange={e => setHunt(h => ({ ...h, year: parseInt(e.target.value) || h.year }))}
                className="mt-1" />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="South Africa" value={hunt.country}
                onChange={e => setHunt(h => ({ ...h, country: e.target.value }))}
                className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="operator" className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Outfitter / PH Name
            </Label>
            <Input id="operator" placeholder="e.g. Steve Collett Safaris" value={hunt.operator}
              onChange={e => setHunt(h => ({ ...h, operator: e.target.value }))}
              className="mt-1" />
          </div>

          <div>
            <Label htmlFor="farm" className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Farm / Concession Name
            </Label>
            <Input id="farm" placeholder="e.g. Limpopo Game Reserve" value={hunt.farm}
              onChange={e => setHunt(h => ({ ...h, farm: e.target.value }))}
              className="mt-1" />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea id="notes" placeholder="Any special requirements or notes for our team…"
              value={hunt.notes} rows={3}
              onChange={e => setHunt(h => ({ ...h, notes: e.target.value }))}
              className="mt-1" />
          </div>

          <Button onClick={() => setStep('trophies')} disabled={!huntValid()}
            className="w-full gap-2">
            Next — Add Trophies <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Step 2: Trophies ── */}
      {step === 'trophies' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Trophies</h2>
            <p className="text-sm text-slate-500 mt-1">Add each animal you'd like processed. You can add multiple.</p>
          </div>

          {/* Existing trophies list */}
          {trophies.length > 0 && (
            <div className="space-y-2">
              {trophies.map((t, i) => (
                <div key={i} className="flex items-start gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                  <Crosshair className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{t.species}</p>
                    <p className="text-xs text-slate-500">{t.mountType}{t.quantity > 1 ? ` × ${t.quantity}` : ''}</p>
                    {t.extras.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.extras.map(e => (
                          <span key={e} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded px-1.5 py-0.5">{e}</span>
                        ))}
                      </div>
                    )}
                    {t.instructions && <p className="text-xs text-slate-400 mt-1 italic">{t.instructions}</p>}
                  </div>
                  <button onClick={() => removeTrophy(i)} className="text-slate-300 hover:text-red-400 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add trophy form */}
          {addingTrophy ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-[#0073ea]/30 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Add Trophy</h3>

              {/* Species */}
              <div>
                <Label>Species *</Label>
                <select value={draftTrophy.species}
                  onChange={e => setDraftTrophy(d => ({ ...d, species: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0073ea]">
                  <option value="">Select species…</option>
                  {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Mount type */}
              <div>
                <Label className="mb-2 block">Mount Type *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MOUNT_TYPES.map(m => (
                    <button key={m.id} onClick={() => setDraftTrophy(d => ({ ...d, mountType: m.id }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        draftTrophy.mountType === m.id
                          ? 'border-[#0073ea] bg-blue-50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}>
                      <span className="text-lg">{m.icon}</span>
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 mt-1">{m.id}</p>
                      <p className="text-[10px] text-slate-500">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <Label htmlFor="qty">Quantity</Label>
                <Input id="qty" type="number" min={1} max={20}
                  value={draftTrophy.quantity}
                  onChange={e => setDraftTrophy(d => ({ ...d, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="mt-1 w-24" />
              </div>

              {/* Extras */}
              <div>
                <Label className="mb-2 block">Extras / Add-ons</Label>
                <div className="flex flex-wrap gap-2">
                  {EXTRAS.map(ex => (
                    <button key={ex} onClick={() => toggleExtra(ex)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        draftTrophy.extras.includes(ex)
                          ? 'border-[#0073ea] bg-blue-50 dark:bg-blue-950/30 text-[#0073ea]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <Label htmlFor="instr">Special Instructions</Label>
                <Textarea id="instr" placeholder="Any specific pose, expression, or finish you'd like…"
                  value={draftTrophy.instructions} rows={2}
                  onChange={e => setDraftTrophy(d => ({ ...d, instructions: e.target.value }))}
                  className="mt-1" />
              </div>

              <div className="flex gap-2">
                <Button onClick={addDraftTrophy} className="flex-1 gap-2">
                  <Plus className="w-4 h-4" /> Add This Trophy
                </Button>
                <Button variant="outline" onClick={() => setAddingTrophy(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingTrophy(true)}
              className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-[#0073ea] hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all">
              <Plus className="w-6 h-6 text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Add a Trophy</span>
            </button>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('hunt')} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={() => setStep('review')} disabled={trophies.length === 0} className="flex-1 gap-2">
              Review ({trophies.length} {trophies.length === 1 ? 'trophy' : 'trophies'}) <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ── */}
      {step === 'review' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Review & Submit</h2>
            <p className="text-sm text-slate-500 mt-1">Check your details then submit. Our team will contact you to confirm and arrange collection.</p>
          </div>

          {/* Hunt summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Hunt Details
            </h3>
            <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between"><span>Year</span><span className="font-medium text-slate-900 dark:text-slate-100">{hunt.year}</span></div>
              <div className="flex justify-between"><span>Type</span><Badge className={`text-xs ${hunt.clientType === 'export' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'} border-0`}>{hunt.clientType}</Badge></div>
              {hunt.operator && <div className="flex justify-between"><span>Outfitter / PH</span><span className="font-medium text-slate-900 dark:text-slate-100">{hunt.operator}</span></div>}
              {hunt.farm && <div className="flex justify-between"><span>Farm</span><span className="font-medium text-slate-900 dark:text-slate-100">{hunt.farm}</span></div>}
              {hunt.country && <div className="flex justify-between"><span>Country</span><span className="font-medium text-slate-900 dark:text-slate-100">{hunt.country}</span></div>}
            </div>
          </div>

          {/* Trophies summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4" /> {trophies.length} {trophies.length === 1 ? 'Trophy' : 'Trophies'}
            </h3>
            {trophies.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-2 first:border-0 first:pt-0">
                <Package className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{t.species} — {t.mountType}{t.quantity > 1 ? ` ×${t.quantity}` : ''}</p>
                  {t.extras.length > 0 && <p className="text-xs text-slate-500">{t.extras.join(', ')}</p>}
                  {t.instructions && <p className="text-xs text-slate-400 italic">{t.instructions}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
            After submission our team will review your hunt, contact you to arrange trophy collection, and send a deposit invoice before processing begins.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('trophies')} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 gap-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                : <><CheckCircle2 className="w-4 h-4" /> Submit Hunt Registration</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
