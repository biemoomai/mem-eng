import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://mem-eng.pages.dev,capacitor://localhost,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173,http://localhost:5174')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
const corsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (configuredOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
};

// Kept for backwards compatibility. It no longer accepts browser-supplied rich data.
Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('Origin') || '';
  if (requestOrigin && !configuredOrigins.includes(requestOrigin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' }
    });
  }
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } });

  try {
    const { word } = await req.json();
    const normalizedWord = typeof word === 'string' ? word.trim().toLowerCase() : '';
    if (!/^[a-z][a-z -]{0,63}$/i.test(normalizedWord)) {
      return new Response(JSON.stringify({ error: 'Enter a valid English word or short phrase.' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } });

    const admin = createClient(url, serviceRoleKey);
    const { data: cached } = await admin
      .from('global_dictionary')
      .select('id')
      .eq('word', normalizedWord)
      .maybeSingle();

    if (cached) return new Response(JSON.stringify({ id: cached.id }), { headers: { ...headers, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ error: 'Generate verified details before saving a card.' }), { status: 409, headers: { ...headers, 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request.' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
  }
});
