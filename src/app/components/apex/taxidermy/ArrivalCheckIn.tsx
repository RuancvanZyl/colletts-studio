import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { ClipboardCheck, Upload, CheckCircle2, ArrowLeft, Camera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../../../lib/auth';
import { useReceiving } from '../../../../../lib/hooks/useReceiving';
import { supabase } from '../../../../../lib/supabase';

interface ArrivalCheckInProps {
  onComplete: () => void;
}

const PART_TYPES = [
  { label: 'Skull', value: 'skull' },
  { label: 'Horns', value: 'horns' },
  { label: 'Cape Skin', value: 'cape_skin' },
  { label: 'Full Skin', value: 'full_skin' },
  { label: 'Tusks', value: 'tusks' },
  { label: 'Antlers', value: 'antlers' },
  { label: 'Full Body', value: 'full_body' },
];

const CONDITIONS = ['salted', 'frozen', 'wet_salted', 'cape_only', 'fresh', 'other'];

export function ArrivalCheckIn({ onComplete }: ArrivalCheckInProps) {
  const { user } = useAuth();
  const { startBatch, receiveItem, uploadPhoto, saving } = useReceiving();

  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [species, setSpecies] = useState<{ id: string; common_name: string }[]>([]);
  const [mountTypes, setMountTypes] = useState<{ id: string; name: string }[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    clientId: '',
    speciesId: '',
    speciesName: '',
    tagNumber: '',
    destination: 'local' as 'local' | 'export',
    intakeCondition: 'salted',
    mountTypeId: '',
    instructions: '',
    partTypes: [] as string[],
    notes: '',
    outfitterId: '',
    outfitterName: '',
  });

  // Load reference data
  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('id, full_name').order('full_name'),
      supabase.from('species').select('id, common_name').order('common_name'),
      supabase.from('mount_types').select('id, name').order('name'),
    ]).then(([c, s, m]) => {
      setClients(c.data ?? []);
      setSpecies(s.data ?? []);
      setMountTypes(m.data ?? []);
    });
  }, []);

  // Start a batch on first submit if not already started
  async function ensureBatch(): Promise<string | null> {
    if (batchId) return batchId;
    const { data, error } = await startBatch({
      received_by: user!.id,
      outfitter_id: form.outfitterId || null,
      source_other: form.outfitterName || null,
    });
    if (error || !data) { toast.error('Failed to start batch'); return null; }
    setBatchId(data.id);
    return data.id;
  }

  function togglePartType(pt: string) {
    setForm(f => ({
      ...f,
      partTypes: f.partTypes.includes(pt)
        ? f.partTypes.filter(p => p !== pt)
        : [...f.partTypes, pt],
    }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Select a client'); return; }
    if (!form.tagNumber) { toast.error('Tag number is required'); return; }
    if (!user) return;

    const bid = await ensureBatch();
    if (!bid) return;

    // Upload photo if present
    let photoPath: string | undefined;
    if (photoFile) {
      const tempId = crypto.randomUUID();
      const { path, error } = await uploadPhoto(photoFile, tempId);
      if (error) toast.warning(`Photo upload failed: ${error}`);
      else photoPath = path ?? undefined;
    }

    const result = await receiveItem(bid, {
      clientId: form.clientId,
      speciesId: form.speciesId || undefined,
      speciesName: form.speciesName || undefined,
      tagNumber: form.tagNumber,
      destination: form.destination,
      intakeCondition: form.intakeCondition,
      mountTypeId: form.mountTypeId || undefined,
      instructions: form.instructions || undefined,
      partTypes: form.partTypes,
      notes: form.notes || undefined,
      photoPath,
    }, user.id);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Trophy checked in!');
      // Reset for next trophy in the same batch
      setForm(f => ({ ...f, tagNumber: '', instructions: '', partTypes: [], notes: '', speciesId: '', speciesName: '' }));
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  };

  const handleFinishBatch = () => {
    toast.success('Batch complete');
    onComplete();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onComplete}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Trophy Arrival Check-In</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {batchId ? `Batch open — add more trophies or finish batch` : 'Start a new receiving batch'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Trophy Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Client */}
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Species */}
              <div className="space-y-2">
                <Label>Species</Label>
                <Select
                  value={form.speciesId}
                  onValueChange={v => setForm(f => ({ ...f, speciesId: v, speciesName: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select species…" />
                  </SelectTrigger>
                  <SelectContent>
                    {species.map(s => <SelectItem key={s.id} value={s.id}>{s.common_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!form.speciesId && (
                  <Input
                    placeholder="Or type species name…"
                    value={form.speciesName}
                    onChange={e => setForm(f => ({ ...f, speciesName: e.target.value }))}
                    className="mt-1"
                  />
                )}
              </div>

              {/* Tag Number */}
              <div className="space-y-2">
                <Label>Tag Number *</Label>
                <Input
                  value={form.tagNumber}
                  onChange={e => setForm(f => ({ ...f, tagNumber: e.target.value }))}
                  placeholder="e.g. A-0042"
                  className="font-mono"
                  required
                />
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label>Destination *</Label>
                <Select value={form.destination} onValueChange={v => setForm(f => ({ ...f, destination: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Intake Condition */}
              <div className="space-y-2">
                <Label>Intake Condition</Label>
                <Select value={form.intakeCondition} onValueChange={v => setForm(f => ({ ...f, intakeCondition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Mount Type */}
              <div className="space-y-2">
                <Label>Mount Type</Label>
                <Select value={form.mountTypeId} onValueChange={v => setForm(f => ({ ...f, mountTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {mountTypes.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Part Types */}
            <div className="space-y-2">
              <Label>Parts Received</Label>
              <div className="flex flex-wrap gap-2">
                {PART_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => togglePartType(pt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.partTypes.includes(pt.value)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label>Client Instructions</Label>
              <Textarea
                value={form.instructions}
                onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                placeholder="Pose, base, open mouth, special requests…"
                rows={2}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Condition notes, damage, anything unusual…"
                rows={2}
              />
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <Label>Intake Photo</Label>
              {photoPreview ? (
                <div className="relative w-full max-w-xs">
                  <img src={photoPreview} alt="Preview" className="rounded-lg w-full object-cover max-h-48" />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Tap to take photo or upload</p>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {saving ? 'Saving…' : batchId ? 'Add to Batch' : 'Check In & Start Batch'}
              </Button>
              {batchId && (
                <Button type="button" onClick={handleFinishBatch} variant="outline">
                  Finish Batch
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onComplete}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              If a client already gave instructions for this trophy (status: expected), it will be automatically matched and updated to received. If multiple expected specimens match, a new one is created — link them manually from the client profile.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
