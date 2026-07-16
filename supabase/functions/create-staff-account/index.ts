import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify the caller is an active admin/studio_manager
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: callerProfile } = await anonClient
      .from('staff_profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!callerProfile?.is_active || !['admin', 'studio_manager'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Only admins can create staff accounts' }), { status: 403, headers: corsHeaders });
    }

    // Parse request body
    const { email, password, full_name, role, department_id, avatar_color } = await req.json();
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'email, password and full_name are required' }), { status: 400, headers: corsHeaders });
    }

    // Use service role to create the auth user
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // skip email verification for staff
    });

    if (createError || !newUser.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'Failed to create auth user' }), { status: 400, headers: corsHeaders });
    }

    // Create staff_profiles row
    const { error: profileError } = await adminClient.from('staff_profiles').insert({
      id:            newUser.user.id,
      full_name,
      email,
      role:          role ?? 'department_staff',
      department_id: department_id || null,
      avatar_color:  avatar_color ?? '#3AAECC',
      is_active:     true,
    });

    if (profileError) {
      // Roll back auth user creation
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
