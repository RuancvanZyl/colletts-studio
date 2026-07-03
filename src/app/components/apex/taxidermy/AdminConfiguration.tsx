import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Settings, Users, Building2, Plus, Edit2, RefreshCw, Loader2, Shield, QrCode, Printer, ImageIcon, Upload, KeyRound } from 'lucide-react';
import { StaffCredentials } from './StaffCredentials';
import { useTrophyTypeImages } from '../../../../lib/hooks/useTrophyTypeImages';
import { trophyTypeOptions } from '../mockAnimalData';
import { supabase } from '../../../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import type { Database } from '../../../../lib/database.types';

type Staff = Database['public']['Tables']['staff_profiles']['Row'];
type Department = Database['public']['Tables']['departments']['Row'];
type StaffRole = Database['public']['Tables']['staff_profiles']['Row']['role'];

const ROLES: { value: StaffRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'studio_manager', label: 'Studio Manager' },
  { value: 'department_staff', label: 'Department Staff' },
  { value: 'ground_staff', label: 'Ground Staff' },
  { value: 'bookkeeper', label: 'Bookkeeper' },
];

export function AdminConfiguration() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffOpen, setStaffOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);
  const [qrStaff, setQrStaff] = useState<Staff | null>(null);

  const [staffForm, setStaffForm] = useState({ full_name: '', role: 'department_staff' as StaffRole, department_id: '' });
  const [deptForm, setDeptForm] = useState({ name: '', sort_order: '' });

  // Trophy type reference images (admin-uploadable)
  const { images: trophyImages, uploading: trophyUploading, uploadImage } = useTrophyTypeImages();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleTrophyImageUpload(typeId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadImage(typeId, file);
      toast.success('Image updated — clients will see it immediately');
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message ?? 'Unknown error'));
    }
    // Reset input so same file can be re-uploaded
    if (fileInputRefs.current[typeId]) fileInputRefs.current[typeId]!.value = '';
  }

  async function load() {
    setLoading(true);
    const [staffRes, deptRes] = await Promise.all([
      supabase.from('staff_profiles').select('*').order('full_name'),
      supabase.from('departments').select('*').order('sort_order'),
    ]);
    setStaff(staffRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEditStaff(s: Staff) {
    setEditStaff(s);
    setStaffForm({ full_name: s.full_name, role: s.role, department_id: s.department_id ?? '' });
    setStaffOpen(true);
  }

  function openNewStaff() {
    setEditStaff(null);
    setStaffForm({ full_name: '', role: 'department_staff', department_id: '' });
    setStaffOpen(true);
  }

  async function handleSaveStaff() {
    if (!staffForm.full_name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    const payload = {
      full_name: staffForm.full_name.trim(),
      role: staffForm.role,
      department_id: staffForm.department_id || null,
      is_active: true,
    };
    const { error } = editStaff
      ? await supabase.from('staff_profiles').update(payload).eq('id', editStaff.id)
      : await supabase.from('staff_profiles').insert({ ...payload, id: crypto.randomUUID() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editStaff ? 'Staff updated' : 'Staff member added');
    setStaffOpen(false);
    load();
  }

  async function toggleActive(s: Staff) {
    await supabase.from('staff_profiles').update({ is_active: !s.is_active }).eq('id', s.id);
    load();
  }

  async function handleSaveDept() {
    if (!deptForm.name.trim()) { toast.error('Department name required'); return; }
    setSaving(true);
    const { error } = await supabase.from('departments').insert({
      name: deptForm.name.trim(),
      sort_order: Number(deptForm.sort_order) || 99,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Department added');
    setDeptOpen(false);
    setDeptForm({ name: '', sort_order: '' });
    load();
  }

  function printQR(staffMember: Staff) {
    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR - ${staffMember.full_name}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;padding:20px;font-family:sans-serif">
        <h2 style="margin-bottom:8px">${staffMember.full_name}</h2>
        <p style="margin:0 0 16px;color:#666">${staffMember.role.replace(/_/g,' ')}</p>
        <div id="qr"></div>
        <p style="margin-top:12px;font-size:12px;color:#999">${staffMember.id}</p>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <script>new QRCode(document.getElementById("qr"),{text:"COLLETT-STAFF:${staffMember.id}",width:200,height:200});</script>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 800);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Admin Configuration</h1>
        <p className="text-slate-600 dark:text-slate-400">Staff, departments and system settings</p>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff"><Users className="w-4 h-4 mr-2" />Staff ({staff.length})</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="w-4 h-4 mr-2" />Departments ({departments.length})</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="w-4 h-4 mr-2" />Roles</TabsTrigger>
          <TabsTrigger value="trophy-images"><ImageIcon className="w-4 h-4 mr-2" />Trophy Photos</TabsTrigger>
          <TabsTrigger value="credentials"><KeyRound className="w-4 h-4 mr-2" />Login Cards</TabsTrigger>
        </TabsList>

        {/* STAFF */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="icon" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            <Button onClick={openNewStaff}><Plus className="w-4 h-4 mr-2" />Add Staff</Button>
          </div>

          {loading ? (
            <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" /></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.role.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {departments.find(d => d.id === s.department_id)?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={s.is_active ? 'bg-green-600' : 'bg-slate-400'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEditStaff(s)} title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setQrStaff(s)} title="QR Badge">
                              <QrCode className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleActive(s)} className={s.is_active ? 'text-red-500' : 'text-green-600'}>
                              {s.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* DEPARTMENTS */}
        <TabsContent value="departments" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setDeptOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Department</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(d => (
              <Card key={d.id}>
                <CardContent className="pt-5 pb-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{d.name}</p>
                    <p className="text-xs text-slate-500">Order: {d.sort_order} · {staff.filter(s => s.department_id === d.id).length} staff</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ROLES reference */}
        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Role Permissions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { role: 'admin', perms: ['Full access to all data', 'Manage staff and departments', 'View all reports', 'Configure system settings'] },
                  { role: 'studio_manager', perms: ['View and manage all jobs', 'Advance phases for any job', 'View all clients', 'Manage inventory'] },
                  { role: 'department_staff', perms: ['View jobs assigned to their department', 'Advance phases for their jobs', 'Log inventory usage'] },
                  { role: 'ground_staff', perms: ['Scan and move parts', 'View job locations', 'Check in specimens'] },
                  { role: 'bookkeeper', perms: ['Create and manage invoices', 'Record payments', 'View client financial data'] },
                ].map(r => (
                  <div key={r.role} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Badge variant="outline" className="mb-2">{r.role.replace(/_/g, ' ')}</Badge>
                    <ul className="space-y-1">
                      {r.perms.map(p => <li key={p} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />{p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trophy Type Reference Photos */}
        <TabsContent value="trophy-images" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-teal-500" />
                Trophy Type Reference Photos
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Upload reference photos for each trophy type. Clients see these images when selecting their mount style.
                Photos are stored securely and update instantly.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trophyTypeOptions.map(option => {
                  const isUploading = trophyUploading === option.value;
                  return (
                    <div key={option.value} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {/* Current image */}
                      <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                        {trophyImages[option.value] ? (
                          <img
                            src={trophyImages[option.value]}
                            alt={option.label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            🖼️
                          </div>
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      {/* Info + upload */}
                      <div className="p-3 space-y-2">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{option.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{option.description}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-2"
                          disabled={isUploading}
                          onClick={() => fileInputRefs.current[option.value]?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          {isUploading ? 'Uploading…' : 'Upload Photo'}
                        </Button>
                        <input
                          ref={el => { fileInputRefs.current[option.value] = el; }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleTrophyImageUpload(option.value, e)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Tip: Use high-quality photos of actual finished work. JPG/PNG, recommended 1200×900px or larger.
                If no photo is uploaded, a reference image is shown instead.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="mt-4">
          <StaffCredentials />
        </TabsContent>
      </Tabs>

      {/* Staff edit dialog */}
      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={staffForm.full_name} onChange={e => setStaffForm(p => ({ ...p, full_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={staffForm.role} onValueChange={v => setStaffForm(p => ({ ...p, role: v as StaffRole }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={staffForm.department_id} onValueChange={v => setStaffForm(p => ({ ...p, department_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStaff} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add department dialog */}
      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Sort Order</Label><Input type="number" value={deptForm.sort_order} onChange={e => setDeptForm(p => ({ ...p, sort_order: e.target.value }))} className="mt-1" placeholder="99" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDept} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR badge dialog */}
      {qrStaff && (
        <Dialog open={true} onOpenChange={() => setQrStaff(null)}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader><DialogTitle>Staff QR Badge</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center space-y-3 py-4">
              <QRCodeSVG value={`COLLETT-STAFF:${qrStaff.id}`} size={180} />
              <div className="text-center">
                <p className="font-bold text-slate-900 dark:text-slate-100">{qrStaff.full_name}</p>
                <p className="text-sm text-slate-500">{qrStaff.role.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQrStaff(null)}>Close</Button>
              <Button onClick={() => printQR(qrStaff)}>
                <Printer className="w-4 h-4 mr-2" />Print Badge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
