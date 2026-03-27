import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface NewsItem {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
}

export function useNews(limit?: number) {
  return useQuery<NewsItem[]>({
    queryKey: ["news", limit],
    queryFn: async () => {
      let query = supabase
        .from("news")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: [],
  });
}
