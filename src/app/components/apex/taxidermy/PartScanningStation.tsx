import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Scan, QrCode, Keyboard, ArrowRight, CheckCircle2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useJobLookup } from '../../../../lib/hooks/useJobLookup';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { useAuth } from '../../../../lib/auth';
import { PhaseAdvanceDialog, PHASE_LABELS } from '../shared/PhaseAdvanceDialog';
import type { JobPhase } from '../../../../lib/database.types';
import type { FoundJob } from '../../../../lib/hooks/useJobLookup';

const PHASE_ORDER: JobPhase[] = [
  'intake', 'skin_processing', 'skull_processing', 'storage_pre',
  'tannery', 'storage_post', 'mounting', 'finishing',
  'quality_check', 'packing', 'shipped', 'delivered',
];

function nextPhaseFor(current: JobPhase): JobPhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

interface ScanEntry extends FoundJob {
  selected: boolean;
  targetPhase: JobPhase;
}

export function PartScanningStation() {
  const { user } = useAuth();
  const { lookupByTag, loading: looking } = useJobLookup();
  const { advancePhase } = useJobs();
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('manual');
  const [scanned, setScanned] = useState<ScanEntry[]>([]);
  const [overridePhase, setOverridePhase] = useState<JobPhase | ''>('');
  const [advanceTarget, setAdvanceTarget] = useState<ScanEntry | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const tag = scanInput.trim();
    if (!tag) { toast.error('Enter a tag or scan'); return; }

    // Prevent duplicates
    if (scanned.find(s => s.specimenTag === tag || s.jobId === tag)) {
      toast.info('Already in list');
      setScanInput('');
      return;
    }

    const { data, error } = await lookupByTag(tag);
    if (error || !data) { toast.error(error ?? 'Not found'); setScanInput(''); return; }

    const next = overridePhase ? overridePhase as JobPhase : (nextPhaseFor(data.jobPhase) ?? data.jobPhase);
    setScanned(prev => [...prev, { ...data, selected: true, targetPhase: next }]);
    setScanInput('');
    toast.success(`Found: ${data.speciesName ?? 'Trophy'} — ${data.clientName}`);
  }

  function removeEntry(jobId: string) {
    setScanned(prev => prev.filter(s => s.jobId !== jobId));
  }

  function toggle(jobId: string) {
    setScanned(prev => prev.map(s => s.jobId === jobId ? { ...s, selected: !s.selected } : s));
  }

  async function handleBulkAdvance() {
    if (!user) { toast.error('Not logged in'); return; }
    const targets = scanned.filter(s => s.selected);
    if (targets.length === 0) { toast.error('Select at least one'); return; }

    let done = 0;
    for (const t of targets) {
      // Bulk advance uses a generic comment (staff can add per-item via individual dialog)
      const result = await advancePhase(t.jobId, t.targetPhase, user.id, { comment: 'Bulk phase advance via scan station' });
      if (!result.error) done++;
      else toast.error(`${t.specimenTag}: ${result.error}`);
    }
    if (done > 0) {
      toast.success(`${done} job${done !== 1 ? 's' : ''} advanced`);
      setScanned(prev => prev.filter(s => !s.selected));
    }
  }

  const selected = scanned.filter(s => s.selected);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Scan & Move Parts</h1>
        <p className="text-slate-600 dark:text-slate-400">Scan specimen or part tags to move jobs through production phases</p>
      </div>

      {/* Override destination */}
      <Card>
        <CardHeader>
          <CardTitle>Target Phase Override</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Force destination phase (optional)</Label>
              <Select value={overridePhase} onValueChange={v => setOverridePhase(v as JobPhase | '')}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Auto — use each job's natural next phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto — natural next phase</SelectItem>
                  {PHASE_ORDER.map(p => (
                    <SelectItem key={p} value={p}>{PHASE_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {overridePhase && (
              <div className="flex items-end">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-900 dark:text-blue-100">
                  All scanned jobs → <strong>{PHASE_LABELS[overridePhase as JobPhase]}</strong>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scan input */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Scan Tag</CardTitle>
            <div className="flex gap-2">
              <Button variant={scanMode === 'qr' ? 'default' : 'outline'} size="sm" onClick={() => setScanMode('qr')}>
                <QrCode className="w-4 h-4 mr-2" />QR Code
              </Button>
              <Button variant={scanMode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setScanMode('manual')}>
                <Keyboard className="w-4 h-4 mr-2" />Manual
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-3">
            <div className="relative flex-1">
              {scanMode === 'qr' ? <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /> : <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
              <Input
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder={scanMode === 'qr' ? 'Scan QR code...' : 'Enter tag number...'}
                className="text-lg h-14 pl-12"
                autoFocus
              />
            </div>
            <Button type="submit" className="h-14 px-6" disabled={looking}>
              {looking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Scanned list */}
      {scanned.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scanned Jobs ({scanned.length})</CardTitle>
              <Badge variant="secondary">{selected.length} selected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Current Phase</TableHead>
                    <TableHead>Target Phase</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanned.map(entry => (
                    <TableRow key={entry.jobId}>
                      <TableCell>
                        <input type="checkbox" checked={entry.selected} onChange={() => toggle(entry.jobId)} className="w-4 h-4 rounded" />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.specimenTag ?? entry.jobId.slice(0, 8)}
                        {entry.rush && <Badge className="ml-2 bg-red-600 text-xs">RUSH</Badge>}
                      </TableCell>
                      <TableCell className="font-medium">{entry.clientName}</TableCell>
                      <TableCell>{entry.speciesName ?? '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{PHASE_LABELS[entry.jobPhase]}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <Badge className="bg-blue-600">{PHASE_LABELS[entry.targetPhase]}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                        {entry.dueDate ? new Date(entry.dueDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Advance individually" onClick={() => setAdvanceTarget(entry)}>
                            <ArrowRight className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeEntry(entry.jobId)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button onClick={handleBulkAdvance} disabled={selected.length === 0} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Bulk Advance {selected.length} Job{selected.length !== 1 ? 's' : ''}
              </Button>
              <Button variant="outline" onClick={() => setScanned([])}>Clear All</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Scan className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No jobs scanned — scan or type a tag to begin</p>
          </CardContent>
        </Card>
      )}

      {advanceTarget && (
        <PhaseAdvanceDialog
          open={true}
          onClose={() => setAdvanceTarget(null)}
          jobId={advanceTarget.jobId}
          currentPhase={advanceTarget.jobPhase}
          nextPhase={advanceTarget.targetPhase}
          jobLabel={`${advanceTarget.speciesName ?? 'Trophy'} — ${advanceTarget.clientName}`}
          onConfirm={async (jobId, nextPhase, staffId, proof) => {
            const result = await advancePhase(jobId, nextPhase, staffId, proof);
            if (!result.error) {
              setScanned(prev => prev.filter(s => s.jobId !== jobId));
            }
            return result;
          }}
        />
      )}
    </div>
  );
}
