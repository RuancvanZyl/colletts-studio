import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { getPipeline, DEPT_LABELS } from '../../../../lib/pipeline';
import {
  ClipboardList, CheckCircle2, Camera, User, AlertTriangle,
  Package, Clock, ChevronRight, XCircle, Loader2, RefreshCw,
  X, Upload,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingHunt {
  id: string;
  year: number;
  client_type: string;
  client_name: string;
  client_number: string | null;
  client_email: string | null;
  operator: string | null;
  checked_in_at: string;
}

type CheckStatus = 'pending' | 'ok' | 'issue';

interface TrophyLine {
  docId: string;
  species: string;
  mountType: string;
  quantity: number;
  tagNumber: string;
  expectedCondition: string;
  instructions: string;
  // receiving decision
  status: CheckStatus;
  conditionNotes: string;
  intakePhotos: File[];
  photoPreviews: string[];
}

// ── Hunt selection list ───────────────────────────────────────────────────────

export function ReceivingSheet({ onNavigate }: { onNavigate: (v: string) => void }) {
  const [hunts, setHunts]         = useState<PendingHunt[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [tab, setTab]             = useState<'pending' | 'received'>('pending');
  const [received, setReceived]   = useState<PendingHunt[]>([]);

  useEffect(() => { loadHunts(); }, [tab]);

  async function loadHunts() {
    setLoading(true);
    const column = tab === 'pending' ? 'checked_in_at' : 'received_at';
    const { data } = await (supabase as any)
      .from('v_recent_checkins')
      .select('*')
      .order('checked_in_at', { ascending: false })
      .limit(50)
      .catch(() => ({ data: null }));

    // fallback: query via hunt_documents to get only activated (in_progress) hunts
    if (!data) {
      // Get hunt_ids that have at least one in_progress job card at receiving
      const { data: activeDocs } = await (supabase as any)
        .from('hunt_documents')
        .select('hunt_id')
        .eq('doc_type', 'job_card')
        .eq('status', 'in_progress')
        .eq('current_department', 'receiving');

      const activeHuntIds = [...new Set((activeDocs ?? []).map((d: any) => d.hunt_id))];

      // Get hunt_ids that have passed receiving
      const { data: pastReceiving } = await (supabase as any)
        .from('hunt_documents')
        .select('hunt_id')
        .eq('doc_type', 'job_card')
        .eq('status', 'in_progress')
        .neq('current_department', 'receiving');

      const pastSet = new Set((pastReceiving ?? []).map((d: any) => d.hunt_id));

      if (activeHuntIds.length === 0 && tab === 'pending') {
        setHunts([]);
        setLoading(false);
        return;
      }

      const idsToFetch = tab === 'pending' ? activeHuntIds : [...pastSet];
      if (idsToFetch.length === 0) {
        if (tab === 'pending') setHunts([]);
        else setReceived([]);
        setLoading(false);
        return;
      }

      const { data: raw } = await (supabase as any)
        .from('client_hunts')
        .select(`
          id, year, client_type, operator, created_at,
          clients!inner(full_name, client_number, email)
        `)
        .in('id', idsToFetch)
        .order('created_at', { ascending: false })
        .limit(50);

      const mapped: PendingHunt[] = (raw ?? []).map((r: any) => ({
        id:             r.id,
        year:           r.year,
        client_type:    r.client_type ?? 'export',
        client_name:    r.clients?.full_name ?? 'Unknown',
        client_number:  r.clients?.client_number ?? null,
        client_email:   r.clients?.email ?? null,
        operator:       r.operator ?? null,
        checked_in_at:  r.created_at,
      }));

      if (tab === 'pending') setHunts(mapped);
      else setReceived(mapped);
    } else {
      if (tab === 'pending') setHunts(data);
      else setReceived(data);
    }
    setLoading(false);
  }

  if (activeId) {
    return <ReceivingChecklist huntId={activeId} onBack={() => { setActiveId(null); loadHunts(); }} />;
  }

  const list = tab === 'pending' ? hunts : received;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" /> Receiving
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Select a hunt to check in trophies</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadHunts}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {(['pending','received'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'
            }`}>
            {t === 'pending' ? 'Awaiting Receiving' : 'Already Received'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-8"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No hunts {tab === 'pending' ? 'waiting to be received' : 'received yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(hunt => (
            <button key={hunt.id} onClick={() => setActiveId(hunt.id)}
              className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 hover:shadow-sm transition-all flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{hunt.client_name}</span>
                  {hunt.client_number && <span className="text-xs text-slate-400 font-mono">{hunt.client_number}</span>}
                  <Badge variant="secondary" className="text-[10px]">{hunt.year}</Badge>
                  {hunt.client_type === 'local' && <Badge className="text-[10px] bg-green-100 text-green-700">Local</Badge>}
                </div>
                {hunt.operator && <p className="text-xs text-slate-400">{hunt.operator}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── The actual checklist ──────────────────────────────────────────────────────

function ReceivingChecklist({ huntId, onBack }: { huntId: string; onBack: () => void }) {
  const { profile } = useAuth();
  const [lines, setLines]       = useState<TrophyLine[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [huntInfo, setHuntInfo] = useState<{ client_name: string; client_number: string } | null>(null);
  const [huntPhotos, setHuntPhotos] = useState<File[]>([]);
  const [huntPhotoPreviews, setHuntPhotoPreviews] = useState<string[]>([]);
  const huntPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadDocs(); }, [huntId]);

  async function loadDocs() {
    setLoading(true);
    // Hunt + client info
    const { data: hunt } = await (supabase as any)
      .from('client_hunts')
      .select('clients!inner(full_name, client_number)')
      .eq('id', huntId)
      .single();
    if (hunt) setHuntInfo({ client_name: hunt.clients?.full_name, client_number: hunt.clients?.client_number });

    // Job cards for this hunt — only in_progress (deposit confirmed)
    const { data: docs } = await (supabase as any)
      .from('hunt_documents')
      .select('id, title, form_data, current_department')
      .eq('hunt_id', huntId)
      .eq('doc_type', 'job_card')
      .eq('status', 'in_progress');

    const mapped: TrophyLine[] = (docs ?? []).map((d: any) => {
      const fd = d.form_data ?? {};
      return {
        docId:             d.id,
        species:           fd.species ?? 'Unknown',
        mountType:         fd.mount_type ?? '',
        quantity:          fd.quantity ?? 1,
        tagNumber:         fd.tag_number ?? '',
        expectedCondition: fd.condition ?? 'unknown',
        instructions:      fd.instructions ?? '',
        status:            d.current_department !== 'receiving' ? 'ok' : 'pending',
        conditionNotes:    fd.condition_notes ?? '',
        intakePhotos:      [],
        photoPreviews:     [],
      };
    });

    setLines(mapped);
    setLoading(false);
  }

  function updateLine(idx: number, patch: Partial<TrophyLine>) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function addPhotos(idx: number, files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setLines(prev => prev.map((l, i) => i === idx ? {
      ...l,
      intakePhotos:  [...l.intakePhotos, ...newFiles],
      photoPreviews: [...l.photoPreviews, ...newPreviews],
    } : l));
  }

  function removePhoto(lineIdx: number, photoIdx: number) {
    setLines(prev => prev.map((l, i) => i === lineIdx ? {
      ...l,
      intakePhotos:  l.intakePhotos.filter((_, j) => j !== photoIdx),
      photoPreviews: l.photoPreviews.filter((_, j) => j !== photoIdx),
    } : l));
  }

  function addHuntPhotos(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files);
    setHuntPhotos(prev => [...prev, ...newFiles]);
    setHuntPhotoPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
  }

  async function saveReceiving() {
    const unconfirmed = lines.filter(l => l.status === 'pending');
    if (unconfirmed.length > 0) {
      toast.error(`${unconfirmed.length} trophies not yet checked — mark each as OK or Issue`);
      return;
    }

    setSaving(true);
    try {
      // Upload hunt-level arrival photos
      const huntPhotoPaths: string[] = [];
      for (const file of huntPhotos) {
        const ext  = file.name.split('.').pop();
        const path = `hunt-arrivals/${huntId}/${Date.now()}.${ext}`;
        const { error } = await (supabase as any).storage.from('client-photos').upload(path, file, { upsert: true });
        if (!error) huntPhotoPaths.push(path);
      }

      // Process each line
      for (const line of lines) {
        // Upload per-trophy photos
        const photoPaths: string[] = [];
        for (const file of line.intakePhotos) {
          const ext  = file.name.split('.').pop();
          const path = `trophy-intake/${huntId}/${line.docId}/${Date.now()}.${ext}`;
          const { error } = await (supabase as any).storage.from('client-photos').upload(path, file, { upsert: true });
          if (!error) photoPaths.push(path);
        }

        // Determine next department from pipeline
        const { data: doc } = await (supabase as any)
          .from('hunt_documents').select('form_data').eq('id', line.docId).single();
        const fd = doc?.form_data ?? {};
        const pipeline = getPipeline(line.mountType);
        const nextDept = pipeline[1] ?? 'skinning'; // first dept after receiving

        const historyEntry = {
          dept:        'receiving',
          completedBy: profile?.full_name ?? 'Staff',
          completedAt: new Date().toISOString(),
          photoPaths,
          notes:       line.conditionNotes,
        };

        await (supabase as any).from('hunt_documents').update({
          current_department: line.status === 'issue' ? 'receiving' : nextDept,
          status:             line.status === 'issue' ? 'flagged' : 'in_progress',
          form_data: {
            ...fd,
            condition_notes:     line.conditionNotes,
            intake_photo_paths:  photoPaths,
            arrival_photo_paths: huntPhotoPaths,
            received_at:         new Date().toISOString(),
            received_by:         profile?.full_name ?? '',
            stage_history:       [...(fd.stage_history ?? []), historyEntry],
          },
        }).eq('id', line.docId);

        // Stage history record
        await (supabase as any).from('trophy_stage_history').insert({
          hunt_doc_id:       line.docId,
          department:        'receiving',
          completed_by:      profile?.id ?? null,
          completed_by_name: profile?.full_name ?? null,
          photo_paths:       photoPaths,
          notes:             line.conditionNotes || null,
        });
      }

      toast.success('Receiving complete — trophies queued into pipeline');
      onBack();
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const okCount     = lines.filter(l => l.status === 'ok').length;
  const issueCount  = lines.filter(l => l.status === 'issue').length;
  const pendingCount = lines.filter(l => l.status === 'pending').length;

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-400 py-12"><Loader2 className="w-5 h-5 animate-spin" />Loading job cards…</div>;
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="text-slate-900 dark:text-slate-100">{huntInfo?.client_name}</h1>
          {huntInfo?.client_number && <p className="text-xs text-slate-400 font-mono">{huntInfo.client_number}</p>}
        </div>
        {/* Status counters */}
        <div className="flex gap-2">
          {pendingCount > 0 && <Badge className="bg-slate-200 text-slate-700">{pendingCount} pending</Badge>}
          {okCount > 0      && <Badge className="bg-green-100 text-green-700">{okCount} OK</Badge>}
          {issueCount > 0   && <Badge className="bg-red-100 text-red-700">{issueCount} issues</Badge>}
        </div>
      </div>

      {/* Hunt-level arrival photos */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Arrival photos (vehicle / delivery)</span>
        </div>
        <div className="flex gap-2 flex-wrap mb-2">
          {huntPhotoPreviews.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border" />
              <button onClick={() => {
                setHuntPhotos(p => p.filter((_, j) => j !== i));
                setHuntPhotoPreviews(p => p.filter((_, j) => j !== i));
              }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <button onClick={() => huntPhotoRef.current?.click()}
            className="w-16 h-16 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg flex flex-col items-center justify-center text-blue-400 hover:border-blue-500 transition-colors">
            <Camera className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Add</span>
          </button>
        </div>
        <input ref={huntPhotoRef} type="file" accept="image/*" multiple capture="environment"
          className="hidden" onChange={e => addHuntPhotos(e.target.files)} />
      </div>

      {lines.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No job cards found for this hunt.</p>
          <p className="text-xs mt-1">Use Arrival Check-In to add trophies first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <TrophyCheckCard
              key={line.docId}
              line={line}
              onStatus={s => updateLine(idx, { status: s })}
              onNotes={n => updateLine(idx, { conditionNotes: n })}
              onAddPhotos={files => addPhotos(idx, files)}
              onRemovePhoto={pi => removePhoto(idx, pi)}
            />
          ))}
        </div>
      )}

      {/* Footer action */}
      <div className="sticky bottom-4 pt-4">
        <Button
          onClick={saveReceiving}
          disabled={saving || pendingCount > 0}
          className={`w-full h-12 text-base font-bold gap-2 ${
            pendingCount > 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> :
            pendingCount > 0
              ? `Check all ${pendingCount} remaining trophies first`
              : <><CheckCircle2 className="w-4 h-4" />Complete Receiving & Queue Trophies</>}
        </Button>
      </div>
    </div>
  );
}

// ── Single trophy check card ──────────────────────────────────────────────────

function TrophyCheckCard({
  line, onStatus, onNotes, onAddPhotos, onRemovePhoto,
}: {
  line: TrophyLine;
  onStatus: (s: CheckStatus) => void;
  onNotes: (n: string) => void;
  onAddPhotos: (f: FileList | null) => void;
  onRemovePhoto: (i: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(line.status === 'pending');

  const borderColor =
    line.status === 'ok'    ? 'border-green-400 bg-green-50 dark:bg-green-950/20' :
    line.status === 'issue' ? 'border-red-400 bg-red-50 dark:bg-red-950/20' :
                              'border-slate-200 dark:border-slate-700';

  return (
    <div className={`rounded-xl border-2 transition-all overflow-hidden ${borderColor}`}>
      {/* Trophy header — always visible */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">{line.species}</span>
            <span className="text-sm text-slate-500">{line.mountType}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
            {line.tagNumber && <span className="font-mono">Tag: {line.tagNumber}</span>}
            {line.quantity > 1 && <span>Qty: {line.quantity}</span>}
            <span className="capitalize">Expected: {line.expectedCondition}</span>
          </div>
          {line.instructions && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-0.5">
              {line.instructions}
            </p>
          )}
        </div>

        {/* Big status buttons */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { onStatus('ok'); setExpanded(false); }}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all ${
              line.status === 'ok'
                ? 'bg-green-500 text-white shadow-lg scale-105'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}>
            <CheckCircle2 className="w-6 h-6" />
            OK
          </button>
          <button
            onClick={() => { onStatus('issue'); setExpanded(true); }}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all ${
              line.status === 'issue'
                ? 'bg-red-500 text-white shadow-lg scale-105'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}>
            <XCircle className="w-6 h-6" />
            Issue
          </button>
        </div>
      </div>

      {/* Expanded section — notes + photos */}
      {(expanded || line.status !== 'pending') && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
          {/* Notes */}
          <Textarea
            value={line.conditionNotes}
            onChange={e => onNotes(e.target.value)}
            placeholder={line.status === 'issue' ? 'Describe the issue (required)…' : 'Condition notes (optional)…'}
            className="text-sm h-14 resize-none"
          />

          {/* Photos */}
          <div className="flex gap-2 flex-wrap">
            {line.photoPreviews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="w-14 h-14 object-cover rounded-lg border" />
                <button onClick={() => onRemovePhoto(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()}
              className="w-14 h-14 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-400 transition-colors">
              <Camera className="w-4 h-4" />
              <span className="text-[10px] mt-0.5">Photo</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
              className="hidden" onChange={e => onAddPhotos(e.target.files)} />
          </div>
        </div>
      )}
    </div>
  );
}
