import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');

const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return bytesToHex(new Uint8Array(digest));
};

const getAuthenticatedUser = async (request: Request) => {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server configuration is incomplete' }, 500);
  }

  const user = await getAuthenticatedUser(request);
  if (!user) return json({ error: 'Authentication required' }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === 'status') {
      const [
        { data: lineIdentity, error: lineError },
        { data: latestMerge, error: mergeError },
        { count: deckCount, error: deckError },
      ] = await Promise.all([
        admin.from('line_identities').select('line_user_id,display_name').eq('user_id', user.id).maybeSingle(),
        admin.from('account_merge_audit')
          .select('source_deck_count,destination_deck_count_before,destination_deck_count_after,overlap_count,created_at')
          .eq('destination_user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        admin.from('user_decks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      if (lineError || mergeError || deckError) throw lineError || mergeError || deckError;
      return json({
        lineConnected: Boolean(lineIdentity?.line_user_id),
        lineDisplayName: lineIdentity?.display_name || null,
        googleDeckBefore: latestMerge?.destination_deck_count_before ?? null,
        lineDeckBefore: latestMerge?.source_deck_count ?? null,
        overlapCount: latestMerge?.overlap_count ?? null,
        combinedDeckCount: deckCount ?? latestMerge?.destination_deck_count_after ?? 0,
        mergedAt: latestMerge?.created_at || null,
      });
    }

    if (action === 'create') {
      const { data: lineIdentity, error: lineError } = await admin
        .from('line_identities')
        .select('line_user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (lineError || !lineIdentity?.line_user_id) {
        return json({ error: 'Current account is not connected to LINE' }, 400);
      }

      const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await admin
        .from('account_merge_intents')
        .delete()
        .eq('source_user_id', user.id);

      const { error } = await admin.from('account_merge_intents').insert({
        token_hash: tokenHash,
        source_user_id: user.id,
        expires_at: expiresAt,
      });
      if (error) throw error;

      return json({ token, expiresAt });
    }

    if (action === 'complete') {
      const token = typeof body?.token === 'string' ? body.token : '';
      if (!/^[0-9a-f]{64}$/.test(token)) {
        return json({ error: 'Merge request is invalid' }, 400);
      }

      const tokenHash = await hashToken(token);
      const { data: intent, error: intentError } = await admin
        .from('account_merge_intents')
        .select('source_user_id,expires_at,consumed_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();
      if (
        intentError ||
        !intent ||
        intent.consumed_at ||
        new Date(intent.expires_at).getTime() <= Date.now()
      ) {
        return json({ error: 'Merge request expired. Please start again.' }, 400);
      }
      if (intent.source_user_id === user.id) {
        return json({ error: 'Sign in with the Google account to merge into' }, 400);
      }
      const hasGoogle = user.identities?.some(
        (identity) => identity.provider === 'google',
      );
      if (!hasGoogle) {
        return json({ error: 'Destination must be a Google account' }, 400);
      }

      const { data: claimed, error: claimError } = await admin
        .from('account_merge_intents')
        .update({ consumed_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .is('consumed_at', null)
        .select('source_user_id')
        .maybeSingle();
      if (claimError || !claimed) {
        return json({ error: 'Merge request was already used' }, 409);
      }

      const { data: mergeResult, error: mergeError } = await admin.rpc(
        'merge_memeng_accounts',
        {
          p_source_user_id: claimed.source_user_id,
          p_destination_user_id: user.id,
        },
      );
      if (mergeError) {
        await admin
          .from('account_merge_intents')
          .update({ consumed_at: null })
          .eq('token_hash', tokenHash);
        throw mergeError;
      }

      const { data: destinationData, error: destinationError } =
        await admin.auth.admin.getUserById(user.id);
      if (destinationError || !destinationData?.user) {
        throw new Error('Merged account could not be refreshed');
      }

      const { data: lineIdentity } = await admin
        .from('line_identities')
        .select('line_user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const destinationUser = destinationData.user;
      const { error: metadataError } = await admin.auth.admin.updateUserById(
        user.id,
        {
          app_metadata: {
            ...(destinationUser.app_metadata || {}),
            ...(lineIdentity?.line_user_id
              ? {
                  line_user_id: lineIdentity.line_user_id,
                  auth_origin: 'line+google',
                }
              : {}),
          },
        },
      );
      if (metadataError) {
        console.error('Merged destination metadata refresh failed:', metadataError);
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(
        claimed.source_user_id,
      );
      if (deleteError) {
        console.error('Merged source Auth cleanup failed:', deleteError);
      }

      return json({ merged: true, ...mergeResult });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('Account merge failed:', error);
    return json({ error: 'Could not merge accounts. No deck data was removed.' }, 500);
  }
});
