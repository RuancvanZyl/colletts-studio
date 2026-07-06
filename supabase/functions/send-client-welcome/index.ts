// Supabase Edge Function: send-client-welcome
// Deploy: supabase functions deploy send-client-welcome
// Requires env var: RESEND_API_KEY (get free key at resend.com)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = 'onboarding@resend.dev';
const FROM_NAME      = 'Apex Trophy Solutions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { email, name, clientId } = await req.json();

    if (!email || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing email or API key' }), { status: 400 });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #080C0C; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #3AAECC; margin: 0; font-size: 24px; letter-spacing: 4px;">APEX</h1>
          <p style="color: #7AADB8; margin: 4px 0 0; font-size: 11px; letter-spacing: 3px;">TROPHY SOLUTIONS</p>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1a202c; margin: 0 0 16px;">Welcome, ${name}!</h2>
          <p style="color: #4a5568; line-height: 1.6;">
            Your client profile with Apex Trophy Solutions has been successfully created.
          </p>
          <p style="color: #4a5568; line-height: 1.6;">
            Our team will be in touch to link your hunt and trophies to your profile. As your trophies move through our workshop, you will receive updates at each key stage.
          </p>
          <div style="background: #EDF6F9; border-left: 4px solid #3AAECC; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #2d5a6a; font-size: 14px;">
              <strong>What happens next:</strong><br/>
              1. Your outfitter will confirm your trophy list<br/>
              2. You will receive a deposit invoice<br/>
              3. Trophies are collected and checked in at our workshop<br/>
              4. You receive progress updates as each trophy is completed<br/>
              5. Final invoice and delivery arranged when ready
            </p>
          </div>
          <p style="color: #718096; font-size: 13px;">
            Questions? Contact us at <a href="mailto:info@apextrophysolutions.co.za" style="color: #3AAECC;">info@apextrophysolutions.co.za</a>
          </p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      [email],
        subject: 'Welcome to Apex Trophy Solutions — your profile is ready',
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
