import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Package, Truck, Camera, RefreshCw, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useDeptJobs } from '../../../../lib/hooks/useDeptJobs';
import { toast } from 'sonner';
import type { DeptJob } from '../../../../lib/hooks/useDeptJobs';

const COURIERS = ['DHL', 'FedEx', 'Aramex', 'CourierIT', 'The Courier Guy', 'Airlink Cargo', 'Self-collect', 'Other'];

export function PackingShipping() {
  const { jobs: photoJobs, loading: loadingPhotos, load: loadPhotos, completing: completingPhotos, advance: advancePhotos } = useDeptJobs('photos');
  const { jobs: adminJobs, loading: loadingAdmin, load: loadAdmin, completing: completingAdmin, advance: advanceAdmin } = useDeptJobs('administration');

  const [shipTarget, setShipTarget] = useState<DeptJob | null>(null);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');

  const refresh = () => { loadPhotos(); loadAdmin(); };
  const loading = loadingPhotos || loadingAdmin;

  async function handleAdvancePhotos(job: DeptJob) {
    const result = await advancePhotos(job);
    if (result.error) toast.error('Failed: ' + result.error);
    else toast.success('Photos done — moved to Administration');
  }

  async function confirmShip() {
    if (!shipTarget) return;
    if (!courier) { toast.error('Select a courier'); return; }
    const result = await advanceAdmin(shipTarget);
    if (result.error) {
      toast.error('Failed: ' + result.error);
    } else {
      toast.success(`Shipped via ${courier}${tracking ? ` — tracking: ${tracking}` : ''}`);
      setShipTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Photos & Packing / Shipping</h1>
          <p className="text-slate-600 dark:text-slate-400">Photography, packing and final dispatch</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Awaiting Photos', value: photoJobs.length, color: 'bg-cyan-600' },
          { label: 'Ready to Dispatch', value: adminJobs.length, color: 'bg-indigo-600' },
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

      <Tabs defaultValue="photos">
        <TabsList>
          <TabsTrigger value="photos"><Camera className="w-4 h-4 mr-2" />Photos ({photoJobs.length})</TabsTrigger>
          <TabsTrigger value="dispatch"><Package className="w-4 h-4 mr-2" />Dispatch ({adminJobs.length})</TabsTrigger>
        </TabsList>

        {/* PHOTOS TAB */}
        <TabsContent value="photos" className="mt-4">
          {loadingPhotos ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : photoJobs.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center">
              <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No trophies awaiting photos</p>
            </CardContent></Card>
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
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {photoJobs.map(job => (
                        <TableRow key={job.docId}>
                          <TableCell className="font-mono text-sm">{job.tagNumber || '—'}</TableCell>
                          <TableCell className="font-medium">
                            {job.clientNumber && <span className="text-xs text-slate-500 mr-1">{job.clientNumber}</span>}
                            {job.clientName}
                          </TableCell>
                          <TableCell>{job.species || '—'}</TableCell>
                          <TableCell>{job.mountType || '—'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              className="bg-cyan-600 hover:bg-cyan-700"
                              disabled={completingPhotos === job.docId}
                              onClick={() => handleAdvancePhotos(job)}
                            >
                              {completingPhotos === job.docId
                                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                : <CheckCircle2 className="w-4 h-4 mr-1" />
                              }
                              Photos Done
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

        {/* DISPATCH TAB */}
        <TabsContent value="dispatch" className="mt-4">
          {loadingAdmin ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : adminJobs.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No trophies ready for dispatch</p>
            </CardContent></Card>
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
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminJobs.map(job => (
                        <TableRow key={job.docId}>
                          <TableCell className="font-mono text-sm">{job.tagNumber || '—'}</TableCell>
                          <TableCell className="font-medium">
                            {job.clientNumber && <span className="text-xs text-slate-500 mr-1">{job.clientNumber}</span>}
                            {job.clientName}
                          </TableCell>
                          <TableCell>{job.species || '—'}</TableCell>
                          <TableCell>{job.mountType || '—'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => { setShipTarget(job); setCourier(''); setTracking(''); }}
                            >
                              <Truck className="w-4 h-4 mr-1" />Ship & Complete
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

      {/* Shipping dialog */}
      {shipTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" />Ship Trophy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {shipTarget.species} — {shipTarget.clientName}
                {shipTarget.clientNumber && <span className="ml-1 text-slate-400">({shipTarget.clientNumber})</span>}
              </p>
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
                <Button variant="outline" className="flex-1" onClick={() => setShipTarget(null)}>Cancel</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={confirmShip} disabled={completingAdmin === shipTarget.docId}>
                  {completingAdmin === shipTarget.docId
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Truck className="w-4 h-4 mr-2" />
                  }
                  Confirm Ship
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
