import { useState, useRef } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import { Scan, QrCode, Keyboard, CheckCircle2, X, AlertTriangle, ChevronRight, Tag } from 'lucide-react';

const DEPT_COLORS: Record<string, string> = {
  cleaning_bleach: 'bg-purple-600',
  storage:         'bg-slate-600',
  tannery:         'bg-amber-600',
  mounting:        'bg-green-600',
  finishing:       'bg-orange-600',
  quality_check:   'bg-red-600',
  receiving:       'bg-blue-600',
};

const DEPT_LABELS: Record<string, string> = {
  cleaning_bleach: 'Cleaning & Bleach',
  storage:         'Storage',
  tannery:         'Tannery',
  mounting:        'Mounting',
  finishing:       'Finishing',
  quality_check:   'Quality Check',
  receiving:       'Receiving',
};

const STATUS_NEXT: Record<string, string> = {
  complete:    'in_progress',
  in_progress: 'complete',
  pending:     'in_progress',
};

interface ScannedDoc {
  docId: string;
  huntId: string;
  clientName: string;
  clientNumber: string;
  species: string;
  mountType: string;
  tagNumber: string;
  department: string;
  departmentLead: string;
  status: string;
  condition: string;
  instructions: string;
  matchedPartTag?: string;   // which QR part tag was scanned
  matchedPartLabel?: string;
}

export function PartScanningStation() {
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('manual');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<ScannedDoc[]>([]);
  const [moving, setMoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const raw = scanInput.trim();
    if (!raw) { toast.error('Enter a name, tag or scan a QR code'); return; }
    const tag = raw.toUpperCase();

    setScanning(true);
    try {
      // ── 1. Client name or client number search ────────────────────────────
      // If input looks like a name (no dashes or alphanumeric only ≥3 chars not matching tag patterns)
      const looksLikeTag = /^[A-Z0-9]+-/.test(tag) || /^[A-Z]-\d+$/.test(tag);
      if (!looksLikeTag && raw.length >= 2) {
        // Search clients by name or client_number
        const { data: matchedClients } = await (supabase as any)
          .from('clients')
          .select('id, full_name, client_number')
          .or(`full_name.ilike.%${raw}%,client_number.ilike.%${raw}%`)
          .limit(5);

        if (matchedClients?.length) {
          let added = 0;
          for (const client of matchedClients) {
            // Get all hunts for this client
            const { data: hunts } = await (supabase as any)
              .from('client_hunts')
              .select('id')
              .eq('client_id', client.id);

            if (!hunts?.length) continue;
            const huntIds = hunts.map((h: any) => h.id);

            // Get all job cards across those hunts
            const { data: docs } = await (supabase as any)
              .from('hunt_documents')
              .select('id, hunt_id, status, form_data')
              .eq('doc_type', 'job_card')
              .in('hunt_id', huntIds);

            for (const doc of docs ?? []) {
              if (scanned.find(s => s.docId === doc.id)) continue;
              const fd = doc.form_data ?? {};
              setScanned(prev => [...prev, {
                docId:          doc.id,
                huntId:         doc.hunt_id,
                clientName:     client.full_name,
                clientNumber:   client.client_number ?? '',
                species:        fd.species ?? '',
                mountType:      fd.mount_type ?? '',
                tagNumber:      fd.tag_number ?? '',
                department:     fd.department ?? '',
                departmentLead: fd.department_lead ?? '',
                status:         doc.status,
                condition:      fd.condition ?? '',
                instructions:   fd.instructions ?? '',
              }]);
              added++;
            }
          }
          if (added > 0) {
            toast.success(`Loaded ${added} trophy${added !== 1 ? ' parts' : ''} for "${raw}"`);
          } else {
            toast.info(`No trophies found for "${raw}"`);
          }
          setScanInput('');
          setScanning(false);
          inputRef.current?.focus();
          return;
        }
      }

      // ── 2. Exact tag_number match (e.g. "A-0001") ─────────────────────────
      if (scanned.find(s => s.tagNumber === tag || s.matchedPartTag === tag)) {
        toast.info('Already in the list'); setScanInput(''); setScanning(false); return;
      }

      const { data: byTag } = await (supabase as any)
        .from('hunt_documents')
        .select('id, hunt_id, status, form_data')
        .eq('doc_type', 'job_card')
        .ilike('form_data->>tag_number', tag)
        .limit(1)
        .maybeSingle();

      // ── 3. QR part tag inside form_data.parts[].tag ───────────────────────
      let byPartTag: any = null;
      let matchedPart: any = null;
      if (!byTag) {
        const { data: allDocs } = await (supabase as any)
          .from('hunt_documents')
          .select('id, hunt_id, status, form_data')
          .eq('doc_type', 'job_card')
          .not('form_data->parts', 'is', null);

        if (allDocs) {
          for (const doc of allDocs) {
            const parts = doc.form_data?.parts ?? [];
            const part = parts.find((p: any) => (p.tag ?? '').toUpperCase() === tag);
            if (part) { byPartTag = doc; matchedPart = part; break; }
          }
        }
      }

      const doc = byTag ?? byPartTag;
      if (!doc) { toast.error(`Nothing found for "${raw}"`); setScanInput(''); setScanning(false); return; }

      // Load hunt + client info
      const { data: hunt } = await (supabase as any)
        .from('client_hunts').select('id, client_id').eq('id', doc.hunt_id).single();

      const { data: client } = hunt
        ? await (supabase as any).from('clients').select('full_name, client_number').eq('id', hunt.client_id).single()
        : { data: null };

      const fd = doc.form_data ?? {};
      setScanned(prev => [...prev, {
        docId:            doc.id,
        huntId:           doc.hunt_id,
        clientName:       client?.full_name ?? 'Unknown',
        clientNumber:     client?.client_number ?? '',
        species:          fd.species ?? '',
        mountType:        fd.mount_type ?? '',
        tagNumber:        fd.tag_number ?? tag,
        department:       fd.department ?? '',
        departmentLead:   fd.department_lead ?? '',
        status:           doc.status,
        condition:        fd.condition ?? '',
        instructions:     fd.instructions ?? '',
        matchedPartTag:   matchedPart ? tag : undefined,
        matchedPartLabel: matchedPart?.label,
      }]);

      toast.success(`Found: ${fd.species} — ${client?.full_name ?? 'Unknown'}`);
    } catch (err: any) {
      toast.error('Lookup failed: ' + err.message);
    } finally {
      setScanInput('');
      setScanning(false);
      inputRef.current?.focus();
    }
  }

  async function moveToNextStatus(docId: string, currentStatus: string) {
    const next = STATUS_NEXT[currentStatus] ?? 'in_progress';
    const { error } = await (supabase as any)
      .from('hunt_documents')
      .update({ status: next })
      .eq('id', docId);

    if (error) { toast.error('Failed to update status'); return; }
    setScanned(prev => prev.map(s => s.docId === docId ? { ...s, status: next } : s));
    toast.success(`Status updated → ${next.replace('_', ' ')}`);
  }

  async function bulkMoveAll() {
    setMoving(true);
    let done = 0;
    for (const s of scanned) {
      const next = STATUS_NEXT[s.status] ?? 'in_progress';
      const { error } = await (supabase as any)
        .from('hunt_documents').update({ status: next }).eq('id', s.docId);
      if (!error) done++;
    }
    setScanned(prev => prev.map(s => ({ ...s, status: STATUS_NEXT[s.status] ?? 'in_progress' })));
    setMoving(false);
    toast.success(`${done} trophy${done !== 1 ? ' trophies' : ''} updated`);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Scan className="w-6 h-6 text-blue-500" />
          Scan Parts
        </h1>
        <p className="text-slate-500 text-sm mt-1">Scan a QR code or type a tag number to look up a trophy</p>
      </div>

      {/* Scan input */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => setScanMode('qr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              scanMode === 'qr'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-400'
            }`}
          >
            <QrCode className="w-4 h-4" /> QR Scan
          </button>
          <button
            onClick={() => setScanMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              scanMode === 'manual'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-400'
            }`}
          >
            <Keyboard className="w-4 h-4" /> Manual
          </button>
        </div>

        <form onSubmit={handleScan} className="flex gap-3">
          <div className="relative flex-1">
            {scanMode === 'qr'
              ? <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              : <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
            <Input
              ref={inputRef}
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder={scanMode === 'qr' ? 'Point QR scanner here…' : 'e.g. A-0001 or E042-ZEB-T1-CAPE'}
              className="h-14 pl-12 text-lg font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={scanning} className="h-14 px-6 bg-blue-600 hover:bg-blue-700">
            {scanning ? 'Looking up…' : 'Find'}
          </Button>
        </form>
      </div>

      {/* Scanned list */}
      {scanned.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{scanned.length} trophy{scanned.length !== 1 ? ' parts' : ''} scanned</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setScanned([])}>Clear All</Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={bulkMoveAll} disabled={moving}>
                {moving ? 'Updating…' : 'Move All → Next Status'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {scanned.map(s => {
              const dept = DEPT_LABELS[s.department] ?? s.department;
              const deptColor = DEPT_COLORS[s.department] ?? 'bg-slate-500';
              const isComplete = s.status === 'complete';

              return (
                <div key={s.docId} className={`bg-white dark:bg-slate-800 rounded-xl border-2 transition-all ${
                  isComplete
                    ? 'border-green-500 dark:border-green-600'
                    : 'border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center gap-3 p-4">
                    {/* Status icon */}
                    {isComplete
                      ? <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                      : <div className="w-6 h-6 rounded-full border-2 border-slate-400 shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">{s.species}</span>
                        <span className="text-slate-500 text-sm">{s.mountType}</span>
                        {s.condition === 'damaged' && (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Damaged
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{s.tagNumber}</span>
                        {s.clientNumber && (
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.clientNumber}</span>
                        )}
                        <span className="text-xs text-slate-500">— {s.clientName}</span>
                        {s.matchedPartTag && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
                            {s.matchedPartLabel ?? s.matchedPartTag}
                          </span>
                        )}
                      </div>
                      {s.instructions && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 line-clamp-1">{s.instructions}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {dept && (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${deptColor}`}>
                          {dept}
                        </span>
                      )}
                      {s.departmentLead && (
                        <span className="text-xs text-slate-500">{s.departmentLead}</span>
                      )}
                      <Badge variant="outline" className={`text-xs ${
                        s.status === 'complete'   ? 'border-green-400 text-green-600' :
                        s.status === 'in_progress'? 'border-blue-400 text-blue-600'  :
                                                    'border-slate-300 text-slate-500'
                      }`}>
                        {s.status.replace('_', ' ')}
                      </Badge>
                      <button
                        onClick={() => moveToNextStatus(s.docId, s.status)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Move <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setScanned(prev => prev.filter(x => x.docId !== s.docId))}>
                        <X className="w-4 h-4 text-slate-400 hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {scanned.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Scan className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No parts scanned yet</p>
          <p className="text-sm mt-1">Scan a QR code from a trophy label or type a tag number above</p>
        </div>
      )}
    </div>
  );
}
