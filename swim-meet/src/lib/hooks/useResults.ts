import { useCallback, useEffect, useState } from 'react';
import { supabase, HAS_SUPABASE } from '../supabase';
import type { MedalResultRow } from '../database.types';

export function useResults(eventId: string | undefined, categoryId?: string) {
  const [results, setResults] = useState<MedalResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!HAS_SUPABASE || !eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase.from('v_medal_results').select('*').eq('event_id', eventId);
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data } = await query.order('elapsed', { ascending: true, nullsFirst: false });
    setResults((data as MedalResultRow[]) ?? []);
    setLoading(false);
  }, [eventId, categoryId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!HAS_SUPABASE) return;
    const channel = supabase
      .channel(`results-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scan_events' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'race_sessions' }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, refresh]);

  return { results, loading, refresh };
}
