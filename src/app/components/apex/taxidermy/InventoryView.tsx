import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { List, Search, AlertTriangle, RefreshCw, Plus, Edit2, Loader2, PackageCheck } from 'lucide-react';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { useInventory } from '../../../../lib/hooks/useInventory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';
import { PHASE_LABELS } from '../shared/PhaseAdvanceDialog';
import type { JobPhase } from '../../../../lib/database.types';

const PHASE_COLORS: Partial<Record<JobPhase, string>> = {
  intake: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  skin_processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  skull_processing: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  storage_pre: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  tannery: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  storage_post: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  mounting: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  finishing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  quality_check: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  packing: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  shipped: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
};

export function InventoryView() {
  const { jobs, loading: jobsLoading, refresh: refreshJobs } = useJobs();
  const { items, lowStock, loading: stockLoading, updateStock, refresh: refreshStock } = useInventory();
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<'all' | JobPhase>('all');
  const [editItem, setEditItem] = useState<{ id: string; name: string; qty: number } | null>(null);
  const [newQty, setNewQty] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', unit: '', qty: '0', threshold: '5', unit_cost: '', supplier: '' });
  const [saving, setSaving] = useState(false);

  const activePhases: JobPhase[] = ['intake', 'skin_processing', 'skull_processing', 'storage_pre', 'tannery', 'storage_post', 'mounting', 'finishing', 'quality_check', 'packing'];

  const filteredJobs = jobs.filter(j => {
    if (phaseFilter !== 'all' && j.current_phase !== phaseFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      j.specimens?.tag_number?.toLowerCase().includes(q) ||
      j.specimens?.clients?.full_name?.toLowerCase().includes(q) ||
      j.specimens?.species?.common_name?.toLowerCase().includes(q) ||
      j.specimens?.species_name?.toLowerCase().includes(q) || false
    );
  }).filter(j => activePhases.includes(j.current_phase as JobPhase));

  async function handleStockUpdate() {
    if (!editItem) return;
    setSaving(true);
    const result = await updateStock(editItem.id, Number(newQty));
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    setEditItem(null);
    toast.success('Stock updated');
  }

  async function handleAddItem() {
    if (!addForm.name) { toast.error('Name required'); return; }
    setSaving(true);
    const { error } = await supabase.from('inventory_items').insert({
      name: addForm.name,
      unit: addForm.unit || null,
      quantity_on_hand: Number(addForm.qty),
      reorder_threshold: Number(addForm.threshold),
      unit_cost: addForm.unit_cost ? Number(addForm.unit_cost) : null,
      supplier: addForm.supplier || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Item added');
    setAddOpen(false);
    setAddForm({ name: '', unit: '', qty: '0', threshold: '5', unit_cost: '', supplier: '' });
    refreshStock();
  }

  // Phase breakdown
  const phaseCounts = activePhases.map(p => ({ phase: p, count: jobs.filter(j => j.current_phase === p).length })).filter(p => p.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Inventory & Job Tracker</h1>
        <p className="text-slate-600 dark:text-slate-400">All active jobs and workshop supplies</p>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs in Workshop ({jobs.filter(j => activePhases.includes(j.current_phase as JobPhase)).length})</TabsTrigger>
          <TabsTrigger value="stock">
            Supplies
            {lowStock.length > 0 && <Badge className="ml-2 bg-red-600 text-xs">{lowStock.length} low</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* JOBS TAB */}
        <TabsContent value="jobs" className="space-y-4 mt-4">
          {/* Phase breakdown */}
          <div className="flex flex-wrap gap-2">
            {phaseCounts.map(p => (
              <button
                key={p.phase}
                onClick={() => setPhaseFilter(phaseFilter === p.phase ? 'all' : p.phase)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${phaseFilter === p.phase ? 'ring-2 ring-blue-500 ' : ''}${PHASE_COLORS[p.phase] ?? 'bg-slate-100 text-slate-700'}`}
              >
                {PHASE_LABELS[p.phase]} · {p.count}
              </button>
            ))}
            {phaseFilter !== 'all' && (
              <button onClick={() => setPhaseFilter('all')} className="px-3 py-1.5 rounded-full text-xs border bg-white dark:bg-slate-900 text-slate-500">
                Clear filter
              </button>
            )}
          </div>

          {/* Search + refresh */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tag, client, species..." className="pl-10" />
            </div>
            <Button variant="ghost" size="icon" onClick={refreshJobs} disabled={jobsLoading}>
              <RefreshCw className={`w-4 h-4 ${jobsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {jobsLoading ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
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
                        <TableHead>Phase</TableHead>
                        <TableHead>Parts</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Rush</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No jobs found</TableCell></TableRow>
                      ) : filteredJobs.map(job => {
                        const overdue = job.due_date && new Date(job.due_date) < new Date();
                        return (
                          <TableRow key={job.id} className={overdue ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                            <TableCell className="font-mono text-sm">{job.specimens?.tag_number ?? job.id.slice(0, 8)}</TableCell>
                            <TableCell className="font-medium">{job.specimens?.clients?.full_name ?? '—'}</TableCell>
                            <TableCell>{job.specimens?.species?.common_name ?? job.specimens?.species_name ?? '—'}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PHASE_COLORS[job.current_phase as JobPhase] ?? ''}`}>
                                {PHASE_LABELS[job.current_phase as JobPhase]}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {job.parts.map(p => <Badge key={p.id} variant="outline" className="text-xs">{p.part_type.replace(/_/g, ' ')}</Badge>)}
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
                              {job.rush && <Badge className="bg-red-600">RUSH</Badge>}
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

        {/* STOCK TAB */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">{lowStock.length} item{lowStock.length !== 1 ? 's' : ''} below reorder threshold</p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Item
            </Button>
          </div>

          {stockLoading ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>In Stock</TableHead>
                        <TableHead>Reorder At</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => {
                        const low = item.quantity_on_hand <= item.reorder_threshold;
                        return (
                          <TableRow key={item.id} className={low ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-slate-500">{item.unit ?? '—'}</TableCell>
                            <TableCell className={`font-bold ${low ? 'text-red-600' : 'text-green-600'}`}>{item.quantity_on_hand}</TableCell>
                            <TableCell>{item.reorder_threshold}</TableCell>
                            <TableCell className="text-slate-500">{item.supplier ?? '—'}</TableCell>
                            <TableCell>
                              {low
                                ? <Badge className="bg-red-600"><AlertTriangle className="w-3 h-3 mr-1" />Reorder</Badge>
                                : <Badge className="bg-green-600"><PackageCheck className="w-3 h-3 mr-1" />OK</Badge>
                              }
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => { setEditItem({ id: item.id, name: item.name, qty: item.quantity_on_hand }); setNewQty(String(item.quantity_on_hand)); }}>
                                <Edit2 className="w-3 h-3 mr-1" />Update
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
          )}
        </TabsContent>
      </Tabs>

      {/* Edit stock dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Update Stock: {editItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Quantity on Hand</Label>
              <Input type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)} className="mt-1" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleStockUpdate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add item dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { key: 'name', label: 'Name *', placeholder: 'e.g. Glass Eyes — Kudu' },
              { key: 'unit', label: 'Unit', placeholder: 'pairs / litres / kg' },
              { key: 'qty', label: 'Current Quantity', placeholder: '0', type: 'number' },
              { key: 'threshold', label: 'Reorder Threshold', placeholder: '5', type: 'number' },
              { key: 'unit_cost', label: 'Unit Cost (R)', placeholder: '0.00', type: 'number' },
              { key: 'supplier', label: 'Supplier', placeholder: 'Company name' },
            ].map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type={f.type ?? 'text'}
                  value={(addForm as any)[f.key]}
                  onChange={e => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
