// send-push: tells the recipients' phones and computers about new team messages, new messages from hunters and outfitters, and arrivals.
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
    const body = await req.json().catch(() => ({} as any));

    // Trophies arrived: tell the receiving team and the admins that a condition report needs to be done
    if (body?.kind === 'arrival' && body?.hunt) {
      const { data: hunt } = await admin.from('client_hunts').select('id, clients(full_name)').eq('id', body.hunt).maybeSingle();
      const who = (hunt as any)?.clients?.full_name ?? 'A hunter';
      const { data: staff } = await admin.from('staff_profiles').select('id, role, works_in, manages_departments').eq('is_active', true);
      const targets = (staff ?? []).filter((p: any) => p.id !== user.id && (['admin', 'studio_manager'].includes(p.role) || (p.works_in ?? []).includes('receiving') || (p.manages_departments ?? []).includes('receiving'))).map((p: any) => p.id);
      const { data: subs } = targets.length ? await admin.from('push_subscriptions').select('*').in('user_id', targets) : { data: [] as any[] };
      const payload = JSON.stringify({ title: `${who}: trophies arrived`, body: 'The trophies have arrived. The condition report needs to be done.', tag: 'arrival', url: '/?open=receiving' });
      let n = 0;
      await Promise.all((subs ?? []).map(async (s: any) => {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); n++; }
        catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', s.id); }
      }));
      return json({ ok: true, sent: n });
    }
    // A hunter or an outfitter wrote to the workshop: tell the managers' phones. Tapping it opens that conversation.
    if (body?.kind === 'client_message' || body?.kind === 'outfitter_message') {
      const { data: staff } = await admin.from('staff_profiles').select('id').eq('is_active', true).in('role', ['admin', 'studio_manager', 'bookkeeper']);
      const targets = (staff ?? []).map((p: any) => p.id).filter((id: string) => id !== user.id);
      const { data: subs } = targets.length ? await admin.from('push_subscriptions').select('*').in('user_id', targets) : { data: [] as any[] };
      const since = new Date(Date.now() - 3600_000).toISOString();
      const send = async (payload: Record<string, unknown>) => {
        let n = 0;
        await Promise.all((subs ?? []).map(async (s: any) => {
          try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload)); n++; }
          catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', s.id); }
        }));
        return n;
      };
      let sent = 0;
      if (body.kind === 'client_message') {
        const { data: cl } = await admin.from('clients').select('id, full_name').eq('auth_user_id', user.id).maybeSingle();
        if (!cl) return json({ ok: true, sent: 0 });
        const { data: msgs } = await admin.from('client_messages').select('id, subject, body').eq('client_id', cl.id).eq('direction', 'inbound').eq('push_sent', false).gte('sent_at', since).order('sent_at');
        if (!msgs?.length) return json({ ok: true, sent: 0 });
        const last: any = msgs[msgs.length - 1];
        sent = await send({ title: `${cl.full_name}: new message`, body: `${last.subject ? last.subject + ': ' : ''}${String(last.body).slice(0, 120)}`, tag: `client-${cl.id}`, url: `/?open=client:${cl.id}` });
        await admin.from('client_messages').update({ push_sent: true }).in('id', msgs.map((m: any) => m.id));
      } else {
        const { data: msgs } = await admin.from('outfitter_messages').select('id, hunt_id, sender_name, body').eq('sender', 'outfitter').eq('sender_user', user.id).eq('push_sent', false).gte('created_at', since).order('created_at');
        if (!msgs?.length) return json({ ok: true, sent: 0 });
        const byHunt = new Map<string, any>();
        for (const m of msgs as any[]) byHunt.set(m.hunt_id, m);
        for (const [huntId, m] of byHunt) sent += await send({ title: `${m.sender_name ?? 'An outfitter'}: new message`, body: String(m.body).slice(0, 120), tag: `outfitter-${huntId}`, url: `/?open=outfitter:${huntId}` });
        await admin.from('outfitter_messages').update({ push_sent: true }).in('id', (msgs as any[]).map(m => m.id));
      }
      return json({ ok: true, sent });
    }
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
