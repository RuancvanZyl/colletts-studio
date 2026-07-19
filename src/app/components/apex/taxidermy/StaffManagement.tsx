/**
 * StaffManagement — admin view to create, edit and deactivate staff accounts.
 * Creating a new account calls the create-staff-account Edge Function which
 * uses the service role to create the Supabase auth user + staff_profiles row.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';
import { Plus, RefreshCw, User, Shield, Pencil, Power, Loader2, X, Check } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  department_id: string | null;
  department_name: string | null;
  is_active: boolean;
  avatar_color: string;
  created_at: string;
}

const ROLES = [
  { value: 'admin',           label: 'Admin' },
  { value: 'studio_manager',  label: 'Studio Manager' },
  { value: 'department_staff', label: 'Department Staff' },
  { value: 'ground_staff',    label: 'Ground Staff' },
  { value: 'bookkeeper',      label: 'Bookkeeper' },
];

const AVATAR_COLORS = [
  '#3AAECC','#E67E22','#2ECC71','#9B59B6','#E74C3C',
  '#1ABC9C','#F39C12','#3498DB','#E91E63','#00BCD4',
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    studio_manager: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    department_staff: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    ground_staff: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    bookkeeper: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  };
  return map[role] ?? 'bg-slate-100 text-slate-700';
}

export function StaffManagement() {
  const [staff, setStaff]       = useState<StaffMember[]>([]);
  const [depts, setDepts]       = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'department_staff',
    department_id: '',
    avatar_color: AVATAR_COLORS[0],
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: staffRows }, { data: deptRows }] = await Promise.all([
      (supabase as any).from('staff_profiles').select(`
        id, full_name, email, role, department_id, is_active, avatar_color, created_at,
        departments(name)
      `).order('full_name'),
      (supabase as any).from('departments').select('id, name').order('sort_order'),
    ]);
    setStaff((staffRows ?? []).map((s: any) => ({
      ...s,
      department_name: s.departments?.name ?? null,
    })));
    setDepts(deptRows ?? []);
    setLoading(false);
  }

  function openNew() {
    setEditId(null);
    setForm({ full_name: '', email: '', password: '', role: 'department_staff', department_id: '', avatar_color: AVATAR_COLORS[0] });
    setShowForm(true);
  }

  function openEdit(s: StaffMember) {
    setEditId(s.id);
    setForm({ full_name: s.full_name, email: s.email ?? '', password: '', role: s.role, department_id: s.department_id ?? '', avatar_color: s.avatar_color ?? AVATAR_COLORS[0] });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);

    if (editId) {
      // Update existing staff profile
      const { error } = await (supabase as any).from('staff_profiles').update({
        full_name:     form.full_name.trim(),
        email:         form.email || null,
        role:          form.role,
        department_id: form.department_id || null,
        avatar_color:  form.avatar_color,
      }).eq('id', editId);
      if (error) { toast.error(error.message); } else { toast.success('Staff member updated'); setShowForm(false); load(); }
    } else {
      // Create new staff via Edge Function
      if (!form.email.trim() || !form.password.trim()) { toast.error('Email and password are required for new staff'); setSaving(false); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email:         form.email.trim(),
          password:      form.password,
          full_name:     form.full_name.trim(),
          role:          form.role,
          department_id: form.department_id || null,
          avatar_color:  form.avatar_color,
        }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error ?? 'Failed to create staff account'); } else { toast.success(`${form.full_name} added — they can now log in`); setShowForm(false); load(); }
    }
    setSaving(false);
  }

  async function toggleActive(s: StaffMember) {
    const { error } = await (supabase as any).from('staff_profiles').update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) { toast.error(error.message); } else {
      toast.success(s.is_active ? `${s.full_name} deactivated` : `${s.full_name} reactivated`);
      load();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Staff Management</h2>
          <p className="text-sm text-slate-500">Create and manage workshop staff accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openNew} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading staff…
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map(s => (
            <div key={s.id} className={`flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-slate-900 ${s.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-50'}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: s.avatar_color }}>
                {initials(s.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{s.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge(s.role)}`}>
                    {ROLES.find(r => r.value === s.role)?.label ?? s.role}
                  </span>
                  {!s.is_active && <span className="text-xs text-slate-400 italic">Inactive</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {s.email ?? 'No email'}{s.department_name ? ` · ${s.department_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEdit(s)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const msg = s.is_active
                      ? `Deactivate ${s.full_name}? They will no longer be able to log in.`
                      : `Reactivate ${s.full_name}? They will be able to log in again.`;
                    if (window.confirm(msg)) toggleActive(s);
                  }}
                  className="gap-1.5"
                >
                  <Power className={`w-3.5 h-3.5 ${s.is_active ? 'text-red-500' : 'text-green-500'}`} />
                  {s.is_active ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <User className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No staff members yet — add your first one</p>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{editId ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Full Name *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. John Smith" className="mt-1" />
              </div>

              {!editId && (
                <>
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Email *</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Temporary Password *</Label>
                    <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" className="mt-1" />
                    <p className="text-xs text-slate-400 mt-1">Staff can change this after first login</p>
                  </div>
                </>
              )}

              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Role *</Label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Department</Label>
                <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">No specific department</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Avatar Colour</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {AVATAR_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 relative"
                      style={{ background: c }}>
                      {form.avatar_color === c && <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? 'Save Changes' : 'Create Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
