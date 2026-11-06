import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { getPipeline, DEPT_LABELS } from '../../../../lib/pipeline';
import { PrintButton } from '../shared/PrintButton';
import { savePhotos, shrinkPhoto } from '../../../../lib/offline/photos';
import { printReceivingSheet } from '../../../../lib/print';
import { ReceivedFields, emptyReceived, receivedOk, receivedMissing, type ReceivedValue } from '../shared/ReceivedFields';
import { PART_LABEL, listParts, partRecords } from '../../../../lib/received';
import { conditionSummary } from '../../../../lib/condition';
import { useDraft } from '../../../../lib/draft';
import { tellAboutArrival } from '../../../../lib/push';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { PART_LABEL as PL } from '../../../../lib/received';
import { ReceivingGrid } from './ReceivingGrid';
import { SpeciesField } from '../shared/AnimalPicker';
import { crossCheck } from '../shared/ReceivedFields';
import {
  ClipboardList, CheckCircle2, Camera, User, AlertTriangle,
  Package, Clock, ChevronRight, XCircle, Loader2, RefreshCw,
  X, Upload, Plus,
} from 'lucide-react';
import { useBack } from '../../../../lib/back';

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
  arrivedAt?: string | null;   // when the tag was seen or someone pressed "Trophies have arrived"
  missing?: boolean;           // parts did not arrive: the outfitter was told, it stays red until they are received
}

type CheckStatus = 'pending' | 'ok' | 'issue' | 'later';   // later = part of it is here, the rest follows

interface TrophyLine {
  docId: string;
  species: string;
  mountType: string;
  quantity: number;
  tagNumber: string;
  expectedCondition: string;
  instructions: string;
  preRegistered: boolean; // true = awaiting_arrival (outfitter pre-entered)
  // receiving decision
  status: CheckStatus;
  conditionNotes: string;
  intakePhotos: File[];
  photoPreviews: string[];
  // what physically came in, part by part, and its condition
  rec: ReceivedValue;
  expectedParts: string[];   // what the hunter or outfitter said would come
  moved?: boolean;           // already past Receiving (received earlier): no missing-parts alerts
  isNew?: boolean;           // arrived but not on the client's list: a job card is made for it when the receiving is saved
}

// ── Hunt selection list ───────────────────────────────────────────────────────

export function ReceivingSheet({ onNavigate }: { onNavigate: (v: string) => void }) {
  const [hunts, setHunts]         = useState<PendingHunt[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeId, setActiveId]   = useState<string | null>(null);
  useBack(!!activeId, () => setActiveId(null));
  const [tab, setTab]             = useState<'pending' | 'received'>('pending');
  const [received, setReceived]   = useState<PendingHunt[]>([]);
  const [search, setSearch]       = useState('');

  useEffect(() => { loadHunts(); }, [tab]);

  async function loadHunts() {
    setLoading(true);
    try {
      // One joined query: job cards in/after Receiving with their hunt + client attached.
      // Paged (1000/page), no id lists in the URL, and always clears the spinner.
      const rows: any[] = [];
      for (let from = 0; from < 5000; from += 1000) {
        let q = (supabase as any)
          .from('hunt_documents')
          .select('hunt_id, arrived_at, client_hunts(id, year, client_type, operator, created_at, status, clients(full_name, client_number, email))')
          .eq('doc_type', 'job_card');
        q = tab === 'pending'
          ? q.in('status', ['awaiting_arrival', 'in_progress']).eq('current_department', 'receiving')
          : q.eq('status', 'in_progress').neq('current_department', 'receiving');
        const { data, error } = await q.order('hunt_id', { ascending: true }).range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }

      const arrivedBy: Record<string, string> = {};
      for (const r of rows) if (r.arrived_at && (!arrivedBy[r.hunt_id] || r.arrived_at < arrivedBy[r.hunt_id])) arrivedBy[r.hunt_id] = r.arrived_at;
      const { data: openFu } = await (supabase as any).from('part_followups').select('hunt_id').is('resolved_at', null);
      const missingHunts = new Set<string>((openFu ?? []).map((x: any) => x.hunt_id));
      const seen = new Set<string>();
      const mapped: PendingHunt[] = [];
      for (const r of rows) {
        const h = r.client_hunts;
        if (!h || seen.has(h.id) || h.status === 'cancelled') continue;
        seen.add(h.id);
        mapped.push({
          id:            h.id,
          year:          h.year,
          client_type:   h.client_type ?? 'export',
          client_name:   h.clients?.full_name ?? 'Unknown',
          client_number: h.clients?.client_number ?? null,
          client_email:  h.clients?.email ?? null,
          operator:      h.operator ?? null,
          checked_in_at: h.created_at,
          arrivedAt:     arrivedBy[h.id] ?? null,
          missing:       missingHunts.has(h.id),
        });
      }
      // trophies that have arrived and wait for their condition report come first
      mapped.sort((a, b) => (b.missing ? 1 : 0) - (a.missing ? 1 : 0) || (a.arrivedAt ? 0 : 1) - (b.arrivedAt ? 0 : 1) || a.client_name.localeCompare(b.client_name));

      if (tab === 'pending') setHunts(mapped);
      else setReceived(mapped);
    } catch (err: any) {
      toast.error('Could not load receiving list: ' + (err?.message ?? 'unknown error'));
    } finally {
      setLoading(false);
    }
  }

  if (activeId) {
    return <ReceivingChecklist huntId={activeId} onBack={() => { setActiveId(null); loadHunts(); }} />;
  }

  const list = (tab === 'pending' ? hunts : received)
    .filter(h => !search || h.client_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" /> Receiving
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Select a hunt to check in trophies</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadHunts} title="Refresh" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></Button>
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

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search client…"
        className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
      />

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
                  {hunt.missing && <Badge className="text-[10px] bg-red-600 text-white border-0">Parts missing</Badge>}
                </div>
                {hunt.operator && <p className="text-xs text-slate-400">{hunt.operator}</p>}
                {hunt.arrivedAt && tab === 'pending' && <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5 mt-0.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />Arrived {new Date(hunt.arrivedAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Condition report needed</p>}
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
  const [huntInfo, setHuntInfo] = useState<{ client_id: string; client_name: string; client_number: string; ref: string; year: number | null; operator: string | null } | null>(null);
  const [huntPhotos, setHuntPhotos] = useState<File[]>([]);
  const [huntPhotoPreviews, setHuntPhotoPreviews] = useState<string[]>([]);
  const huntPhotoRef = useRef<HTMLInputElement>(null);
  // what has been ticked and typed is kept on this device until the receiving is saved (photos have to be taken again)
  const [edits, setEdits, dEdits] = useDraft<Record<string, { status: CheckStatus; conditionNotes: string; rec: ReceivedValue }>>(`receiving:${huntId}`, {});

  // like the top and bottom of the paper sheet
  const [delivery, setDelivery, dDelivery] = useDraft<{ deliveredBy: string; brought: '' | 'collected' | 'delivered'; mileage: string; note: string }>(`receiving:${huntId}:delivery`, { deliveredBy: '', brought: '', mileage: '', note: '' });
  // animals that came but are not on the client's list
  const [extras, setExtras, dExtras] = useDraft<{ docId: string; species: string }[]>(`receiving:${huntId}:extras`, []);
  const [view, setView] = useDraft<'sheet' | 'cards'>('receiving:view', 'sheet', 30 * 24 * 3600 * 1000);
  const [arrival, setArrival] = useState<{ at: string; via: string } | null>(null);
  const [followups, setFollowups] = useState<{ id: string; doc_id: string; parts: string[]; opened_at: string; plan_date: string | null; plan_note: string | null; reminder_count: number }[]>([]);
  const [missingAsk, setMissingAsk] = useState<{ docId: string; species: string; missing: string[] }[] | null>(null);
  const [neverSent, setNeverSent] = useState<Set<string>>(new Set());
  const [addingExtra, setAddingExtra] = useState(false);
  const [extraSpecies, setExtraSpecies] = useState('');

  useEffect(() => { loadDocs(); }, [huntId]);

  async function loadDocs() {
    setLoading(true);
    // Hunt + client info
    const { data: hunt } = await (supabase as any)
      .from('client_hunts')
      .select('client_id, ref_number, year, operator, clients!inner(full_name, client_number)')
      .eq('id', huntId)
      .single();
    if (hunt) setHuntInfo({ client_id: hunt.client_id, client_name: hunt.clients?.full_name, client_number: hunt.clients?.client_number, ref: hunt.ref_number ?? '', year: hunt.year ?? null, operator: hunt.operator ?? null });

    // Job cards: awaiting_arrival (pre-registered export) + in_progress at receiving
    const { data: docs } = await (supabase as any)
      .from('hunt_documents')
      .select('id, title, form_data, current_department, status, arrived_at, arrived_via')
      .eq('hunt_id', huntId)
      .eq('doc_type', 'job_card')
      .in('status', ['awaiting_arrival', 'in_progress']);

    const mapped: TrophyLine[] = (docs ?? []).map((d: any) => {
      const fd = d.form_data ?? {};
      const cr = fd.condition_report ?? {};
      const state = cr.state ?? fd.condition ?? '';
      const rec: ReceivedValue = {
        parts: (fd.received_parts ?? []).map((p: any) => p.code),
        other: fd.received_other ?? '',
        condition: state === 'fresh' || state === 'salted' ? state : '',
        salt: cr.salt ?? '', skull: cr.skull ?? '', issues: cr.issues ?? [],
      };
      const saved = edits[d.id];
      return {
        preRegistered: d.status === 'awaiting_arrival',
        docId:             d.id,
        species:           fd.species ?? 'Unknown',
        mountType:         fd.mount_type ?? '',
        quantity:          fd.quantity ?? 1,
        tagNumber:         fd.tag_number ?? '',
        expectedCondition: fd.condition ?? 'unknown',
        instructions:      fd.instructions ?? '',
        status:            saved?.status ?? (d.current_department !== 'receiving' ? 'ok' : 'pending'),
        conditionNotes:    saved?.conditionNotes ?? fd.condition_notes ?? '',
        intakePhotos:      [],
        photoPreviews:     [],
        rec:               saved?.rec ?? rec,
        expectedParts:     (fd.parts ?? []).map((p: any) => p.code).filter(Boolean),
        moved:             d.current_department !== 'receiving',
      };
    });

    const { data: fus } = await (supabase as any).from('part_followups').select('id, doc_id, parts, opened_at, plan_date, plan_note, reminder_count').eq('hunt_id', huntId).is('resolved_at', null);
    setFollowups(fus ?? []);
    const arrivedDocs = (docs ?? []).filter((d: any) => d.arrived_at).sort((a: any, b: any) => (a.arrived_at < b.arrived_at ? -1 : 1));
    setArrival(arrivedDocs.length ? { at: arrivedDocs[0].arrived_at, via: arrivedDocs[0].arrived_via ?? 'manual' } : null);
    const added: TrophyLine[] = extras.map(x => ({
      docId: x.docId, species: x.species, mountType: '', quantity: 1, tagNumber: '', expectedCondition: 'unknown', instructions: '', preRegistered: false,
      status: edits[x.docId]?.status ?? 'pending', conditionNotes: edits[x.docId]?.conditionNotes ?? '', intakePhotos: [], photoPreviews: [],
      rec: edits[x.docId]?.rec ?? emptyReceived(), expectedParts: [], isNew: true,
    }));
    setLines([...mapped, ...added]);
    setLoading(false);
  }

  function updateLine(idx: number, patch: Partial<TrophyLine>) {
    const l = lines[idx];
    if (l && ('status' in patch || 'conditionNotes' in patch || 'rec' in patch)) {
      const next = { status: patch.status ?? l.status, conditionNotes: patch.conditionNotes ?? l.conditionNotes, rec: patch.rec ?? l.rec };
      setEdits(e => ({ ...e, [l.docId]: next }));
    }
    setLines(prev => prev.map((x, i) => i === idx ? { ...x, ...patch } : x));
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
      toast.error(`${unconfirmed.length} animal${unconfirmed.length > 1 ? 's' : ''} not checked yet. Mark each one OK, Issue or To follow.`);
      return;
    }

    // something is missing but the animal is marked OK: ask what it is before saving
    const okButMissing = lines.filter(l => l.status === 'ok' && missingFor(l).length > 0 && !neverSent.has(l.docId));
    if (okButMissing.length > 0 && !missingAsk) {
      setMissingAsk(okButMissing.map(l => ({ docId: l.docId, species: l.species, missing: missingFor(l) })));
      return;
    }

    const noReason = lines.filter(l => l.status === 'issue' && !l.conditionNotes.trim() && l.rec.issues.length === 0 && l.rec.skull !== 'bad');
    if (noReason.length > 0) {
      toast.error(`Say what the issue is for ${noReason.map(l => l.species).join(', ')} (write it in the notes, or tick what you see).`);
      return;
    }

    setSaving(true);
    try {
      // Arrival photos of the delivery — saved on the device first, uploaded when there is a connection
      const huntPhotoPaths: string[] = [];
      if (huntPhotos.length && huntInfo?.client_id) {
        const r = await savePhotos({ clientId: huntInfo.client_id, huntId, kind: 'arrival', shared: true, staffId: profile?.id ?? null, staffName: profile?.full_name ?? null,
          files: await Promise.all(huntPhotos.map(f => shrinkPhoto(f))) });
        if (r.error) throw new Error(r.error);
      }

      // Process each line
      let waitingCount = 0; let laterCount = 0; let madeNew = false; let followedUp = 0;
      for (const line0 of lines) {
        let line = line0;
        if (line0.isNew) {
          // arrived but not on the client's list: make its job card now
          const { data: made, error: mkErr } = await (supabase as any).from('hunt_documents').insert({
            hunt_id: huntId, doc_type: 'job_card', status: 'in_progress', current_department: 'receiving',
            title: `${line0.species} - Pending Instructions`,
            form_data: { species: line0.species, mount_type: 'Pending Instructions', quantity: 1, instructions: '' },
          }).select('id').single();
          if (mkErr) throw new Error(mkErr.message);
          line = { ...line0, docId: made.id, mountType: 'Pending Instructions' };
          madeNew = true;
        }
        // Per-trophy arrival photos — shown to the client in their tracking view
        const photoPaths: string[] = [];
        if (line.intakePhotos.length && huntInfo?.client_id) {
          const r = await savePhotos({ clientId: huntInfo.client_id, huntId, docId: line.docId, kind: 'arrival', shared: true,
            staffId: profile?.id ?? null, staffName: profile?.full_name ?? null,
            files: await Promise.all(line.intakePhotos.map(f => shrinkPhoto(f))) });
          if (r.error) throw new Error(r.error);
        }

        // Determine next department from pipeline
        const { data: doc } = await (supabase as any)
          .from('hunt_documents').select('form_data').eq('id', line.docId).single();
        const fd = doc?.form_data ?? {};
        const receivedAt = new Date().toISOString();
        const num = huntInfo?.client_number ?? 'NEW';
        const lineNo = lines.indexOf(line) + 1;
        const keep: any[] = Array.isArray(fd.parts) ? fd.parts : [];
        const known = new Set(keep.map(p => p.code));
        // what physically came in, part by part (parts that already have a tag keep it; new ones get one)
        const received = {
          received_parts: line.rec.parts.map(code => ({ code, label: PART_LABEL[code] ?? code })),
          received_other: line.rec.other.trim(),
          condition: line.rec.condition,
          condition_report: {
            state: line.rec.condition, ...(line.rec.condition === 'salted' && line.rec.salt ? { salt: line.rec.salt } : {}),
            issues: line.rec.issues, ...(line.rec.skull ? { skull: line.rec.skull } : {}), notes: line.conditionNotes.trim(),
            recorded_by: profile?.full_name ?? '', recorded_at: receivedAt,
          },
          missing_parts: missingFor(line),
          parts: [...keep.filter(p => line.rec.parts.includes(p.code)), ...partRecords(num, line.species, lineNo, line.rec.parts.filter(c => !known.has(c)))],
        };

        // parts that did not arrive: open the follow-up (the outfitter is told, gives a plan and is reminded until they arrive)
        const miss = missingFor(line);
        if ((line.status === 'later' || line.status === 'issue') && miss.length > 0) {
          const { error: fuErr } = await (supabase as any).rpc('staff_open_part_followup', { p_doc: line.docId, p_parts: miss });
          if (fuErr) toast.warning(`The outfitter could not be told about the missing ${line.species} parts automatically. Please tell them yourself. (${fuErr.message})`, { duration: 12000 });
          else followedUp++;
        } else if (line.status === 'ok' && miss.length > 0 && neverSent.has(line.docId)) {
          await (supabase as any).rpc('staff_close_part_followup', { p_doc: line.docId, p_reason: 'never_sent' }).then(() => undefined, () => undefined);
        }

        // Part of it is here and the rest follows: write down what came, keep the card in Receiving
        if (line.status === 'later') {
          await (supabase as any).from('hunt_documents').update({
            status: 'in_progress',
            form_data: { ...fd, ...received, condition_notes: line.conditionNotes, to_follow: true },
          }).eq('id', line.docId);
          laterCount++;
          continue;
        }

        // No mount chosen yet → just record the condition; the animal stays in Receiving until the hunter decides
        if (/^pending instructions$/i.test(line.mountType.trim()) || !line.mountType) {
          await (supabase as any).from('hunt_documents').update({
            status: line.status === 'issue' ? 'flagged' : 'in_progress',
            form_data: { ...fd, ...received, condition_notes: line.conditionNotes, to_follow: false },
          }).eq('id', line.docId);
          waitingCount++;
          continue;
        }
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
            ...received,
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

      if (madeNew) await (supabase as any).rpc('start_awaiting_instruction', { p_hunt_id: huntId });
      // the delivery details (who brought it, collected or delivered, mileage, note); skipped quietly until migration 069 is run
      await (supabase as any).from('hunt_receivings').insert({
        hunt_id: huntId, received_by: profile?.id ?? null, received_by_name: profile?.full_name ?? null,
        delivered_by_name: delivery.deliveredBy.trim() || null, brought_by: delivery.brought || null,
        mileage_km: delivery.mileage ? Number(delivery.mileage) : null, note: delivery.note.trim() || null, animals_count: lines.length,
      }).then(() => undefined, () => undefined);
      dEdits.clear(); dDelivery.clear(); dExtras.clear();
      if (followedUp) toast.info(`The outfitter has been told about the missing parts and will be reminded until they arrive. It stays red on your Needs you list until then.`, { duration: 10000 });
      if (laterCount) toast.info(`${laterCount} animal${laterCount > 1 ? 's are' : ' is'} only partly here. They stay on the receiving list until the rest arrives.`, { duration: 9000 });
      toast.success(waitingCount ? `Receiving saved — ${waitingCount} animal${waitingCount > 1 ? 's are' : ' is'} waiting for the hunter to choose a mount` : 'Receiving complete — trophies queued into pipeline');
      onBack();
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // the trophies are here: tell the receiving team and the admins (the same alert a tag will raise)
  async function markArrived() {
    const { error } = await (supabase as any).rpc('mark_arrived', { p_hunt: huntId, p_doc: null, p_via: 'manual' });
    if (error) { toast.error(error.message); return; }
    setArrival({ at: new Date().toISOString(), via: 'manual' });
    void tellAboutArrival(huntId);
    toast.success('The receiving team and the admins have been told that the trophies arrived.');
  }
  async function remindNow(id: string) {
    const { error } = await (supabase as any).rpc('staff_remind_part_followup', { p_followup: id });
    if (error) toast.error(error.message); else { toast.success('The outfitter has been reminded.'); loadDocs(); }
  }
  const [saveSoon, setSaveSoon] = useState(false);
  useEffect(() => { if (saveSoon) { setSaveSoon(false); saveReceiving(); } }, [saveSoon]);
  function answerMissing(choice: 'later' | 'issue' | 'never' | 'back') {
    const ask = missingAsk ?? [];
    setMissingAsk(null);
    if (choice === 'back') return;
    if (choice === 'never') setNeverSent(prev => new Set([...prev, ...ask.map(a => a.docId)]));
    else for (const a of ask) { const i = lines.findIndex(l => l.docId === a.docId); if (i >= 0) updateLine(i, { status: choice }); }
    setSaveSoon(true);
  }

  // parts the client listed that were not ticked, for animals that have been looked at
  const missingFor = (l: TrophyLine) => (l.isNew || l.moved ? [] : l.expectedParts.filter(c => c !== 'OTHER' && !l.rec.parts.includes(c)));
  const lookedAt = (l: TrophyLine) => l.status !== 'pending' || l.rec.parts.length > 0;
  const missingRows = lines.filter(l => lookedAt(l) && missingFor(l).length > 0 && !neverSent.has(l.docId));
  const okCount     = lines.filter(l => l.status === 'ok').length;
  const issueCount  = lines.filter(l => l.status === 'issue').length;
  const pendingCount = lines.filter(l => l.status === 'pending').length;
  const laterCount   = lines.filter(l => l.status === 'later').length;
  const extraCount   = lines.filter(l => l.isNew).length;
  const listedCount  = lines.filter(l => !l.isNew).length;
  const differences  = lines.filter(l => { if (l.isNew || l.rec.parts.length === 0) return false; const c = crossCheck(l.expectedParts, l.rec.parts, true); return c.listedAny && (c.missing.length > 0 || c.extra.length > 0); }).length;

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-400 py-12"><Loader2 className="w-5 h-5 animate-spin" />Loading job cards…</div>;
  }

  return (
    <div className={`space-y-5 ${view === 'sheet' ? 'max-w-6xl' : 'max-w-2xl'}`}>
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
          {laterCount > 0   && <Badge className="bg-amber-100 text-amber-800">{laterCount} to follow</Badge>}
        </div>
        <PrintButton compact label="Print sheet" onPrint={() => {
          printReceivingSheet({
            clientName: huntInfo?.client_name ?? '', clientNumber: huntInfo?.client_number, huntRef: huntInfo?.ref,
            year: huntInfo?.year, operator: huntInfo?.operator, receivedBy: profile?.full_name ?? '',
            deliveredBy: delivery.deliveredBy, brought: delivery.brought, mileage: delivery.mileage, note: delivery.note,
            lines: lines.map(l => ({ parts: l.rec.parts, other: l.rec.other, visual: conditionSummary({ state: l.rec.condition, salt: l.rec.condition === 'salted' ? l.rec.salt : undefined, issues: l.rec.issues, skull: l.rec.skull }),
              species: l.species, mountType: l.mountType, quantity: l.quantity, tagNumber: l.tagNumber,
              instructions: l.instructions, status: l.status, conditionNotes: l.conditionNotes,
              received: [l.rec.parts.length ? `Came in: ${listParts(l.rec.parts, l.rec.other)}` : '', conditionSummary({ state: l.rec.condition, salt: l.rec.condition === 'salted' ? l.rec.salt : undefined, issues: l.rec.issues, skull: l.rec.skull })].filter(Boolean).join('. ') })),
          });
        }} />
      </div>

      {/* Arrival: the green light (a tag will switch it on by itself; until then a person can) */}
      {lines.length > 0 && (arrival ? (
        <div className="rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950/30 px-4 py-3 flex items-center gap-3">
          <span className="inline-block w-4 h-4 rounded-full bg-green-500 shrink-0" />
          <p className="text-sm text-green-900 dark:text-green-200">
            <strong>Arrived</strong> {new Date(arrival.at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} {arrival.via === 'tag' ? '(the tag was seen at the workshop)' : '(marked by hand)'}.
            {pendingCount > 0 && ' The condition report needs to be done: tick the parts that came in and fill in the condition for each animal.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="inline-block w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
          <p className="flex-1 min-w-[200px] text-sm text-slate-700 dark:text-slate-200">Not marked as arrived yet. When the trophies are here, press the button so the receiving team and the admins know a condition report is needed.</p>
          <button type="button" onClick={markArrived} className="min-h-11 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold">Trophies have arrived</button>
        </div>
      ))}

      {/* Parts that did not arrive earlier: the outfitter's plan, red until received */}
      {followups.length > 0 && (
        <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 dark:bg-red-950/40 p-4 space-y-2">
          <p className="font-bold text-red-800 dark:text-red-200 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Still to come. The outfitter has been told and is reminded every 3 days.</p>
          {followups.map(f => {
            const l = lines.find(x => x.docId === f.doc_id);
            const overdue = !!f.plan_date && f.plan_date < new Date().toISOString().slice(0, 10);
            return (
              <div key={f.id} className="rounded-lg bg-white/70 dark:bg-slate-900/50 p-3 flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[200px] text-sm text-slate-800 dark:text-slate-100">
                  <strong>{l?.species ?? 'Animal'}</strong>: {f.parts.map(c => PL[c] ?? c).join(', ')}
                  <div className={`text-xs mt-0.5 ${overdue ? 'font-bold text-red-700 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'}`}>
                    {f.plan_date ? `Outfitter's plan: by ${new Date(f.plan_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}${f.plan_note ? ` (${f.plan_note})` : ''}${overdue ? '. That date has passed' : ''}` : 'The outfitter has not given a date yet'}
                    {f.reminder_count > 0 ? ` · reminded ${f.reminder_count} time${f.reminder_count > 1 ? 's' : ''}` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => remindNow(f.id)} className="min-h-11 px-3 rounded-lg border-2 border-red-600 text-red-700 dark:text-red-300 font-bold text-sm">Remind the outfitter now</button>
              </div>
            );
          })}
          <p className="text-xs text-red-800 dark:text-red-300">When the rest has arrived, tick the parts below and mark the animal OK. This closes by itself and the outfitter is thanked.</p>
        </div>
      )}

      {/* Something is missing */}
      {missingRows.length > 0 && (
        <div role="alert" className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 space-y-1.5">
          <p className="font-bold text-red-800 dark:text-red-200 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Something is missing</p>
          <ul className="text-sm text-red-900 dark:text-red-100 list-disc pl-5">
            {missingRows.map(l => <li key={l.docId}><strong>{l.species}</strong>: {missingFor(l).map(c => PL[c] ?? c).join(', ')}</li>)}
          </ul>
          <p className="text-sm text-red-800 dark:text-red-200">The client listed these parts, but they are not ticked. If they did not arrive, mark the animal <strong>Issue</strong> or <strong>To follow</strong>.</p>
        </div>
      )}

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

      {/* Pre-registered export notice */}
      {lines.some(l => l.preRegistered) && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Pre-registered export hunt</p>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
              The outfitter pre-entered these trophies. Cross-reference each one against what physically arrived — mark OK or flag any discrepancies.
            </p>
          </div>
        </div>
      )}

      {/* Delivery details — the top and bottom of the paper sheet */}
      <div className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-4 space-y-3">
        <p className="font-bold text-slate-900 dark:text-slate-100">Delivery</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Delivered by (name)
            <input className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-base font-normal text-slate-900 dark:text-slate-100" value={delivery.deliveredBy} onChange={e => setDelivery(d => ({ ...d, deliveredBy: e.target.value }))} placeholder="Who brought them in?" />
          </label>
          <div>
            <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">How did they get here?</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([['collected', 'We collected them'], ['delivered', 'They were delivered']] as const).map(([v, t]) => (
                <button key={v} type="button" aria-pressed={delivery.brought === v} onClick={() => setDelivery(d => ({ ...d, brought: d.brought === v ? '' : v }))}
                  className={`min-h-11 rounded-lg border-2 text-sm font-semibold ${delivery.brought === v ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{t}</button>
              ))}
            </div>
          </div>
          {delivery.brought === 'collected' && (
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Kilometres driven
              <input inputMode="decimal" className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-base font-normal text-slate-900 dark:text-slate-100" value={delivery.mileage} onChange={e => setDelivery(d => ({ ...d, mileage: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="e.g. 254" />
            </label>
          )}
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">Note
            <input className="mt-1 w-full min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-base font-normal text-slate-900 dark:text-slate-100" value={delivery.note} onChange={e => setDelivery(d => ({ ...d, note: e.target.value }))} placeholder="For example: skins to follow with the courier" />
          </label>
        </div>
        <p className="text-xs text-slate-500">Received by {profile?.full_name ?? 'you'} on {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}. The client's own details are on the client's file.</p>
      </div>

      {/* What the client listed against what came in */}
      {lines.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="flex-1 min-w-[220px] text-sm text-slate-700 dark:text-slate-200">
            The client listed <strong>{listedCount}</strong> animal{listedCount === 1 ? '' : 's'}.
            {extraCount > 0 && <> <strong className="text-sky-600 dark:text-sky-300">{extraCount}</strong> came that {extraCount === 1 ? 'is' : 'are'} not on the list.</>}
            {differences > 0 && <> <strong className="text-amber-600 dark:text-amber-400">{differences}</strong> {differences === 1 ? 'has' : 'have'} parts that do not match what the client listed.</>}
            {differences === 0 && extraCount === 0 && lines.some(l => l.rec.parts.length > 0) && <> Everything ticked so far matches.</>}
          </p>
          <div className="flex gap-1 rounded-lg border border-slate-300 dark:border-slate-600 p-1">
            {([['sheet', 'Sheet'], ['cards', 'Cards']] as const).map(([v, t]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`min-h-9 px-3 rounded-md text-sm font-semibold ${view === v ? 'bg-[#0073ea] text-white' : 'text-slate-600 dark:text-slate-300'}`}>{t}</button>
            ))}
          </div>
        </div>
      )}

      {lines.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No job cards found for this hunt.</p>
          <p className="text-xs mt-1">Use Arrival Check-In to add trophies first.</p>
        </div>
      ) : view === 'sheet' ? (
        <ReceivingGrid
          lines={lines}
          onRec={(idx, patch) => updateLine(idx, { rec: { ...lines[idx].rec, ...patch } })}
          onStatus={(idx, s) => updateLine(idx, { status: s })}
          onRemove={idx => { const id = lines[idx].docId; setExtras(x => x.filter(e => e.docId !== id)); setLines(prev => prev.filter((_, i) => i !== idx)); }}
          renderDetails={idx => (
            <>
              {lines[idx].instructions && <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">The client wrote: {lines[idx].instructions}</p>}
              <ReceivedFields value={lines[idx].rec} expected={lines[idx].expectedParts} showParts={false} onChange={patch => updateLine(idx, { rec: { ...lines[idx].rec, ...patch } })} />
              <LineExtras line={lines[idx]} onNotes={n => updateLine(idx, { conditionNotes: n })} onAddPhotos={files => addPhotos(idx, files)} onRemovePhoto={pi => removePhoto(idx, pi)} />
            </>
          )}
        />
      ) : (
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <TrophyCheckCard
              key={line.docId}
              line={line}
              onStatus={s => updateLine(idx, { status: s })}
              onNotes={n => updateLine(idx, { conditionNotes: n })}
              onRec={patch => updateLine(idx, { rec: { ...line.rec, ...patch } })}
              onAddPhotos={files => addPhotos(idx, files)}
              onRemovePhoto={pi => removePhoto(idx, pi)}
            />
          ))}
        </div>
      )}

      {/* An animal that came but the client did not list */}
      <div className="rounded-xl border border-dashed border-slate-400 dark:border-slate-600 p-4 space-y-3">
        {!addingExtra ? (
          <button type="button" onClick={() => setAddingExtra(true)} className="inline-flex items-center gap-2 text-base font-semibold text-[#0073ea] min-h-11"><Plus className="w-5 h-5" />An animal came that is not on the client's list</button>
        ) : (
          <>
            <SpeciesField value={extraSpecies} onChange={setExtraSpecies} labelClass="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1" fieldClass="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 min-h-11 text-base" />
            <div className="flex gap-2">
              <button type="button" className="min-h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold" onClick={() => { setAddingExtra(false); setExtraSpecies(''); }}>Cancel</button>
              <button type="button" disabled={!extraSpecies.trim()} className="min-h-11 px-4 rounded-lg bg-[#0073ea] text-white font-bold disabled:opacity-50" onClick={() => {
                const id = `new:${crypto.randomUUID()}`;
                setExtras(x => [...x, { docId: id, species: extraSpecies.trim() }]);
                setLines(prev => [...prev, { docId: id, species: extraSpecies.trim(), mountType: '', quantity: 1, tagNumber: '', expectedCondition: 'unknown', instructions: '', preRegistered: false, status: 'pending', conditionNotes: '', intakePhotos: [], photoPreviews: [], rec: emptyReceived(), expectedParts: [], isNew: true }]);
                setAddingExtra(false); setExtraSpecies('');
              }}>Add it to the sheet</button>
            </div>
          </>
        )}
      </div>

      {/* Saving with parts missing: ask what to do */}
      {missingAsk && (
        <Dialog open onOpenChange={(o: boolean) => { if (!o) answerMissing('back'); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="text-xl">Parts are missing</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600 dark:text-slate-300">These animals are marked OK, but the client listed parts that are not ticked:</p>
            <ul className="text-sm list-disc pl-5 text-slate-800 dark:text-slate-100">
              {missingAsk.map(a => <li key={a.docId}><strong>{a.species}</strong>: {a.missing.map(c => PL[c] ?? c).join(', ')}</li>)}
            </ul>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">What happened?</p>
            <div className="grid gap-2">
              <button type="button" className="min-h-12 rounded-xl bg-amber-500 text-white font-bold px-4" onClick={() => answerMissing('later')}>The rest is still coming: mark To follow</button>
              <button type="button" className="min-h-12 rounded-xl bg-red-600 text-white font-bold px-4" onClick={() => answerMissing('issue')}>Something is wrong or lost: mark Issue</button>
              <button type="button" className="min-h-12 rounded-xl border-2 border-slate-400 font-semibold px-4 text-slate-800 dark:text-slate-100" onClick={() => answerMissing('never')}>They were never sent. Keep OK and save</button>
              <button type="button" className="min-h-12 rounded-xl border border-slate-300 dark:border-slate-600 font-semibold px-4 text-slate-600 dark:text-slate-300" onClick={() => answerMissing('back')}>Go back and tick them</button>
            </div>
          </DialogContent>
        </Dialog>
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
              ? `Check the ${pendingCount} remaining animal${pendingCount > 1 ? 's' : ''} first (OK, Issue or To follow)`
              : <><CheckCircle2 className="w-4 h-4" />Complete Receiving & Queue Trophies</>}
        </Button>
      </div>
    </div>
  );
}

// ── Notes and photos for one animal ───────────────────────────────────────────

function LineExtras({ line, onNotes, onAddPhotos, onRemovePhoto }: {
  line: TrophyLine; onNotes: (n: string) => void; onAddPhotos: (f: FileList | null) => void; onRemovePhoto: (i: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Textarea
        value={line.conditionNotes}
        onChange={e => onNotes(e.target.value)}
        placeholder={line.status === 'issue' ? 'Describe the issue (required)…' : line.status === 'later' ? 'What is still to come, and how? (for example: skins with the courier)' : 'Notes, for example: hooves on back skin (optional)…'}
        className="text-sm h-14 resize-none"
      />
      <div className="flex gap-2 flex-wrap">
        {line.photoPreviews.map((src, i) => (
          <div key={i} className="relative">
            <img src={src} alt="" className="w-14 h-14 object-cover rounded-lg border" />
            <button onClick={() => onRemovePhoto(i)} aria-label="Remove photo"
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
  );
}

// ── Single trophy check card ──────────────────────────────────────────────────

function TrophyCheckCard({
  line, onStatus, onNotes, onRec, onAddPhotos, onRemovePhoto,
}: {
  line: TrophyLine;
  onStatus: (s: CheckStatus) => void;
  onNotes: (n: string) => void;
  onRec: (patch: Partial<ReceivedValue>) => void;
  onAddPhotos: (f: FileList | null) => void;
  onRemovePhoto: (i: number) => void;
}) {
  const [expanded, setExpanded] = useState(line.status === 'pending');

  const borderColor =
    line.status === 'ok'    ? 'border-green-400 bg-green-50 dark:bg-green-950/20' :
    line.status === 'issue' ? 'border-red-400 bg-red-50 dark:bg-red-950/20' :
    line.status === 'later' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' :
                              'border-slate-200 dark:border-slate-700';
  const btn = (on: boolean, onCls: string, offCls: string) => `w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-xs transition-all ${on ? `${onCls} shadow-lg scale-105` : offCls}`;

  return (
    <div className={`rounded-xl border-2 transition-all overflow-hidden ${borderColor}`}>
      {/* Trophy header — always visible */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">{line.species}</span>
            <span className="text-sm text-slate-500">{line.mountType}</span>
            {line.preRegistered && (
              <Badge className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0">Pre-registered</Badge>
            )}
            {line.isNew && <Badge className="text-[10px] bg-sky-100 text-sky-700 border-0">Not on the client's list</Badge>}
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
            onClick={() => { if (!receivedOk(line.rec)) { toast.error(receivedMissing(line.rec)); setExpanded(true); return; } onStatus('ok'); setExpanded(false); }}
            className={btn(line.status === 'ok', 'bg-green-500 text-white', 'bg-green-100 text-green-600 hover:bg-green-200')}>
            <CheckCircle2 className="w-6 h-6" />
            OK
          </button>
          <button
            onClick={() => { onStatus('issue'); setExpanded(true); }}
            className={btn(line.status === 'issue', 'bg-red-500 text-white', 'bg-red-100 text-red-600 hover:bg-red-200')}>
            <XCircle className="w-6 h-6" />
            Issue
          </button>
          <button
            onClick={() => { onStatus('later'); setExpanded(true); }}
            title="Part of it is here, the rest follows"
            className={btn(line.status === 'later', 'bg-amber-500 text-white', 'bg-amber-100 text-amber-700 hover:bg-amber-200')}>
            <Clock className="w-6 h-6" />
            Later
          </button>
        </div>
      </div>

      {/* Expanded section — what came in, condition, notes + photos */}
      {(expanded || line.status !== 'pending') && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
          <ReceivedFields value={line.rec} expected={line.expectedParts} onChange={onRec} />
          <LineExtras line={line} onNotes={onNotes} onAddPhotos={onAddPhotos} onRemovePhoto={onRemovePhoto} />
        </div>
      )}
    </div>
  );
}
