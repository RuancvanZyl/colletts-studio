// Supabase Edge Function: send-hunter-invite
// Staff only. Sends the welcome letter + sign-up link to a hunter (variant "welcome"),
// or tells a registered hunter that their trophies have arrived (variant "arrived").
// Deploy: supabase functions deploy send-hunter-invite   (needs RESEND_API_KEY; emails only reach
// outside addresses once a sending domain is verified in Resend and FROM_EMAIL below is changed to it)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const { data: staff } = await supa.from('staff_profiles').select('is_active').eq('id', user.id).maybeSingle();
    if (!staff?.is_active) return new Response(JSON.stringify({ error: 'Staff only' }), { status: 403, headers: cors });

    const { email, name, url, variant, workshop, animals } = await req.json();
    if (!email || !url) return new Response(JSON.stringify({ error: 'email and url are required' }), { status: 400, headers: cors });
    if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: 'Email is not set up yet (RESEND_API_KEY missing)' }), { status: 500, headers: cors });

    const first = String(name ?? '').split(' ')[0] || 'there';
    const shop = workshop || 'Apex Trophy Solutions';
    const list = (animals ?? []).map((a: any) => `<li><strong>${esc(a.species)}</strong>${a.parts ? ` — ${esc(a.parts)}` : ''}</li>`).join('');
    const arrived = variant === 'arrived';
    const html = `<!DOCTYPE html><html><body style="margin:0;background:#f0f4f8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#080C0C;padding:24px;text-align:center"><span style="font-size:22px;font-weight:900;letter-spacing:6px;color:#3AAECC">${esc(shop).toUpperCase()}</span></td></tr>
<tr><td style="padding:28px 32px;color:#2d3748;font-size:15px;line-height:1.65">
<p>Dear ${esc(first)},</p>
<p>Thank you for choosing <strong>${esc(shop)}</strong>. ${arrived ? 'More of your trophies have arrived at our workshop:' : 'We have received your trophies:'}</p>
<ul>${list}</ul>
<p>${arrived ? 'Open your profile to see what we received and choose how you would like each animal mounted.'
 : 'Please create your profile, check what we received, and choose how you would like each animal mounted. Once you have chosen, we start work — and you can follow every stage, with photos, from your phone.'}</p>
<p style="text-align:center;margin:28px 0"><a href="${esc(url)}" style="background:#3AAECC;color:#080C0C;text-decoration:none;font-weight:700;padding:14px 30px;border-radius:8px;display:inline-block">${arrived ? 'CHOOSE MY MOUNTS' : 'CREATE MY PROFILE'}</a></p>
<p style="font-size:13px;color:#718096">If the button does not work, copy this link into your browser:<br>${esc(url)}</p>
<p>Kind regards,<br><strong>${esc(shop)}</strong></p></td></tr></table></td></tr></table></body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${shop} <${FROM_EMAIL}>`, to: [email],
        subject: arrived ? `Your trophies have arrived — ${shop}` : `Welcome to ${shop} — create your profile`, html }),
    });
    const out = await res.json();
    return new Response(JSON.stringify(res.ok ? { ok: true } : { error: out?.message ?? 'Email provider refused the message' }), { status: res.ok ? 200 : 502, headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
