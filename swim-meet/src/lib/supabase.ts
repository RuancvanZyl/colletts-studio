import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const HAS_SUPABASE = Boolean(url && anonKey);

// Note: intentionally untyped generic — our hand-written Database types
// (below) are used for shaping query results manually, since supabase-js's
// strict Database generic requires Enums/CompositeTypes keys we don't need.
export const supabase = HAS_SUPABASE
  ? createClient(url, anonKey)
  : (null as unknown as ReturnType<typeof createClient>);

if (!HAS_SUPABASE) {
  // eslint-disable-next-line no-console
  console.warn(
    '[swim-meet] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running with no backend. Copy .env.example to .env and point it at a NEW Supabase project (never the taxidermy one).',
  );
}
