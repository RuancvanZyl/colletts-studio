import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Users, Plus, Search, RefreshCw, Edit2, Phone, Mail, Globe, Loader2, ChevronRight } from 'lucide-react';
import { useClients } from '../../../../lib/hooks/useClients';
import { useJobs } from '../../../../lib/hooks/useJobs';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import type { Database } from '../../../../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', address: '', country: '',
  nationality: '', passport_number: '', passport_expiry: '', notes: '',
};

export function ClientManagement() {
  const { clients, loading, createClient, updateClient, refresh } = useClients();
  const { jobs } = useJobs();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.country?.toLowerCase().includes(q);
  });

  function openNew() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setEditOpen(true);
  }

  function openEdit(client: Client) {
    setForm({
      full_name: client.full_name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      country: client.country ?? '',
      nationality: client.nationality ?? '',
      passport_number: client.passport_number ?? '',
      passport_expiry: client.passport_expiry ?? '',
      notes: client.notes ?? '',
    });
    setSelected(client);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      country: form.country || null,
      nationality: form.nationality || null,
      passport_number: form.passport_number || null,
      passport_expiry: form.passport_expiry || null,
      notes: form.notes || null,
    };
    const result = selected
      ? await updateClient(selected.id, payload)
      : await createClient(payload as any);
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success(selected ? 'Client updated' : 'Client created');
    setEditOpen(false);
  }

  function clientJobCount(clientId: string) {
    return jobs.filter(j => j.specimens?.clients?.full_name === clients.find(c => c.id === clientId)?.full_name).length;
  }

  const detailClient = selected && !editOpen ? selected : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100">Client Management</h1>
          <p className="text-slate-600 dark:text-slate-400">{clients.length} clients registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />New Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone, country..." className="pl-10" />
          </div>

          {loading ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{search ? 'No clients match your search' : 'No clients yet — add your first client'}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(client => {
                    const jobCount = clientJobCount(client.id);
                    return (
                      <div
                        key={client.id}
                        className={`flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors ${selected?.id === client.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                        onClick={() => setSelected(selected?.id === client.id ? null : client)}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{client.full_name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{client.full_name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {client.country && <span className="text-xs text-slate-500 flex items-center gap-1"><Globe className="w-3 h-3" />{client.country}</span>}
                            {client.email && <span className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {jobCount > 0 && <Badge variant="secondary">{jobCount} job{jobCount !== 1 ? 's' : ''}</Badge>}
                          <Badge variant={client.onboarding_status === 'complete' ? 'default' : 'outline'} className={client.onboarding_status === 'complete' ? 'bg-green-600' : ''}>
                            {client.onboarding_status.replace('_', ' ')}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Client detail panel */}
        <div>
          {detailClient ? (
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {detailClient.full_name}
                  <Button size="sm" variant="outline" onClick={() => openEdit(detailClient)}>
                    <Edit2 className="w-3 h-3 mr-1" />Edit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR code for client */}
                <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <QRCodeSVG value={`COLLETT-CLIENT:${detailClient.id}`} size={120} />
                  <p className="text-xs text-slate-500 mt-2">Client QR</p>
                </div>

                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Email', value: detailClient.email, icon: Mail },
                    { label: 'Phone', value: detailClient.phone, icon: Phone },
                    { label: 'Country', value: detailClient.country, icon: Globe },
                    { label: 'Nationality', value: detailClient.nationality },
                    { label: 'Passport', value: detailClient.passport_number },
                    { label: 'Passport Expiry', value: detailClient.passport_expiry },
                  ].map(f => f.value && (
                    <div key={f.label} className="flex gap-2">
                      <span className="text-slate-500 w-24 flex-shrink-0">{f.label}</span>
                      <span className="text-slate-900 dark:text-slate-100">{f.value}</span>
                    </div>
                  ))}
                </div>

                {detailClient.notes && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300">{detailClient.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Badge variant={detailClient.onboarding_status === 'complete' ? 'default' : 'outline'}
                    className={detailClient.onboarding_status === 'complete' ? 'bg-green-600' : ''}>
                    {detailClient.onboarding_status.replace('_', ' ')}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400">
                  Added {new Date(detailClient.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed sticky top-20">
              <CardContent className="py-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Select a client to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add / edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit Client' : 'New Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: 'full_name', label: 'Full Name *' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'phone', label: 'Phone' },
              { key: 'country', label: 'Country' },
              { key: 'nationality', label: 'Nationality' },
              { key: 'passport_number', label: 'Passport Number' },
              { key: 'passport_expiry', label: 'Passport Expiry', type: 'date' },
              { key: 'address', label: 'Address' },
            ].map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type={f.type ?? 'text'}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="mt-1" />
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
