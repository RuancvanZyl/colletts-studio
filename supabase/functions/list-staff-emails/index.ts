import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
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
      .from('staff_profiles').select('role').eq('id', user.id).single();

    if (!profile || !['admin', 'studio_manager'].includes(profile.role)) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all staff profiles
    const { data: profiles } = await adminClient
      .from('staff_profiles')
      .select('id, full_name, role, is_active')
      .eq('is_active', true)
      .order('full_name');

    // Get auth users to pull emails
    const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 200 });

    const emailMap: Record<string, string> = {};
    for (const u of users) emailMap[u.id] = u.email ?? '';

    const result = (profiles ?? []).map((p: any) => ({
      id:       p.id,
      name:     p.full_name,
      role:     p.role,
      email:    emailMap[p.id] ?? '',
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
