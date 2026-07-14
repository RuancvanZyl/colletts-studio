import { useCallback, useEffect, useState } from 'react';
import { supabase, HAS_SUPABASE } from '../supabase';
import type { RaceSessionRow, ScanEventRow } from '../database.types';

export function useTimingSession(categoryId: string | undefined) {
  const [session, setSession] = useState<RaceSessionRow | null>(null);
  const [recentScans, setRecentScans] = useState<ScanEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const ensureSession = useCallback(async () => {
    if (!HAS_SUPABASE || !categoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let { data } = await supabase.from('race_sessions').select('*').eq('category_id', categoryId).maybeSingle();
    if (!data) {
      const created = await supabase
        .from('race_sessions')
        .insert({ category_id: categoryId })
        .select('*')
        .single();
      data = created.data;
    }
    setSession(data as RaceSessionRow);

    if (data) {
      const { data: scans } = await supabase
        .from('scan_events')
        .select('*')
        .eq('session_id', data.id)
        .order('scanned_at', { ascending: false })
        .limit(100);
      setRecentScans((scans as ScanEventRow[]) ?? []);
    }
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    if (!HAS_SUPABASE || !session?.id) return;
    const channel = supabase
      .channel(`race-session-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'race_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as RaceSessionRow),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_events', filter: `session_id=eq.${session.id}` },
        (payload) => setRecentScans((prev) => [payload.new as ScanEventRow, ...prev].slice(0, 50)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  async function startCountdown(seconds: number) {
    if (!session) return;
    const { data } = await supabase.rpc('start_countdown', { p_session_id: session.id, p_seconds: seconds });
    if (data) setSession(data as RaceSessionRow);
  }

  async function fireGun() {
    if (!session) return;
    const { data } = await supabase.rpc('fire_gun', { p_session_id: session.id });
    if (data) setSession(data as RaceSessionRow);
  }

  async function finishSession() {
    if (!session) return;
    const { data } = await supabase.rpc('finish_session', { p_session_id: session.id });
    if (data) setSession(data as RaceSessionRow);
  }

  async function recordScan(chipCode: string, scanType: 'checkin' | 'finish', stationId: string) {
    if (!session) return null;
    const { data, error } = await supabase.rpc('record_scan', {
      p_session_id: session.id,
      p_chip_code: chipCode,
      p_scan_type: scanType,
      p_station_id: stationId,
    });
    if (error) return { error: error.message };
    return data?.[0] ?? null;
  }

  return { session, recentScans, loading, startCountdown, fireGun, finishSession, recordScan, refresh: ensureSession };
}
