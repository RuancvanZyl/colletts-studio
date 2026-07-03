import { useState, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Plus, Trash2, Loader2, CheckCircle2, Search, ChevronDown,
  ClipboardList, AlertTriangle, User, Calendar, Hash,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useClients } from '../../../../lib/hooks/useClients';
import { DEPT_LABELS, getPipeline } from '../../../../lib/pipeline';
import { toast } from 'sonner';

// ── Species & mount options ───────────────────────────────────────────────────

const SPECIES_LIST = [
  'Baboon','Blesbok','Bontebok','Buffalo','Bushbuck','Bushpig','Caracal','Civet',
  'Crocodile','Duiker','Eland','Elephant','Fallow Deer','Gemsbok','Genet Cat',
  'Giraffe','Grysbok','Hartebeest','Hippo','Hyena','Impala','Jackal','Klipspringer',
  'Kudu','Lechwe','Leopard','Lion','Nguni','Nyala','Oribi','Ostrich',
  'Reedbuck (Common)','Reedbuck (Mountain)','Reedbuck (Vaal)','Sable','Serval',
  'Springbok','Steenbok','Tsessebe','Warthog','Waterbuck','Wild Cat',
  'Wildebeest (Black)','Wildebeest (Blue)','Vervet Monkey','Zebra','Other',
];

const MOUNT_TYPES = [
  'Shoulder Mount','Offset Shoulder Mount','Pedestal Mount','Full Mount',
  'Euro Skull','Bleach Only','Artistic Skull','Rug Mount on Felt',
  'Tan Only','Dip & Pack','Half Mount','Life Cast',
];

const CONDITIONS = ['Salted','Frozen','Fresh','Wet Salted','Cape Only','Other'];

const ALL_DEPTS = [
  'receiving','cleaning_bleach','storage','tannery',
  'mounting','finishing','quality_check','photos','administration',
];

// ── Empty trophy row ──────────────────────────────────────────────────────────

type TrophyRow = {
  id: string;
  species: string;
  mountType: string;
  tagNumber: string;
  condition: string;
  currentDept: string;
  instructions: string;
};

function emptyRow(): TrophyRow {
  return {
    id: crypto.randomUUID(),
    species: '',
    mountType: 'Shoulder Mount',
    tagNumber: '',
    condition: 'Salted',
    currentDept: 'mounting',
    instructions: '',
  };
}

// ── Client search ─────────────────────────────────────────────────────────────

function ClientSearch({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const { clients } = useClients();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const selected = clients.find(c => c.id === value);
  const filtered = q
    ? clients.filter(c => c.full_name.toLowerCase().includes(q.toLowerCase()) || (c as any).client_number?.toLowerCase().includes(q.toLowerCase()))
    : clients.slice(0, 20);

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background cursor-pointer text-sm"
        onClick={() => setOpen(o => !o)}
      >
        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className={selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
          {selected ? `${selected.full_name}${(selected as any).client_number ? ' · ' + (selected as any).client_number : ''}` : 'Select client…'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search name or number…"
                className="w-full pl-7 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 rounded border-none outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onChange(c.id, c.full_name); setOpen(false); setQ(''); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <span className="font-medium text-slate-900 dark:text-slate-100">{c.full_name}</span>
                {(c as any).client_number && <span className="text-xs text-slate-400 font-mono">{(c as any).client_number}</span>}
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${(c as any).client_type === 'local' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {(c as any).client_type ?? 'export'}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-4 text-xs text-slate-400 text-center">No clients found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trophy row ────────────────────────────────────────────────────────────────

function TrophyRowForm({ row, index, onChange, onDelete }: {
  row: TrophyRow;
  index: number;
  onChange: (id: string, patch: Partial<TrophyRow>) => void;
  onDelete: (id: string) => void;
}) {
  const set = (patch: Partial<TrophyRow>) => onChange(row.id, patch);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
        <span className="w-5 h-5 rounded-full bg-[#0073ea] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{index + 1}</span>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
          {row.species || 'Species not set'} — {row.mountType}
        </span>
        <button onClick={() => onDelete(row.id)} className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Species */}
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-[11px] text-slate-500">Species *</Label>
          <select
            value={row.species}
            onChange={e => set({ species: e.target.value })}
            className="mt-1 w-full h-8 text-sm rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
          >
            <option value="">Select…</option>
            {SPECIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Mount type */}
        <div>
          <Label className="text-[11px] text-slate-500">Mount Type *</Label>
          <select
            value={row.mountType}
            onChange={e => set({ mountType: e.target.value })}
            className="mt-1 w-full h-8 text-sm rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
          >
            {MOUNT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Tag number */}
        <div>
          <Label className="text-[11px] text-slate-500">Tag Number</Label>
          <Input
            value={row.tagNumber}
            onChange={e => set({ tagNumber: e.target.value })}
            placeholder="T-001"
            className="mt-1 h-8 text-sm font-mono"
          />
        </div>

        {/* Condition */}
        <div>
          <Label className="text-[11px] text-slate-500">Condition</Label>
          <select
            value={row.condition}
            onChange={e => set({ condition: e.target.value })}
            className="mt-1 w-full h-8 text-sm rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
          >
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Current department */}
        <div>
          <Label className="text-[11px] text-slate-500">Currently In *</Label>
          <select
            value={row.currentDept}
            onChange={e => set({ currentDept: e.target.value })}
            className="mt-1 w-full h-8 text-sm rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
          >
            {ALL_DEPTS.map(d => <option key={d} value={d}>{DEPT_LABELS[d] ?? d}</option>)}
          </select>
        </div>

        {/* Instructions */}
        <div className="col-span-2 sm:col-span-3">
          <Label className="text-[11px] text-slate-500">Special Instructions</Label>
          <Input
            value={row.instructions}
            onChange={e => set({ instructions: e.target.value })}
            placeholder="Any special notes for this trophy…"
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>

      {/* Pipeline preview */}
      <div className="px-3 pb-3 flex flex-wrap gap-1">
        {getPipeline(row.mountType).map(stage => (
          <span key={stage} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            stage === row.currentDept
              ? 'bg-[#0073ea] text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
          }`}>
            {DEPT_LABELS[stage] ?? stage}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface QuickJobEntryProps {
  onDone?: () => void;
}

export function QuickJobEntry({ onDone }: QuickJobEntryProps) {
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [refNumber, setRefNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [ph, setPh] = useState('');
  const [country, setCountry] = useState('');
  const [dropboxPath, setDropboxPath] = useState('');
  const [rows, setRows] = useState<TrophyRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  function updateRow(id: string, patch: Partial<TrophyRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function deleteRow(id: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }

  function addRow() {
    setRows(prev => [...prev, emptyRow()]);
  }

  function reset() {
    setClientId(''); setClientName(''); setRefNumber('');
    setOperator(''); setPh(''); setCountry(''); setDropboxPath('');
    setRows([emptyRow()]); setSaved(false); setSavedCount(0);
  }

  async function handleSubmit() {
    if (!clientId) { toast.error('Select a client'); return; }
    if (!refNumber.trim()) { toast.error('Enter a reference number'); return; }
    const invalid = rows.find(r => !r.species);
    if (invalid) { toast.error('Every trophy needs a species'); return; }

    setSaving(true);
    try {
      // 1. Create or reuse client_hunt
      const { data: hunt, error: huntErr } = await (supabase as any)
        .from('client_hunts')
        .insert({
          client_id: clientId,
          year,
          ref_number: refNumber.trim(),
          operator: operator || null,
          ph: ph || null,
          country: country || null,
          dropbox_path: dropboxPath || null,
          status: 'active',
        })
        .select()
        .single();

      if (huntErr) throw new Error(huntErr.message);

      // 2. Create one job_card per trophy row
      const docs = rows.map(r => ({
        hunt_id: hunt.id,
        doc_type: 'job_card',
        title: `${r.species} — ${r.mountType}${r.tagNumber ? ' · ' + r.tagNumber : ''}`,
        status: 'in_progress',
        current_department: r.currentDept,
        form_data: {
          species:       r.species,
          mount_type:    r.mountType,
          tag_number:    r.tagNumber,
          condition:     r.condition.toLowerCase().replace(' ', '_'),
          instructions:  r.instructions,
          received_at:   new Date().toISOString(),
          stage_history: [],
        },
      }));

      const { error: docsErr } = await (supabase as any)
        .from('hunt_documents')
        .insert(docs);

      if (docsErr) throw new Error(docsErr.message);

      setSavedCount(rows.length);
      setSaved(true);
      toast.success(`${rows.length} trophy job card${rows.length !== 1 ? 's' : ''} created and routed to departments`);
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Jobs Created</h2>
        <p className="text-slate-500">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{savedCount} trophy job card{savedCount !== 1 ? 's' : ''}</span> have been routed into their departments. Staff will see them in their queues immediately.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button onClick={reset} variant="outline">Add Another Hunt</Button>
          {onDone && <Button onClick={onDone}>Done</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#0073ea]" />
          Quick Job Entry
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Enter existing Dropbox jobs to get them flowing through the department pipeline.
        </p>
      </div>

      {/* Hunt details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-[#0073ea]" /> Hunt Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Client *</Label>
              <div className="mt-1">
                <ClientSearch value={clientId} onChange={(id, name) => { setClientId(id); setClientName(name); }} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Reference Number *</Label>
              <Input
                value={refNumber}
                onChange={e => setRefNumber(e.target.value)}
                placeholder="WI 9025 / T0122"
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <Input
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder="2025"
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Safari Operator</Label>
              <Input value={operator} onChange={e => setOperator(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Professional Hunter</Label>
              <Input value={ph} onChange={e => setPh(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Country</Label>
              <Input value={country} onChange={e => setCountry(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Dropbox Folder Path</Label>
              <Input
                value={dropboxPath}
                onChange={e => setDropboxPath(e.target.value)}
                placeholder="01 Export Clients/2025/WI 9025…"
                className="mt-1 h-9 font-mono text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trophy rows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trophies</h2>
            <Badge variant="secondary">{rows.length}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={addRow} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add Trophy
          </Button>
        </div>

        {rows.map((row, i) => (
          <TrophyRowForm
            key={row.id}
            row={row}
            index={i}
            onChange={updateRow}
            onDelete={deleteRow}
          />
        ))}

        <button
          onClick={addRow}
          className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-4 flex items-center justify-center gap-2 text-slate-400 hover:border-[#0073ea] hover:text-[#0073ea] transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add another trophy
        </button>
      </div>

      {/* Summary & Submit */}
      <Card className="border-[#0073ea]/20 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{rows.length} trophy{rows.length !== 1 ? 'ies' : ''}</span> will be created as job cards and routed to their departments immediately.
{clientName && <span> Client: <strong>{clientName}</strong></span>}
            </div>
            <Button onClick={handleSubmit} disabled={saving} className="shrink-0">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Create {rows.length} Job Card{rows.length !== 1 ? 's' : ''}
              </>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
