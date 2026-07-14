import { useEffect, useState } from 'react';
import { supabase, HAS_SUPABASE } from '../supabase';
import type { RaceCategoryRow } from '../database.types';

export function useCategory(categoryId: string | undefined) {
  const [category, setCategory] = useState<RaceCategoryRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!HAS_SUPABASE || !categoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('race_categories')
      .select('*')
      .eq('id', categoryId)
      .single()
      .then(({ data }) => {
        setCategory(data as RaceCategoryRow | null);
        setLoading(false);
      });
  }, [categoryId]);

  return { category, loading };
}
