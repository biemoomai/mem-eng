import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1';
import * as jwt from 'https://deno.land/x/djwt@v2.9.1/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const JWT_SECRET = Deno.env.get('JWT_SECRET')!; // Note: JWT_SECRET must be set in Edge Function secrets!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { line_access_token } = await req.json();

    if (!line_access_token) {
      throw new Error('line_access_token is required');
    }

    // 1. Verify LINE Token and get User Profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': `Bearer ${line_access_token}` }
    });
    
    if (!profileRes.ok) {
      throw new Error('Failed to verify LINE token');
    }

    const profileData = await profileRes.json();
    const lineUserId = profileData.userId;
    const displayName = profileData.displayName;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Check if user already exists in public.users via line_user_id
    let { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    let supabaseUserId = existingUser?.id;

    if (!supabaseUserId) {
      // 3. User doesn't exist. We need to create a new Auth user via Admin API
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: `${lineUserId}@line.guest.com`,
        email_confirm: true,
        user_metadata: {
          name: displayName
        }
      });

      if (authErr) {
        throw new Error(`Failed to create Supabase user: ${authErr.message}`);
      }

      supabaseUserId = authData.user.id;

      // 4. Update the public.users record with the line_user_id
      await supabaseAdmin.from('users').update({
        line_user_id: lineUserId,
        display_name: displayName
      }).eq('id', supabaseUserId);
    }

    // 5. Generate a Custom JWT using the Supabase JWT_SECRET
    // We sign it so Supabase PostgREST trusts it.
    // Ensure we encode the key properly
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const payload = {
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
      sub: supabaseUserId,
      email: `${lineUserId}@line.guest.com`,
      role: "authenticated",
      app_metadata: { provider: "line", providers: ["line"] },
      user_metadata: { name: displayName },
    };

    const token = await jwt.create({ alg: "HS256", typ: "JWT" }, payload, key);

    return new Response(JSON.stringify({ 
      token, 
      user: { id: supabaseUserId, lineUserId, displayName } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
