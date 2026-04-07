import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface NoteSubject {
  id: string; name: string; slug: string; emoji: string; color: string;
  description: string | null; class_level: string; display_order: number;
  is_visible: boolean; chapter_count?: number;
}
export interface NoteChapter {
  id: string; subject_id: string; title: string; slug: string;
  description: string | null; content: string | null; animation_code: string | null;
  graph_config: any | null; pdf_url: string | null; read_time_mins: number;
  difficulty: "easy" | "medium" | "hard"; chapter_number: number;
  is_published: boolean; view_count: number; created_at: string;
}
export interface NoteQuiz {
  id: string; chapter_id: string; title: string; pass_score: number;
  time_limit_secs: number; is_active: boolean;
}
export interface NoteQuestion {
  id: string; quiz_id: string; question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct: "a"|"b"|"c"|"d"; explanation: string | null; display_order: number;
}
export interface NoteProgress {
  chapter_id: string; started: boolean; completed: boolean; bookmarked: boolean;
}

// ── Subjects ──────────────────────────────────────────────────────────────────
export function useNoteSubjects(adminMode = false) {
  return useQuery<NoteSubject[]>({
    queryKey: ["note-subjects", adminMode],
    queryFn: async () => {
      let q = supabase.from("note_subjects").select("*").order("display_order");
      if (!adminMode) q = q.eq("is_visible", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMutateSubject() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: async (s: Partial<NoteSubject> & { id?: string }) => {
      if (s.id) {
        const { error } = await supabase.from("note_subjects").update(s).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("note_subjects").insert(s);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note-subjects"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("note_subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note-subjects"] }),
  });
  return { upsert, remove };
}

// ── Chapters ──────────────────────────────────────────────────────────────────
export function useNoteChapters(subjectId?: string, adminMode = false) {
  return useQuery<NoteChapter[]>({
    queryKey: ["note-chapters", subjectId, adminMode],
    queryFn: async () => {
      let q = supabase.from("note_chapters").select("*").order("chapter_number");
      if (subjectId) q = q.eq("subject_id", subjectId);
      if (!adminMode) q = q.eq("is_published", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subjectId || adminMode,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMutateChapter() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: async (c: Partial<NoteChapter> & { id?: string }) => {
      if (c.id) {
        const { id, ...rest } = c;
        const { error } = await supabase.from("note_chapters").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("note_chapters").insert(c);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note-chapters"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("note_chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note-chapters"] }),
  });
  return { upsert, remove };
}

// ── Quiz & Questions ──────────────────────────────────────────────────────────
export function useNoteQuiz(chapterId?: string) {
  return useQuery<NoteQuiz | null>({
    queryKey: ["note-quiz", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase.from("note_quizzes")
        .select("*").eq("chapter_id", chapterId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });
}

export function useNoteQuestions(quizId?: string) {
  return useQuery<NoteQuestion[]>({
    queryKey: ["note-questions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.from("note_questions")
        .select("*").eq("quiz_id", quizId!).order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!quizId,
  });
}

export function useMutateQuestion() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: async (q: Partial<NoteQuestion> & { id?: string }) => {
      if (q.id) {
        const { id, ...rest } = q;
        const { error } = await supabase.from("note_questions").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("note_questions").insert(q);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note-questions"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("note_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note-questions"] }),
  });
  return { upsert, remove };
}

// ── Progress ──────────────────────────────────────────────────────────────────
export function useNoteProgress(userId?: string) {
  return useQuery<NoteProgress[]>({
    queryKey: ["note-progress", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("note_progress").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export async function saveProgress(userId: string, chapterId: string, update: Partial<NoteProgress>) {
  const { error } = await supabase.from("note_progress").upsert(
    { user_id: userId, chapter_id: chapterId, ...update, updated_at: new Date().toISOString() },
    { onConflict: "user_id,chapter_id" }
  );
  return !error;
}

export async function saveQuizResult(userId: string, quizId: string, score: number, total: number, passed: boolean) {
  const { error } = await supabase.from("note_quiz_results").insert({ user_id: userId, quiz_id: quizId, score, total, passed });
  return !error;
}

export async function incrementViewCount(chapterId: string) {
  await supabase.rpc("increment_chapter_views", { chapter_id: chapterId }).catch(() => {
    // fallback: just update directly
    supabase.from("note_chapters").update({ view_count: 999 }).eq("id", chapterId);
  });
}
