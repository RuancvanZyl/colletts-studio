/**
 * useLiveRefresh — a screen that reloads itself when someone else changes the data it shows, so a change made by one person
 * appears for everyone without a refresh. It also reloads when the app comes back to the foreground. The database must publish
 * the table for realtime (migration 062); until it does, the screen simply keeps working as before.
 */
import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

export function useLiveRefresh(tables: string[], onChange: () => void, delayMs = 1200) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = tables.join(',');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fire = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => cb.current(), delayMs); };
    let channel: any = null;
    try {
      channel = (supabase as any).channel(`live-${key}-${Math.random().toString(36).slice(2, 8)}`);
      for (const t of tables) channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, fire);
      channel.subscribe();
    } catch { /* realtime unavailable: the screen still loads normally */ }
    const onVisible = () => { if (document.visibilityState === 'visible') fire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      try { if (channel) (supabase as any).removeChannel(channel); } catch { /* already gone */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delayMs]);
}
