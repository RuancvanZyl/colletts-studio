import { useCallback, useEffect, useState } from 'react';
import { supabase, HAS_SUPABASE } from '../supabase';
import type { EventRow, RaceCategoryRow, AgeGroupRow } from '../database.types';

export function usePublicEvents() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!HAS_SUPABASE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'registration_open')
      .order('event_date', { ascending: true });
    setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, refresh };
}

export function useAllEvents() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!HAS_SUPABASE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false });
    setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, refresh };
}

export function useEventCategories(eventId: string | undefined) {
  const [categories, setCategories] = useState<RaceCategoryRow[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!HAS_SUPABASE || !eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: cats }, { data: ags }] = await Promise.all([
      supabase.from('race_categories').select('*').eq('event_id', eventId).order('distance_m'),
      supabase.from('age_groups').select('*').eq('event_id', eventId).order('sort_order'),
    ]);
    setCategories((cats as RaceCategoryRow[]) ?? []);
    setAgeGroups((ags as AgeGroupRow[]) ?? []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories, ageGroups, loading, refresh };
}
