import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  FolderOpen, ChevronRight, ChevronDown, Loader2, CheckCircle2,
  Download, ExternalLink, AlertTriangle, RefreshCw, Search, X,
} from 'lucide-react';
import { getAllEntries, getDropboxWebUrl, type DropboxEntry } from '../../../../lib/dropbox';
import { supabase } from '../../../../lib/supabase';
import { useClients } from '../../../../lib/hooks/useClients';
import { DEPT_LABELS } from '../../../../lib/pipeline';
import { toast } from 'sonner';

// ── Folder name parser ────────────────────────────────────────────────────────
// Handles: T0126 ClientName E838-Operator-notes
//          ST0126 ClientName E833-notes
//          WI 2526 ClientName E857-Operator-notes

type ParsedFolder = {
  refNumber: string;
  clientName: string;
  eNumber: string;
  operator: string;
  jobType: 'taxidermy' | 'skull_tanning' | 'dip_pack' | 'other';
  notes: string;
  year: string;
};

function parseFolder(name: string, year: string): ParsedFolder {
  // Match patterns like T0126, ST0126, WI 2526, WI0526
  const match = name.match(/^(ST|WI\s*|T|DP)(\d+)\s+(.*)/i);
  if (!match) return { refNumber: name, clientName: name, eNumber: '', operator: '', jobType: 'other', notes: '', year };

  const prefix = match[1].trim().toUpperCase();
  const num = match[2];
  const rest = match[3];

  const jobType: ParsedFolder['jobType'] =
    prefix === 'ST' ? 'skull_tanning' :
    prefix === 'DP' ? 'dip_pack' :
    prefix === 'T'  ? 'taxidermy' : 'other';

  const refNumber = `${prefix}${num}`;

  // Extract E-number: looks for E followed by 3 digits
  const eMatch = rest.match(/\bE(\d{3,4})\b/i);
  const eNumber = eMatch ? `E${eMatch[1]}` : '';

  // Extract operator (text after E-number, before dash-notes)
  // Typical: "ClientName E838-OperatorName-status notes"
  let clientName = rest;
  let operator = '';
  let notes = '';

  if (eMatch) {
    const beforeE = rest.slice(0, eMatch.index).trim();
    const afterE  = rest.slice((eMatch.index ?? 0) + eMatch[0].length).trim();
    clientName = beforeE;

    // After E-number: -OperatorName-status notes
    const parts = afterE.replace(/^[-\s]+/, '').split('-');
    operator = parts[0]?.trim() ?? '';
    notes    = parts.slice(1).join(' ').trim();
  }

  // Clean up client name — remove trailing dashes/operators
  clientName = clientName.replace(/[-]+$/, '').trim();

  return { refNumber, clientName, eNumber, operator, jobType, notes, year };
}

function jobTypeBadge(jt: ParsedFolder['jobType']) {
  const map = {
    taxidermy:    { label: 'Taxidermy',      cls: 'bg-blue-100 text-blue-700' },
    skull_tanning:{ label: 'Skull/Tanning',  cls: 'bg-amber-100 text-amber-700' },
    dip_pack:     { label: 'Dip & Pack',     cls: 'bg-purple-100 text-purple-700' },
    other:        { label: 'Other',          cls: 'bg-slate-100 text-slate-600' },
  };
  const m = map[jt];
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

// ── Default department per job type ──────────────────────────────────────────
function defaultDept(jt: ParsedFolder['jobType']): string {
  if (jt === 'skull_tanning') return 'cleaning_bleach';
  if (jt === 'dip_pack')      return 'administration';
  return 'mounting';
}

// ── Year → category → client folder structure ─────────────────────────────────

const DROPBOX_ROOT = ((import.meta as any).env?.VITE_DROPBOX_ROOT as string | undefined) || '/Colletts SA';
const CLIENT_BASE  = `${DROPBOX_ROOT}/01 Export Client Invoices`;

// ── ImportRow — single folder being imported ──────────────────────────────────
type ImportRow = {
  folder: DropboxEntry;
  parsed: ParsedFolder;
  clientId: string;
  currentDept: string;
  importing: boolean;
  done: boolean;
  error: string | null;
};

// ── Main component ────────────────────────────────────────────────────────────
export function DropboxImport() {
  const { clients } = useClients();
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [categories, setCategories] = useState<DropboxEntry[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [folders, setFolders] = useState<DropboxEntry[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState<ImportRow[]>([]);
  const [importingAll, setImportingAll] = useState(false);

  // Load years
  useEffect(() => {
    getAllEntries(CLIENT_BASE).then(entries => {
      const ys = entries
        .filter(e => e['.tag'] === 'folder' && /^\d{4}$/.test(e.name))
        .map(e => e.name)
        .sort((a, b) => Number(b) - Number(a));
      setYears(ys);
      if (ys.length) setSelectedYear(ys[0]);
    }).catch(() => toast.error('Could not connect to Dropbox'));
  }, []);

  // Load categories when year changes
  useEffect(() => {
    if (!selectedYear) return;
    setCategories([]);
    setSelectedCat('');
    setFolders([]);
    getAllEntries(`${CLIENT_BASE}/${selectedYear}`).then(entries => {
      const cats = entries.filter(e => e['.tag'] === 'folder');
      setCategories(cats);
      // Also load client folders directly at year level (WI folders)
      const direct = entries.filter(e => e['.tag'] === 'folder' && /^(T|ST|WI|DP)/i.test(e.name));
      if (direct.length) setFolders(direct);
    });
  }, [selectedYear]);

  // Load folders when category changes
  async function loadCategory(catPath: string, catName: string) {
    setSelectedCat(catName);
    setLoadingFolders(true);
    setFolders([]);
    try {
      const entries = await getAllEntries(catPath);
      setFolders(entries.filter(e => e['.tag'] === 'folder'));
    } catch {
      toast.error('Could not load category');
    } finally {
      setLoadingFolders(false);
    }
  }

  const filtered = folders.filter(f => {
    if (!search) return true;
    return f.name.toLowerCase().includes(search.toLowerCase());
  });

  function addToQueue(folder: DropboxEntry) {
    if (queue.find(r => r.folder.id === folder.id)) return;
    const parsed = parseFolder(folder.name, selectedYear);
    // Try to match client by name
    const matchedClient = clients.find(c =>
      c.full_name.toLowerCase().includes(parsed.clientName.toLowerCase().split(' ')[0]) ||
      parsed.clientName.toLowerCase().includes(c.full_name.toLowerCase().split(' ')[0])
    );
    setQueue(prev => [...prev, {
      folder,
      parsed,
      clientId: matchedClient?.id ?? '',
      currentDept: defaultDept(parsed.jobType),
      importing: false,
      done: false,
      error: null,
    }]);
  }

  function removeFromQueue(id: string) {
    setQueue(prev => prev.filter(r => r.folder.id !== id));
  }

  function updateQueue(id: string, patch: Partial<ImportRow>) {
    setQueue(prev => prev.map(r => r.folder.id === id ? { ...r, ...patch } : r));
  }

  async function importRow(row: ImportRow): Promise<boolean> {
    if (!row.clientId) { updateQueue(row.folder.id, { error: 'Select a client' }); return false; }
    updateQueue(row.folder.id, { importing: true, error: null });
    try {
      // Create client_hunt
      const { data: hunt, error: huntErr } = await (supabase as any)
        .from('client_hunts')
        .insert({
          client_id:    row.clientId,
          year:         row.parsed.year,
          ref_number:   row.parsed.refNumber,
          operator:     row.parsed.operator || null,
          dropbox_path: row.folder.path_display.replace(DROPBOX_ROOT + '/', ''),
          status:       'active',
        })
        .select().single();
      if (huntErr) throw new Error(huntErr.message);

      // Create one job_card with what we know from the folder name
      await (supabase as any).from('hunt_documents').insert({
        hunt_id:            hunt.id,
        doc_type:           'job_card',
        title:              `${row.parsed.clientName} — ${row.parsed.refNumber}`,
        status:             'in_progress',
        current_department: row.currentDept,
        form_data: {
          species:       '',
          mount_type:    row.parsed.jobType === 'skull_tanning' ? 'Euro Skull' : 'Shoulder Mount',
          tag_number:    row.parsed.eNumber,
          condition:     'unknown',
          instructions:  row.parsed.notes,
          received_at:   new Date().toISOString(),
          stage_history: [],
        },
      });

      updateQueue(row.folder.id, { importing: false, done: true });
      return true;
    } catch (err: any) {
      updateQueue(row.folder.id, { importing: false, error: err.message });
      return false;
    }
  }

  async function importAll() {
    setImportingAll(true);
    let ok = 0;
    for (const row of queue.filter(r => !r.done)) {
      const success = await importRow(row);
      if (success) ok++;
    }
    setImportingAll(false);
    if (ok > 0) toast.success(`${ok} hunt${ok !== 1 ? 's' : ''} imported into pipeline`);
  }

  const pendingCount = queue.filter(r => !r.done).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-[#0073ea]" /> Dropbox Import
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Browse your Dropbox client folders and import them into the department pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Dropbox browser */}
        <div className="space-y-3">
          {/* Year tabs */}
          <div className="flex gap-1 flex-wrap">
            {years.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedYear === y ? 'bg-[#0073ea] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}>
                {y}
              </button>
            ))}
          </div>

          {/* Category list */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => loadCategory(cat.path_display, cat.name)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedCat === cat.name
                      ? 'bg-[#0073ea] text-white border-[#0073ea]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:border-[#0073ea]'
                  }`}>
                  <FolderOpen className="w-3 h-3" /> {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          {folders.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client name…" className="pl-9 h-8 text-sm" />
            </div>
          )}

          {/* Folder list */}
          {loadingFolders ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading folders…
            </div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map(folder => {
                const parsed = parseFolder(folder.name, selectedYear);
                const inQueue = queue.some(r => r.folder.id === folder.id);
                const done    = queue.find(r => r.folder.id === folder.id)?.done;
                return (
                  <div key={folder.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      done    ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                      inQueue ? 'border-[#0073ea] bg-blue-50 dark:bg-blue-950/20' :
                                'border-slate-200 dark:border-slate-700 hover:border-[#0073ea] hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => !inQueue && !done && addToQueue(folder)}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> :
                     inQueue ? <CheckCircle2 className="w-4 h-4 text-[#0073ea] shrink-0" /> :
                     <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{parsed.refNumber}</span>
                        {jobTypeBadge(parsed.jobType)}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{parsed.clientName}</p>
                      {parsed.operator && <p className="text-[10px] text-slate-400">{parsed.operator}</p>}
                    </div>
                    <a href={getDropboxWebUrl(folder.path_display)} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()} className="text-slate-300 hover:text-[#0073ea] shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
              {filtered.length === 0 && folders.length === 0 && (
                <p className="text-sm text-slate-400 py-6 text-center">Select a year and category above</p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Import queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Import Queue <Badge variant="secondary" className="ml-1">{queue.length}</Badge>
            </h2>
            {pendingCount > 0 && (
              <Button size="sm" onClick={importAll} disabled={importingAll} className="h-7 text-xs">
                {importingAll ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Importing…</> :
                  <><Download className="w-3 h-3 mr-1" />Import All ({pendingCount})</>}
              </Button>
            )}
          </div>

          {queue.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Click folders on the left to add them here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {queue.map(row => (
                <Card key={row.folder.id} className={`overflow-hidden ${
                  row.done  ? 'border-green-300' :
                  row.error ? 'border-red-300' : ''
                }`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold">{row.parsed.refNumber}</span>
                          {jobTypeBadge(row.parsed.jobType)}
                          {row.done && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Imported</span>}
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{row.parsed.clientName}</p>
                        {row.parsed.operator && <p className="text-xs text-slate-400">{row.parsed.operator}</p>}
                      </div>
                      {!row.done && (
                        <button onClick={() => removeFromQueue(row.folder.id)} className="text-slate-300 hover:text-red-400 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {!row.done && (
                      <>
                        {/* Client match */}
                        <div>
                          <Label className="text-[11px] text-slate-500">Client *</Label>
                          <select
                            value={row.clientId}
                            onChange={e => updateQueue(row.folder.id, { clientId: e.target.value })}
                            className="mt-0.5 w-full h-7 text-xs rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
                          >
                            <option value="">— select client —</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.full_name}{(c as any).client_number ? ` · ${(c as any).client_number}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Current department */}
                        <div>
                          <Label className="text-[11px] text-slate-500">Currently In</Label>
                          <select
                            value={row.currentDept}
                            onChange={e => updateQueue(row.folder.id, { currentDept: e.target.value })}
                            className="mt-0.5 w-full h-7 text-xs rounded-md border border-input bg-transparent px-2 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
                          >
                            {Object.entries(DEPT_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>

                        {row.error && (
                          <div className="flex items-center gap-1.5 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> {row.error}
                          </div>
                        )}

                        <Button size="sm" onClick={() => importRow(row)} disabled={row.importing}
                          className="w-full h-7 text-xs">
                          {row.importing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Importing…</> : 'Import'}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
