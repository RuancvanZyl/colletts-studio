import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle, Loader2, ClipboardList } from 'lucide-react';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { PhaseAdvanceDialog } from '../shared/PhaseAdvanceDialog';
import { useAuth } from '../../../../lib/auth';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';
import type { JobWithRelations } from '../../../../lib/hooks/useJobs';

const QC_CHECKS = [
  { key: 'symmetry', label: 'Facial symmetry and proportion' },
  { key: 'stitching', label: 'Stitching (hidden and tight)' },
  { key: 'paint', label: 'Paint quality and colour accuracy' },
  { key: 'eyes', label: 'Eye positioning and expression' },
  { key: 'finish', label: 'Base / habitat finish' },
  { key: 'photos', label: 'Quality photos taken' },
];

export function QualityInspection() {
  const { user } = useAuth();
  const { jobs, loading, refresh, advancePhase } = useJobs('quality_check');
  const [selected, setSelected] = useState<JobWithRelations | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [failNotes, setFailNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [passTarget, setPassTarget] = useState<JobWithRelations | null>(null);

  function openJob(job: JobWithRelations) {
    setSelected(job);
    setChecks({});
    setFailNotes('');
  }

  const allChecked = QC_CHECKS.every(c => checks[c.key]);

  async function handleFail() {
    if (!user || !selected) return;
    if (!failNotes.trim()) { toast.error('Add failure notes before failing QC'); return; }
    setSaving(true);

    // Write checkpoint with fail notes, send back to finishing
    const result = await advancePhase(selected.id, 'finishing', user.id, { comment: `QC FAILED: ${failNotes}` });
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.warning('Trophy returned to Finishing with QC failure notes');
    setSelected(null);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Quality Inspection</h1>
          <p className="text-slate-600 dark:text-slate-400">Final quality check before packing</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Job list */}
      {loading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
      ) : jobs.length === 0 ? (
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
              <ClipboardList className="w-5 h-5 text-emerald-600" />
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
                    <TableHead>Due</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(job => {
                    const overdue = job.due_date && new Date(job.due_date) < new Date();
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-sm">
                          {job.specimens?.tag_number ?? '—'}
                          {job.rush && <Badge className="ml-2 bg-red-600 text-xs">RUSH</Badge>}
                        </TableCell>
                        <TableCell className="font-medium">{job.specimens?.clients?.full_name ?? '—'}</TableCell>
                        <TableCell>{job.specimens?.species?.common_name ?? job.specimens?.species_name ?? '—'}</TableCell>
                        <TableCell>{job.mount_types?.name ?? '—'}</TableCell>
                        <TableCell>
                          {job.due_date ? (
                            <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : ''}`}>
                              {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                              {new Date(job.due_date).toLocaleDateString()}
                            </span>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => openJob(job)}>
                            <ClipboardList className="w-4 h-4 mr-1" />Inspect
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Inspection form */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Inspecting: {selected.specimens?.tag_number ?? selected.id.slice(0, 8)}
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>← Back</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trophy info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div><p className="text-xs text-slate-500">Client</p><p className="text-sm font-medium">{selected.specimens?.clients?.full_name ?? '—'}</p></div>
              <div><p className="text-xs text-slate-500">Species</p><p className="text-sm font-medium">{selected.specimens?.species?.common_name ?? selected.specimens?.species_name ?? '—'}</p></div>
              <div><p className="text-xs text-slate-500">Mount Type</p><p className="text-sm font-medium">{selected.mount_types?.name ?? '—'}</p></div>
              <div><p className="text-xs text-slate-500">Due</p><p className={`text-sm font-medium ${selected.due_date && new Date(selected.due_date) < new Date() ? 'text-red-600' : ''}`}>{selected.due_date ? new Date(selected.due_date).toLocaleDateString() : '—'}</p></div>
            </div>

            {/* QC Checklist */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Quality Checklist</h3>
              <div className="space-y-2">
                {QC_CHECKS.map(item => (
                  <div key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Checkbox
                      id={item.key}
                      checked={!!checks[item.key]}
                      onCheckedChange={v => setChecks(prev => ({ ...prev, [item.key]: v as boolean }))}
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
              <Textarea id="failNotes" value={failNotes} onChange={e => setFailNotes(e.target.value)} placeholder="Describe issues found..." rows={3} className="mt-1" />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button className="bg-green-600 hover:bg-green-700" disabled={!allChecked} onClick={() => setPassTarget(selected)}>
                <CheckCircle2 className="w-4 h-4 mr-2" />Pass QC — Move to Packing
              </Button>
              <Button variant="destructive" disabled={saving} onClick={handleFail}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Fail QC — Return to Finishing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {passTarget && (
        <PhaseAdvanceDialog
          open={true}
          onClose={() => setPassTarget(null)}
          jobId={passTarget.id}
          currentPhase="quality_check"
          nextPhase="packing"
          jobLabel={`${passTarget.specimens?.species?.common_name ?? passTarget.specimens?.species_name ?? 'Trophy'} — ${passTarget.specimens?.clients?.full_name ?? ''}`}
          onConfirm={async (jobId, nextPhase, staffId, proof) => {
            const result = await advancePhase(jobId, nextPhase, staffId, proof);
            if (!result.error) setSelected(null);
            return result;
          }}
        />
      )}
    </div>
  );
}
