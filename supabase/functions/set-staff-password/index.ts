import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify caller is an admin using their JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const { data: profile } = await callerClient
      .from('staff_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'studio_manager'].includes(profile.role)) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // Use service role to update the target user's password
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { userId, password } = await req.json();
    if (!userId || !password || password.length < 8) {
      return new Response('Invalid payload', { status: 400, headers: corsHeaders });
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
