import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (isMounted) {
            setUser(session.user);
            setLoading(false);
          }
        } else {
          // Automatically sign in anonymously if no session exists!
          const { data, error } = await supabase.auth.signInAnonymously();
          if (isMounted) {
            if (error) {
              console.error("Auto anonymous sign in failed:", error);
              setUser(null);
            } else {
              setUser(data?.user ?? null);
            }
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error in initAuth:", err);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      // 1. Fetch user profile from public.users
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      let currentProfile = data;

      if (error && error.code === 'PGRST116') {
        // Record not found, let's insert a new one!
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email || null,
            display_name: authUser.email ? authUser.email.split('@')[0] : 'Guest',
            streak_days: 1,
            last_login_date: new Date().toISOString()
          })
          .select()
          .single();

        if (!insertError) {
          currentProfile = newProfile;
        }
      }

      if (currentProfile) {
        // If profile exists but email or display name is still null/Guest, and authUser now has an email
        if (authUser.email && (!currentProfile.email || currentProfile.display_name === 'Guest')) {
          const { data: updatedProfile, error: emailUpdateErr } = await supabase
            .from('users')
            .update({
              email: authUser.email,
              display_name: authUser.email.split('@')[0]
            })
            .eq('id', authUser.id)
            .select()
            .single();
          
          if (!emailUpdateErr && updatedProfile) {
            currentProfile = updatedProfile;
          }
        }
        
        // 2. Calculate Streak
        const lastLogin = currentProfile.last_login_date ? new Date(currentProfile.last_login_date) : null;
        const today = new Date();
        
        const lastLoginDateOnly = lastLogin ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate()) : null;
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        let newStreak = currentProfile.streak_days ?? 0;
        let shouldUpdate = false;

        if (lastLoginDateOnly) {
          const diffTime = todayDateOnly - lastLoginDateOnly;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak += 1;
            shouldUpdate = true;
          } else if (diffDays > 1) {
            newStreak = 1;
            shouldUpdate = true;
          }
        } else {
          newStreak = 1;
          shouldUpdate = true;
        }

        const updatePayload = { last_login_date: today.toISOString() };
        if (shouldUpdate) {
          updatePayload.streak_days = newStreak;
        }

        const { data: updatedProfile, error: updateError } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', authUser.id)
          .select()
          .single();

        if (!updateError && updatedProfile) {
          setProfile(updatedProfile);
        } else {
          setProfile({ ...currentProfile, ...updatePayload });
        }
      }
    } catch (err) {
      console.error("Error in fetchAndSyncProfile:", err);
    }
  };



  const isAnonymous = user ? (user.is_anonymous || !user.email) : false;

  const loginAsGuest = async () => {
    localStorage.removeItem('memeng_logged_out');
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setUser(data?.user ?? null);
      return { data, error: null };
    } catch (err) {
      console.error("loginAsGuest error:", err);
      return { data: null, error: err };
    }
  };

  // Helpful functions
  const signUp = async (email, password) => {
    localStorage.removeItem('memeng_logged_out');
    if (isAnonymous) {
      const { data, error } = await supabase.auth.updateUser({ email, password });
      if (error) return { data: null, error };
      if (data?.user) {
        setUser(data.user);
        await supabase
          .from('users')
          .update({
            email: email,
            display_name: email.split('@')[0]
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
    if (isAnonymous) {
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
    const res = await supabase.auth.signOut();
    try {
      await supabase.auth.signInAnonymously();
    } catch (err) {
      console.error("Auto guest sign in on logout failed:", err);
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, profile, signUp, signIn, signInWithGoogle, signOut, deleteAccount, isAnonymous, loginAsGuest }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

