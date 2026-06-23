import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Warehouse, ArrowRight, RefreshCw, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { PhaseAdvanceDialog, PHASE_LABELS } from '../shared/PhaseAdvanceDialog';
import type { JobWithRelations } from '../../../../lib/hooks/useJobs';

function daysIn(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function JobTable({
  jobs,
  nextPhase,
  onAdvance,
}: {
  jobs: JobWithRelations[];
  nextPhase: 'tannery' | 'mounting';
  onAdvance: (job: JobWithRelations) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tag</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Species</TableHead>
            <TableHead>Parts</TableHead>
            <TableHead>Days in Storage</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map(job => {
            const days = daysIn(job.updated_at);
            const overdue = job.due_date && new Date(job.due_date) < new Date();
            const stalledWarning = days > 7;
            return (
              <TableRow key={job.id} className={stalledWarning ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                <TableCell className="font-mono text-sm">
                  {job.specimens?.tag_number ?? '—'}
                  {job.rush && <Badge className="ml-2 bg-red-600 text-xs">RUSH</Badge>}
                </TableCell>
                <TableCell className="font-medium">{job.specimens?.clients?.full_name ?? '—'}</TableCell>
                <TableCell>{job.specimens?.species?.common_name ?? job.specimens?.species_name ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {job.parts.map(p => (
                      <Badge key={p.id} variant="outline" className="text-xs">{p.part_type.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className={stalledWarning ? 'text-amber-600 font-medium' : ''}>{days}d</span>
                    {stalledWarning && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                  </div>
                </TableCell>
                <TableCell>
                  {job.due_date ? (
                    <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : ''}`}>
                      {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      {new Date(job.due_date).toLocaleDateString()}
                    </span>
                  ) : <span className="text-slate-400 text-sm">—</span>}
                </TableCell>
                <TableCell>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onAdvance(job)}>
                    <ArrowRight className="w-4 h-4 mr-1" />
                    {PHASE_LABELS[nextPhase]}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function StorageManagement() {
  const { jobs: preTanneryJobs, loading: loadingPre, refresh: refreshPre, advancePhase: advancePre } = useJobs('storage_pre');
  const { jobs: postTanneryJobs, loading: loadingPost, refresh: refreshPost, advancePhase: advancePost } = useJobs('storage_post');
  const [advanceTarget, setAdvanceTarget] = useState<{ job: JobWithRelations; type: 'pre' | 'post' } | null>(null);

  const refresh = () => { refreshPre(); refreshPost(); };
  const loading = loadingPre || loadingPost;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Storage Management</h1>
          <p className="text-slate-600 dark:text-slate-400">Pre-tannery and post-tannery storage</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Pre-Tannery Storage</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{preTanneryJobs.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Post-Tannery Storage</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{postTanneryJobs.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 rounded-lg flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pre">
        <TabsList>
          <TabsTrigger value="pre">Pre-Tannery ({preTanneryJobs.length})</TabsTrigger>
          <TabsTrigger value="post">Post-Tannery ({postTanneryJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pre" className="mt-4">
          {loadingPre ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : preTanneryJobs.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No items in pre-tannery storage</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <JobTable jobs={preTanneryJobs} nextPhase="tannery" onAdvance={job => setAdvanceTarget({ job, type: 'pre' })} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="post" className="mt-4">
          {loadingPost ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : postTanneryJobs.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No items in post-tannery storage</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <JobTable jobs={postTanneryJobs} nextPhase="mounting" onAdvance={job => setAdvanceTarget({ job, type: 'post' })} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {advanceTarget && (
        <PhaseAdvanceDialog
          open={true}
          onClose={() => setAdvanceTarget(null)}
          jobId={advanceTarget.job.id}
          currentPhase={advanceTarget.type === 'pre' ? 'storage_pre' : 'storage_post'}
          nextPhase={advanceTarget.type === 'pre' ? 'tannery' : 'mounting'}
          jobLabel={`${advanceTarget.job.specimens?.species?.common_name ?? advanceTarget.job.specimens?.species_name ?? 'Trophy'} — ${advanceTarget.job.specimens?.clients?.full_name ?? ''}`}
          onConfirm={advanceTarget.type === 'pre' ? advancePre : advancePost}
        />
      )}
    </div>
  );
}
