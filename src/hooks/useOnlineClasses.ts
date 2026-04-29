/**
 * useOnlineClasses.ts
 * Data hook for the Online Classes system.
 * Uses Supabase when connected, localStorage as offline/demo fallback.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ClassStatus = "upcoming" | "live" | "completed" | "cancelled";

export interface OnlineClass {
  id: string;
  title: string;
  subject: string;
  class_name: string;        // e.g. "Class 10", "Class 9"
  teacher_name: string;
  teacher_id: string | null;
  meet_link: string;
  scheduled_date: string;    // ISO date: "2024-01-15"
  start_time: string;        // "HH:MM"
  duration_minutes: number;
  description: string | null;
  homework: string | null;
  notes: string | null;
  recording_link: string | null;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}

export type NewClass = Omit<OnlineClass, "id" | "created_at" | "updated_at" | "status">;

// ─── Subject config ───────────────────────────────────────────────────────────
export const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "English", "Urdu", "Islamiyat", "Pakistan Studies",
  "Computer Science", "General Science", "History", "Geography",
];

export const SUBJECT_ICONS: Record<string, string> = {
  "Mathematics":       "📐",
  "Physics":           "⚛️",
  "Chemistry":         "🧪",
  "Biology":           "🧬",
  "English":           "📖",
  "Urdu":              "✍️",
  "Islamiyat":         "☪️",
  "Pakistan Studies":  "🇵🇰",
  "Computer Science":  "💻",
  "General Science":   "🔬",
  "History":           "📜",
  "Geography":         "🌍",
};

export const SUBJECT_COLORS: Record<string, string> = {
  "Mathematics":       "from-blue-500 to-indigo-600",
  "Physics":           "from-violet-500 to-purple-600",
  "Chemistry":         "from-green-500 to-emerald-600",
  "Biology":           "from-teal-500 to-cyan-600",
  "English":           "from-orange-500 to-amber-600",
  "Urdu":              "from-rose-500 to-pink-600",
  "Islamiyat":         "from-emerald-600 to-green-700",
  "Pakistan Studies":  "from-green-600 to-green-800",
  "Computer Science":  "from-sky-500 to-blue-600",
  "General Science":   "from-cyan-500 to-teal-600",
  "History":           "from-amber-500 to-orange-600",
  "Geography":         "from-lime-500 to-green-600",
};

export const CLASS_NAMES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

// ─── Status detection ─────────────────────────────────────────────────────────
export function getClassStatus(cls: Pick<OnlineClass, "scheduled_date" | "start_time" | "duration_minutes" | "status">): ClassStatus {
  if (cls.status === "cancelled") return "cancelled";

  const now  = new Date();
  const [h, m] = cls.start_time.split(":").map(Number);
  const start  = new Date(`${cls.scheduled_date}T${cls.start_time}:00`);
  const end    = new Date(start.getTime() + cls.duration_minutes * 60000);

  if (now >= start && now < end) return "live";
  if (now >= end)                return "completed";
  return "upcoming";
}

export function getCountdown(cls: Pick<OnlineClass, "scheduled_date" | "start_time">): string {
  const now   = new Date();
  const start = new Date(`${cls.scheduled_date}T${cls.start_time}:00`);
  const diff  = start.getTime() - now.getTime();
  if (diff <= 0) return "";

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);

  if (days > 0)  return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0)  return `${mins}m ${secs}s`;
  return `${secs}s`;
}

// ─── LocalStorage fallback ────────────────────────────────────────────────────
const LS_KEY = "ocean_online_classes";

function loadFromLS(): OnlineClass[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : getDemoClasses();
  } catch { return getDemoClasses(); }
}

function saveToLS(classes: OnlineClass[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(classes)); } catch {}
}

function makeid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getDemoClasses(): OnlineClass[] {
  const now  = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

  // Make one class "live" right now (started 10 min ago, 60 min duration)
  const liveStart = new Date(now.getTime() - 10 * 60000);
  const liveTime  = `${String(liveStart.getHours()).padStart(2,"0")}:${String(liveStart.getMinutes()).padStart(2,"0")}`;

  // Upcoming in 30 min
  const upcomingStart = new Date(now.getTime() + 30 * 60000);
  const upcomingTime  = `${String(upcomingStart.getHours()).padStart(2,"0")}:${String(upcomingStart.getMinutes()).padStart(2,"0")}`;

  return [
    {
      id: "demo-1",
      title: "Algebra & Equations",
      subject: "Mathematics",
      class_name: "Class 10",
      teacher_name: "Sir Ahmad",
      teacher_id: null,
      meet_link: "https://meet.google.com/abc-defg-hij",
      scheduled_date: today,
      start_time: liveTime,
      duration_minutes: 60,
      description: "Today we cover quadratic equations and their applications.",
      homework: "Complete Exercise 3.4 questions 1-10",
      notes: "Remember: ax² + bx + c = 0",
      recording_link: null,
      status: "upcoming",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-2",
      title: "Newton's Laws of Motion",
      subject: "Physics",
      class_name: "Class 10",
      teacher_name: "Ma'am Fatima",
      teacher_id: null,
      meet_link: "https://meet.google.com/xyz-uvwx-yz1",
      scheduled_date: today,
      start_time: upcomingTime,
      duration_minutes: 45,
      description: "Understanding force, mass and acceleration.",
      homework: null,
      notes: null,
      recording_link: null,
      status: "upcoming",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-3",
      title: "Organic Chemistry Intro",
      subject: "Chemistry",
      class_name: "Class 10",
      teacher_name: "Sir Hassan",
      teacher_id: null,
      meet_link: "https://meet.google.com/org-chem-101",
      scheduled_date: tomorrow,
      start_time: "10:00",
      duration_minutes: 60,
      description: "Introduction to organic compounds and carbon chemistry.",
      homework: null,
      notes: null,
      recording_link: null,
      status: "upcoming",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-4",
      title: "Cell Biology & Genetics",
      subject: "Biology",
      class_name: "Class 9",
      teacher_name: "Ma'am Zainab",
      teacher_id: null,
      meet_link: "https://meet.google.com/bio-cell-xyz",
      scheduled_date: yesterday,
      start_time: "09:00",
      duration_minutes: 50,
      description: "DNA, RNA and protein synthesis.",
      homework: "Read Chapter 5, answer questions at end.",
      notes: "Cell = basic unit of life. Nucleus contains DNA.",
      recording_link: null,
      status: "upcoming",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-5",
      title: "Essay Writing & Grammar",
      subject: "English",
      class_name: "Class 9",
      teacher_name: "Sir Imran",
      teacher_id: null,
      meet_link: "https://meet.google.com/eng-essay-abc",
      scheduled_date: tomorrow,
      start_time: "14:00",
      duration_minutes: 45,
      description: "Learn to write compelling essays with proper structure.",
      homework: null,
      notes: null,
      recording_link: null,
      status: "upcoming",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
export function useOnlineClasses() {
  const [classes, setClasses]   = useState<OnlineClass[]>([]);
  const [loading, setLoading]   = useState(true);
  const [useSupabase, setUseSupabase] = useState(false);

  // Load data
  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("online_classes")
        .select("*")
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setClasses(data ?? []);
      setUseSupabase(true);
    } catch {
      // Supabase not set up — use localStorage
      setClasses(loadFromLS());
      setUseSupabase(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  // ── Create class ────────────────────────────────────────────────────────────
  const createClass = useCallback(async (data: NewClass): Promise<boolean> => {
    try {
      if (useSupabase) {
        const { error } = await supabase.from("online_classes").insert({
          ...data,
          status: "upcoming",
        });
        if (error) throw error;
        await loadClasses();
      } else {
        const newClass: OnlineClass = {
          ...data,
          id: makeid(),
          status: "upcoming",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updated = [...classes, newClass];
        setClasses(updated);
        saveToLS(updated);
      }
      toast.success("Class created successfully! 🎉");
      return true;
    } catch (e: any) {
      toast.error(e.message || "Failed to create class");
      return false;
    }
  }, [useSupabase, classes, loadClasses]);

  // ── Update class ────────────────────────────────────────────────────────────
  const updateClass = useCallback(async (id: string, data: Partial<OnlineClass>): Promise<boolean> => {
    try {
      if (useSupabase) {
        const { error } = await supabase
          .from("online_classes")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        await loadClasses();
      } else {
        const updated = classes.map(c =>
          c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c
        );
        setClasses(updated);
        saveToLS(updated);
      }
      toast.success("Class updated! ✅");
      return true;
    } catch (e: any) {
      toast.error(e.message || "Failed to update class");
      return false;
    }
  }, [useSupabase, classes, loadClasses]);

  // ── Delete class ────────────────────────────────────────────────────────────
  const deleteClass = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (useSupabase) {
        const { error } = await supabase.from("online_classes").delete().eq("id", id);
        if (error) throw error;
        await loadClasses();
      } else {
        const updated = classes.filter(c => c.id !== id);
        setClasses(updated);
        saveToLS(updated);
      }
      toast.success("Class deleted");
      return true;
    } catch (e: any) {
      toast.error(e.message || "Failed to delete class");
      return false;
    }
  }, [useSupabase, classes, loadClasses]);

  // ── Computed with live status ───────────────────────────────────────────────
  const classesWithStatus = classes.map(c => ({
    ...c,
    status: getClassStatus(c),
  }));

  const liveClasses     = classesWithStatus.filter(c => c.status === "live");
  const upcomingClasses = classesWithStatus.filter(c => c.status === "upcoming");
  const completedClasses = classesWithStatus.filter(c => c.status === "completed");

  const today = new Date().toISOString().slice(0, 10);
  const todayClasses    = classesWithStatus.filter(c => c.scheduled_date === today);
  const completedToday  = completedClasses.filter(c => c.scheduled_date === today);

  return {
    classes: classesWithStatus,
    liveClasses,
    upcomingClasses,
    completedClasses,
    todayClasses,
    completedToday,
    loading,
    useSupabase,
    createClass,
    updateClass,
    deleteClass,
    refresh: loadClasses,
  };
}
