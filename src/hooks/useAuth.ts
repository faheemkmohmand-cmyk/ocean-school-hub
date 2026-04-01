import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  class: string | null;
  roll_number: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) {
        console.warn("Profile fetch error (table may not exist yet):", error.message);
        return null;
      }
      return data as Profile;
    } catch (e) {
      console.warn("Profile fetch exception:", e);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Step 1: get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Step 2: fetch profile — await fully before setLoading(false)
        const prof = await fetchProfile(session.user.id);
        if (mounted) setProfile(prof);
      }

      // Step 3: only NOW set loading false — profile is ready
      if (mounted) setLoading(false);
    };

    init();

    // Listen for auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (mounted) setProfile(prof);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    }
  };

  return { user, session, profile, loading, signOut, refreshProfile };
}
