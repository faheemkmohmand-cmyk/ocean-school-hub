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
  status: string;
  created_at: string;
}

// Maximum time to wait for auth init before giving up (prevents infinite spinner)
const AUTH_INIT_TIMEOUT_MS = 8000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_my_profile");

      if (!rpcError && rpcData) {
        return rpcData as Profile;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Profile fetch error:", error.message);
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
      try {
        // Race getSession against a timeout — if Supabase auth refresh hangs
        // (e.g. expired refresh token causing an infinite loop), we don't stay
        // stuck on the loading spinner forever.
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), AUTH_INIT_TIMEOUT_MS)
          ),
        ]);

        if (!mounted) return;

        // If the race timed out, sessionResult is null — treat as no session
        const session = sessionResult
          ? (sessionResult as { data: { session: Session | null } }).data.session
          : null;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          if (mounted) setProfile(prof);
        }

        if (mounted) setLoading(false);
      } catch (err) {
        console.warn("Auth init error:", err);
        // Even if everything fails, stop loading so the user isn't stuck forever
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // On sign-out: clear everything immediately BEFORE any async work
        // This prevents stale user/profile data from lingering on screen
        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          // Guard again after await — component may have unmounted
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
    // Clear state immediately so UI updates at once — don't wait for signOut to resolve
    setProfile(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    }
  };

  return { user, session, profile, loading, signOut, refreshProfile };
}
