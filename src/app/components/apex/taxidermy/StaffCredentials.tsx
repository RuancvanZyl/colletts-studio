import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Printer, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  newPassword?: string;
  saved?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin:            'Admin',
  studio_manager:   'Studio Manager',
  department_staff: 'Workshop Staff',
  ground_staff:     'Ground Staff',
  bookkeeper:       'Bookkeeper',
};

function generatePassword(): string {
  const words   = ['Apex','Hunt','Cape','Horn','Skin','Buck','Lion','Kudu','Oryx','Gemsbok'];
  const numbers = Math.floor(100 + Math.random() * 900);
  const word    = words[Math.floor(Math.random() * words.length)];
  const sym     = ['!','@','#','$'][Math.floor(Math.random() * 4)];
  return `${word}${numbers}${sym}`;
}

export function StaffCredentials() {
  const [staff, setStaff]       = useState<StaffMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [showPw, setShowPw]     = useState<Record<string, boolean>>({});
  const [allGenerated, setAllGenerated] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-staff-emails`,
      { headers: { Authorization: `Bearer ${session?.access_token}` } }
    );
    const data = await res.json();
    setStaff((data ?? []).map((s: StaffMember) => ({ ...s, newPassword: generatePassword() })));
    setAllGenerated(true);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function savePassword(member: StaffMember) {
    if (!member.newPassword) return;
    setSaving(member.id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-staff-password`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: member.id, password: member.newPassword }),
      }
    );
    const result = await res.json();
    setSaving(null);
    if (result.ok) {
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, saved: true } : s));
      toast.success(`Password set for ${member.name}`);
    } else {
      toast.error(`Failed: ${result.error}`);
    }
  }

  async function saveAll() {
    for (const member of staff) {
      if (!member.saved) await savePassword(member);
    }
    toast.success('All passwords updated');
  }

  function regenerate(id: string) {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, newPassword: generatePassword(), saved: false } : s));
  }

  function print() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Staff Login Cards</h2>
          <p className="text-sm text-slate-500">Set passwords then print one card per staff member</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1.5" />Regenerate All
          </Button>
          <Button size="sm" onClick={saveAll} className="bg-green-600 hover:bg-green-700 text-white">
            <KeyRound className="w-4 h-4 mr-1.5" />Save All Passwords
          </Button>
          <Button size="sm" onClick={print} variant="outline">
            <Printer className="w-4 h-4 mr-1.5" />Print Cards
          </Button>
        </div>
      </div>

      {/* Notice */}
      <div className="no-print bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        Click <strong>Save All Passwords</strong> first to apply them in Supabase, then <strong>Print Cards</strong> to print and hand out.
      </div>

      {/* Cards — print layout */}
      <div className="print-grid">
        {staff.map(member => (
          <div key={member.id} className="credential-card bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

            {/* Card header */}
            <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">{member.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">{member.name}</p>
                <p className="text-slate-400 text-xs">{ROLE_LABELS[member.role] ?? member.role}</p>
              </div>
              {member.saved && (
                <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto no-print" />
              )}
            </div>

            {/* Login details */}
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Login URL</p>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">app.apextrophysolutions.com</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{member.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                    {showPw[member.id] ? member.newPassword : '••••••••••'}
                  </p>
                  <button
                    onClick={() => setShowPw(p => ({ ...p, [member.id]: !p[member.id] }))}
                    className="text-slate-400 hover:text-slate-600 no-print"
                  >
                    {showPw[member.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {/* Always visible on print */}
                  <p className="print-password hidden">{member.newPassword}</p>
                </div>
              </div>
            </div>

            {/* Actions — hidden on print */}
            <div className="no-print px-5 pb-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => regenerate(member.id)}
                className="flex-1 text-xs"
              >
                New Password
              </Button>
              <Button
                size="sm"
                onClick={() => savePassword(member)}
                disabled={saving === member.id || member.saved}
                className={`flex-1 text-xs ${member.saved ? 'bg-green-600' : 'bg-slate-800'} text-white`}
              >
                {saving === member.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : member.saved ? 'Saved ✓' : 'Save Password'
                }
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-grid, .print-grid * { visibility: visible; }
          .print-grid { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-password { display: block !important; }
          .credential-card {
            break-inside: avoid;
            border: 2px solid #1e293b !important;
            margin-bottom: 16px;
            background: white !important;
            color: black !important;
          }
          .print-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding: 16px;
          }
        }
        .print-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .print-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}
