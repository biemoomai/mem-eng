import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get('CLEANUP_CRON_SECRET');
  if (!expectedSecret || req.headers.get('x-cleanup-secret') !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let page = 1;
  let deleted = 0;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return new Response(JSON.stringify({ error: 'Could not list users' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    const users = data.users || [];
    for (const user of users) {
      const lastActive = new Date(user.last_sign_in_at || user.created_at || 0).getTime();
      if (user.is_anonymous && lastActive > 0 && lastActive < cutoff) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
        if (!deleteError) deleted += 1;
      }
    }
    if (users.length < 1000) break;
    page += 1;
  }

  return new Response(JSON.stringify({ deleted }), { headers: { 'Content-Type': 'application/json' } });
});