import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Standard client — used for authenticated features (admin, profiles, etc.)
export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient("https://placeholder.supabase.co", "placeholder");

// Public client — used for admission form and any public-facing inserts.
// Auth is completely disabled so a broken/expired refresh token cannot
// block or hang public requests. This is the root cause of the admission
// submit hanging: the main client gets stuck in an auth refresh loop.
export const supabasePublic = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession:    false,
        autoRefreshToken:  false,
        detectSessionFromUrl: false,
      },
    })
  : createClient("https://placeholder.supabase.co", "placeholder", {
      auth: {
        persistSession:    false,
        autoRefreshToken:  false,
        detectSessionFromUrl: false,
      },
    });
