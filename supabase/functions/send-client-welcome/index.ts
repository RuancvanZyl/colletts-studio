// Supabase Edge Function: send-client-welcome
// Deploy: supabase functions deploy send-client-welcome
// Requires env var: RESEND_API_KEY (get free key at resend.com)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = 'onboarding@resend.dev';
const FROM_NAME      = 'Apex Trophy Solutions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  try {
    const { email, name, portalType } = await req.json();

    if (!email || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing email or API key' }), { status: 400 });
    }

    const firstName = name?.split(' ')[0] || name || 'there';

    const portalLabel = portalType === 'outfitter'
      ? 'Outfitter Portal'
      : portalType === 'taxidermy'
      ? 'Workshop Portal'
      : 'Hunter Portal';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#080C0C;padding:36px 40px;border-radius:16px 16px 0 0;text-align:center;">
            <p style="margin:0 0 4px;font-size:28px;font-weight:900;letter-spacing:8px;color:#3AAECC;">APEX</p>
            <p style="margin:0;font-size:11px;letter-spacing:4px;color:#7AADB8;text-transform:uppercase;">Trophy Solutions</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <h1 style="margin:0 0 8px;font-size:24px;color:#1a202c;">Welcome, ${firstName}!</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#718096;">Your ${portalLabel} account is ready.</p>

            <p style="margin:0 0 20px;font-size:15px;color:#4a5568;line-height:1.7;">
              You now have access to your personal dashboard on the Apex Trophy Solutions platform.
              Here you can track your trophies every step of the way — from the day they arrive at our
              workshop to the moment they are ready to be shipped home.
            </p>

            <!-- What's next box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="background:#EDF6F9;border-left:4px solid #3AAECC;border-radius:4px;padding:20px 24px;">
                  <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#2d5a6a;letter-spacing:1px;text-transform:uppercase;">What happens next</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr><td style="padding:4px 0;font-size:14px;color:#2d5a6a;">✓&nbsp;&nbsp;Add your trophies and trophy types to your profile</td></tr>
                    <tr><td style="padding:4px 0;font-size:14px;color:#2d5a6a;">✓&nbsp;&nbsp;Track each trophy through our workshop in real time</td></tr>
                    <tr><td style="padding:4px 0;font-size:14px;color:#2d5a6a;">✓&nbsp;&nbsp;Receive updates at each key stage of the process</td></tr>
                    <tr><td style="padding:4px 0;font-size:14px;color:#2d5a6a;">✓&nbsp;&nbsp;Get notified when your trophies are ready for shipping</td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr>
                <td align="center">
                  <a href="https://app.apextrophysolutions.com"
                     style="display:inline-block;background:#3AAECC;color:#080C0C;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:2px;padding:14px 36px;border-radius:8px;">
                    OPEN MY PORTAL
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:14px;color:#718096;line-height:1.6;">
              Any questions? Reach us at
              <a href="mailto:info@apextrophysolutions.co.za" style="color:#3AAECC;text-decoration:none;">info@apextrophysolutions.co.za</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#080C0C;padding:24px 40px;border-radius:0 0 16px 16px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#4a6a75;">
              © ${new Date().getFullYear()} Apex Trophy Solutions · South Africa<br/>
              <a href="https://app.apextrophysolutions.com" style="color:#3AAECC;text-decoration:none;">app.apextrophysolutions.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      [email],
        subject: `Welcome to Apex Trophy Solutions, ${firstName}!`,
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
