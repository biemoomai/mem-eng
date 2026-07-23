import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();
const LIFF_ID = import.meta.env.VITE_LIFF_ID || '2010748224-EeJEpvzz';

const getAuthLineUserId = (authUser) => {
  const metadataLineUserId = authUser?.app_metadata?.line_user_id;
  return typeof metadataLineUserId === 'string'
    ? metadataLineUserId.toLowerCase()
    : '';
};

const hasLineIdentity = (authUser, publicProfile = null) =>
  Boolean(publicProfile?.line_user_id || getAuthLineUserId(authUser));

const hasStoredLiffMode = () => {
  try {
    return sessionStorage.getItem('memeng_liff_mode') === 'true';
  } catch {
    return false;
  }
};

const rememberLiffMode = () => {
  try {
    sessionStorage.setItem('memeng_liff_mode', 'true');
  } catch {
    // Some in-app browsers disable session storage. LIFF still works normally.
  }
};

const shouldInitializeLiff = () => {
  const params = new URLSearchParams(window.location.search);
  const userAgent = navigator.userAgent || '';
  return (
    /Line\//i.test(userAgent) ||
    params.has('liff.state') ||
    params.has('liffClientId') ||
    hasStoredLiffMode()
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiffMode, setIsLiffMode] = useState(false);
  const [lineAuthError, setLineAuthError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const lineModeRequested = shouldInitializeLiff();
      let lineLoginRedirectStarted = false;

      try {
        if (lineModeRequested) {
          const { default: liff } = await import('@line/liff');
          await liff.init({ liffId: LIFF_ID });

          rememberLiffMode();
          if (isMounted) setIsLiffMode(true);

          if (!liff.isLoggedIn()) {
            lineLoginRedirectStarted = true;
            liff.login({ redirectUri: window.location.href });
            return;
          }

          const lineProfile = await liff.getProfile();
          const currentLineUserId = lineProfile.userId?.toLowerCase();
          if (!currentLineUserId) {
            throw new Error('LINE profile has no user ID');
          }

          const { data: existingSession } = await supabase.auth.getSession();
          const existingUser = existingSession?.session?.user;
          const existingLineUserId = getAuthLineUserId(existingUser);

          // Never reuse a Supabase session that belongs to a different LINE
          // account on the same device.
          if (existingLineUserId !== currentLineUserId) {
            const lineToken = liff.getAccessToken();
            const supabaseUrl =
              import.meta.env.VITE_SUPABASE_URL ||
              localStorage.getItem('supabase_url');

            if (!lineToken || !supabaseUrl) {
              throw new Error('LINE session is incomplete');
            }

            const response = await fetch(
              supabaseUrl + '/functions/v1/liff-auth',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ line_access_token: lineToken }),
              },
            );
            const authData = await response.json();

            if (
              !response.ok ||
              !authData.access_token ||
              !authData.refresh_token
            ) {
              throw new Error(authData.error || 'LINE sign-in failed');
            }

            const { error: sessionError } = await supabase.auth.setSession({
              access_token: authData.access_token,
              refresh_token: authData.refresh_token,
            });
            if (sessionError) throw sessionError;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          if (isMounted) setUser(session.user);
        } else if (!lineModeRequested) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          if (isMounted) setUser(data?.user ?? null);
        } else {
          throw new Error('LINE sign-in did not create a session');
        }
      } catch (error) {
        console.error('Authentication initialization failed:', error);
        if (isMounted) {
          setUser(null);
          if (lineModeRequested) {
            setIsLiffMode(true);
            setLineAuthError(
              'เชื่อมบัญชี LINE ไม่สำเร็จ กรุณาปิดแล้วเปิดจาก LINE อีกครั้ง',
            );
          }
        }
      } finally {
        if (isMounted && !lineLoginRedirectStarted) setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchAndSyncProfile(user);
    } else {
      setProfile(null);
    }
  }, [user]);

  const fetchAndSyncProfile = async (authUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      let currentProfile = data;
      const preferredName =
        authUser.user_metadata?.name ||
        authUser.user_metadata?.full_name ||
        (authUser.email ? authUser.email.split('@')[0] : 'Guest');

      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email || null,
            display_name: preferredName,
            streak_days: 1,
            last_login_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (!insertError) currentProfile = newProfile;
      }

      if (!currentProfile) return;

      if (
        authUser.email &&
        (!currentProfile.email || currentProfile.display_name === 'Guest')
      ) {
        const { data: updatedProfile, error: emailUpdateError } = await supabase
          .from('users')
          .update({
            email: authUser.email,
            display_name: preferredName,
          })
          .eq('id', authUser.id)
          .select()
          .single();

        if (!emailUpdateError && updatedProfile) {
          currentProfile = updatedProfile;
        }
      }

      const lastLogin = currentProfile.last_login_date
        ? new Date(currentProfile.last_login_date)
        : null;
      const today = new Date();
      const lastLoginDateOnly = lastLogin
        ? new Date(
            lastLogin.getFullYear(),
            lastLogin.getMonth(),
            lastLogin.getDate(),
          )
        : null;
      const todayDateOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      let newStreak = currentProfile.streak_days ?? 0;
      let shouldUpdateStreak = false;

      if (lastLoginDateOnly) {
        const difference = Math.floor(
          (todayDateOnly - lastLoginDateOnly) / (1000 * 60 * 60 * 24),
        );
        if (difference === 1) {
          newStreak += 1;
          shouldUpdateStreak = true;
        } else if (difference > 1) {
          newStreak = 1;
          shouldUpdateStreak = true;
        }
      } else {
        newStreak = 1;
        shouldUpdateStreak = true;
      }

      const updatePayload = {
        last_login_date: today.toISOString(),
        ...(shouldUpdateStreak ? { streak_days: newStreak } : {}),
      };
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', authUser.id)
        .select()
        .single();

      setProfile(
        !updateError && updatedProfile
          ? updatedProfile
          : { ...currentProfile, ...updatePayload },
      );
    } catch (error) {
      console.error('Profile sync failed:', error);
    }
  };

  const isAnonymous = user ? Boolean(user.is_anonymous || !user.email) : false;
  const isLineUser = hasLineIdentity(user, profile);
  const hasGoogleIdentity = Boolean(
    user?.identities?.some((identity) => identity.provider === 'google'),
  );

  const loginAsGuest = async () => {
    localStorage.removeItem('memeng_logged_out');
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setUser(data?.user ?? null);
      return { data, error: null };
    } catch (error) {
      console.error('Guest sign-in failed:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email, password) => {
    localStorage.removeItem('memeng_logged_out');

    if (isAnonymous || isLineUser) {
      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
      });
      if (error) return { data: null, error };

      if (data?.user) {
        setUser(data.user);
        await supabase
          .from('users')
          .update({
            email,
            display_name: email.split('@')[0],
          })
          .eq('id', data.user.id);
      }
      return { data, error: null };
    }

    return supabase.auth.signUp({ email, password });
  };

  const signIn = async (email, password) => {
    localStorage.removeItem('memeng_logged_out');
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signInWithGoogle = async () => {
    localStorage.removeItem('memeng_logged_out');
    const options = { redirectTo: window.location.origin };
    if (isAnonymous || isLineUser) {
      return supabase.auth.linkIdentity({ provider: 'google', options });
    }
    return supabase.auth.signInWithOAuth({ provider: 'google', options });
  };

  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) return { error };

    localStorage.removeItem('chatgpt_anki_deck');
    localStorage.removeItem('chatgpt_anki_streak');
    localStorage.removeItem('vocab_review_logs');
    await supabase.auth.signOut();
    const freshSession = await supabase.auth.signInAnonymously();
    return { error: freshSession.error || null };
  };

  const signOut = async () => {
    localStorage.removeItem('memeng_logged_out');
    const result = await supabase.auth.signOut();
    try {
      await supabase.auth.signInAnonymously();
    } catch (error) {
      console.error('Auto guest sign-in after logout failed:', error);
    }
    return result;
  };

  if (lineAuthError) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#090A0D',
          color: '#FFFFFF',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 320 }}>
          <h1 style={{ fontSize: 22, marginBottom: 10 }}>เปิดแอพไม่สำเร็จ</h1>
          <p style={{ color: '#A7ACB9', lineHeight: 1.6 }}>
            {lineAuthError}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              marginTop: 18,
              padding: '12px 16px',
              border: 0,
              borderRadius: 8,
              background: '#F5C842',
              color: '#111217',
              fontWeight: 800,
            }}
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        deleteAccount,
        isAnonymous,
        isLineUser,
        hasGoogleIdentity,
        loginAsGuest,
        isLiffMode,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
