import { useEffect, useState } from 'react';
import { supabase, HAS_SUPABASE } from '../supabase';

export interface RosterEntry {
  registration_id: string;
  race_number: number;
  full_name: string;
}

export function useCategoryRoster(categoryId: string | undefined) {
  const [roster, setRoster] = useState<Record<string, RosterEntry>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!HAS_SUPABASE || !categoryId) return;
    supabase
      .from('registrations')
      .select('id, race_number, swimmers(full_name)')
      .eq('category_id', categoryId)
      .eq('status', 'confirmed')
      .then(({ data }) => {
        const map: Record<string, RosterEntry> = {};
        (data ?? []).forEach((r: any) => {
          map[r.id] = { registration_id: r.id, race_number: r.race_number, full_name: r.swimmers?.full_name ?? 'Unknown' };
        });
        setRoster(map);
        setTotal((data ?? []).length);
      });
  }, [categoryId]);

  return { roster, total };
}
