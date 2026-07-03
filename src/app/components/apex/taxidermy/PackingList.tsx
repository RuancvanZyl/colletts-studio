import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { toast } from 'sonner';
import {
  Package, Printer, Save, X, Plus, Trash2, Loader2, CheckCircle2,
} from 'lucide-react';

interface Trophy {
  docId: string;
  tagNumber: string;
  species: string;
  mountType: string;
}

interface Crate {
  id: string;
  number: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  trophies: string[]; // docIds
}

interface PackingListProps {
  huntId: string;
  clientName: string;
  clientNumber: string;
  onClose: () => void;
}

const COURIERS = ['DHL', 'FedEx', 'Aramex', 'CourierIT', 'The Courier Guy', 'Airlink Cargo', 'Self-collect', 'Other'];

export function PackingList({ huntId, clientName, clientNumber, onClose }: PackingListProps) {
  const [trophies, setTrophies]   = useState<Trophy[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [crates, setCrates]       = useState<Crate[]>([{ id: '1', number: '1', length: '', width: '', height: '', weight: '', trophies: [] }]);
  const [courier, setCourier]     = useState('');
  const [tracking, setTracking]   = useState('');
  const [notes, setNotes]         = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Load trophies at packing or beyond for this hunt
      const { data: docs } = await (supabase as any)
        .from('hunt_documents')
        .select('id, form_data, current_department, status')
        .eq('hunt_id', huntId)
        .eq('doc_type', 'job_card')
        .neq('status', 'pending_payment');

      if (docs) {
        setTrophies(docs.map((d: any) => ({
          docId: d.id,
          tagNumber: d.form_data?.tag_number || '—',
          species: d.form_data?.species || '—',
          mountType: d.form_data?.mount_type || '—',
        })));
      }

      // Load existing packing list if any
      const { data: existing } = await (supabase as any)
        .from('hunt_documents')
        .select('id, form_data')
        .eq('hunt_id', huntId)
        .eq('doc_type', 'packing_list')
        .maybeSingle();

      if (existing) {
        setExistingId(existing.id);
        const fd = existing.form_data;
        if (fd?.crates)   setCrates(fd.crates);
        if (fd?.courier)  setCourier(fd.courier);
        if (fd?.tracking) setTracking(fd.tracking);
        if (fd?.notes)    setNotes(fd.notes);
      }

      setLoading(false);
    }
    load();
  }, [huntId]);

  function addCrate() {
    const next = String(crates.length + 1);
    setCrates(prev => [...prev, { id: next, number: next, length: '', width: '', height: '', weight: '', trophies: [] }]);
  }

  function removeCrate(id: string) {
    setCrates(prev => prev.filter(c => c.id !== id));
  }

  function updateCrate(id: string, field: keyof Crate, value: string) {
    setCrates(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function toggleTrophyInCrate(crateId: string, docId: string) {
    setCrates(prev => prev.map(c => {
      if (c.id !== crateId) return c;
      const has = c.trophies.includes(docId);
      return { ...c, trophies: has ? c.trophies.filter(t => t !== docId) : [...c.trophies, docId] };
    }));
  }

  async function save() {
    setSaving(true);
    const formData = { crates, courier, tracking, notes, generated_at: new Date().toISOString() };
    let error;
    if (existingId) {
      ({ error } = await (supabase as any)
        .from('hunt_documents')
        .update({ form_data: formData, updated_at: new Date().toISOString() })
        .eq('id', existingId));
    } else {
      const { data, error: err } = await (supabase as any)
        .from('hunt_documents')
        .insert({ hunt_id: huntId, doc_type: 'packing_list', status: 'in_progress', form_data: formData })
        .select('id')
        .single();
      error = err;
      if (data) setExistingId(data.id);
    }
    setSaving(false);
    if (error) toast.error('Save failed: ' + error.message);
    else toast.success('Packing list saved');
  }

  function print() {
    window.print();
  }

  const unassigned = trophies.filter(t => !crates.some(c => c.trophies.includes(t.docId)));
  const totalCrates = crates.length;
  const totalWeight = crates.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f1e2b] rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl my-4 print:shadow-none print:rounded-none print:border-none">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 print:border-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-lime-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Packing List</h2>
              <p className="text-xs text-slate-500">{clientName}{clientNumber ? ` · ${clientNumber}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={print}><Printer className="w-4 h-4 mr-1" />Print</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Trophies', value: trophies.length },
              { label: 'Total Crates',   value: totalCrates },
              { label: 'Total Weight',   value: totalWeight ? `${totalWeight.toFixed(1)} kg` : '—' },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Courier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Courier</Label>
              <Select value={courier} onValueChange={setCourier}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select courier..." /></SelectTrigger>
                <SelectContent>{COURIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tracking / AWB Number</Label>
              <Input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Tracking number..." className="mt-1" />
            </div>
          </div>

          {/* Unassigned trophies */}
          {unassigned.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                {unassigned.length} trophy{unassigned.length !== 1 ? 'ies' : ''} not yet assigned to a crate
              </p>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(t => (
                  <Badge key={t.docId} variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 text-xs">
                    {t.tagNumber} · {t.species}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Crates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Crates</h3>
              <Button variant="outline" size="sm" onClick={addCrate} className="print:hidden">
                <Plus className="w-3.5 h-3.5 mr-1" />Add Crate
              </Button>
            </div>

            {crates.map((crate, idx) => (
              <div key={crate.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {/* Crate header */}
                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Crate #{idx + 1}
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    className="w-7 h-7 text-red-500 hover:text-red-600 print:hidden"
                    onClick={() => removeCrate(crate.id)}
                    disabled={crates.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Dimensions */}
                  <div className="grid grid-cols-4 gap-3">
                    {(['length', 'width', 'height'] as const).map(dim => (
                      <div key={dim}>
                        <Label className="text-xs capitalize">{dim} (cm)</Label>
                        <Input
                          type="number" min="0"
                          value={(crate as any)[dim]}
                          onChange={e => updateCrate(crate.id, dim, e.target.value)}
                          placeholder="0"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    ))}
                    <div>
                      <Label className="text-xs">Weight (kg)</Label>
                      <Input
                        type="number" min="0" step="0.1"
                        value={crate.weight}
                        onChange={e => updateCrate(crate.id, 'weight', e.target.value)}
                        placeholder="0"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Trophy assignment */}
                  <div>
                    <Label className="text-xs mb-2 block">Contents</Label>
                    {trophies.length === 0 ? (
                      <p className="text-xs text-slate-400">No trophies found for this hunt</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {trophies.map(t => {
                          const checked = crate.trophies.includes(t.docId);
                          return (
                            <button
                              key={t.docId}
                              onClick={() => toggleTrophyInCrate(crate.id, t.docId)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                                checked
                                  ? 'border-lime-500 bg-lime-50 dark:bg-lime-950/30 text-lime-700 dark:text-lime-300'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${checked ? 'text-lime-500' : 'text-slate-300'}`} />
                              <span className="font-mono mr-1">{t.tagNumber}</span>
                              <span className="truncate">{t.species} · {t.mountType}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Crate summary for print */}
                  {crate.trophies.length > 0 && (
                    <p className="text-xs text-slate-500 hidden print:block">
                      Contents: {crate.trophies.map(id => {
                        const t = trophies.find(x => x.docId === id);
                        return t ? `${t.tagNumber} (${t.species})` : id;
                      }).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes / Special Instructions</Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Fragile items, temperature requirements, permit numbers..."
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1e2b] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>

          {/* Footer signature block for print */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-8 border-t border-slate-300">
            <div>
              <p className="text-xs text-slate-500 mb-6">Packed by (signature)</p>
              <div className="border-t border-slate-400 pt-1">
                <p className="text-xs text-slate-600">Name: _____________________ Date: _______</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-6">Checked by (signature)</p>
              <div className="border-t border-slate-400 pt-1">
                <p className="text-xs text-slate-600">Name: _____________________ Date: _______</p>
              </div>
            </div>
          </div>

          {existingId && (
            <p className="text-xs text-slate-400 text-center print:hidden">
              Packing list saved · last updated {new Date().toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
