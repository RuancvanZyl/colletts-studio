/**
 * Staff messaging — every message is a permanent record. Only department managers and admins can send;
 * everyone can read what is addressed to them. Sending works offline (queued, sent with the real time).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { performAction } from '../offline/outbox';
import { fetchAllRows } from '../supabaseHelpers';

export interface StaffMessage {
  id: string; sender_id: string; sender_name: string | null;
  recipient_kind: 'user' | 'department' | 'everyone'; recipient_user: string | null; recipient_dept: string | null;
  subject: string | null; body: string; priority: number; requires_ack: boolean;
  hunt_doc_id: string | null; hunt_id: string | null; sent_at: string;
}
export interface MessageRead { message_id: string; user_id: string; read_at: string; acknowledged: boolean }
export interface StaffPerson { id: string; full_name: string; role: string; works_in: string[]; manages_departments: string[]; is_active: boolean }

/** May this person send messages? (admins and department managers) */
export function canCommunicate(profile: { role?: string; manages_departments?: string[] } | null | undefined) {
  if (!profile) return false;
  return ['admin', 'studio_manager'].includes(profile.role ?? '') || (profile.manages_departments?.length ?? 0) > 0;
}
export const isAdminRole = (role?: string) => role === 'admin' || role === 'studio_manager';

export function useStaffMessages() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [reads, setReads] = useState<MessageRead[]>([]);
  const [people, setPeople] = useState<StaffPerson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: msgs } = await (supabase as any).from('staff_messages').select('*').order('sent_at', { ascending: false }).limit(300);
      const { data: rd } = await (supabase as any).from('staff_message_reads').select('message_id, user_id, read_at, acknowledged')
        .in('message_id', (msgs ?? []).map((m: any) => m.id).slice(0, 300));
      const { data: ppl } = await (supabase as any).from('staff_profiles').select('id, full_name, role, works_in, manages_departments, is_active').eq('is_active', true).order('full_name');
      setMessages(msgs ?? []); setReads(rd ?? []); setPeople(ppl ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const myId = profile?.id;
  const myReads = new Set(reads.filter(r => r.user_id === myId).map(r => r.message_id));
  const inbox = messages.filter(m => m.sender_id !== myId);
  const sent = messages.filter(m => m.sender_id === myId);
  const unread = inbox.filter(m => !myReads.has(m.id));

  async function markRead(ids: string[], ack = false) {
    if (ids.length === 0) return;
    await (supabase as any).rpc('staff_message_mark_read', { p_ids: ids, p_ack: ack });
    const now = new Date().toISOString();
    setReads(prev => [...prev.filter(r => !(r.user_id === myId && ids.includes(r.message_id) && !ack)),
      ...ids.map(id => ({ message_id: id, user_id: myId!, read_at: now, acknowledged: ack }))]);
  }

  async function send(m: { kind: 'user' | 'department' | 'everyone'; user?: string; dept?: string; subject: string; body: string; priority: number; ack: boolean; doc?: string | null; hunt?: string | null }) {
    const r = await performAction('staff_message', {
      kind: m.kind, user: m.user ?? null, dept: m.dept ?? null, subject: m.subject, body: m.body,
      priority: m.priority, ack: m.ack, doc: m.doc ?? null, hunt: m.hunt ?? null,
    }, myId ?? null);
    if (!r.error && !r.queued) await load();
    return r;
  }

  return { messages, reads, people, inbox, sent, unread, myReads, loading, reload: load, markRead, send };
}

/** Light-weight unread counter for the sidebar badge */
export function useUnreadMessages(): number {
  const { profile } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!profile?.id) return;
    let alive = true;
    const run = async () => {
      try {
        const { data: msgs } = await (supabase as any).from('staff_messages').select('id, sender_id').order('sent_at', { ascending: false }).limit(100);
        const mine = (msgs ?? []).filter((m: any) => m.sender_id !== profile.id).map((m: any) => m.id);
        if (mine.length === 0) { if (alive) setN(0); return; }
        const { data: rd } = await (supabase as any).from('staff_message_reads').select('message_id').eq('user_id', profile.id).in('message_id', mine);
        const seen = new Set((rd ?? []).map((r: any) => r.message_id));
        if (alive) setN(mine.filter((id: string) => !seen.has(id)).length);
      } catch { /* offline: keep the last number */ }
    };
    run();
    const t = setInterval(run, 60_000);
    const onVis = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [profile?.id]);
  return n;
}

export interface LogRow {
  kind: 'staff' | 'client'; id: string; sent_at: string; from_name: string | null; to_name: string | null;
  subject: string | null; body: string; priority: number; hunt_id: string | null; hunt_doc_id: string | null;
  client_id: string | null; read_count: number; requires_ack: boolean;
}

/** Everything that was said, staff and client, newest first (admins only — enforced by the database) */
export function useCommunicationLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setRows(await fetchAllRows<LogRow>(() => (supabase as any).from('v_communication_log').select('*').order('sent_at', { ascending: false }).order('id')));
    } catch (e: any) { setError(e?.message ?? 'Could not load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { rows, loading, error, reload: load };
}
