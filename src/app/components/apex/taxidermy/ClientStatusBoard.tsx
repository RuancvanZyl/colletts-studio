import { useState, useMemo } from 'react';
import { Search, Users, ArrowRight, ChevronDown, ChevronRight as ChevronRightIcon, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useClientBoard, type ClientBoardEntry, type FlagKey } from '../../../../lib/hooks/useClientBoard';
import { DEPT_LABELS, DEPT_COLORS } from '../../../../lib/pipeline';
import { useAuth } from '../../../../lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';

interface ClientStatusBoardProps {
  onNavigate: (view: string, clientId?: string) => void;
}

function orderStatus(e: ClientBoardEntry): { label: string; className: string } {
  if (e.activeHunts > 0) {
    if (e.missingJobCard) return { label: 'Awaiting job card', className: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' };
    if (e.departments.length > 0) return { label: 'In production', className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' };
    return { label: 'Active', className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' };
  }
  if (e.completedHunts > 0) return { label: 'Completed', className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' };
  return { label: 'Cancelled', className: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
}

const FLAG_META: Record<FlagKey, { label: string; chip: string; row: string; hint: string }> = {
  noJobCard:   { label: 'No job card',          chip: 'bg-amber-500 text-white',  row: 'border-l-4 border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20',   hint: 'Trophies are here but no job card has been made.' },
  instruction: { label: 'Awaiting instruction', chip: 'bg-violet-600 text-white', row: 'border-l-4 border-l-violet-500 bg-violet-50/60 dark:bg-violet-950/20', hint: 'The client has not confirmed what they want done.' },
  deposit:     { label: 'Deposit not paid',     chip: 'bg-rose-600 text-white',   row: 'border-l-4 border-l-rose-500 bg-rose-50/60 dark:bg-rose-950/20',       hint: 'A deposit or payment is still outstanding.' },
  waiting:     { label: 'Waiting too long',     chip: 'bg-red-700 text-white',    row: 'border-l-4 border-l-red-600 bg-red-50/70 dark:bg-red-950/30',          hint: 'Past its deadline, or waiting longer than it should.' },
  profile:     { label: 'Profile problem',      chip: 'bg-slate-700 text-white',  row: 'border-l-4 border-l-slate-500 bg-slate-100/70 dark:bg-slate-800/40',   hint: 'The client profile is missing or has wrong details.' },
};

// Conditions that are currently true for this client (resolved or not)
function activeFlags(e: ClientBoardEntry): FlagKey[] {
  const f: FlagKey[] = [];
  if (e.activeHunts > 0) {
    if (e.waitingTooLong) f.push('waiting');
    if (e.depositUnpaid) f.push('deposit');
    if (e.awaitingInstruction) f.push('instruction');
    if (e.missingJobCard) f.push('noJobCard');
  }
  if (e.profileProblems.length > 0) f.push('profile');
  return f;
}

const openFlags     = (e: ClientBoardEntry) => activeFlags(e).filter(k => !e.resolutions[k]);
const resolvedFlags = (e: ClientBoardEntry) => activeFlags(e).filter(k => !!e.resolutions[k]);

function ClientRow({ e, onOpen, onResolve, onReopen }: {
  e: ClientBoardEntry;
  onOpen: () => void;
  onResolve: (k: FlagKey) => void;
  onReopen: (k: FlagKey) => void;
}) {
  const status = orderStatus(e);
  const open = openFlags(e);
  const done = resolvedFlags(e);
  const worst = open[0];
  const detail = [
    e.pastDeadline ? 'Past deadline' : null,
    e.waitingDays !== null && (e.depositUnpaid || e.awaitingInstruction) ? `waiting ${e.waitingDays} days` : null,
    ...e.profileProblems,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors ${
        worst ? FLAG_META[worst].row : done.length ? 'border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
    >
      <div className="w-8 h-8 rounded-full bg-[#0073ea]/10 border border-[#0073ea]/20 flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={onOpen}>
        <span className="text-[#0073ea] text-xs font-bold">{e.fullName.charAt(0)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <button onClick={onOpen} className="text-left block max-w-full">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate hover:underline">{e.fullName}</p>
          <p className="text-xs text-slate-400">{e.clientNumber ?? '—'} · {e.clientType}</p>
        </button>

        {(open.length > 0 || done.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {open.map(k => (
              <button
                key={k}
                onClick={() => onResolve(k)}
                title={`${FLAG_META[k].hint} Click to mark as resolved.`}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded hover:opacity-80 ${FLAG_META[k].chip}`}
              >
                {FLAG_META[k].label} · resolve
              </button>
            ))}
            {done.map(k => {
              const r = e.resolutions[k]!;
              return (
                <button
                  key={k}
                  onClick={() => onReopen(k)}
                  title={`Resolved${r.by ? ` by ${r.by}` : ''} on ${new Date(r.at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}${r.note ? ` — ${r.note}` : ''}. Click to reopen.`}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 hover:opacity-80"
                >
                  <CheckCircle2 className="w-3 h-3" />{FLAG_META[k].label} resolved
                </button>
              );
            })}
          </div>
        )}
        {detail && open.length > 0 && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{detail}</p>}
        {done.length > 0 && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
            {done.map(k => {
              const r = e.resolutions[k]!;
              return `${FLAG_META[k].label}: ${r.by ?? 'staff'}, ${new Date(r.at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}${r.note ? ` — ${r.note}` : ''}`;
            }).join(' · ')}
          </p>
        )}
      </div>

      {/* Process column */}
      <div className="w-36 flex-shrink-0 hidden sm:flex flex-wrap gap-1 justify-start cursor-pointer" onClick={onOpen}>
        {e.departments.length > 0 ? (
          e.departments.map(d => (
            <span
              key={d}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: (DEPT_COLORS[d] ?? '#64748b') + '20', color: DEPT_COLORS[d] ?? '#64748b' }}
            >
              {DEPT_LABELS[d] ?? d}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-slate-400">—</span>
        )}
      </div>

      {/* Status column */}
      <div className="w-32 flex-shrink-0 flex items-center justify-end gap-1.5 cursor-pointer" onClick={onOpen}>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${status.className}`}>
          {status.label}
        </span>
        {e.activeHunts > 1 && (
          <span className="text-[10px] text-slate-400 whitespace-nowrap">×{e.activeHunts}</span>
        )}
      </div>
    </div>
  );
}

export function ClientStatusBoard({ onNavigate }: ClientStatusBoardProps) {
  const { profile } = useAuth();
  const { entries, loading, resolveFlag, reopenFlag } = useClientBoard();
  const [query, setQuery] = useState('');
  const [showOthers, setShowOthers] = useState(false);
  const [flagFilter, setFlagFilter] = useState<FlagKey | 'resolved' | null>(null);
  const [resolving, setResolving] = useState<{ entry: ClientBoardEntry; flag: FlagKey } | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => entries.filter(e => e.activeHunts > 0), [entries]);
  const others = useMemo(() => entries.filter(e => e.activeHunts === 0), [entries]);

  function filterAndSort(list: ClientBoardEntry[]) {
    const q = query.trim().toLowerCase();
    return list
      .filter(e => !q || e.fullName.toLowerCase().includes(q) || (e.clientNumber ?? '').toLowerCase().includes(q))
      .filter(e => {
        if (!flagFilter) return true;
        if (flagFilter === 'resolved') return resolvedFlags(e).length > 0;
        return openFlags(e).includes(flagFilter);
      })
      .sort((a, b) => {
        const fa = openFlags(a).length, fb = openFlags(b).length;
        if (fa !== fb) return fb - fa;                 // most open problems first
        return a.fullName.localeCompare(b.fullName);
      });
  }

  const counts = useMemo(() => {
    const c: Record<FlagKey, number> = { noJobCard: 0, instruction: 0, deposit: 0, waiting: 0, profile: 0 };
    let resolved = 0;
    for (const e of entries) {
      for (const k of openFlags(e)) c[k]++;
      resolved += resolvedFlags(e).length;
    }
    return { ...c, resolved };
  }, [entries]);

  const activeRows = filterAndSort(active);
  const otherRows = filterAndSort(others);

  async function confirmResolve() {
    if (!resolving) return;
    setSaving(true);
    const { error } = await resolveFlag(resolving.entry.clientId, resolving.flag, note, { id: profile?.id, name: profile?.full_name });
    setSaving(false);
    if (error) { toast.error('Could not save. Please try again.'); return; }
    toast.success(`${FLAG_META[resolving.flag].label} marked resolved for ${resolving.entry.fullName}`);
    setResolving(null); setNote('');
  }

  async function reopen(e: ClientBoardEntry, k: FlagKey) {
    const { error } = await reopenFlag(e.clientId, k);
    if (error) toast.error('Could not reopen: ' + error);
    else toast.success(`${FLAG_META[k].label} reopened for ${e.fullName}`);
  }

  const renderRow = (e: ClientBoardEntry) => (
    <ClientRow
      key={e.clientId}
      e={e}
      onOpen={() => onNavigate('clients', e.clientId)}
      onResolve={k => { setResolving({ entry: e, flag: k }); setNote(''); }}
      onReopen={k => reopen(e, k)}
    />
  );

  return (
    <div className="bg-white dark:bg-[#1c2b3a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0073ea]" />Status board
        </h2>
        <button onClick={() => onNavigate('clients')} className="text-xs text-[#0073ea] hover:underline flex items-center gap-1">
          Open Clients <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="px-5 pt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Active <span className="opacity-70">{active.length}</span>
        </p>
        <div className="relative w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search client name…"
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
          />
        </div>
      </div>

      {/* Attention filters */}
      <div className="px-5 pt-3 flex flex-wrap gap-2">
        {(Object.keys(FLAG_META) as FlagKey[]).map(k => (
          <button
            key={k}
            onClick={() => setFlagFilter(f => (f === k ? null : k))}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
              flagFilter === k ? FLAG_META[k].chip + ' border-transparent shadow' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            {FLAG_META[k].label} <span className="opacity-80">{counts[k]}</span>
          </button>
        ))}
        <button
          onClick={() => setFlagFilter(f => (f === 'resolved' ? null : 'resolved'))}
          className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all flex items-center gap-1 ${
            flagFilter === 'resolved' ? 'bg-emerald-600 text-white border-transparent shadow' : 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />Resolved <span className="opacity-80">{counts.resolved}</span>
        </button>
        {flagFilter && (
          <button onClick={() => setFlagFilter(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">Show all</button>
        )}
      </div>

      <div className="p-5 pt-3">
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
        ) : activeRows.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">No active clients match</p>
        ) : (
          <div className="max-h-[32rem] overflow-y-auto space-y-1.5 pr-1">
            {activeRows.map(renderRow)}
          </div>
        )}

        {/* Completed / Cancelled — collapsed by default */}
        {!loading && others.length > 0 && (
          <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
            <button
              onClick={() => setShowOthers(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-wider"
            >
              {showOthers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
              Completed &amp; Cancelled <span className="opacity-70">{others.length}</span>
            </button>
            {showOthers && (
              <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1 mt-3">
                {otherRows.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-4">No matches</p>
                ) : otherRows.map(renderRow)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resolve dialog */}
      <Dialog open={!!resolving} onOpenChange={(o: boolean) => { if (!o) { setResolving(null); setNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Resolve: {resolving ? FLAG_META[resolving.flag].label : ''}
            </DialogTitle>
          </DialogHeader>
          {resolving && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{resolving.entry.fullName}</span> — {FLAG_META[resolving.flag].hint}
              </p>
              <label className="block text-xs font-medium text-slate-500">
                What was done? (optional)
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Deposit received 20 Oct, client replied with instructions…"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </label>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> It stays on the board marked as resolved, and you can reopen it any time.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setResolving(null); setNote(''); }}>Cancel</Button>
            <Button size="sm" onClick={confirmResolve} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Saving…' : 'Mark resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
