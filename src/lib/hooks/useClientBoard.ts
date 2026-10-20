import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export type FlagKey = 'noJobCard' | 'instruction' | 'deposit' | 'waiting' | 'profile';
export type FlagResolution = { at: string; by: string | null; note: string | null };

export type ClientBoardEntry = {
  clientId: string;
  fullName: string;
  clientNumber: string | null;
  clientType: string;
  activeHunts: number;
  completedHunts: number;
  cancelledHunts: number;
  departments: string[];       // distinct current_department values across this client's active job cards
  missingJobCard: boolean;     // has an active hunt with zero job_card docs

  // ── Attention flags (active hunts only) ──
  awaitingInstruction: boolean;   // client has not confirmed what they want done
  depositUnpaid: boolean;         // deposit / payment still outstanding
  pastDeadline: boolean;          // an active hunt is past its deadline
  waitingDays: number | null;     // days since the last pro-forma / dated note, when awaiting deposit or instruction
  waitingTooLong: boolean;        // awaiting for longer than it should
  profileProblems: string[];      // e.g. "No contact details", "Duplicate profile"
  resolutions: Partial<Record<FlagKey, FlagResolution>>;   // flags staff have marked resolved
};

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6,
  august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const DAY = 86_400_000;
const RE_INSTRUCTION = /await(ing)?\s*(more\s*)?(photos\s*re\s*)?instr|finalis(e|ing)\s*instr|instructions?\s*(o\s*s|outstanding)|thinking about instructions|await(ing)?\s*go-?ahead|await(ing)?\s*(a\s*)?reply|no reaction/i;
const RE_UNPAID    = /await(ing)?\s*(a\s*)?(deposit|dep\b|payment|payement|pmt)|req(uest)?\s*balance|o\s*s\s*balance|dep\s*2\s*b\s*paid|not paid/i;
const RE_FULLY_PAID = /fully\s*paid/i;
const RE_BAD_NAME  = /CW\d{3,}|moved to|\d{2}\.\d{2}\.\d{4}|steve\s*(is\s*)?handl|dropped off|ex zambia|\bgroup\b.*ex\b/i;

function latestDate(text: string): number | null {
  // pick dd.mm.yyyy dates from a folder name, ignoring the promised deadline=… part
  const cleaned = text.replace(/dead?line\s*=\s*[\d.\sA-Za-z]+/gi, ' ');
  let best: number | null = null;
  for (const m of cleaned.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g)) {
    const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    const t = new Date(y, Number(m[2]) - 1, Number(m[1])).getTime();
    if (!isNaN(t) && t <= Date.now() + DAY && (best === null || t > best)) best = t;
  }
  return best;
}

function datedInTitle(title: string): number | null {
  const m = title.match(/dated\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
  if (!m) return null;
  const mon = MONTHS[m[2].toLowerCase()];
  if (mon === undefined) return null;
  const t = new Date(Number(m[3]), mon, Number(m[1])).getTime();
  return isNaN(t) ? null : t;
}

async function fetchAll(build: () => any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export function useClientBoard() {
  const [entries, setEntries] = useState<ClientBoardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [clients, hunts, jobCards, invoices, resolutionRows] = await Promise.all([
        fetchAll(() => (supabase as any).from('clients')
          .select('id, full_name, client_number, client_type, email, phone').order('id')),
        fetchAll(() => (supabase as any).from('client_hunts')
          .select('id, client_id, status, dropbox_path, deadline_current').order('id')),
        fetchAll(() => (supabase as any).from('hunt_documents')
          .select('id, hunt_id, status, current_department, mount:form_data->>mount_type')
          .eq('doc_type', 'job_card').order('id')),
        fetchAll(() => (supabase as any).from('hunt_documents')
          .select('id, hunt_id, title').eq('doc_type', 'invoice').ilike('title', '%dated%').order('id')),
        fetchAll(() => (supabase as any).from('client_flag_resolutions')
          .select('id, client_id, flag_key, note, resolved_by_name, resolved_at').order('id')).catch(() => [] as any[]),
      ]);

      const huntToClient: Record<string, string> = {};
      const huntInfo: Record<string, any> = {};
      hunts.forEach((h: any) => { huntToClient[h.id] = h.client_id; huntInfo[h.id] = h; });

      const jcByHunt: Record<string, any[]> = {};
      for (const d of jobCards) (jcByHunt[d.hunt_id] ??= []).push(d);

      const latestInvoice: Record<string, number> = {};
      for (const d of invoices) {
        const t = datedInTitle(d.title ?? '');
        if (t !== null && (latestInvoice[d.hunt_id] ?? 0) < t) latestInvoice[d.hunt_id] = t;
      }

      // duplicate names (only among clients that actually have hunts)
      const nameCount: Record<string, number> = {};
      const clientsWithHunts = new Set(hunts.map((h: any) => h.client_id));
      for (const c of clients) {
        if (!clientsWithHunts.has(c.id)) continue;
        const k = (c.full_name ?? '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
        nameCount[k] = (nameCount[k] ?? 0) + 1;
      }

      const today = new Date().toISOString().slice(0, 10);
      const byClient: Record<string, ClientBoardEntry> = {};
      for (const c of clients) {
        const problems: string[] = [];
        const email = (c.email ?? '').trim();
        const phone = (c.phone ?? '').trim();
        const emailOk = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email);
        const phoneOk = phone.replace(/\D/g, '').length >= 7;
        if (!emailOk && !phoneOk) problems.push('No contact details');
        else {
          if (email && !emailOk) problems.push('Email needs cleaning');
          if (phone && !phoneOk) problems.push('Phone number invalid');
        }
        if (RE_BAD_NAME.test(c.full_name ?? '')) problems.push('Name contains folder text');
        if ((nameCount[(c.full_name ?? '').toLowerCase().replace(/[^a-z]+/g, ' ').trim()] ?? 0) > 1) problems.push('Duplicate profile');

        byClient[c.id] = {
          clientId: c.id,
          fullName: c.full_name,
          clientNumber: c.client_number ?? null,
          clientType: c.client_type ?? 'export',
          activeHunts: 0, completedHunts: 0, cancelledHunts: 0,
          departments: [],
          missingJobCard: false,
          awaitingInstruction: false,
          depositUnpaid: false,
          pastDeadline: false,
          waitingDays: null,
          waitingTooLong: false,
          profileProblems: problems,
          resolutions: {},
        };
      }

      for (const r of resolutionRows) {
        const entry = byClient[r.client_id];
        if (entry) entry.resolutions[r.flag_key as FlagKey] = { at: r.resolved_at, by: r.resolved_by_name ?? null, note: r.note ?? null };
      }

      for (const h of hunts) {
        const entry = byClient[h.client_id];
        if (!entry) continue;
        if (h.status === 'active') {
          entry.activeHunts++;
          const cards = jcByHunt[h.id] ?? [];
          if (cards.length === 0) entry.missingJobCard = true;

          const folder: string = h.dropbox_path ?? '';
          const allPending = cards.length > 0 && cards.every(c => c.mount === 'Pending Instructions' && c.status === 'in_progress');
          const awaitingInstr = RE_INSTRUCTION.test(folder) || (allPending && cards.length > 1);
          const unpaid = RE_UNPAID.test(folder) && !RE_FULLY_PAID.test(folder);
          if (awaitingInstr) entry.awaitingInstruction = true;
          if (unpaid) entry.depositUnpaid = true;

          if (awaitingInstr || unpaid) {
            const ref = Math.max(latestInvoice[h.id] ?? 0, latestDate(folder) ?? 0);
            if (ref > 0) {
              const days = Math.floor((Date.now() - ref) / DAY);
              if (entry.waitingDays === null || days > entry.waitingDays) entry.waitingDays = days;
              if (days > (unpaid ? 30 : 14)) entry.waitingTooLong = true;
            }
          }
          if (h.deadline_current && h.deadline_current < today) { entry.pastDeadline = true; entry.waitingTooLong = true; }
          if (!folder && !entry.profileProblems.includes('No Dropbox folder')) entry.profileProblems.push('No Dropbox folder');
        } else if (h.status === 'completed') {
          entry.completedHunts++;
        } else if (h.status === 'cancelled') {
          entry.cancelledHunts++;
        }
      }

      for (const d of jobCards) {
        const clientId = huntToClient[d.hunt_id];
        const entry = clientId ? byClient[clientId] : null;
        if (!entry || d.status !== 'in_progress' || !d.current_department) continue;
        if (!entry.departments.includes(d.current_department)) entry.departments.push(d.current_department);
      }

      setEntries(Object.values(byClient).filter(e => e.activeHunts + e.completedHunts + e.cancelledHunts > 0));
    } catch (err) {
      console.error('Client board failed to load', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') load();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function resolveFlag(clientId: string, flag: FlagKey, note: string, staff: { id?: string; name?: string | null }) {
    const row = { client_id: clientId, flag_key: flag, note: note.trim() || null, resolved_by: staff.id ?? null, resolved_by_name: staff.name ?? null, resolved_at: new Date().toISOString() };
    const { error } = await (supabase as any).from('client_flag_resolutions').upsert(row, { onConflict: 'client_id,flag_key' });
    if (error) return { error: error.message as string };
    setEntries(prev => prev.map(e => e.clientId === clientId
      ? { ...e, resolutions: { ...e.resolutions, [flag]: { at: row.resolved_at, by: row.resolved_by_name, note: row.note } } } : e));
    return { error: null };
  }

  async function reopenFlag(clientId: string, flag: FlagKey) {
    const { error } = await (supabase as any).from('client_flag_resolutions').delete().eq('client_id', clientId).eq('flag_key', flag);
    if (error) return { error: error.message as string };
    setEntries(prev => prev.map(e => {
      if (e.clientId !== clientId) return e;
      const next = { ...e.resolutions }; delete next[flag];
      return { ...e, resolutions: next };
    }));
    return { error: null };
  }

  return { entries, loading, refresh: load, resolveFlag, reopenFlag };
}
