import { useState, useRef } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import {
  Plus, FolderOpen, FileText, ClipboardList, Package,
  ShieldCheck, Loader2, ChevronDown, ChevronUp, Upload,
  CheckCircle2, AlertCircle, Clock, ExternalLink, Trash2,
} from 'lucide-react';
import { useClientHunts, type ClientHunt, type HuntDocument } from '../../../../lib/hooks/useClientHunts';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';

// ── Doc type metadata ───────────────────────────────────────────────────────
const DOC_META: Record<string, { label: string; icon: typeof FileText; color: string; staffOnly?: boolean }> = {
  permit:           { label: 'Hunting Permit',    icon: ShieldCheck,   color: 'text-green-600' },
  cites:            { label: 'CITES Permit',       icon: ShieldCheck,   color: 'text-emerald-600' },
  import_permit:    { label: 'Import Permit',      icon: ShieldCheck,   color: 'text-teal-600' },
  job_card:         { label: 'Job Card',           icon: ClipboardList, color: 'text-blue-600', staffOnly: true },
  receiving_sheet:  { label: 'Receiving Sheet',    icon: ClipboardList, color: 'text-indigo-600', staffOnly: true },
  packing_list:     { label: 'Packing List',       icon: Package,       color: 'text-violet-600', staffOnly: true },
  invoice:          { label: 'Invoice',            icon: FileText,      color: 'text-amber-600' },
  other:            { label: 'Other Document',     icon: FileText,      color: 'text-slate-500' },
};

const STATUS_ICON = {
  complete: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  pending:  <Clock className="w-3.5 h-3.5 text-amber-400" />,
  missing:  <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
};

const DROPBOX_WEB_ROOT =
  'https://www.dropbox.com/home/Colletts%20SA';

function dropboxUrl(path: string) {
  return `${DROPBOX_WEB_ROOT}/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
}

// ── Add Hunt dialog ─────────────────────────────────────────────────────────
function AddHuntDialog({ clientId, onAdded, onClose }: { clientId: string; onAdded: () => void; onClose: () => void }) {
  const { addHunt } = useClientHunts(clientId);
  const [form, setForm] = useState({ year: new Date().getFullYear().toString(), ref_number: '', operator: '', ph: '', country: '', hunt_area: '', dropbox_path: '' });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.ref_number.trim()) { toast.error('Ref number required'); return; }
    setSaving(true);
    const { error } = await addHunt(form);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success('Hunt added');
    onAdded();
    onClose();
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Add Hunt / Job</DialogTitle></DialogHeader>
      <div className="space-y-3">
        {[
          { key: 'year',         label: 'Year *',             placeholder: '2025' },
          { key: 'ref_number',   label: 'Reference Number *', placeholder: 'WI 9025 / T0122' },
          { key: 'operator',     label: 'Safari Operator',    placeholder: '' },
          { key: 'ph',           label: 'Professional Hunter',placeholder: '' },
          { key: 'country',      label: 'Country',            placeholder: '' },
          { key: 'hunt_area',    label: 'Hunt Area',          placeholder: '' },
          { key: 'dropbox_path', label: 'Dropbox Folder Path',placeholder: '01 Export Client Invoices/2025/WI 9025 ...' },
        ].map(f => (
          <div key={f.key}>
            <Label className="text-xs">{f.label}</Label>
            <Input
              value={(form as any)[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="mt-1 h-8 text-sm"
            />
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save Hunt
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Add Document dialog ─────────────────────────────────────────────────────
function AddDocDialog({ hunt, onAdded, onClose }: { hunt: ClientHunt; onAdded: () => void; onClose: () => void }) {
  const { addDocument, uploadDocFile } = useClientHunts(hunt.client_id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<HuntDocument['doc_type']>('permit');
  const [title, setTitle] = useState('');
  const [dropboxPath, setDropboxPath] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleUpload(files: FileList | null) {
    if (!files?.[0]) return;
    setSaving(true);
    const { error } = await uploadDocFile(hunt.id, docType, files[0]);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success('Document uploaded');
    onAdded(); onClose();
  }

  async function handleLinkDropbox() {
    if (!dropboxPath.trim()) { toast.error('Enter a Dropbox path'); return; }
    setSaving(true);
    const { error } = await addDocument(hunt.id, {
      doc_type: docType,
      title: title || DOC_META[docType].label,
      dropbox_path: dropboxPath.trim(),
      status: 'complete',
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success('Document linked');
    onAdded(); onClose();
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Add Document — {hunt.ref_number}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Document Type</Label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value as HuntDocument['doc_type'])}
            className="mt-1 w-full h-9 text-sm rounded-md border border-input bg-transparent px-3"
          >
            {Object.entries(DOC_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Title (optional)</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={DOC_META[docType].label} className="mt-1 h-8 text-sm" />
        </div>

        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-slate-500 mb-2">Option A — Link from Dropbox</p>
          <Input
            value={dropboxPath}
            onChange={e => setDropboxPath(e.target.value)}
            placeholder="01 Export Client Invoices/2025/WI 9025 .../filename.pdf"
            className="h-8 text-sm mb-2"
          />
          <Button onClick={handleLinkDropbox} disabled={saving} size="sm" variant="outline" className="w-full">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3 mr-1" />}
            Link Dropbox File
          </Button>
        </div>

        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-slate-500 mb-2">Option B — Upload file</p>
          <input ref={fileRef} type="file" className="hidden" onChange={e => handleUpload(e.target.files)} />
          <Button onClick={() => fileRef.current?.click()} disabled={saving} size="sm" variant="outline" className="w-full">
            <Upload className="w-3 h-3 mr-1" /> Upload File
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Staff Doc Creator (job card / receiving sheet / packing list) ─────────
function StaffDocDialog({ hunt, docType, onSaved, onClose }: {
  hunt: ClientHunt;
  docType: 'job_card' | 'receiving_sheet' | 'packing_list';
  onSaved: () => void;
  onClose: () => void;
}) {
  const { addDocument, updateDocument } = useClientHunts(hunt.client_id);
  const existingDoc = hunt.documents.find(d => d.doc_type === docType);
  const [saving, setSaving] = useState(false);

  const JOB_CARD_FIELDS = [
    { key: 'date_received',    label: 'Date Received',    type: 'date' },
    { key: 'ph_name',          label: 'Professional Hunter', type: 'text' },
    { key: 'operator',         label: 'Operator / Outfitter', type: 'text' },
    { key: 'hunt_area',        label: 'Hunt Area',        type: 'text' },
    { key: 'species',          label: 'Species / Trophy', type: 'text', multiline: true },
    { key: 'mount_type',       label: 'Mount Type',       type: 'text' },
    { key: 'special_instructions', label: 'Special Instructions', type: 'text', multiline: true },
    { key: 'condition_notes',  label: 'Condition on Arrival', type: 'text', multiline: true },
    { key: 'received_by',      label: 'Received By',      type: 'text' },
  ];

  const RECEIVING_FIELDS = [
    { key: 'date_received',    label: 'Date Received',    type: 'date' },
    { key: 'ref_number',       label: 'Reference Number', type: 'text' },
    { key: 'from_ph',          label: 'From (PH/Operator)', type: 'text' },
    { key: 'items_received',   label: 'Items Received (list each)', type: 'text', multiline: true },
    { key: 'condition',        label: 'Overall Condition', type: 'text' },
    { key: 'missing_parts',    label: 'Missing / Damaged Parts', type: 'text', multiline: true },
    { key: 'received_by',      label: 'Received By',      type: 'text' },
    { key: 'checked_by',       label: 'Checked By',       type: 'text' },
  ];

  const PACKING_FIELDS = [
    { key: 'date_packed',      label: 'Date Packed',      type: 'date' },
    { key: 'ship_to',          label: 'Ship To (name/address)', type: 'text', multiline: true },
    { key: 'via',              label: 'Via (courier/airline)', type: 'text' },
    { key: 'tracking',         label: 'Tracking / Airway Bill', type: 'text' },
    { key: 'contents',         label: 'Contents (list each item)', type: 'text', multiline: true },
    { key: 'boxes',            label: 'Number of Boxes / Crates', type: 'text' },
    { key: 'total_weight_kg',  label: 'Total Weight (kg)', type: 'text' },
    { key: 'packed_by',        label: 'Packed By',        type: 'text' },
    { key: 'checked_by',       label: 'Checked By',       type: 'text' },
    { key: 'notes',            label: 'Notes',            type: 'text', multiline: true },
  ];

  const FIELDS = docType === 'job_card' ? JOB_CARD_FIELDS
    : docType === 'receiving_sheet' ? RECEIVING_FIELDS
    : PACKING_FIELDS;

  const TITLES = {
    job_card: 'Job Card',
    receiving_sheet: 'Receiving Sheet',
    packing_list: 'Packing List',
  };

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const base = existingDoc?.form_data ?? {};
    const defaults = { ref_number: hunt.ref_number, operator: hunt.operator ?? '', ph_name: hunt.ph ?? '' };
    // ArrivalCheckIn saves different key names — map them so the form shows populated data
    const mapped: Record<string, string> = { ...defaults, ...base };
    if (!mapped.condition_notes && base.condition) mapped.condition_notes = String(base.condition);
    if (!mapped.special_instructions && base.instructions) mapped.special_instructions = String(base.instructions);
    if (!mapped.items_received && base.species) {
      const qty = base.quantity ? `x${base.quantity} ` : '';
      mapped.items_received = `${qty}${base.species}${base.mount_type ? ` (${base.mount_type})` : ''}`;
    }
    return mapped;
  });

  function set(key: string, val: string) {
    setFormData(p => ({ ...p, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    if (existingDoc) {
      const { error } = await updateDocument(existingDoc.id, { form_data: formData, status: 'complete' });
      if (error) { toast.error(error); setSaving(false); return; }
    } else {
      const { error } = await addDocument(hunt.id, {
        doc_type: docType,
        title: `${TITLES[docType]} — ${hunt.ref_number}`,
        form_data: formData,
        status: 'complete',
      });
      if (error) { toast.error(error); setSaving(false); return; }
    }
    setSaving(false);
    toast.success(`${TITLES[docType]} saved`);
    onSaved();
    onClose();
  }

  async function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${TITLES[docType]} — ${hunt.ref_number}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; color: #111; }
        h2 { margin-bottom: 4px; } .sub { color: #555; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td { padding: 6px 8px; border: 1px solid #ccc; vertical-align: top; }
        .label { background: #f5f5f5; font-weight: bold; width: 35%; }
        .value { min-height: 24px; }
        .logo { font-size: 18px; font-weight: bold; color: #1a4d8a; margin-bottom: 2px; }
        footer { margin-top: 32px; font-size: 10px; color: #888; }
      </style></head><body>
      <div class="logo">APEX Trophy Solutions</div>
      <h2>${TITLES[docType]}</h2>
      <div class="sub">Ref: ${hunt.ref_number} | Year: ${hunt.year} | ${hunt.country ?? ''}</div>
      <table>
        ${FIELDS.map(f => `
          <tr>
            <td class="label">${f.label}</td>
            <td class="value">${formData[f.key] ?? ''}</td>
          </tr>
        `).join('')}
      </table>
      <footer>Generated ${new Date().toLocaleDateString()} — Apex Trophy Solutions</footer>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{TITLES[docType]} — {hunt.ref_number} ({hunt.year})</DialogTitle>
      </DialogHeader>
      <div className="space-y-2.5">
        {FIELDS.map(f => (
          <div key={f.key}>
            <Label className="text-xs text-slate-500">{f.label}</Label>
            {f.multiline ? (
              <textarea
                rows={2}
                value={formData[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
              />
            ) : (
              <Input
                type={f.type}
                value={formData[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            )}
          </div>
        ))}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={handlePrint} size="sm">Print / PDF</Button>
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Hunt Card ───────────────────────────────────────────────────────────────
function HuntCard({ hunt, onRefresh }: { hunt: ClientHunt; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [staffDocType, setStaffDocType] = useState<'job_card' | 'receiving_sheet' | 'packing_list' | null>(null);
  const { deleteDocument } = useClientHunts(hunt.client_id);

  const permitDocs = hunt.documents.filter(d => ['permit','cites','import_permit'].includes(d.doc_type));
  const staffDocs  = hunt.documents.filter(d => ['job_card','receiving_sheet','packing_list'].includes(d.doc_type));
  const otherDocs  = hunt.documents.filter(d => ['invoice','other'].includes(d.doc_type));

  async function openDoc(doc: HuntDocument) {
    if (doc.storage_path) {
      const { data } = await supabase.storage
        .from('client-photos')
        .createSignedUrl(doc.storage_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
      else toast.error('Could not open file — ensure the storage bucket exists in Supabase');
    } else if (doc.dropbox_path) {
      window.open(dropboxUrl(doc.dropbox_path), '_blank');
    }
  }

  const statusColor = {
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    cancelled: 'bg-slate-100 text-slate-500',
  }[hunt.status];

  return (
    <>
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Hunt header */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{hunt.ref_number}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}>{hunt.status}</span>
              {hunt.operator && <span className="text-xs text-slate-500">{hunt.operator}</span>}
              {hunt.country  && <span className="text-xs text-slate-400">· {hunt.country}</span>}
            </div>
            {hunt.ph && <p className="text-xs text-slate-400 mt-0.5">PH: {hunt.ph}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hunt.dropbox_path && (
              <a
                href={dropboxUrl(hunt.dropbox_path)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] text-[#0073ea] hover:underline"
              >
                <FolderOpen className="w-3 h-3" /> Dropbox
              </a>
            )}
            {hunt.documents.length > 0 && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                hunt.documents.filter(d => d.status === 'complete').length === hunt.documents.length
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {hunt.documents.filter(d => d.status === 'complete').length}/{hunt.documents.length} docs
              </span>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {open && (
          <div className="px-4 py-3 space-y-3">

            {/* Staff work documents */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Staff Documents</p>
              <div className="grid grid-cols-3 gap-2">
                {(['job_card', 'receiving_sheet', 'packing_list'] as const).map(dt => {
                  const existing = hunt.documents.find(d => d.doc_type === dt);
                  const meta = DOC_META[dt];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={dt}
                      onClick={() => setStaffDocType(dt)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-center transition-colors ${
                        existing
                          ? 'border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800'
                          : 'border-dashed border-slate-300 dark:border-slate-600 hover:border-[#0073ea] hover:bg-blue-50 dark:hover:bg-blue-950/20'
                      }`}
                    >
                      {existing
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <Icon className={`w-4 h-4 ${meta.color}`} />
                      }
                      <span className="text-[10px] font-medium leading-tight text-slate-700 dark:text-slate-300">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Linked documents */}
            {(permitDocs.length > 0 || otherDocs.length > 0) && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Permits & Files</p>
                <div className="space-y-1.5">
                  {[...permitDocs, ...otherDocs].map(doc => {
                    const meta = DOC_META[doc.doc_type];
                    const Icon = meta.icon;
                    return (
                      <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group">
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                        <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{doc.title}</span>
                        {STATUS_ICON[doc.status]}
                        {(doc.dropbox_path || doc.storage_path) && (
                          <button onClick={() => openDoc(doc)} className="opacity-0 group-hover:opacity-100 text-[#0073ea]">
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={async () => { await deleteDocument(doc.id); onRefresh(); }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={() => setAddDocOpen(true)}
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
            >
              <Plus className="w-3 h-3 mr-1" /> Link / Upload Permit or File
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={addDocOpen} onOpenChange={setAddDocOpen}>
        <AddDocDialog hunt={hunt} onAdded={onRefresh} onClose={() => setAddDocOpen(false)} />
      </Dialog>

      {staffDocType && (
        <Dialog open={!!staffDocType} onOpenChange={() => setStaffDocType(null)}>
          <StaffDocDialog
            hunt={hunt}
            docType={staffDocType}
            onSaved={onRefresh}
            onClose={() => setStaffDocType(null)}
          />
        </Dialog>
      )}
    </>
  );
}

// ── Main HuntTimeline export ─────────────────────────────────────────────────
export function HuntTimeline({ clientId }: { clientId: string }) {
  const { hunts, loading, refresh, addHunt } = useClientHunts(clientId);
  const [addOpen, setAddOpen] = useState(false);

  // Group by year descending
  const byYear = hunts.reduce<Record<string, ClientHunt[]>>((acc, h) => {
    (acc[h.year] ??= []).push(h);
    return acc;
  }, {});

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Hunts & Documents</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="w-3 h-3 mr-1" /> Add Hunt
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading hunts…
        </div>
      ) : years.length === 0 ? (
        <button
          onClick={() => setAddOpen(true)}
          className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-8 text-slate-400 hover:border-[#0073ea] hover:text-[#0073ea] transition-colors flex flex-col items-center gap-2"
        >
          <FolderOpen className="w-6 h-6" />
          <span className="text-xs">No hunts yet — click to add</span>
        </button>
      ) : (
        <div className="space-y-4">
          {years.map(year => (
            <div key={year}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{year}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] text-slate-400">{byYear[year].length} hunt{byYear[year].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {byYear[year].map(hunt => (
                  <HuntCard key={hunt.id} hunt={hunt} onRefresh={refresh} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <AddHuntDialog clientId={clientId} onAdded={refresh} onClose={() => setAddOpen(false)} />
      </Dialog>
    </div>
  );
}
