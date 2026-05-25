import { useQuery } from "@tanstack/react-query";
import { supabase, supabasePublic } from "@/lib/supabase";

export interface SchoolSettings {
  id: number;
  school_name: string;
  tagline: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  emis_code: string;
  address: string;
  phone: string | null;
  email: string | null;
  established_year: number;
  total_students: number;
  total_teachers: number;
  pass_percentage: number;
}

export const fallbackSettings: SchoolSettings = {
  id: 1,
  school_name: "GHS Babi Khel",
  tagline: "Excellence in Education",
  description:
    "Government High School Babi Khel is committed to providing quality education and nurturing the future leaders of Pakistan.",
  logo_url: null,
  banner_url: null,
  emis_code: "60673",
  address: "Babi Khel, District Mohmand, KPK, Pakistan",
  phone: null,
  email: "ghsbabikhel@edu.pk",
  established_year: 2018,
  total_students: 500,
  total_teachers: 25,
  pass_percentage: 98,
};

// Force every media URL to https so mobile Chrome never blocks mixed-content
export function safeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

async function fetchSettings(client: typeof supabase) {
  const { data, error } = await client
    .from("school_settings")
    .select(
      "id, school_name, tagline, description, logo_url, banner_url, emis_code, address, phone, email, established_year, total_students, total_teachers, pass_percentage"
    )
    .eq("id", 1)
    .single();

  if (error) throw error;
  return {
    ...data,
    logo_url: safeMediaUrl(data.logo_url),
    banner_url: safeMediaUrl(data.banner_url),
  };
}

export function useSchoolSettings() {
  return useQuery<SchoolSettings>({
    queryKey: ["school-settings"],
    queryFn: async () => {
      // Attempt 1: Public (anon) client
      try {
        return await fetchSettings(supabasePublic);
      } catch (publicErr) {
        console.warn(
          "[useSchoolSettings] Public client failed, trying authenticated client:",
          publicErr
        );
      }

      // Attempt 2: Authenticated client — NO timeout (timeout was causing
      // the logo/banner to disappear after sign-in on mobile Chrome)
      try {
        return await fetchSettings(supabase);
      } catch (authErr) {
        console.warn(
          "[useSchoolSettings] Authenticated client also failed:",
          authErr
        );
      }

      // Last resort: fallback (logo/banner will be null)
      console.error(
        "[useSchoolSettings] ALL queries failed. Using fallback. " +
        "Fix: Add a public SELECT RLS policy on school_settings in Supabase."
      );
      return fallbackSettings;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    // KEY FIX: keep showing previous data while a refetch is in progress
    // This prevents logo/banner from flashing away during auth-triggered refetches
    placeholderData: (previousData) => previousData ?? fallbackSettings,
  });
    }
