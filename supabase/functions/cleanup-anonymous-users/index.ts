import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const responseHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: responseHeaders });
  }

  const expectedSecret = Deno.env.get('CLEANUP_CRON_SECRET');
  if (!expectedSecret || req.headers.get('x-cleanup-secret') !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: responseHeaders });
  }

  const input = await req.json().catch(() => ({}));
  const dryRun = input?.dryRun !== false;
  const limit = Math.max(1, Math.min(Number(input?.limit) || 100, 500));
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: candidates, error: previewError } = await admin.rpc('preview_anonymous_user_cleanup', { p_limit: limit });
  if (previewError) {
    console.error('Anonymous cleanup preview failed:', previewError);
    return new Response(JSON.stringify({ error: 'Could not preview guest cleanup' }), { status: 500, headers: responseHeaders });
  }

  const staleUserIds = (candidates || []).map((candidate: any) => candidate.user_id).filter(Boolean);
  let deleted = 0;
  let failed = 0;
  if (!dryRun) {
    for (const userId of staleUserIds) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) failed += 1;
      else deleted += 1;
    }
  }

  return new Response(JSON.stringify({ dryRun, candidates: staleUserIds.length, deleted, failed, limit }), { headers: responseHeaders });
});
