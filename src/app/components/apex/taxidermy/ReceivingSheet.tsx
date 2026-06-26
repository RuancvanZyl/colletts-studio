import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import {
  ClipboardList, CheckCircle2, Camera, ArrowLeft, User,
  AlertTriangle, Package, Clock, ChevronRight, Printer,
} from 'lucide-react';

// ── Department config ─────────────────────────────────────────────────────────

const DEPARTMENTS: Record<string, { label: string; leads: string[]; color: string }> = {
  receiving:       { label: 'Receiving',        leads: ['Abri','Steve','Vince','Ruan'],    color: 'bg-blue-600' },
  cleaning_bleach: { label: 'Cleaning & Bleach',leads: ['Vince'],                          color: 'bg-purple-600' },
  storage:         { label: 'Storage',          leads: ['Vince'],                          color: 'bg-slate-600' },
  tannery:         { label: 'Tannery',          leads: ['Divine'],                         color: 'bg-amber-600' },
  mounting:        { label: 'Mounting',         leads: ['Emanuel'],                        color: 'bg-green-600' },
  finishing:       { label: 'Finishing',        leads: ['Kyle'],                           color: 'bg-orange-600' },
  quality_check:   { label: 'Quality Check',   leads: ['Abri','Steve'],                   color: 'bg-red-600' },
  photos:          { label: 'Photos',           leads: ['Ruan','Steve'],                   color: 'bg-cyan-600' },
  administration:  { label: 'Administration',  leads: ['Abri','Cecilia'],                 color: 'bg-indigo-600' },
};

// Auto-route trophy to primary department based on mount type
function primaryDept(mountType: string): string {
  const mt = mountType.toLowerCase();
  if (mt.includes('euro') || mt.includes('bleach')) return 'cleaning_bleach';
  if (mt.includes('full') || mt.includes('shoulder') || mt.includes('pedestal') || mt.includes('half')) return 'mounting';
  if (mt.includes('tan')) return 'tannery';
  if (mt.includes('rug') || mt.includes('skin')) return 'tannery';
  return 'mounting';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingHunt {
  id: string;
  year: number;
  client_type: string;
  client_name: string;
  client_email: string | null;
  trophy_count: number;
  checked_in_at: string;
}

interface TrophyDoc {
  id: string;
  title: string;
  form_data: {
    species: string;
    mount_type: string;
    quantity: number;
    tag_number: string;
    condition: string;
    instructions: string;
    price_usd: number | null;
    reference_photo_paths: string[];
  };
}

interface ReceivingLine {
  docId: string;
  species: string;
  mountType: string;
  quantity: number;
  tagNumber: string;
  expectedCondition: string;
  instructions: string;
  // receiving fields
  actualCondition: string;
  conditionNotes: string;
  departmentLead: string;
  department: string;
  intakePhotos: File[];
  photoPreviews: string[];
  confirmed: boolean;
}

interface ReceivingSheetProps {
  onNavigate: (view: string) => void;
}

// ── List view ─────────────────────────────────────────────────────────────────

export function ReceivingSheet({ onNavigate }: ReceivingSheetProps) {
  const [pendingHunts, setPendingHunts] = useState<PendingHunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHuntId, setActiveHuntId] = useState<string | null>(null);
  const [receivedHunts, setReceivedHunts] = useState<PendingHunt[]>([]);
  const [tab, setTab] = useState<'pending' | 'received'>('pending');

  useEffect(() => { loadHunts(); }, []);

  async function loadHunts() {
    setLoading(true);
    const { data: hunts } = await (supabase as any)
      .from('client_hunts')
      .select('id, year, status, client_type, client_id, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!hunts?.length) { setLoading(false); return; }

    const huntIds = hunts.map((h: any) => h.id);

    const [clientsRes, docsRes] = await Promise.all([
      (supabase as any).from('clients').select('id, full_name, email'),
      (supabase as any).from('hunt_documents').select('hunt_id, doc_type, status').in('hunt_id', huntIds),
    ]);

    const clientMap = Object.fromEntries((clientsRes.data ?? []).map((c: any) => [c.id, c]));
    const docs: any[] = docsRes.data ?? [];

    const pending: PendingHunt[] = [];
    const received: PendingHunt[] = [];

    for (const h of hunts) {
      const huntDocs = docs.filter((d: any) => d.hunt_id === h.id);
      const jobCards = huntDocs.filter((d: any) => d.doc_type === 'job_card');
      const hasReceiving = huntDocs.some((d: any) => d.doc_type === 'receiving_sheet');
      if (!jobCards.length) continue;

      const client = clientMap[h.client_id];
      const entry: PendingHunt = {
        id: h.id,
        year: h.year,
        client_type: h.client_type ?? 'export',
        client_name: client?.full_name ?? 'Unknown Client',
        client_email: client?.email ?? null,
        trophy_count: jobCards.length,
        checked_in_at: h.created_at,
      };
      (hasReceiving ? received : pending).push(entry);
    }

    setPendingHunts(pending);
    setReceivedHunts(received);
    setLoading(false);
  }

  if (activeHuntId) {
    return (
      <ReceivingForm
        huntId={activeHuntId}
        onBack={() => { setActiveHuntId(null); loadHunts(); }}
      />
    );
  }

  const list = tab === 'pending' ? pendingHunts : receivedHunts;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" />
            Receiving
          </h1>
          <p className="text-slate-500 text-sm mt-1">Confirm trophy intake and generate job cards</p>
        </div>
        <Button variant="outline" onClick={() => onNavigate('arrival')}>
          + New Check-In
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['pending','received'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t === 'pending' ? 'Awaiting Receipt' : 'Received'}
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
              t === 'pending'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
            }`}>
              {t === 'pending' ? pendingHunts.length : receivedHunts.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{tab === 'pending' ? 'No hunts awaiting receipt' : 'No received hunts yet'}</p>
          {tab === 'pending' && (
            <p className="text-sm mt-1">Complete an Arrival Check-In first to create a receiving sheet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(hunt => (
            <div
              key={hunt.id}
              onClick={() => setActiveHuntId(hunt.id)}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                tab === 'pending' ? 'bg-orange-500' : 'bg-green-600'
              }`}>
                {hunt.trophy_count}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white truncate">{hunt.client_name}</p>
                <p className="text-sm text-slate-500">{hunt.year} · {hunt.trophy_count} {hunt.trophy_count === 1 ? 'trophy' : 'trophies'}</p>
              </div>
              <Badge variant="outline" className={hunt.client_type === 'local' ? 'border-green-400 text-green-600' : 'border-blue-400 text-blue-600'}>
                {hunt.client_type === 'local' ? '🇿🇦 Local' : '✈️ Export'}
              </Badge>
              {tab === 'pending' && (
                <div className="flex items-center gap-1 text-orange-500 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Awaiting
                </div>
              )}
              {tab === 'received' && (
                <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Received
                </div>
              )}
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Receiving Form ────────────────────────────────────────────────────────────

function ReceivingForm({ huntId, onBack }: { huntId: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [huntInfo, setHuntInfo] = useState<{ clientName: string; clientType: string; year: number } | null>(null);
  const [lines, setLines] = useState<ReceivingLine[]>([]);
  const [receivedBy, setReceivedBy] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [activePhotoLineId, setActivePhotoLineId] = useState<string | null>(null);

  useEffect(() => { loadSheet(); }, [huntId]);

  async function loadSheet() {
    setLoading(true);
    const [huntRes, docsRes] = await Promise.all([
      (supabase as any).from('client_hunts').select('id, year, client_type, client_id').eq('id', huntId).single(),
      (supabase as any).from('hunt_documents').select('id, title, form_data').eq('hunt_id', huntId).eq('doc_type', 'job_card'),
    ]);

    const hunt = huntRes.data;
    if (!hunt) { setLoading(false); return; }

    const clientRes = await (supabase as any).from('clients').select('full_name').eq('id', hunt.client_id).single();
    setHuntInfo({
      clientName: clientRes.data?.full_name ?? 'Unknown',
      clientType: hunt.client_type ?? 'export',
      year: hunt.year,
    });

    const docs: TrophyDoc[] = docsRes.data ?? [];
    setLines(docs.map(doc => {
      const fd = doc.form_data ?? {};
      const dept = primaryDept(fd.mount_type ?? '');
      return {
        docId: doc.id,
        species: fd.species ?? '',
        mountType: fd.mount_type ?? '',
        quantity: fd.quantity ?? 1,
        tagNumber: fd.tag_number ?? '',
        expectedCondition: fd.condition ?? '',
        instructions: fd.instructions ?? '',
        actualCondition: fd.condition ?? 'salted',
        conditionNotes: '',
        department: dept,
        departmentLead: DEPARTMENTS[dept]?.leads[0] ?? '',
        intakePhotos: [],
        photoPreviews: [],
        confirmed: false,
      };
    }));
    setLoading(false);
  }

  function updateLine(docId: string, patch: Partial<ReceivingLine>) {
    setLines(prev => prev.map(l => l.docId === docId ? { ...l, ...patch } : l));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activePhotoLineId) return;
    const files = Array.from(e.target.files ?? []);
    setLines(prev => prev.map(l => {
      if (l.docId !== activePhotoLineId) return l;
      const remaining = 5 - l.intakePhotos.length;
      const toAdd = files.slice(0, remaining);
      return {
        ...l,
        intakePhotos: [...l.intakePhotos, ...toAdd],
        photoPreviews: [...l.photoPreviews, ...toAdd.map(f => URL.createObjectURL(f))],
      };
    }));
    e.target.value = '';
  }

  const allConfirmed = lines.length > 0 && lines.every(l => l.confirmed);
  const confirmedCount = lines.filter(l => l.confirmed).length;

  async function handleComplete() {
    if (!receivedBy.trim()) { toast.error('Please select who is receiving these trophies'); return; }
    setSubmitting(true);
    try {
      // 1. Upload intake photos and update each job card doc
      for (const line of lines) {
        const photoPaths: string[] = [];
        for (const file of line.intakePhotos) {
          const ext = file.name.split('.').pop() ?? 'jpg';
          const path = `receiving/${huntId}/${line.tagNumber}/${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from('trophy-references').upload(path, file, { upsert: true });
          if (!error) photoPaths.push(path);
        }

        // Determine first processing stage after receiving
        const { getNextDepartment } = await import('../../../../lib/pipeline');
        const nextDept = getNextDepartment(line.mountType, 'receiving') ?? line.department;

        await (supabase as any).from('hunt_documents').update({
          status: 'in_progress',
          current_department: nextDept,
          form_data: {
            species: line.species,
            mount_type: line.mountType,
            quantity: line.quantity,
            tag_number: line.tagNumber,
            condition: line.actualCondition,
            condition_notes: line.conditionNotes,
            instructions: line.instructions,
            department: line.department,
            department_label: DEPARTMENTS[line.department]?.label ?? line.department,
            department_lead: line.departmentLead,
            received_by: receivedBy,
            received_at: new Date().toISOString(),
            intake_photo_paths: photoPaths,
            stage_history: [
              { dept: 'receiving', completedBy: receivedBy, completedAt: new Date().toISOString() },
            ],
          },
        }).eq('id', line.docId);
      }

      // 2. Create the receiving sheet summary doc
      await (supabase as any).from('hunt_documents').insert({
        hunt_id: huntId,
        doc_type: 'receiving_sheet',
        title: `Receiving Sheet – ${huntInfo?.clientName} (${huntInfo?.year})`,
        status: 'complete',
        form_data: {
          received_by: receivedBy,
          received_at: new Date().toISOString(),
          trophy_count: lines.length,
          general_notes: generalNotes,
          department_summary: lines.map(l => ({
            tag: l.tagNumber,
            species: l.species,
            mount: l.mountType,
            dept: DEPARTMENTS[l.department]?.label,
            lead: l.departmentLead,
          })),
        },
      });

      setDone(true);
      toast.success('Receiving sheet completed — job cards updated');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to complete receiving sheet');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-slate-400">Loading receiving sheet…</div>
  );

  if (done) return <ReceivingDone lines={lines} huntInfo={huntInfo} receivedBy={receivedBy} onBack={onBack} />;

  const receivingLeads = DEPARTMENTS.receiving.leads;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Receiving Sheet</h1>
          <p className="text-slate-500 text-sm">
            {huntInfo?.clientName} · {huntInfo?.year} ·{' '}
            <span className={huntInfo?.clientType === 'local' ? 'text-green-600' : 'text-blue-600'}>
              {huntInfo?.clientType === 'local' ? '🇿🇦 Local' : '✈️ Export'}
            </span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{confirmedCount}/{lines.length}</div>
          <div className="text-xs text-slate-500">confirmed</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300 rounded-full"
          style={{ width: `${lines.length ? (confirmedCount / lines.length) * 100 : 0}%` }}
        />
      </div>

      {/* Received by */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
          <User className="inline w-4 h-4 mr-1" />Received by *
        </Label>
        <div className="flex flex-wrap gap-2">
          {receivingLeads.map(name => (
            <button
              key={name}
              onClick={() => setReceivedBy(name)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                receivedBy === name
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Trophy lines */}
      <div className="space-y-4">
        {lines.map((line, idx) => (
          <TrophyReceivingCard
            key={line.docId}
            line={line}
            idx={idx}
            onChange={patch => updateLine(line.docId, patch)}
            onPhotoClick={() => {
              setActivePhotoLineId(line.docId);
              photoInputRef.current?.click();
            }}
          />
        ))}
      </div>

      {/* General notes */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">General Receiving Notes</Label>
        <Textarea
          value={generalNotes}
          onChange={e => setGeneralNotes(e.target.value)}
          placeholder="Any overall observations, concerns, or notes about this delivery…"
          className="resize-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          rows={3}
        />
      </div>

      {/* Complete button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-slate-500">
          {allConfirmed
            ? 'All trophies confirmed — ready to complete'
            : `Confirm all ${lines.length} trophies before completing`}
        </p>
        <Button
          onClick={handleComplete}
          disabled={!allConfirmed || !receivedBy || submitting}
          className="bg-green-600 hover:bg-green-700 text-white px-8 gap-2 disabled:opacity-40"
        >
          <CheckCircle2 className="w-4 h-4" />
          {submitting ? 'Saving…' : 'Complete & Generate Job Cards'}
        </Button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoChange}
      />
    </div>
  );
}

// ── Trophy receiving card ─────────────────────────────────────────────────────

function TrophyReceivingCard({
  line, idx, onChange, onPhotoClick,
}: {
  line: ReceivingLine;
  idx: number;
  onChange: (patch: Partial<ReceivingLine>) => void;
  onPhotoClick: () => void;
}) {
  const dept = DEPARTMENTS[line.department];
  const CONDITIONS = ['salted','frozen','fresh','wet_salted','cape_only','damaged','other'];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border-2 transition-all ${
      line.confirmed
        ? 'border-green-500 dark:border-green-600'
        : 'border-slate-200 dark:border-slate-700'
    }`}>
      {/* Trophy header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700">
        <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">{line.species}</p>
          <p className="text-sm text-slate-500">{line.mountType} · Tag: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{line.tagNumber}</span> · Qty: {line.quantity}</p>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${dept?.color ?? 'bg-slate-500'}`}>
          {dept?.label ?? line.department}
        </div>
        {line.confirmed && (
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
        )}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client instructions (read-only) */}
        {line.instructions && (
          <div className="md:col-span-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Client Instructions</p>
            <p className="text-sm text-amber-800 dark:text-amber-300">{line.instructions}</p>
          </div>
        )}

        {/* Actual condition */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Actual Condition on Arrival</Label>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map(c => (
              <button
                key={c}
                onClick={() => onChange({ actualCondition: c })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  line.actualCondition === c
                    ? c === 'damaged'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-400'
                }`}
              >
                {c.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Condition notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Condition Notes</Label>
          <Input
            value={line.conditionNotes}
            onChange={e => onChange({ conditionNotes: e.target.value })}
            placeholder="Any damage, missing parts, notes…"
            className="text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
        </div>

        {/* Department assignment */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Department</Label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(DEPARTMENTS)
              .filter(([key]) => !['receiving','administration','photos','quality_check'].includes(key))
              .map(([key, d]) => (
                <button
                  key={key}
                  onClick={() => onChange({ department: key, departmentLead: d.leads[0] })}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    line.department === key
                      ? `${d.color} text-white border-transparent`
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
          </div>
        </div>

        {/* Lead assignment */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Department Lead</Label>
          <div className="flex flex-wrap gap-1.5">
            {(DEPARTMENTS[line.department]?.leads ?? []).map(name => (
              <button
                key={name}
                onClick={() => onChange({ departmentLead: name })}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  line.departmentLead === name
                    ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-400'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Intake photos */}
        <div className="md:col-span-2 space-y-1.5">
          <Label className="text-xs text-slate-500">Intake Photos</Label>
          <div className="flex flex-wrap gap-2">
            {line.photoPreviews.map((src, i) => (
              <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
            ))}
            {line.intakePhotos.length < 5 && (
              <button
                onClick={onPhotoClick}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-blue-400 transition-colors"
              >
                <Camera className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Confirm toggle */}
        <div className="md:col-span-2 flex justify-end">
          <button
            onClick={() => onChange({ confirmed: !line.confirmed })}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              line.confirmed
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {line.confirmed ? 'Confirmed' : 'Confirm Trophy Received'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Done / Job Card summary ───────────────────────────────────────────────────

function ReceivingDone({
  lines, huntInfo, receivedBy, onBack,
}: {
  lines: ReceivingLine[];
  huntInfo: { clientName: string; clientType: string; year: number } | null;
  receivedBy: string;
  onBack: () => void;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Success banner */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-5 flex items-start gap-4">
        <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-lg font-bold text-green-800 dark:text-green-300">Receiving Complete</h2>
          <p className="text-green-700 dark:text-green-400 text-sm mt-0.5">
            {lines.length} {lines.length === 1 ? 'trophy' : 'trophies'} received from <strong>{huntInfo?.clientName}</strong> by <strong>{receivedBy}</strong> on {dateStr}.
            Job cards have been updated and routed to departments.
          </p>
        </div>
      </div>

      {/* Job card summary table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            Job Cards Issued
          </h3>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tag</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Species</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mount</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Condition</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {lines.map(line => {
                const dept = DEPARTMENTS[line.department];
                return (
                  <tr key={line.docId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{line.tagNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{line.species}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{line.mountType}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        line.actualCondition === 'damaged'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {line.actualCondition.replace('_',' ')}
                        {line.conditionNotes && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${dept?.color ?? 'bg-slate-500'}`}>
                        {dept?.label ?? line.department}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{line.departmentLead}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">
          Back to Receiving List
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print Job Cards
        </Button>
      </div>
    </div>
  );
}
