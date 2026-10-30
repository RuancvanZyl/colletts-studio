import { useState, useEffect, useRef } from 'react';
import { completeStage as completeStageAction } from '../../../../lib/offline/completeStage';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { getNextDepartment, getStaffDepartments, DEPT_LABELS, ALL_DEPARTMENTS } from '../../../../lib/pipeline';
import { conditionSummary } from '../../../../lib/condition';
import { CaseTag, type OpenCase } from './CaseTag';
import { SoakReportButton } from './SoakReportButton';
import { EditJobCardButton } from './EditJobCard';
import { useLiveRefresh } from '../../../../lib/liveRefresh';
import { Button } from '../../ui/button';
import { PrintButton } from '../shared/PrintButton';
import { JobPhotosButton } from '../shared/TrophyPhotos';
import { printJobCards } from '../../../../lib/print';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, Sparkles, ChevronDown, ChevronUp,
  Camera, CheckCircle2, X, ArrowLeft, Search,
} from 'lucide-react';

interface StageHistory {
  dept: string;
  completedAt: string;
  completedBy: string;
}

interface JobCard {
  docId: string;
  huntId: string;
  clientNumber: string;
  clientName: string;
  clientEmail: string | null;
  tagNumber: string;
  species: string;
  mountType: string;
  instructions: string;
  received: string;
  condition: string;
  specialRequests: string[];
  department: string;
  stageHistory: StageHistory[];
  huntYear: number | null;
  operator: string | null;
  isPending?: boolean;
}

export function WorkshopInstructions() {
  const { profile } = useAuth();
  const [cards, setCards]         = useState<JobCard[]>([]);
  const [pendingCards, setPendingCards] = useState<JobCard[]>([]);
  const [loading, setLoading]     = useState(true);
  const loadedOnce = useRef(false);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [find, setFind] = useState('');
  const [problems, setProblems] = useState<Record<string, OpenCase>>({});
  const [completing, setCompleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [photos, setPhotos]       = useState<Record<string, File[]>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Role gates
  const isAdmin = profile?.role === 'admin' || profile?.role === 'studio_manager';
  // Boss (Steve) sees everything too
  const isBoss  = profile?.full_name?.split(' ')[0] === 'Steve';
  const seeAll  = isAdmin || isBoss;

  // Departments this staff member works in
  const myDepts = profile?.full_name ? getStaffDepartments(profile.full_name, profile.department_name, profile.works_in) : [];

  async function load() {
    // Only the very first load shows the big spinner. Later refreshes (the refresh button, or a change made by
    // someone else) update quietly so the screen the person is working on never blinks or disappears.
    if (!loadedOnce.current) setLoading(true);

    // One joined query per page (client + hunt come with each job card) — no long id lists in the URL,
    // and paged so more than 1000 job cards still load.
    const EMBED = 'id, hunt_id, form_data, current_department, status, client_hunts(client_id, year, operator, clients(id, full_name, client_number, email))';
    const fetchAll = async (build: () => any) => {
      const rows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await build().range(from, from + 999);
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return rows;
    };

    const [docs, pendingDocs, custDocs] = await Promise.all([
      fetchAll(() => {
        let q = (supabase as any).from('hunt_documents').select(EMBED)
          .eq('doc_type', 'job_card').eq('status', 'in_progress').order('created_at', { ascending: true });
        if (!seeAll && myDepts.length > 0) q = q.in('current_department', myDepts);
        return q;
      }),
      // Admin also fetches pending_payment (hunter-submitted, not yet activated)
      seeAll
        ? fetchAll(() => (supabase as any).from('hunt_documents').select(EMBED)
            .eq('doc_type', 'job_card').eq('status', 'pending_payment').order('created_at', { ascending: false }))
        : Promise.resolve([] as any[]),
      fetchAll(() => (supabase as any).from('hunt_documents')
        .select('hunt_id, title, form_data').eq('doc_type', 'customisation').order('created_at', { ascending: true })),
    ]);

    const allDocs = [...docs, ...pendingDocs];
    if (allDocs.length === 0) { setCards([]); setPendingCards([]); setLoading(false); loadedOnce.current = true; return; }

    const custByHunt: Record<string, string[]> = {};
    for (const c of custDocs) {
      if (!custByHunt[c.hunt_id]) custByHunt[c.hunt_id] = [];
      const desc = c.form_data?.description ? `${c.title}: ${c.form_data.description}` : c.title;
      custByHunt[c.hunt_id].push(desc);
    }

    const toCard = (doc: any, isPending = false): JobCard => {
      const cl = doc.client_hunts?.clients ?? {};
      const fd = doc.form_data ?? {};
      const meta = { year: doc.client_hunts?.year ?? null, operator: doc.client_hunts?.operator ?? null };
      return {
        docId:           doc.id,
        huntId:          doc.hunt_id,
        clientNumber:    cl.client_number ?? '—',
        clientName:      cl.full_name     ?? '—',
        clientEmail:     cl.email         ?? null,
        tagNumber:       fd.tag_number    ?? '',
        species:         fd.species       ?? '—',
        mountType:       fd.mount_type    ?? '—',
        instructions:    fd.instructions  ?? '',
        received:        (fd.received_parts ?? []).length ? (fd.received_parts as any[]).map(p => p.label ?? p.code).join(', ') + (fd.received_other ? ` (${fd.received_other})` : '') : '',
        condition:       conditionSummary(fd.condition_report, fd.condition),
        specialRequests: custByHunt[doc.hunt_id] ?? [],
        department:      doc.current_department ?? 'receiving',
        stageHistory:    fd.stage_history ?? [],
        huntYear:        meta.year        ?? null,
        operator:        meta.operator    ?? null,
        isPending,
      };
    };

    const { data: qc } = await (supabase as any).from('quality_cases').select('id, job_doc_id, reasons, order_override_at, order_override_reason').neq('status', 'resolved');
    const pm: Record<string, OpenCase> = {};
    for (const c of qc ?? []) pm[c.job_doc_id] = { id: c.id, reasons: c.reasons ?? [], held: !!c.order_override_at, overrideReason: c.order_override_reason ?? null };
    setProblems(pm);
    setCards(docs.map((d: any) => toCard(d, false)));
    setPendingCards(pendingDocs.map((d: any) => toCard(d, true)));
    setLoading(false);
    loadedOnce.current = true;
  }

  async function activateJob(card: JobCard) {
    setActivating(card.docId);
    const { error } = await (supabase as any)
      .from('hunt_documents')
      .update({ status: 'in_progress', current_department: 'receiving' })
      .eq('id', card.docId);
    if (error) { toast.error('Could not activate job'); }
    else { toast.success(`${card.species} activated → Receiving`); }
    setActivating(null);
    load();
  }

  useEffect(() => { load(); }, [profile?.full_name]);
  useLiveRefresh(['hunt_documents', 'quality_cases'], load);

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  function addPhotos(docId: string, files: FileList | null) {
    if (!files) return;
    setPhotos(prev => ({ ...prev, [docId]: [...(prev[docId] ?? []), ...Array.from(files)] }));
  }

  function removePhoto(docId: string, idx: number) {
    setPhotos(prev => ({ ...prev, [docId]: (prev[docId] ?? []).filter((_, i) => i !== idx) }));
  }

  async function markDone(card: JobCard) {
    if (completing) return;
    setCompleting(card.docId);

    const by  = profile?.full_name ?? 'Staff';
    const cardPhotos = photos[card.docId] ?? [];
    const next = getNextDepartment(card.mountType, card.department);

    // Same path as My Tasks and the stations: photos kept on the device, checklist rule enforced, works offline
    const r = await completeStageAction({
      doc: card.docId, dept: card.department, mountType: card.mountType, notes: '',
      files: cardPhotos, staffId: profile?.id ?? null, staffName: by,
    });

    if (r.error) {
      if (/checklist incomplete/i.test(r.error) && isAdmin) {
        // admins may override, but must say why (it is recorded on the job card)
        const reason = window.prompt(`${r.error}\n\nAs a manager you can still move this job on. Please type the reason. It is saved on the job card.`);
        if (reason && reason.trim()) {
          const { error: ovErr } = await (supabase as any).rpc('job_force_advance', {
            p_doc: card.docId, p_next: next ?? 'done', p_status: next ? 'in_progress' : 'completed', p_reason: reason.trim(),
          });
          if (ovErr) { toast.error(ovErr.message); setCompleting(null); return; }
        } else { setCompleting(null); return; }
      } else {
        toast.error(r.error);
        setCompleting(null);
        return;
      }
    }

    // Fire-and-forget email to client at checkpoint stages
    if (card.clientEmail && !r.queued) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-trophy-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          clientEmail: card.clientEmail,
          clientName:  card.clientName,
          species:     card.species,
          mountType:   card.mountType,
          stage:       next ?? 'done',
          huntYear:    card.huntYear,
          operator:    card.operator,
        }),
      }).catch(() => {}); // silent — email is best-effort
    }

    const nextLabel = next ? (DEPT_LABELS[next] ?? next) : null;
    toast.success(r.queued ? 'Saved on this device — it will be sent when the connection returns' : `${card.species} done${nextLabel ? ` → moving to ${nextLabel}` : ' — job complete!'}`);

    setPhotos(prev => { const n = { ...prev }; delete n[card.docId]; return n; });
    setExpanded(null);
    setCompleting(null);
    load();
  }

  function timeInDept(card: JobCard): string | null {
    if (!card.stageHistory.length) return null;
    const last = card.stageHistory[card.stageHistory.length - 1];
    if (!last?.completedAt) return null;
    const mins = Math.round((Date.now() - new Date(last.completedAt).getTime()) / 60000);
    if (mins < 60)   return `${mins}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h`;
    return `${Math.round(mins / 1440)}d`;
  }

  // ── by client: one row per client, then the client's full job card ───────────
  const stageOrder = (d: string) => { const i = ALL_DEPARTMENTS.indexOf(d); return i < 0 ? 99 : i; };
  const filtered = cards.filter(c => (deptFilter === 'all' || c.department === deptFilter)
    && (!find.trim() || `${c.clientName} ${c.clientNumber} ${c.species}`.toLowerCase().includes(find.trim().toLowerCase())));
  const clientsMap = new Map<string, JobCard[]>();
  for (const c of filtered) { const k = c.clientNumber !== '—' ? c.clientNumber : c.clientName; (clientsMap.get(k) ?? clientsMap.set(k, []).get(k)!).push(c); }
  const clients = [...clientsMap.entries()].sort((a, b) => a[1][0].clientName.localeCompare(b[1][0].clientName));
  const deptsPresent = ALL_DEPARTMENTS.filter(d => cards.some(c => c.department === d));
  const clientKey = (c: JobCard) => c.clientNumber !== '—' ? c.clientNumber : c.clientName;
  const openList = openClient ? cards.filter(c => clientKey(c) === openClient) : [];
  const openCards = openList.length > 0 ? openList : null;

  const view = { expanded, toggle, completing, markDone, photos, addPhotos, removePhoto, fileRefs, problems, isAdmin, reload: load };

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Job Cards</h1>
          <p className="text-slate-500 text-sm">
            {seeAll
              ? `${cards.length} active job cards · ${new Set(cards.map(c => c.clientName)).size} clients · ${pendingCards.length} waiting to be activated`
              : myDepts.length > 0
                ? `${myDepts.map(d => DEPT_LABELS[d] ?? d).join(', ')} — ${cards.length} job${cards.length !== 1 ? 's' : ''}`
                : 'No department assigned'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cards.length > 0 && <PrintButton label={`Print all`} onPrint={() => printJobCards({ docIds: cards.map(c => c.docId) })} />}
          <Button variant="outline" size="sm" onClick={load} disabled={loading} title="Refresh" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Pending hunter submissions — admin only */}
      {seeAll && pendingCards.length > 0 && !openCards && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">New from hunters: waiting to be activated</span>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">{pendingCards.length}</span>
          </div>
          <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border-2 border-amber-300 dark:border-amber-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {pendingCards.map(card => (
              <div key={card.docId} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{card.species} — {card.mountType}</div>
                  <div className="text-sm text-slate-500">{card.clientName} · {card.huntYear ?? '—'} · {card.operator ?? 'No outfitter'}</div>
                  {card.instructions && <div className="text-xs text-slate-400 mt-1 truncate">{card.instructions}</div>}
                </div>
                <Button size="sm" onClick={() => activateJob(card)} disabled={activating === card.docId} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white">
                  {activating === card.docId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : cards.length === 0 ? (
        <div className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-20 text-center">
          <p className="text-slate-500 font-medium">{myDepts.length === 0 && !seeAll ? 'No department assigned to your profile' : 'No active jobs at your station'}</p>
        </div>
      ) : openCards ? (
        // ── one client: the full job card ──
        <div className="space-y-4">
          <button onClick={() => setOpenClient(null)} className="inline-flex items-center gap-1.5 text-base font-semibold text-[#0073ea] min-h-11"><ArrowLeft className="w-4 h-4" />All clients</button>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2b3a] p-4 space-y-3">
            <div>
              <span className="font-mono text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded">{openCards[0].clientNumber}</span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight mt-1.5">{openCards[0].clientName}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{openCards.length} trophies{openCards[0].huntYear ? ` · ${openCards[0].huntYear} hunt` : ''}{openCards[0].operator ? ` · ${openCards[0].operator}` : ''}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">{[...new Set(openCards.map(c => c.department))].sort((x, y) => stageOrder(x) - stageOrder(y)).map(d => <span key={d} className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-[#0073ea]/10 text-[#0073ea]">{DEPT_LABELS[d] ?? d} · {openCards.filter(c => c.department === d).length}</span>)}</div>
            <PrintButton label="Print the full job card" className="w-full justify-center min-h-11" onPrint={() => printJobCards({ docIds: openCards.map(c => c.docId) })} />
          </div>
          {[...openCards].sort((x, y) => stageOrder(x.department) - stageOrder(y.department) || x.species.localeCompare(y.species)).map(card => <AnimalBlock key={card.docId} card={card} {...view} />)}
        </div>
      ) : (
        // ── all clients: one row each ──
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDeptFilter('all')} className={`min-h-11 px-4 rounded-full border-2 text-sm font-bold ${deptFilter === 'all' ? 'border-[#0073ea] bg-[#0073ea] text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>All departments</button>
            {deptsPresent.map(d => <button key={d} onClick={() => setDeptFilter(d)} className={`min-h-11 px-4 rounded-full border-2 text-sm font-bold ${deptFilter === d ? 'border-[#0073ea] bg-[#0073ea] text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{DEPT_LABELS[d] ?? d} · {cards.filter(c => c.department === d).length}</button>)}
          </div>
          <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={find} onChange={e => setFind(e.target.value)} placeholder="Find a client or an animal" className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pl-9 pr-3 min-h-11 text-base" /></div>
          {clients.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500">No clients match.</p>}
          {clients.map(([key, list]) => {
            const withInstr = list.filter(c => c.instructions || c.specialRequests.length > 0).length;
            const flagged = list.filter(c => problems[c.docId]).length;
            const byDept = [...new Set(list.map(c => c.department))].sort((x, y) => stageOrder(x) - stageOrder(y));
            return (
              <div key={key} className="bg-white dark:bg-[#1c2b3a] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center">
                <button onClick={() => setOpenClient(key)} className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 min-h-16">
                  <span className="flex-1 min-w-0 space-y-1">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded shrink-0">{list[0].clientNumber}</span>
                      {flagged > 0 && <span className="text-[11px] font-bold rounded-full px-2 py-0.5 bg-red-600 text-white shrink-0">{flagged} problem{flagged > 1 ? 's' : ''}</span>}
                    </span>
                    <span className="block font-bold text-slate-900 dark:text-slate-100 text-lg leading-snug">{list[0].clientName}</span>
                    <span className="block text-sm text-slate-500">{list.length} trophy{list.length > 1 ? 's' : ''} · {byDept.map(d => `${DEPT_LABELS[d] ?? d} ${list.filter(c => c.department === d).length}`).join(' · ')}{withInstr > 0 ? ` · ${withInstr} with instructions` : ''}</span>
                  </span>
                  <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90 shrink-0" />
                </button>
                <PrintButton compact iconOnlyOnPhone label="Print" className="mr-3 shrink-0" onPrint={() => printJobCards({ docIds: list.map(c => c.docId) })} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── One animal on the client's job card: what it is, what was received, the instructions, and the work ──
interface ViewProps {
  expanded: string | null;
  toggle: (id: string) => void;
  completing: string | null;
  markDone: (card: JobCard) => void;
  photos: Record<string, File[]>;
  addPhotos: (id: string, files: FileList | null) => void;
  removePhoto: (id: string, idx: number) => void;
  fileRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  problems: Record<string, OpenCase>;
  isAdmin: boolean;
  reload: () => void;
}

function AnimalBlock({ card, expanded, toggle, completing, markDone, photos, addPhotos, removePhoto, fileRefs, problems, isAdmin, reload }: ViewProps & { card: JobCard }) {
  const isOpen = expanded === card.docId;
  const isDoing = completing === card.docId;
  const cardPhotos = photos[card.docId] ?? [];
  const problem = problems[card.docId];
  return (
    <section className={`rounded-2xl border bg-white dark:bg-[#1c2b3a] overflow-hidden ${problem ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="px-4 pt-4 pb-3 space-y-2.5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{card.species}</h3>
            <p className="text-base text-slate-700 dark:text-slate-300">{card.mountType}{card.tagNumber ? <span className="font-mono text-sm text-slate-500"> · tag #{card.tagNumber}</span> : null}</p>
          </div>
          <span className="shrink-0 text-xs font-bold rounded-full px-3 py-1 bg-[#0073ea]/10 text-[#0073ea]">{DEPT_LABELS[card.department] ?? card.department}</span>
        </div>
        {problem && <CaseTag c={problem} />}
        {(card.received || card.condition) && (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {card.received && <><span className="font-semibold">Received:</span> {card.received}</>}
            {card.received && card.condition ? ' · ' : ''}{card.condition && <><span className="font-semibold">Condition:</span> {card.condition}</>}
          </p>
        )}
        {card.instructions ? (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Client instructions</p>
            <p className="text-base text-blue-900 dark:text-blue-100 leading-relaxed whitespace-pre-wrap">{card.instructions}</p>
          </div>
        ) : !card.specialRequests.length && <p className="text-sm text-slate-400 italic">No special instructions: standard mount</p>}
        {card.specialRequests.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Sparkles className="w-3 h-3" />Special request for this client (price to be confirmed)</p>
            {card.specialRequests.map((r, i) => <p key={i} className="text-base text-amber-900 dark:text-amber-200 leading-relaxed">{r}</p>)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <JobPhotosButton docId={card.docId} dept={card.department} huntId={card.huntId} title={`${card.species} — ${card.clientName}`} />
          <PrintButton compact label="Print this card" onPrint={() => printJobCards({ docIds: [card.docId] })} />
          {card.department === 'tannery' && <SoakReportButton docId={card.docId} huntId={card.huntId} species={card.species} />}
          {isAdmin && <EditJobCardButton docId={card.docId} huntId={card.huntId} species={card.species} mount={card.mountType} instructions={card.instructions} tag={card.tagNumber} department={card.department} clientName={card.clientName} onChanged={reload} />}
          <button onClick={() => toggle(card.docId)} className="ml-auto min-h-11 px-4 rounded-lg border-2 border-green-600 text-green-700 dark:text-green-300 font-bold text-sm inline-flex items-center gap-1.5">{isOpen ? <ChevronUp className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}{isOpen ? 'Close' : 'Complete this stage'}</button>
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-5 pt-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Upload photo <span className="font-normal text-slate-400">({['mounting', 'finishing'].includes(card.department) ? 'required here; the date, time and your name are printed on it' : 'optional'})</span>
          </p>
          {cardPhotos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cardPhotos.map((f, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(card.docId, i)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center"><X className="w-2.5 h-2.5 text-white" /></button>
                </div>
              ))}
              <button onClick={() => fileRefs.current[card.docId]?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 flex-shrink-0"><Camera className="w-5 h-5" /></button>
            </div>
          ) : (
            <button onClick={() => fileRefs.current[card.docId]?.click()} className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-4 flex flex-col items-center gap-1.5 text-slate-400 hover:border-slate-300 transition-colors"><Camera className="w-5 h-5" /><span className="text-xs">Tap to add photo</span></button>
          )}
          <input ref={el => { fileRefs.current[card.docId] = el; }} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={e => addPhotos(card.docId, e.target.files)} />
          <Button onClick={() => markDone(card)} disabled={!!isDoing} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3 rounded-xl">
            {isDoing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><CheckCircle2 className="w-5 h-5 mr-2" />Mark Done</>}
          </Button>
          <p className="text-[10px] text-center text-slate-400">Time &amp; date stamp recorded automatically</p>
        </div>
      )}
    </section>
  );
}
