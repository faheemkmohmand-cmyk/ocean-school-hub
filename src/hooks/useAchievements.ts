import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Achievement {
  id: string;
  title: string;
  description: string | null;
  student_name: string | null;
  class: string | null;
  year: number | null;
  image_url: string | null;
  category: string;
  created_at: string;
}

export function useAchievements(limit?: number) {
  return useQuery<Achievement[]>({
    queryKey: ["achievements", limit],
    queryFn: async () => {
      let query = supabase
        .from("achievements")
        .select("*")
        .order("created_at", { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}
