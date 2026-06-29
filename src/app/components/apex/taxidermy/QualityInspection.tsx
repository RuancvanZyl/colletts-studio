import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle, Loader2, ClipboardList } from 'lucide-react';
import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { DEPT_COLORS } from '../../../../lib/pipeline';
import { toast } from 'sonner';
import type { DeptJob } from '../../../../lib/hooks/useDeptJobs';

const QC_CHECKS = [
  { key: 'symmetry', label: 'Facial symmetry and proportion' },
  { key: 'stitching', label: 'Stitching (hidden and tight)' },
  { key: 'paint',    label: 'Paint quality and colour accuracy' },
  { key: 'eyes',     label: 'Eye positioning and expression' },
  { key: 'finish',   label: 'Base / habitat finish' },
  { key: 'photos',   label: 'Quality photos taken' },
];

export function QualityInspection() {
  const { jobs, loading, completing, load, advance } = useDeptJobs('quality_check');
  const [selected, setSelected] = useState<DeptJob | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [failNotes, setFailNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function openJob(job: DeptJob) {
    setSelected(job);
    setChecks({});
    setFailNotes('');
  }

  const allChecked = QC_CHECKS.every(c => checks[c.key]);

  async function handlePass() {
    if (!selected) return;
    const result = await advance(selected); // advances to photos
    if (result.error) {
      toast.error('Failed: ' + result.error);
    } else {
      toast.success('QC passed — moved to Photos');
      setSelected(null);
    }
  }

  async function handleFail() {
    if (!selected) return;
    if (!failNotes.trim()) { toast.error('Add failure notes before failing QC'); return; }
    setSaving(true);
    const result = await advance(selected, 'finishing'); // send back to finishing
    setSaving(false);
    if (result.error) {
      toast.error('Failed: ' + result.error);
    } else {
      toast.warning('Trophy returned to Finishing with QC failure notes');
      setSelected(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Quality Inspection</h1>
          <p className="text-slate-600 dark:text-slate-400">Final quality check before photos</p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
      ) : jobs.length === 0 && !selected ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No trophies awaiting QC</p>
          </CardContent>
        </Card>
      ) : !selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-600" />
              Awaiting Inspection ({jobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Mount Type</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(job => (
                    <TableRow key={job.docId}>
                      <TableCell className="font-mono text-sm">{job.tagNumber || '—'}</TableCell>
                      <TableCell className="font-medium">
                        {job.clientNumber && <span className="text-xs text-slate-500 mr-1">{job.clientNumber}</span>}
                        {job.clientName}
                      </TableCell>
                      <TableCell>{job.species || '—'}</TableCell>
                      <TableCell>{job.mountType || '—'}</TableCell>
                      <TableCell>
                        {job.condition === 'damaged'
                          ? <Badge className="bg-red-600 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Damaged</Badge>
                          : <Badge variant="outline" className="text-xs capitalize">{job.condition || 'Good'}</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => openJob(job)}>
                          <ClipboardList className="w-4 h-4 mr-1" />Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-red-600" />
                Inspecting: {selected.tagNumber || selected.species}
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>← Back</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trophy info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div><p className="text-xs text-slate-500">Client</p><p className="text-sm font-medium">{selected.clientName}</p></div>
              <div><p className="text-xs text-slate-500">Species</p><p className="text-sm font-medium">{selected.species || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Mount Type</p><p className="text-sm font-medium">{selected.mountType || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Tag</p><p className="text-sm font-mono">{selected.tagNumber || '—'}</p></div>
            </div>

            {selected.instructions && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Special Instructions</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{selected.instructions}</p>
              </div>
            )}

            {/* QC Checklist */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Quality Checklist</h3>
              <div className="space-y-2">
                {QC_CHECKS.map(item => (
                  <div key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox
                      id={item.key}
                      checked={!!checks[item.key]}
                      onCheckedChange={(v: boolean | 'indeterminate') => setChecks(prev => ({ ...prev, [item.key]: v === true }))}
                    />
                    <Label htmlFor={item.key} className="flex-1 cursor-pointer">{item.label}</Label>
                    {checks[item.key] && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Failure notes */}
            <div>
              <Label htmlFor="failNotes" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Failure Notes (required if failing QC)
              </Label>
              <Textarea
                id="failNotes"
                value={failNotes}
                onChange={e => setFailNotes(e.target.value)}
                placeholder="Describe issues found..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={!allChecked || completing === selected.docId}
                onClick={handlePass}
              >
                {completing === selected.docId
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4 mr-2" />
                }
                Pass QC — Move to Photos
              </Button>
              <Button
                variant="destructive"
                disabled={saving || completing === selected.docId}
                onClick={handleFail}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Fail QC — Return to Finishing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
