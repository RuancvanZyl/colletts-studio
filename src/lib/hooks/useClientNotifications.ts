import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export interface ClientNotification {
  id:         string;
  type:       'update' | 'milestone' | 'alert' | 'ready';
  stage:      string | null;
  title:      string;
  body:       string | null;
  species:    string | null;
  mountType:  string | null;
  read:       boolean;
  createdAt:  string;
}

export function useClientNotifications(clientId: string | null | undefined) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading]             = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('client_notifications')
      .select('id, type, stage, title, body, species, mount_type, read, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications((data ?? []).map((n: any) => ({
      id:        n.id,
      type:      n.type,
      stage:     n.stage,
      title:     n.title,
      body:      n.body,
      species:   n.species,
      mountType: n.mount_type,
      read:      n.read,
      createdAt: n.created_at,
    })));
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await (supabase as any)
      .from('client_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    if (!clientId) return;
    await (supabase as any)
      .from('client_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, loading, unreadCount, load, markRead, markAllRead };
}
