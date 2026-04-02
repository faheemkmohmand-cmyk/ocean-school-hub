import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface TimetableEntry {
  id: string;
  class: string;
  day: string;
  period_number: number;
  subject: string;
  teacher_name: string | null;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  updated_at: string;
}

export function useTimetable(classFilter: string) {
  return useQuery<TimetableEntry[]>({
    queryKey: ["timetable", classFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetables")
        .select("id, class, day, period_number, subject, teacher_name, start_time, end_time, room, updated_at")
        .eq("class", classFilter)
        .order("period_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!classFilter,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: [],
  });
}
