import { useCallback, useEffect, useState } from 'react';
import { supabase, HAS_SUPABASE } from '../supabase';
import type {
  EventRow,
  RaceCategoryRow,
  AgeGroupRow,
  RegistrationRow,
  SwimmerRow,
  TimingChipRow,
} from '../database.types';

export async function createEvent(input: Partial<EventRow>) {
  const { data, error } = await supabase.from('events').insert(input).select('*').single();
  return { data: data as EventRow | null, error: error?.message ?? null };
}

export async function updateEvent(id: string, input: Partial<EventRow>) {
  const { data, error } = await supabase.from('events').update(input).eq('id', id).select('*').single();
  return { data: data as EventRow | null, error: error?.message ?? null };
}

export async function createCategory(input: Partial<RaceCategoryRow>) {
  const { data, error } = await supabase.from('race_categories').insert(input).select('*').single();
  return { data: data as RaceCategoryRow | null, error: error?.message ?? null };
}

export async function updateCategory(id: string, input: Partial<RaceCategoryRow>) {
  const { data, error } = await supabase.from('race_categories').update(input).eq('id', id).select('*').single();
  return { data: data as RaceCategoryRow | null, error: error?.message ?? null };
}

export async function createAgeGroup(input: Partial<AgeGroupRow>) {
  const { data, error } = await supabase.from('age_groups').insert(input).select('*').single();
  return { data: data as AgeGroupRow | null, error: error?.message ?? null };
}

export async function deleteAgeGroup(id: string) {
  const { error } = await supabase.from('age_groups').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export interface RegistrationWithSwimmer extends RegistrationRow {
  swimmers: SwimmerRow;
  timing_chips: TimingChipRow[];
}

export function useEventRegistrations(eventId: string | undefined) {
  const [registrations, setRegistrations] = useState<RegistrationWithSwimmer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!HAS_SUPABASE || !eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('registrations')
      .select('*, swimmers(*), timing_chips(*)')
      .eq('event_id', eventId)
      .order('race_number');
    setRegistrations((data as RegistrationWithSwimmer[]) ?? []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { registrations, loading, refresh };
}

export async function assignChip(chipCode: string, registrationId: string) {
  const { error } = await supabase.rpc('assign_timing_chip', {
    p_chip_code: chipCode,
    p_registration_id: registrationId,
  });
  return { error: error?.message ?? null };
}

export async function updateRegistrationStatus(id: string, status: RegistrationRow['status']) {
  const { error } = await supabase.from('registrations').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}
