import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
            email: authUser.email,
            display_name: authUser.email.split('@')[0],
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



  // Helpful functions
  const signUp = async (email, password) => {
    return supabase.auth.signUp({ email, password });
  };

  const signIn = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signInWithGoogle = async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, signUp, signIn, signInWithGoogle, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
