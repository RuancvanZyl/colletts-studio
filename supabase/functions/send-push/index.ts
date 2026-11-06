// send-push: tells the recipients' phones and computers about the sender's new team messages.
// Called by the app right after a message is sent. Needs the secrets VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ ok: false, error: 'Please sign in first' }, 401);
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ ok: false, error: 'Please sign in first' }, 401);

    const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!pub || !priv) return json({ ok: false, error: 'Notifications are not switched on yet' });
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:office@apextrophysolutions.com', pub, priv);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // only the caller's own recent messages that nobody was told about yet
    const { data: msgs } = await admin.from('staff_messages').select('*')
      .eq('sender_id', user.id).eq('push_sent', false).gte('sent_at', new Date(Date.now() - 3600_000).toISOString());
    const { data: people } = await admin.from('staff_profiles').select('id, works_in, manages_departments').eq('is_active', true);

    let sent = 0;
    for (const m of msgs ?? []) {
      const targets = (people ?? []).filter((p: any) => p.id !== m.sender_id && (
        m.recipient_kind === 'everyone'
        || (m.recipient_kind === 'user' && p.id === m.recipient_user)
        || (m.recipient_kind === 'department' && ((p.works_in ?? []).includes(m.recipient_dept) || (p.manages_departments ?? []).includes(m.recipient_dept)))
      )).map((p: any) => p.id);
      const { data: subs } = targets.length ? await admin.from('push_subscriptions').select('*').in('user_id', targets) : { data: [] as any[] };
      const payload = JSON.stringify({
        title: `Message from ${m.sender_name ?? 'the workshop'}`,
        body: `${m.subject ? m.subject + ': ' : ''}${String(m.body).slice(0, 120)}`,
        tag: 'staff-message', url: '/?open=messages',
      });
      await Promise.all((subs ?? []).map(async (s: any) => {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); sent++; }
        catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', s.id); }
      }));
      await admin.from('staff_messages').update({ push_sent: true }).eq('id', m.id);
    }
    return json({ ok: true, sent });
  } catch (err: any) {
    return json({ ok: false, error: String(err?.message ?? err) }, 500);
  }
});
