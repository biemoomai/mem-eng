export type LineProfile = {
  userId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
};

export type LineUser = {
  id: string;
  email: string;
  displayName: string;
  lineUserId: string;
};

const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/i;

export const assertLineUserId = (lineUserId: unknown) => {
  if (typeof lineUserId !== 'string' || !LINE_USER_ID_PATTERN.test(lineUserId)) {
    throw new Error('Invalid LINE user ID');
  }
  return lineUserId;
};

export const normalizeLineUserId = (lineUserId: unknown) =>
  assertLineUserId(lineUserId).toLowerCase();

export const getLineEmail = (lineUserId: string) =>
  `${normalizeLineUserId(lineUserId)}@line.guest.com`;

export async function fetchLineBotProfile(
  lineUserId: string,
  channelAccessToken: string,
): Promise<LineProfile> {
  const response = await fetch(
    `https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`,
    { headers: { Authorization: `Bearer ${channelAccessToken}` } },
  );

  if (!response.ok) {
    return { userId: lineUserId };
  }

  const profile = await response.json();
  return {
    userId: lineUserId,
    displayName: profile.displayName || null,
    pictureUrl: profile.pictureUrl || null,
  };
}

async function getAuthUser(admin: any, userId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return data.user;
}

async function findRecoverableSyntheticUser(
  admin: any,
  email: string,
  lineUserId: string,
) {
  const { data: candidate, error } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (error || !candidate?.id) return null;

  const authUser = await getAuthUser(admin, candidate.id);
  if (!authUser) return null;

  const authEmail = authUser.email?.toLowerCase();
  const serverLineUserId = authUser.app_metadata?.line_user_id?.toLowerCase();
  return authEmail === email && serverLineUserId === lineUserId.toLowerCase()
    ? authUser
    : null;
}

async function waitForMappedUser(admin: any, lineUserId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
    const { data } = await admin
      .from('line_identities')
      .select('user_id')
      .eq('line_user_id', lineUserId)
      .maybeSingle();
    if (data?.user_id) {
      const authUser = await getAuthUser(admin, data.user_id);
      if (authUser) return authUser;
    }
  }
  return null;
}

async function ensureServerLineMetadata(
  admin: any,
  authUser: any,
  lineUserId: string,
) {
  if (authUser.app_metadata?.line_user_id?.toLowerCase() === lineUserId.toLowerCase()) {
    return authUser;
  }

  const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
    app_metadata: {
      ...(authUser.app_metadata || {}),
      line_user_id: lineUserId,
      auth_origin: 'line',
    },
  });
  if (error || !data?.user) {
    throw new Error('Failed to secure LINE identity metadata');
  }
  return data.user;
}

export async function ensureLineUser(
  admin: any,
  profile: LineProfile,
): Promise<LineUser> {
  const lineUserId = normalizeLineUserId(profile.userId);
  const email = getLineEmail(lineUserId);

  const { data: identity, error: identityError } = await admin
    .from('line_identities')
    .select('user_id,display_name,picture_url')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (identityError) {
    throw new Error(`Failed to read LINE identity: ${identityError.message}`);
  }

  let authUser = identity?.user_id
    ? await getAuthUser(admin, identity.user_id)
    : null;
  const displayName =
    profile.displayName?.trim() ||
    identity?.display_name ||
    'LINE learner';
  const pictureUrl = profile.pictureUrl || identity?.picture_url || null;

  if (identity?.user_id && !authUser) {
    throw new Error('LINE identity points to a missing Auth user');
  }

  if (!authUser) {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        app_metadata: {
          line_user_id: lineUserId,
          auth_origin: 'line',
        },
        user_metadata: {
          name: displayName,
        },
      });

    if (createError || !created?.user) {
      // Another concurrent LINE event may have created the mapping first.
      authUser =
        await waitForMappedUser(admin, lineUserId) ||
        await findRecoverableSyntheticUser(admin, email, lineUserId);
      if (!authUser) {
        throw new Error(
          `Failed to create LINE user: ${createError?.message || 'unknown error'}`,
        );
      }
    } else {
      authUser = created.user;
    }
  }

  authUser = await ensureServerLineMetadata(admin, authUser, lineUserId);
  const userId = authUser.id;
  const currentEmail = authUser.email?.toLowerCase() || email;

  const { error: profileError } = await admin
    .from('users')
    .upsert({
      id: userId,
      email: currentEmail,
      display_name: displayName,
      line_user_id: lineUserId,
    }, { onConflict: 'id' });

  if (profileError) {
    throw new Error(`Failed to update LINE profile: ${profileError.message}`);
  }

  const now = new Date().toISOString();
  const { error: identityUpsertError } = await admin
    .from('line_identities')
    .upsert({
      line_user_id: lineUserId,
      user_id: userId,
      display_name: displayName,
      picture_url: pictureUrl,
      updated_at: now,
      last_seen_at: now,
    }, { onConflict: 'line_user_id' });

  if (identityUpsertError) {
    throw new Error(
      `Failed to persist LINE identity: ${identityUpsertError.message}`,
    );
  }

  return { id: userId, email: currentEmail, displayName, lineUserId };
}
