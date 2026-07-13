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

const collectUserFiles = async (admin: any, path: string, files: string[], depth = 0) => {
  if (depth > 2) throw new Error('Unexpected storage path depth');
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from('user-card-images').list(path, { limit: 1000, offset });
    if (error) throw error;
    const entries = data || [];
    for (const entry of entries) {
      const entryPath = `${path}/${entry.name}`;
      if (entry.id) files.push(entryPath);
      else await collectUserFiles(admin, entryPath, files, depth + 1);
    }
    if (entries.length < 1000) break;
    offset += entries.length;
  }
};

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

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } });

  const lastSignIn = new Date(user.last_sign_in_at || 0).getTime();
  if (!lastSignIn || Date.now() - lastSignIn > 30 * 60 * 1000) {
    return new Response(JSON.stringify({ error: 'Please sign in again before deleting your account.' }), { status: 403, headers: { ...headers, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(url, serviceRoleKey);
  const files: string[] = [];
  try {
    await collectUserFiles(admin, user.id, files);
    for (let index = 0; index < files.length; index += 100) {
      const { error: removeError } = await admin.storage.from('user-card-images').remove(files.slice(index, index + 100));
      if (removeError) throw removeError;
    }
  } catch (storageError) {
    console.error('Account storage cleanup failed:', storageError);
    return new Response(JSON.stringify({ error: 'Could not remove account images.' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return new Response(JSON.stringify({ error: 'Could not delete account' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, 'Content-Type': 'application/json' } });
});