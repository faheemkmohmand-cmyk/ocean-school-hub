import { useQuery } from "@tanstack/react-query";
// Use supabasePublic (no auth session) so this query never gets stuck
// in an auth refresh loop.
import { supabasePublic } from "@/lib/supabase";

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

export function useSchoolSettings() {
  return useQuery<SchoolSettings>({
    queryKey: ["school-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabasePublic
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
      } catch (err) {
        console.warn("[useSchoolSettings] Query failed, using fallback:", err);
        return fallbackSettings;
      }
    },
    staleTime: 10 * 60 * 1000,       // 10 min — settings rarely change
    gcTime: 60 * 60 * 1000,           // keep in cache 1 hour
    retry: 2,
    // FIX: Turn off refetchOnWindowFocus — school settings don't change
    // while a user is browsing. Every focus/navigation was triggering a
    // refetch that caused a brief undefined→data flash, making logo and
    // banner disappear for a second after sign-in or page navigation.
    refetchOnWindowFocus: false,
    // FIX: placeholderData is a CONSTANT fallbackSettings object, not a
    // function that could return undefined. This guarantees settings is
    // NEVER undefined — even on the very first render before the query
    // resolves. Logo and banner always render, even before Supabase responds.
    placeholderData: fallbackSettings,
  });
}
