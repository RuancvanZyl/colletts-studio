import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

export type Message = {
  id: string;
  client_id: string;
  hunt_id: string | null;
  direction: 'outbound' | 'inbound';
  channel: 'email' | 'in_app' | 'whatsapp' | 'sms';
  subject: string | null;
  body: string;
  html_body: string | null;
  sent_by: string | null;
  from_email: string | null;
  email_thread_id: string | null;
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed';
  read_at: string | null;
  sent_at: string;
  staff?: { full_name: string } | null;
};

export type MessageTemplate = {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: string[];
};

export function useClientMessages(clientId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const load = useCallback(async () => {
    if (!clientId) { setMessages([]); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('client_messages')
      .select('*, staff:sent_by(full_name)')
      .eq('client_id', clientId)
      .order('sent_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  }, [clientId]);

  const loadTemplates = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('message_templates')
      .select('*')
      .eq('is_active', true)
      .order('category');
    if (data) setTemplates(data);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // Subscribe to real-time new messages
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`messages-${clientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'client_messages',
        filter: `client_id=eq.${clientId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, load]);

  async function sendMessage(payload: {
    subject?: string;
    body: string;
    html_body?: string;
    channel: Message['channel'];
    hunt_id?: string;
    to_email?: string;
  }) {
    const row = {
      client_id:  clientId,
      hunt_id:    payload.hunt_id ?? null,
      direction:  'outbound',
      channel:    payload.channel,
      subject:    payload.subject ?? null,
      body:       payload.body,
      html_body:  payload.html_body ?? null,
      sent_by:    profile?.id ?? null,
      status:     'sent',
    };

    const { data, error } = await (supabase as any)
      .from('client_messages')
      .insert(row)
      .select()
      .single();

    if (error) return { error: error.message };

    // If email channel and client has email — trigger edge function to send email
    if (payload.channel === 'email' && payload.to_email) {
      await sendEmailViaEdgeFunction({
        to: payload.to_email,
        subject: payload.subject ?? 'Message from Apex Trophy Solutions',
        body: payload.body,
        html_body: payload.html_body,
        message_id: data.id,
      });
    }

    await load();
    return { error: null, message: data };
  }

  async function markRead(messageId: string) {
    await (supabase as any)
      .from('client_messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', messageId);
    load();
  }

  async function deleteMessage(messageId: string) {
    await (supabase as any).from('client_messages').delete().eq('id', messageId);
    load();
  }

  return { messages, templates, loading, sendMessage, markRead, deleteMessage, refresh: load };
}

async function sendEmailViaEdgeFunction(payload: {
  to: string;
  subject: string;
  body: string;
  html_body?: string;
  message_id: string;
}) {
  // Calls a Supabase Edge Function to send email via SMTP/Resend
  // Edge function not yet deployed — logs intent for now
  try {
    await (supabase as any).functions.invoke('send-client-email', { body: payload });
  } catch {
    // Edge function not yet deployed — communication is stored in DB
  }
}
