import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.2';
import { ensureLineUser } from '../_shared/line-user.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_LOGIN_CHANNEL_ID') || '';
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || 'https://mem-eng.pages.dev';

const allowedOrigins = new Set([
  APP_ORIGIN,
  'https://mem-eng.pages.dev',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]);

const corsHeaders = (request: Request) => {
  const origin = request.headers.get('origin') || APP_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin)
      ? origin
      : APP_ORIGIN,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const getClientIp = (request: Request) => {
  const direct = request.headers.get('cf-connecting-ip');
  if (direct) return direct.trim().slice(0, 80);
  return (request.headers.get('x-forwarded-for') || 'unknown')
    .split(',')[0]
    .trim()
    .slice(0, 80);
};

async function consumeAuthQuota(
  admin: any,
  key: string,
  limit: number,
) {
  const { data, error } = await admin.rpc('consume_line_auth_quota', {
    p_key_hash: await sha256(key),
    p_window_seconds: 3600,
    p_limit: limit,
  });
  if (error) {
    throw new Error('Could not enforce LINE sign-in rate limit');
  }
  return data === true;
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' },
      },
    );
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !LINE_LOGIN_CHANNEL_ID
  ) {
    console.error('LIFF auth secrets are incomplete');
    return new Response(
      JSON.stringify({ error: 'Server configuration is incomplete' }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 16 * 1024) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const { line_access_token: lineAccessToken } = await request.json();
    if (
      typeof lineAccessToken !== 'string' ||
      !lineAccessToken ||
      lineAccessToken.length > 4096
    ) {
      return new Response(
        JSON.stringify({ error: 'LINE access token is required' }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        },
      );
    }

    const verifyResponse = await fetch(
      'https://api.line.me/oauth2/v2.1/verify?access_token=' +
        encodeURIComponent(lineAccessToken),
    );

    if (!verifyResponse.ok) {
      throw new Error('LINE rejected the access token');
    }

    const tokenInfo = await verifyResponse.json();
    if (
      String(tokenInfo.client_id) !== LINE_LOGIN_CHANNEL_ID ||
      Number(tokenInfo.expires_in) <= 0
    ) {
      throw new Error('LINE access token belongs to another channel');
    }

    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: 'Bearer ' + lineAccessToken },
    });

    if (!profileResponse.ok) {
      throw new Error('Could not read LINE profile');
    }

    const profile = await profileResponse.json();
    if (!profile.userId) {
      throw new Error('LINE profile has no user ID');
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const lineQuotaAllowed = await consumeAuthQuota(
      admin,
      'line-user:' + String(profile.userId).toLowerCase(),
      60,
    );
    const ipQuotaAllowed = await consumeAuthQuota(
      admin,
      'line-ip:' + getClientIp(request),
      120,
    );
    if (!lineQuotaAllowed || !ipQuotaAllowed) {
      return new Response(JSON.stringify({ error: 'Too many LINE sign-in attempts' }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const lineUser = await ensureLineUser(admin, {
      userId: profile.userId,
      displayName: profile.displayName || null,
      pictureUrl: profile.pictureUrl || null,
    });


    const { data: authUserData, error: authUserError } =
      await admin.auth.admin.getUserById(lineUser.id);
    const mappedAuthUser = authUserData?.user;
    if (authUserError || !mappedAuthUser || !mappedAuthUser.email) {
      throw new Error('Mapped LINE account is unavailable');
    }
    if (mappedAuthUser.app_metadata?.line_user_id?.toLowerCase() !== lineUser.lineUserId.toLowerCase()) {
      throw new Error('Mapped LINE account identity does not match');
    }
    // Generate and immediately exchange a one-time magic link server-side.
    // The browser receives a normal Supabase session with a real refresh token.
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({

        type: 'magiclink',
        email: mappedAuthUser.email,
        options: {
          data: {
            name: lineUser.displayName,
          },
        },
      });

    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      throw new Error(
        'Could not create LINE session: ' +
          (linkError?.message || 'missing token'),
      );
    }

    const sessionClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: sessionData, error: sessionError } =
      await sessionClient.auth.verifyOtp({
        type: 'magiclink',
        token_hash: tokenHash,
      });

    if (sessionError || !sessionData.session) {
      throw new Error(
        'Could not exchange LINE session: ' +
          (sessionError?.message || 'missing session'),
      );
    }

    if (sessionData.session.user.id !== lineUser.id) {
      try {
        await sessionClient.auth.signOut();
      } catch {
        // The mismatch still fails closed even if revocation is unavailable.
      }
      throw new Error('LINE session identity mismatch');
    }

    return new Response(
      JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        user: {

          id: lineUser.id,
          lineUserId: lineUser.lineUserId,
          displayName: lineUser.displayName,
        },
      }),
      {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('LIFF sign-in failed:', error);
    return new Response(
      JSON.stringify({ error: 'LINE sign-in failed. Please reopen the app.' }),
      {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      },
    );
  }
});
