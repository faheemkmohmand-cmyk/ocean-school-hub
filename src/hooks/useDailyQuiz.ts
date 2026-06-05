import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

// ───────────────────────────────────────────────────────────────────
// Daily Quiz: powered by Open Trivia DB (https://opentdb.com)
// One shared quiz per day. One attempt per user per day.
// ───────────────────────────────────────────────────────────────────

export interface DailyQuestion {
  question: string;
  options: string[];   // shuffled
  correct: string;     // text of correct option
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface DailyQuiz {
  quiz_date: string;
  category: string;
  category_id: number;
  difficulty: string;
  questions: DailyQuestion[];
  created_at: string;
}

export interface DailyAttempt {
  id: string;
  user_id: string;
  quiz_date: string;
  student_name: string;
  student_class: string | null;
  roll_number: string | null;
  answers: Record<string, string>;
  score: number;
  total_questions: number;
  percentage: number;
  time_taken: number | null;
  completed_at: string;
}

// Rotating categories (Open Trivia DB IDs)
const CATEGORIES = [
  { id: 9,  name: "General Knowledge" },
  { id: 17, name: "Science & Nature" },
  { id: 22, name: "Geography" },
  { id: 23, name: "History" },
  { id: 18, name: "Computers" },
  { id: 21, name: "Sports" },
  { id: 20, name: "Mythology" },
];
const DIFFICULTIES: ("easy" | "medium" | "hard")[] = ["easy", "medium", "hard"];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayIndex(): number {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function decodeHtml(s: string): string {
  const t = document.createElement("textarea");
  t.innerHTML = s;
  return t.value;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchTriviaQuestions(categoryId: number, difficulty: string): Promise<DailyQuestion[]> {
  const url = `https://opentdb.com/api.php?amount=10&category=${categoryId}&difficulty=${difficulty}&type=multiple`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Trivia API returned ${res.status}`);
  const json = await res.json();

  // response_code: 0 = success, 1 = not enough questions, 2 = invalid param
  if (json.response_code === 1) {
    // Not enough questions for this category/difficulty — try without difficulty filter
    const fallbackUrl = `https://opentdb.com/api.php?amount=10&category=${categoryId}&type=multiple`;
    const fallbackRes = await fetch(fallbackUrl);
    if (!fallbackRes.ok) throw new Error("Trivia API fallback failed");
    const fallbackJson = await fallbackRes.json();
    if (fallbackJson.response_code !== 0 || !Array.isArray(fallbackJson.results) || fallbackJson.results.length === 0) {
      throw new Error("No questions available for this category");
    }
    return fallbackJson.results.map((r: any) => {
      const correct = decodeHtml(r.correct_answer);
      const options = shuffle([correct, ...r.incorrect_answers.map(decodeHtml)]);
      return {
        question: decodeHtml(r.question),
        options,
        correct,
        category: decodeHtml(r.category),
        difficulty: r.difficulty,
      } as DailyQuestion;
    });
  }

  if (json.response_code !== 0 || !Array.isArray(json.results) || json.results.length === 0) {
    throw new Error("Quiz source returned no questions");
  }

  return json.results.map((r: any) => {
    const correct = decodeHtml(r.correct_answer);
    const options = shuffle([correct, ...r.incorrect_answers.map(decodeHtml)]);
    return {
      question: decodeHtml(r.question),
      options,
      correct,
      category: decodeHtml(r.category),
      difficulty: r.difficulty,
    } as DailyQuestion;
  });
}

// Fallback: fetch from any category if specific one fails
async function fetchAnyTriviaQuestions(): Promise<DailyQuestion[]> {
  const url = `https://opentdb.com/api.php?amount=10&type=multiple`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Trivia API unavailable");
  const json = await res.json();
  if (json.response_code !== 0 || !Array.isArray(json.results) || json.results.length === 0) {
    throw new Error("No quiz questions available");
  }
  return json.results.map((r: any) => {
    const correct = decodeHtml(r.correct_answer);
    const options = shuffle([correct, ...r.incorrect_answers.map(decodeHtml)]);
    return {
      question: decodeHtml(r.question),
      options,
      correct,
      category: decodeHtml(r.category),
      difficulty: r.difficulty,
    } as DailyQuestion;
  });
}

export function useTodayQuiz() {
  const qc = useQueryClient();
  return useQuery<DailyQuiz>({
    queryKey: ["daily-quiz", todayISO()],
    queryFn: async () => {
      const date = todayISO();

      // 1. Read existing quiz for today
      const { data: existing, error: readErr } = await supabase
        .from("daily_quizzes")
        .select("*")
        .eq("quiz_date", date)
        .maybeSingle();

      if (readErr) {
        console.error("Failed to read daily_quizzes:", readErr.message);
      }
      if (existing) return existing as DailyQuiz;

      // 2. Determine category and difficulty for today
      const idx = dayIndex();
      const cat = CATEGORIES[idx % CATEGORIES.length];
      const diff = DIFFICULTIES[idx % DIFFICULTIES.length];

      // 3. Fetch trivia questions with retry and fallback
      let questions: DailyQuestion[] = [];
      let lastErr: unknown = null;

      // Try specific category/difficulty first (3 attempts)
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          questions = await fetchTriviaQuestions(cat.id, diff);
          if (questions.length > 0) break;
        } catch (e) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }

      // Fallback: try any category if specific category failed
      if (questions.length === 0) {
        try {
          questions = await fetchAnyTriviaQuestions();
        } catch (e) {
          lastErr = e;
        }
      }

      if (questions.length === 0) {
        throw lastErr || new Error("Could not load today's quiz. Please try again in a moment.");
      }

      // 4. Insert into Supabase (race-safe: ignore conflict on primary key)
      const { error: insertErr } = await supabase
        .from("daily_quizzes")
        .insert({
          quiz_date: date,
          category: cat.name,
          category_id: cat.id,
          difficulty: diff,
          questions,
        });

      if (insertErr) {
        const msg = String(insertErr.message || "").toLowerCase();
        // Duplicate key is expected when another client seeded the quiz first
        if (!msg.includes("duplicate") && !msg.includes("unique") && !msg.includes("violates")) {
          console.error("Failed to insert daily_quizzes:", insertErr.message);
        }
      }

      // 5. Re-read to get the canonical row (in case another client inserted first)
      const { data: row } = await supabase
        .from("daily_quizzes")
        .select("*")
        .eq("quiz_date", date)
        .maybeSingle();

      qc.invalidateQueries({ queryKey: ["daily-quiz-attempts", date] });

      return (row || {
        quiz_date: date,
        category: cat.name,
        category_id: cat.id,
        difficulty: diff,
        questions,
        created_at: new Date().toISOString(),
      }) as DailyQuiz;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

export function useMyTodayAttempt() {
  const { user } = useAuth();
  const date = todayISO();
  return useQuery<DailyAttempt | null>({
    queryKey: ["my-daily-attempt", user?.id, date],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("daily_quiz_attempts")
        .select("*")
        .eq("user_id", user.id)
        .eq("quiz_date", date)
        .maybeSingle();
      if (error) throw error;
      return (data as DailyAttempt) || null;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useTodayLeaderboard() {
  const date = todayISO();
  return useQuery<DailyAttempt[]>({
    queryKey: ["daily-quiz-attempts", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_quiz_attempts")
        .select("*")
        .eq("quiz_date", date)
        .order("score", { ascending: false })
        .order("time_taken", { ascending: true });
      if (error) throw error;
      return (data || []) as DailyAttempt[];
    },
    staleTime: 60 * 1000,
  });
}

export function useAllTimeLeaderboard() {
  return useQuery<DailyAttempt[]>({
    queryKey: ["daily-quiz-all-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_quiz_attempts")
        .select("user_id, student_name, student_class, score, total_questions, percentage, quiz_date");
      if (error) throw error;
      return (data || []) as DailyAttempt[];
    },
    staleTime: 60 * 1000,
  });
}

export function useSubmitDailyAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Omit<DailyAttempt, "id" | "completed_at">) => {
      const { data, error } = await supabase.from("daily_quiz_attempts").insert(a).select().single();
      if (error) throw error;
      return data as DailyAttempt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-daily-attempt"] });
      qc.invalidateQueries({ queryKey: ["daily-quiz-attempts"] });
      qc.invalidateQueries({ queryKey: ["daily-quiz-all-attempts"] });
    },
  });
}
