/**
 * Helpers that keep database screens working once there are hundreds of rows:
 * Supabase returns at most 1000 rows per request, and a URL with a long list of ids can be rejected.
 */
import { supabase } from './supabase';

/** Read every row of a query, page by page (1000 at a time). `build` must return a fresh query each call. */
export async function fetchAllRows<T = any>(build: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/** `select ... where column in (ids)` that works for any number of ids (chunks of 100). */
export async function selectIn<T = any>(table: string, columns: string, column: string, ids: string[]): Promise<T[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await (supabase as any).from(table).select(columns).in(column, unique.slice(i, i + 100));
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
  }
  return out;
}
