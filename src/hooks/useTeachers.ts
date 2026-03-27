import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Teacher {
  id: string;
  full_name: string;
  subject: string | null;
  qualification: string | null;
  experience: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export function useTeachers(limit?: number) {
  return useQuery<Teacher[]>({
    queryKey: ["teachers", limit],
    queryFn: async () => {
      let query = supabase
        .from("teachers")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}
