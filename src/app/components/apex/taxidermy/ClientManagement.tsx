import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import {
  Users, Plus, Search, RefreshCw, Edit2, Phone, Mail, Globe,
  Loader2, ChevronRight, Camera, ImagePlus, Trash2, X, ZoomIn,
  Plane, MapPin, ArrowLeft, FileText, Upload, CheckCircle2,
} from 'lucide-react';
import { useClients } from '../../../../lib/hooks/useClients';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { HuntTimeline } from './HuntTimeline';
import { CommunicationPanel } from './CommunicationPanel';
import type { Database } from '../../../../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientType = 'all' | 'local' | 'export';

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', address: '', delivery_address: '', country: '',
  nationality: '', passport_number: '', passport_expiry: '', notes: '',
  client_type: 'export' as 'local' | 'export',
};

// ── Photo types ─────────────────────────────────────────────────────────────
type ClientPhoto = {
  id: string;
  client_id: string;
  photo_type: 'arrival' | 'finished';
  storage_path: string;
  caption: string | null;
  created_at: string;
  url?: string;
};

function useClientPhotos(clientId: string | null) {
  const [photos, setPhotos] = useState<ClientPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) { setPhotos([]); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('client_photos')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      const withUrls = await Promise.all(
        (data as ClientPhoto[]).map(async (p) => {
          const { data: urlData } = await (supabase as any).storage
            .from('client-photos')
            .createSignedUrl(p.storage_path, 3600);
          return { ...p, url: urlData?.signedUrl ?? '' };
        })
      );
      setPhotos(withUrls);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);
  return { photos, loading, refresh: load };
}

// ── Photo section ────────────────────────────────────────────────────────────
function PhotoSection({ clientId, photoType, label, photos, onUploaded, onDeleted }: {
  clientId: string;
  photoType: 'arrival' | 'finished';
  label: string;
  photos: ClientPhoto[];
  onUploaded: () => void;
  onDeleted: () => void;
}) {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const mine = photos.filter(p => p.photo_type === photoType);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${clientId}/${photoType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await (supabase as any).storage
        .from('client-photos').upload(path, file, { upsert: false });
      if (upErr) { toast.error(`Upload failed: ${upErr.message}`); continue; }
      await (supabase as any).from('client_photos')
        .insert({ client_id: clientId, photo_type: photoType, storage_path: path, uploaded_by: profile?.id ?? null });
    }
    setUploading(false);
    onUploaded();
    toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`);
  }

  async function handleDelete(photo: ClientPhoto) {
    await (supabase as any).storage.from('client-photos').remove([photo.storage_path]);
    await (supabase as any).from('client_photos').delete().eq('id', photo.id);
    onDeleted();
    toast.success('Photo deleted');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-[#0073ea] hover:underline disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
          Add photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>
      {mine.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg py-5 flex flex-col items-center gap-1 text-slate-400 hover:border-[#0073ea] hover:text-[#0073ea] transition-colors"
        >
          <Camera className="w-4 h-4" />
          <span className="text-xs">Upload {label.toLowerCase()}</span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {mine.map(p => (
            <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
              {p.url
                ? <img src={p.url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
              }
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                <button onClick={() => setLightbox(p.url ?? null)} className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                  <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
                </button>
                <button onClick={() => handleDelete(p)} className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-[#0073ea] hover:text-[#0073ea] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

// ── Passport upload ───────────────────────────────────────────────────────────
function PassportUploadSection({ clientId }: { clientId: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clientId) return;
    (supabase as any).from('client_documents')
      .select('id, file_name')
      .eq('client_id', clientId)
      .eq('doc_type', 'passport')
      .limit(1)
      .then(({ data }: any) => { if (data?.[0]) setExisting(data[0].file_name); });
  }, [clientId]);

  async function handleUpload(f: File) {
    if (!clientId) { setFile(f); return; } // will upload after client created
    setUploading(true);
    const ext = f.name.split('.').pop() ?? 'pdf';
    const path = `passports/${clientId}/passport-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('client-documents').upload(path, f, { upsert: true });
    if (!error) {
      await (supabase as any).from('client_documents').upsert({
        client_id: clientId, doc_type: 'passport', storage_path: path, file_name: f.name,
      }, { onConflict: 'client_id,doc_type' });
      setExisting(f.name);
      setUploaded(true);
      toast.success('Passport document saved');
    } else {
      toast.error('Upload failed: ' + error.message);
    }
    setUploading(false);
  }

  return (
    <div>
      <Label className="text-xs">
        Passport / ID Document <span className="text-slate-400">(photo or scan)</span>
      </Label>
      <div
        className={`mt-1 border-2 border-dashed rounded-lg p-4 flex items-center gap-3 cursor-pointer transition-colors ${
          uploaded || existing
            ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
            : 'border-slate-200 dark:border-slate-600 hover:border-blue-400'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {uploaded || existing ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                {existing ?? file?.name ?? 'Document uploaded'}
              </p>
              <p className="text-xs text-slate-500">Click to replace</p>
            </div>
          </>
        ) : file ? (
          <>
            <FileText className="w-5 h-5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{clientId ? 'Will upload on save' : 'Ready — will upload after client is created'}</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Upload passport or ID</p>
              <p className="text-xs text-slate-400">JPG, PNG or PDF · max 10 MB</p>
            </div>
          </>
        )}
        {uploading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 10 * 1024 * 1024) { toast.error('File too large — max 10 MB'); return; }
          handleUpload(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ── Detail tabs ───────────────────────────────────────────────────────────────
type DetailTab = 'info' | 'hunts' | 'photos' | 'messages';

function ClientDetailPanel({ client, onEdit, onBack }: { client: Client; onEdit: () => void; onBack: () => void }) {
  const [tab, setTab] = useState<DetailTab>('hunts');
  const { photos, loading: photosLoading, refresh: refreshPhotos } = useClientPhotos(client.id);

  const clientType = (client as any).client_type as 'local' | 'export' | undefined;

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'hunts',    label: 'Hunts & Docs' },
    { key: 'messages', label: 'Messages' },
    { key: 'info',     label: 'Client Info' },
    { key: 'photos',   label: `Photos${photos.length ? ` (${photos.length})` : ''}` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} className="lg:hidden text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{client.full_name}</h2>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              clientType === 'local'
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            }`}>
              {clientType === 'local' ? 'Local' : 'Export'}
            </span>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit} className="h-7 text-xs flex-shrink-0">
          <Edit2 className="w-3 h-3 mr-1" /> Edit
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4 -mx-0.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-[#0073ea] text-[#0073ea]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {tab === 'info' && (
          <>
            <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <QRCodeSVG value={`APEX-CLIENT:${client.id}`} size={100} />
              <p className="text-xs text-slate-500 mt-2">Client QR</p>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Email',           value: client.email,           icon: Mail },
                { label: 'Phone',           value: client.phone,           icon: Phone },
                { label: 'Country',         value: client.country,         icon: Globe },
                { label: 'Nationality',     value: client.nationality },
                { label: 'Passport',        value: client.passport_number },
                { label: 'Expiry',          value: client.passport_expiry },
                { label: 'Address',         value: client.address },
              ].map(f => f.value && (
                <div key={f.label} className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0 text-xs">{f.label}</span>
                  <span className="text-slate-900 dark:text-slate-100 text-xs break-all">{f.value}</span>
                </div>
              ))}
            </div>
            {client.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">{client.notes}</p>
              </div>
            )}
            <p className="text-xs text-slate-400">Added {new Date(client.created_at).toLocaleDateString()}</p>
          </>
        )}

        {tab === 'hunts' && <HuntTimeline clientId={client.id} />}

        {tab === 'messages' && (
          <CommunicationPanel
            clientId={client.id}
            clientName={client.full_name}
            clientEmail={client.email ?? null}
          />
        )}

        {tab === 'photos' && (
          <div className="space-y-5">
            {photosLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading photos…
              </div>
            ) : (
              <>
                <PhotoSection
                  clientId={client.id}
                  photoType="arrival"
                  label="Arrival Photos"
                  photos={photos}
                  onUploaded={refreshPhotos}
                  onDeleted={refreshPhotos}
                />
                <PhotoSection
                  clientId={client.id}
                  photoType="finished"
                  label="Finished Product"
                  photos={photos}
                  onUploaded={refreshPhotos}
                  onDeleted={refreshPhotos}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ClientManagement({ initialClientId }: { initialClientId?: string } = {}) {
  const { clients, loading, error, createClient, updateClient, refresh } = useClients();
  const { jobs } = useJobs();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType>('all');
  const [selected, setSelected] = useState<Client | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Auto-open a specific client when navigated from Scan Parts
  useEffect(() => {
    if (initialClientId && clients.length > 0 && !selected) {
      const client = clients.find(c => c.id === initialClientId);
      if (client) setSelected(client);
    }
  }, [initialClientId, clients]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.country?.toLowerCase().includes(q);
    const clientType = (c as any).client_type ?? 'export';
    const matchType = typeFilter === 'all' || clientType === typeFilter;
    return matchSearch && matchType;
  });

  const localCount  = clients.filter(c => (c as any).client_type === 'local').length;
  const exportCount = clients.filter(c => (c as any).client_type !== 'local').length;

  function openNew() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setEditOpen(true);
  }

  function openEdit(client: Client) {
    setForm({
      full_name:        client.full_name,
      email:            client.email ?? '',
      phone:            client.phone ?? '',
      address:          client.address ?? '',
      delivery_address: (client as any).delivery_address ?? '',
      country:          client.country ?? '',
      nationality:      client.nationality ?? '',
      passport_number:  client.passport_number ?? '',
      passport_expiry:  client.passport_expiry ?? '',
      notes:            client.notes ?? '',
      client_type:      ((client as any).client_type ?? 'export') as 'local' | 'export',
    });
    setSelected(client);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload: any = {
      full_name:       form.full_name.trim(),
      email:           form.email || null,
      phone:           form.phone || null,
      address:          form.address || null,
      delivery_address: form.delivery_address || null,
      country:          form.country || null,
      nationality:     form.nationality || null,
      passport_number: form.passport_number || null,
      passport_expiry: form.passport_expiry || null,
      notes:           form.notes || null,
      // client_type is set at registration only — never updated after creation
      ...(!selected && { client_type: form.client_type }),
    };
    const result = selected
      ? await updateClient(selected.id, payload)
      : await createClient(payload);
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success(selected ? 'Client updated' : 'Client created');
    setEditOpen(false);
    refresh();
  }

  const showDetail = selected && !editOpen;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Client Management</h1>
          <p className="text-slate-500 text-sm">{clients.length} clients · {localCount} local · {exportCount} export</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> New Client
          </Button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        {([
          { key: 'all',    label: 'All',    count: clients.length },
          { key: 'local',  label: 'Local',  count: localCount,  icon: MapPin },
          { key: 'export', label: 'Export', count: exportCount, icon: Plane },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              typeFilter === t.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {'icon' in t && t.icon && <t.icon className="w-3 h-3" />}
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              typeFilter === t.key ? 'bg-[#0073ea] text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Client list — collapses on mobile when detail is open */}
        <div className={`lg:col-span-2 space-y-3 ${showDetail ? 'hidden lg:block' : ''}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, phone, country…"
              className="pl-10"
            />
          </div>

          {loading ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : error ? (
            <Card className="border-red-200">
              <CardContent className="py-8 text-center">
                <p className="text-red-500 text-sm font-medium">Error loading clients</p>
                <p className="text-red-400 text-xs mt-1">{error}</p>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">{search ? 'No clients match your search' : 'No clients yet'}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(client => {
                    const ct = (client as any).client_type ?? 'export';
                    return (
                      <div
                        key={client.id}
                        onClick={() => setSelected(selected?.id === client.id ? null : client)}
                        className={`flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors ${selected?.id === client.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                          style={{ background: ct === 'local' ? '#16a34a' : '#0073ea' }}>
                          {client.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{client.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {client.country && <span className="text-xs text-slate-400 truncate">{client.country}</span>}
                            {client.email   && <span className="text-xs text-slate-400 truncate hidden sm:block">{client.email}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail panel */}
        <div className={`lg:col-span-3 ${!showDetail ? 'hidden lg:block' : ''}`}>
          {showDetail ? (
            <Card className="sticky top-20">
              <CardContent className="p-4">
                <ClientDetailPanel
                  client={selected}
                  onEdit={() => openEdit(selected)}
                  onBack={() => setSelected(null)}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed sticky top-20 hidden lg:block">
              <CardContent className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Select a client to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit Client' : 'New Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Client type — set at registration only, locked after */}
            <div>
              <Label className="text-xs">Client Type</Label>
              {selected ? (
                <div className={`mt-1 px-3 py-2 rounded-lg text-sm font-medium border inline-flex items-center gap-1 ${
                  form.client_type === 'local'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {form.client_type === 'local' ? '🇿🇦 Local' : '✈️ Export'}
                  <span className="ml-2 text-xs text-slate-400 font-normal">(set at registration — cannot be changed)</span>
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  {(['local', 'export'] as const).map(ct => (
                    <button
                      key={ct}
                      onClick={() => setForm(p => ({ ...p, client_type: ct }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.client_type === ct
                          ? ct === 'local'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-[#0073ea] text-white border-[#0073ea]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {ct === 'local' ? '🇿🇦 Local' : '✈️ Export'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {[
              { key: 'full_name',       label: 'Full Name *' },
              { key: 'email',           label: 'Email',           type: 'email' },
              { key: 'phone',           label: 'Phone' },
              { key: 'country',         label: 'Country of Origin' },
              { key: 'nationality',     label: 'Nationality' },
              { key: 'passport_number', label: 'Passport Number' },
              { key: 'passport_expiry', label: 'Passport Expiry', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type={f.type ?? 'text'}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="mt-1 h-9"
                />
              </div>
            ))}

            {/* Address fields */}
            <div>
              <Label className="text-xs">Home / Billing Address</Label>
              <Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2} className="mt-1 resize-none" placeholder="Street, City, Postal Code" />
            </div>
            <div>
              <Label className="text-xs">Delivery Address <span className="text-slate-400">(where trophies will be shipped)</span></Label>
              <Textarea value={form.delivery_address} onChange={e => setForm(p => ({ ...p, delivery_address: e.target.value }))} rows={2} className="mt-1 resize-none" placeholder="If different from billing address" />
            </div>

            {/* Passport document upload — only for new clients or existing without one */}
            <PassportUploadSection clientId={selected?.id ?? null} />

            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="mt-1 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selected ? 'Update' : 'Create'} Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
