import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useAuth } from '../../../../lib/auth';
import { toast } from 'sonner';
import {
  ArrowLeft, Crosshair, FileText, Upload, Trash2, Loader2,
  CheckCircle2, Clock, AlertTriangle, Send, ExternalLink,
  Calendar, MapPin, Users, Download,
} from 'lucide-react';
import type { OutfitterHunt } from './HuntDashboard';

const DOC_TYPES = [
  { value: 'permit',       label: 'Hunting Permit' },
  { value: 'cites',        label: 'CITES Certificate' },
  { value: 'import_permit',label: 'Import Permit' },
  { value: 'other',        label: 'Other Document' },
];

const STATUS_COLORS: Record<string, string> = {
  in_progress:     'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  pending_payment: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  completed:       'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  flagged:         'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  in_progress:     'In Production',
  pending_payment: 'Awaiting Payment',
  completed:       'Complete',
  flagged:         'Issue Flagged',
};

interface Trophy {
  id: string;
  title: string;
  status: string;
  current_department: string;
  form_data: any;
}

interface HuntDoc {
  id: string;
  doc_type: string;
  title: string;
  storage_path: string | null;
  dropbox_path: string | null;
  status: string;
  created_at: string;
}

interface HuntDetailViewProps {
  hunt: OutfitterHunt;
  onBack: () => void;
}

export function HuntDetailView({ hunt, onBack }: HuntDetailViewProps) {
  const { profile } = useAuth();
  const [tab, setTab]           = useState<'trophies' | 'documents'>('trophies');
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [docs,     setDocs]     = useState<HuntDoc[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [inviting, setInviting] = useState(false);
  const [invited,  setInvited]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType,  setDocType]  = useState('permit');
  const [docTitle, setDocTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('hunt_documents')
      .select('id, doc_type, title, status, storage_path, dropbox_path, form_data, current_department, created_at')
      .eq('hunt_id', hunt.id)
      .order('created_at', { ascending: true });

    const all = data ?? [];
    setTrophies(all.filter((d: any) => d.doc_type === 'job_card'));
    setDocs(all.filter((d: any) => d.doc_type !== 'job_card'));
    setLoading(false);
  }, [hunt.id]);

  useEffect(() => { load(); }, [load]);

  // Group trophies by species
  const bySpecies = trophies.reduce<Record<string, Trophy[]>>((acc, t) => {
    const sp = t.form_data?.species ?? 'Unknown';
    if (!acc[sp]) acc[sp] = [];
    acc[sp].push(t);
    return acc;
  }, {});

  async function sendInvite() {
    if (!hunt.client?.id) return;
    const { data: clientRow } = await (supabase as any)
      .from('clients').select('email').eq('id', hunt.client.id).single();
    if (!clientRow?.email) { toast.error('No email on file for this client'); return; }
    setInviting(true);
    const { error } = await (supabase as any).auth.signInWithOtp({
      email: clientRow.email,
      options: { shouldCreateUser: true },
    });
    setInviting(false);
    if (error) { toast.error('Invite failed: ' + error.message); return; }
    setInvited(true);
    toast.success(`Portal invite sent to ${clientRow.email}`);
  }

  async function uploadDoc(file: File) {
    if (!docTitle.trim()) { toast.error('Enter a document title first'); return; }
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `hunt-docs/${hunt.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await (supabase as any).storage
        .from('client-photos').upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      await (supabase as any).from('hunt_documents').insert({
        hunt_id:      hunt.id,
        doc_type:     docType,
        title:        docTitle.trim(),
        storage_path: path,
        status:       'complete',
        created_by:   profile?.id ?? null,
      });
      toast.success('Document uploaded');
      setDocTitle('');
      await load();
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteDoc(docId: string, storagePath: string | null) {
    if (!confirm('Delete this document?')) return;
    if (storagePath) {
      await (supabase as any).storage.from('client-photos').remove([storagePath]);
    }
    await (supabase as any).from('hunt_documents').delete().eq('id', docId);
    setDocs(prev => prev.filter(d => d.id !== docId));
    toast.success('Document deleted');
  }

  async function getDownloadUrl(storagePath: string) {
    const { data } = await (supabase as any).storage
      .from('client-photos').createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const docTypeLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label ?? type;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="mt-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{hunt.client?.full_name ?? 'Hunt'}</h1>
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mt-1">
            <span className="font-medium">{hunt.year}</span>
            {hunt.operator && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{hunt.operator}</span>}
            {hunt.farm     && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{hunt.farm}</span>}
            {hunt.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(hunt.start_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                {hunt.end_date && ` – ${new Date(hunt.end_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`}
              </span>
            )}
          </div>
        </div>
        {/* Portal invite */}
        {invited ? (
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="w-4 h-4" /> Invited
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={sendInvite} disabled={inviting} className="flex-shrink-0 h-8 text-xs gap-1.5">
            {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Invite to Portal
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {([
          { key: 'trophies',  label: `Trophies (${trophies.length})` },
          { key: 'documents', label: `Documents (${docs.length})` },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-[#0073ea] text-[#0073ea]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : tab === 'trophies' ? (

        /* ── Trophies by species ──────────────────────────────────────────── */
        <div className="space-y-4">
          {trophies.length === 0 ? (
            <div className="text-center py-10">
              <Crosshair className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No trophies on this hunt yet</p>
            </div>
          ) : (
            Object.entries(bySpecies).map(([species, items]) => (
              <div key={species} className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Species header */}
                <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{species}</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    {items.length} {items.length === 1 ? 'trophy' : 'trophies'}
                  </Badge>
                </div>

                {/* Trophy rows */}
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {items.map(t => {
                    const fd = t.form_data ?? {};
                    return (
                      <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{fd.mount_type ?? 'Mount'}</span>
                            {fd.tag_number && (
                              <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                {fd.tag_number}
                              </span>
                            )}
                            {fd.quantity > 1 && (
                              <span className="text-xs text-slate-400">×{fd.quantity}</span>
                            )}
                          </div>
                          {fd.instructions && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{fd.instructions}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge className={`text-[10px] px-1.5 h-4 ${STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
                            {STATUS_LABELS[t.status] ?? t.status}
                          </Badge>
                          {t.status === 'in_progress' && (
                            <span className="text-[10px] text-slate-400 capitalize">
                              {t.current_department?.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

      ) : (

        /* ── Documents ────────────────────────────────────────────────────── */
        <div className="space-y-4">

          {/* Upload form */}
          <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload Document</p>
            <div className="flex gap-2">
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 text-slate-700 dark:text-slate-300"
              >
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="Document title…"
                className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 text-slate-700 dark:text-slate-300 placeholder-slate-400"
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !docTitle.trim()}
              variant="outline"
              className="w-full gap-2 h-9"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                : <><Upload className="w-4 h-4" /> Choose File &amp; Upload</>
              }
            </Button>
          </div>

          {/* Document list */}
          {docs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No documents uploaded yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload permits, CITES certificates and other paperwork above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => (
                <div key={doc.id} className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    doc.doc_type === 'cites'         ? 'bg-purple-100 dark:bg-purple-950' :
                    doc.doc_type === 'permit'        ? 'bg-blue-100 dark:bg-blue-950' :
                    doc.doc_type === 'import_permit' ? 'bg-green-100 dark:bg-green-950' :
                    'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <FileText className={`w-4 h-4 ${
                      doc.doc_type === 'cites'         ? 'text-purple-600' :
                      doc.doc_type === 'permit'        ? 'text-blue-600' :
                      doc.doc_type === 'import_permit' ? 'text-green-600' :
                      'text-slate-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{doc.title}</p>
                    <p className="text-xs text-slate-400">{docTypeLabel(doc.doc_type)} · {new Date(doc.created_at).toLocaleDateString('en-ZA')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {doc.storage_path && (
                      <button
                        onClick={() => getDownloadUrl(doc.storage_path!)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-[#0073ea] transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {doc.dropbox_path && (
                      <button
                        onClick={() => window.open(`https://www.dropbox.com/home${doc.dropbox_path}`, '_blank')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-[#0073ea] transition-colors"
                        title="Open in Dropbox"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteDoc(doc.id, doc.storage_path)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
