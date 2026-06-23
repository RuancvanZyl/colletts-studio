import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Package, Truck, CheckCircle2, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { useAuth } from '../../../../lib/auth';
import { PhaseAdvanceDialog } from '../shared/PhaseAdvanceDialog';
import { toast } from 'sonner';
import type { JobWithRelations } from '../../../../lib/hooks/useJobs';

const COURIERS = ['DHL', 'FedEx', 'Aramex', 'CourierIT', 'The Courier Guy', 'Airlink Cargo', 'Self-collect', 'Other'];

export function PackingShipping() {
  const { jobs: packingJobs, loading: loadingPacking, refresh: refreshPacking, advancePhase: advancePacking } = useJobs('packing');
  const { jobs: shippedJobs, loading: loadingShipped, refresh: refreshShipped, advancePhase: advanceShipped } = useJobs('shipped');
  const { user } = useAuth();
  const [packTarget, setPackTarget] = useState<JobWithRelations | null>(null);
  const [shipTarget, setShipTarget] = useState<{ job: JobWithRelations; courier: string; tracking: string } | null>(null);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobWithRelations | null>(null);

  const refresh = () => { refreshPacking(); refreshShipped(); };

  function startShipping(job: JobWithRelations) {
    setSelectedJob(job);
    setCourier('');
    setTracking('');
  }

  async function confirmShip() {
    if (!selectedJob || !user) return;
    if (!courier) { toast.error('Select a courier'); return; }
    const result = await advancePacking(selectedJob.id, 'shipped', user.id, {
      comment: `Shipped via ${courier}${tracking ? ` — tracking: ${tracking}` : ''}`,
    });
    if (!result.error) {
      setSelectedJob(null);
      toast.success('Marked as shipped');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Packing & Shipping</h1>
          <p className="text-slate-600 dark:text-slate-400">Pack trophies and arrange shipping</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loadingPacking || loadingShipped}>
          <RefreshCw className={`w-4 h-4 ${(loadingPacking || loadingShipped) ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ready to Pack', value: packingJobs.length, color: 'bg-cyan-600' },
          { label: 'Shipped (In Transit)', value: shippedJobs.length, color: 'bg-blue-600' },
          { label: 'Rush Jobs', value: packingJobs.filter(j => j.rush).length, color: 'bg-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={`w-2 h-10 ${s.color} rounded-full`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="packing">
        <TabsList>
          <TabsTrigger value="packing">Packing ({packingJobs.length})</TabsTrigger>
          <TabsTrigger value="shipped">Shipped ({shippedJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="packing" className="mt-4">
          {loadingPacking ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : packingJobs.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center"><Package className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No trophies ready to pack</p></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Species</TableHead>
                        <TableHead>Mount Type</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packingJobs.map(job => {
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
                              <Badge variant="outline">{(job.specimens as any)?.destination ?? '—'}</Badge>
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
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setPackTarget(job)}>
                                  <Package className="w-4 h-4 mr-1" />Packed
                                </Button>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => startShipping(job)}>
                                  <Truck className="w-4 h-4 mr-1" />Ship
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shipped" className="mt-4">
          {loadingShipped ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : shippedJobs.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center"><Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No trophies in transit</p></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Species</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shippedJobs.map(job => (
                        <TableRow key={job.id}>
                          <TableCell className="font-mono text-sm">{job.specimens?.tag_number ?? '—'}</TableCell>
                          <TableCell className="font-medium">{job.specimens?.clients?.full_name ?? '—'}</TableCell>
                          <TableCell>{job.specimens?.species?.common_name ?? job.specimens?.species_name ?? '—'}</TableCell>
                          <TableCell>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setPackTarget(job)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" />Mark Delivered
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Shipping dialog (inline) */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" />Ship Trophy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedJob.specimens?.species?.common_name ?? ''} — {selectedJob.specimens?.clients?.full_name ?? ''}
                </p>
              </div>
              <div>
                <Label>Courier *</Label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select courier..." /></SelectTrigger>
                  <SelectContent>
                    {COURIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tracking Number (optional)</Label>
                <Input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="AWB / tracking number..." className="mt-1" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedJob(null)}>Cancel</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={confirmShip}>
                  <Truck className="w-4 h-4 mr-2" />Confirm Ship
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {packTarget && (
        <PhaseAdvanceDialog
          open={true}
          onClose={() => setPackTarget(null)}
          jobId={packTarget.id}
          currentPhase={packTarget.current_phase as any}
          nextPhase={packTarget.current_phase === 'packing' ? 'shipped' : 'delivered'}
          jobLabel={`${packTarget.specimens?.species?.common_name ?? packTarget.specimens?.species_name ?? 'Trophy'} — ${packTarget.specimens?.clients?.full_name ?? ''}`}
          onConfirm={packTarget.current_phase === 'packing' ? advancePacking : advanceShipped}
        />
      )}
    </div>
  );
}
