import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

export const EXAM_SUBJECTS = [
  "Urdu", "English", "Mathematics", "Science", "Social Studies",
  "Islamiyat", "Computer", "Physics", "Chemistry", "Biology",
  "Pakistan Studies", "Arabic", "General Science",
];

export const ALL_CLASSES = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
];

const QUERY_OPTS = { staleTime: 2 * 60 * 1000, gcTime: 15 * 60 * 1000 };

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExamAttStatus = "present" | "absent" | "leave";

export interface ExamSession {
  id: string;
  title: string;
  exam_term: string;
  exam_year: string;
  classes: string[];
  is_active: boolean;
  created_at: string;
}

export interface ExamRollNumber {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  class_roll_no: string;
  exam_roll_no: string;
  serial_number: number;
  created_at: string;
}

export interface ExamAttendanceRecord {
  id?: string;
  session_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  class_roll_no: string;
  exam_roll_no: string;
  subject: string;
  exam_date: string;
  status: ExamAttStatus;
  scanned_at: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Exam Sessions ────────────────────────────────────────────────────────────

export function useExamSessions() {
  return useQuery<ExamSession[]>({
    queryKey: ["exam-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_sessions")
        .select("id, title, exam_term, exam_year, classes, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    ...QUERY_OPTS,
  });
}

// ─── Exam Roll Numbers ────────────────────────────────────────────────────────

export function useExamRollNumbers(sessionId: string, className: string) {
  return useQuery<ExamRollNumber[]>({
    queryKey: ["exam-roll-numbers", sessionId, className],
    queryFn: async () => {
      if (!sessionId || !className) return [];
      const { data, error } = await supabase
        .from("exam_roll_numbers")
        .select("id, session_id, student_id, student_name, class_name, class_roll_no, exam_roll_no, serial_number, created_at")
        .eq("session_id", sessionId)
        .eq("class_name", className)
        .order("serial_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && !!className,
    ...QUERY_OPTS,
  });
}

// ─── Exam Attendance ──────────────────────────────────────────────────────────

export function useExamAttendance(
  sessionId: string,
  className: string,
  subject: string,
  examDate: string,
) {
  return useQuery<ExamAttendanceRecord[]>({
    queryKey: ["exam-attendance", sessionId, className, subject, examDate],
    queryFn: async () => {
      if (!sessionId || !className || !subject || !examDate) return [];
      const { data, error } = await supabase
        .from("exam_attendance")
        .select("*")
        .eq("session_id", sessionId)
        .eq("class_name", className)
        .eq("subject", subject)
        .eq("exam_date", examDate)
        .order("exam_roll_no", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && !!className && !!subject && !!examDate,
    ...QUERY_OPTS,
  });
}

// ─── Exam Attendance Overview (all subjects for a class/session) ───────────────

export function useExamAttendanceOverview(
  sessionId: string | undefined,
  className: string | undefined,
) {
  return useQuery<ExamAttendanceRecord[]>({
    queryKey: ["exam-attendance-overview", sessionId, className],
    queryFn: async () => {
      if (!sessionId || !className) return [];
      const { data, error } = await supabase
        .from("exam_attendance")
        .select("*")
        .eq("session_id", sessionId)
        .eq("class_name", className)
        .order("exam_roll_no", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && !!className,
    ...QUERY_OPTS,
  });
}

// ─── Init Attendance Sheet ────────────────────────────────────────────────────

interface InitAttendancePayload {
  sessionId: string;
  cls: string;
  subject: string;
  examDate: string;
  students: {
    student_id: string;
    student_name: string;
    class_roll_no: string;
    exam_roll_no: string;
  }[];
}

export function useInitExamAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, cls, subject, examDate, students }: InitAttendancePayload) => {
      const records = students.map((s) => ({
        session_id: sessionId,
        student_id: s.student_id,
        student_name: s.student_name,
        class_name: cls,
        class_roll_no: s.class_roll_no,
        exam_roll_no: s.exam_roll_no,
        subject,
        exam_date: examDate,
        status: "absent" as ExamAttStatus,
        scanned_at: null,
      }));
      const { error } = await supabase.from("exam_attendance").insert(records);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["exam-attendance", variables.sessionId, variables.cls, variables.subject, variables.examDate],
      });
    },
  });
}

// ─── Update Attendance Status ─────────────────────────────────────────────────

interface UpdateAttendancePayload {
  id: string;
  status: ExamAttStatus;
  sessionId: string;
  cls: string;
  subject: string;
  examDate: string;
}

export function useUpdateExamAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: UpdateAttendancePayload) => {
      const { error } = await supabase
        .from("exam_attendance")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["exam-attendance", variables.sessionId, variables.cls, variables.subject, variables.examDate],
      });
    },
  });
}

// ─── Delete Attendance Sheet ──────────────────────────────────────────────────

interface DeleteAttendancePayload {
  sessionId: string;
  cls: string;
  subject: string;
  examDate: string;
}

export function useDeleteExamAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, cls, subject, examDate }: DeleteAttendancePayload) => {
      const { error } = await supabase
        .from("exam_attendance")
        .delete()
        .eq("session_id", sessionId)
        .eq("class_name", cls)
        .eq("subject", subject)
        .eq("exam_date", examDate);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["exam-attendance", variables.sessionId, variables.cls, variables.subject, variables.examDate],
      });
      qc.invalidateQueries({
        queryKey: ["exam-attendance-overview", variables.sessionId, variables.cls],
      });
    },
  });
    }
