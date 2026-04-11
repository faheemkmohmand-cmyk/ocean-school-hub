import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OverviewTab from "./tabs/OverviewTab";
import TimetableTab from "./tabs/TimetableTab";
import ResultsTab from "./tabs/ResultsTab";
import NoticesTab from "./tabs/NoticesTab";
import NewsTab from "./tabs/NewsTab";
import LibraryTab from "./tabs/LibraryTab";
import GalleryTab from "./tabs/GalleryTab";
import VideosTab from "./tabs/VideosTab";
import AchievementsTab from "./tabs/AchievementsTab";
import TeachersTab from "./tabs/TeachersTab";
import ProfileTab from "./tabs/ProfileTab";
import RollNumbersTab from "./tabs/RollNumbersTab";
import ResultCardTab from "./tabs/ResultCardTab";
import TestsTab from "./tabs/TestsTab";
import NotesTab from "../notes/NotesTab";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import {
  BookMarked, CheckCircle2, Circle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Calendar, Trophy, TrendingUp,
  BarChart3, Star, Printer
} from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { useResults, useResultYears } from "@/hooks/useResults";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Homework { id: string; title: string; description: string | null; class: string; subject: string; due_date: string; teacher_name: string | null; is_active: boolean; created_at: string; }
interface DailyQuote { id: string; text: string; author: string | null; category: string; fixed_date: string | null; }
interface ExamEntry { id: string; class: string; exam_type: string; year: number; subject: string; exam_date: string; start_time: string | null; end_time: string | null; hall: string | null; paper_code: string | null; notes: string | null; }
interface HonorEntry { id: string; student_name: string; class: string; month: number; year: number; reason: string | null; photo_url: string | null; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const examTypes: Record<string, string[]> = { "6":["1st Semester","2nd Semester"],"7":["1st Semester","2nd Semester"],"8":["1st Semester","2nd Semester"],"9":["Annual-I","Annual-II"],"10":["Annual-I","Annual-II"] };
const SUBJECT_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4","#84cc16","#ec4899"];

// ─── Homework Tab ─────────────────────────────────────────────────────────────
function HomeworkTab() {
  const { user, profile } = useAuth();
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: homeworks = [], isLoading } = useQuery<Homework[]>({
    queryKey: ["homework", profile?.class],
    queryFn: async () => {
      let q = supabase.from("homework").select("*").eq("is_active", true).order("due_date", { ascending: true });
      if (profile?.class) q = q.eq("class", profile.class);
      const { data, error } = await q; if (error) throw error; return data ?? [];
    },
    enabled: !!profile,
  });

  const { data: completions = [] } = useQuery<{ homework_id: string }[]>({
    queryKey: ["my-completions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("homework_completions").select("homework_id").eq("student_id", user.id);
      if (error) throw error; return data ?? [];
    },
    enabled: !!user?.id,
  });

  const completedIds = new Set(completions.map(c => c.homework_id));

  const handleToggle = async (hwId: string) => {
    if (!user?.id || toggling) return;
    setToggling(hwId);
    if (completedIds.has(hwId)) {
      await supabase.from("homework_completions").delete().eq("homework_id", hwId).eq("student_id", user.id);
    } else {
      await supabase.from("homework_completions").insert({ homework_id: hwId, student_id: user.id });
    }
    setToggling(null);
  };

  const filtered = homeworks.filter(h => subjectFilter === "All" || h.subject === subjectFilter);
  const pending = filtered.filter(h => !completedIds.has(h.id));
  const done = filtered.filter(h => completedIds.has(h.id));

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2"><BookMarked className="w-5 h-5 text-primary" /> Homework</h2><p className="text-xs text-muted-foreground mt-0.5">{pending.length} pending · {done.length} completed</p></div>
      <div className="flex gap-1.5 flex-wrap">
        {["All","English","Urdu","Maths","Physics","Chemistry","Biology","Islamiyat","Computer Science","G.Science"].map(s => (
          <button key={s} onClick={() => setSubjectFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${subjectFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{s}</button>
        ))}
      </div>
      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 text-center shadow-card"><BookMarked className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No homework assigned</p></div>
      ) : (
        <>
          {pending.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
            {pending.map(hw => {
              const overdue = isPast(new Date(hw.due_date)) && !isToday(new Date(hw.due_date));
              const diff = differenceInDays(new Date(hw.due_date), new Date());
              return (
                <div key={hw.id} className={`bg-card rounded-xl border p-4 flex items-start gap-3 shadow-sm ${overdue ? "border-red-200 dark:border-red-800" : "border-border"}`}>
                  <button onClick={() => handleToggle(hw.id)} disabled={!!toggling} className="mt-0.5 shrink-0"><Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" /></button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{hw.title}</span>
                      {overdue ? <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />Overdue</span>
                        : isToday(new Date(hw.due_date)) ? <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Due Today</span>
                        : diff <= 2 ? <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{diff}d left</span>
                        : <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">{diff}d left</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded">{hw.subject}</span>
                      <span>Due: {format(new Date(hw.due_date), "dd MMM yyyy")}</span>
                      {hw.teacher_name && <span>by {hw.teacher_name}</span>}
                    </div>
                    {hw.description && (<button onClick={() => setExpandedId(expandedId === hw.id ? null : hw.id)} className="text-[11px] text-primary mt-1 flex items-center gap-0.5">{expandedId === hw.id ? <><ChevronUp className="w-3 h-3" />Hide</> : <><ChevronDown className="w-3 h-3" />Details</>}</button>)}
                    {expandedId === hw.id && hw.description && <p className="text-xs text-muted-foreground mt-2 bg-secondary/50 rounded-lg p-2.5 leading-relaxed">{hw.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>}
          {done.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed ✓</p>
            {done.map(hw => (
              <div key={hw.id} className="bg-card/60 rounded-xl border border-border/50 p-4 flex items-start gap-3 opacity-70">
                <button onClick={() => handleToggle(hw.id)} disabled={!!toggling} className="mt-0.5 shrink-0"><CheckCircle2 className="w-5 h-5 text-green-500" /></button>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground line-through">{hw.title}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">{hw.subject}</span><span className="text-[11px] text-muted-foreground">Due: {format(new Date(hw.due_date), "dd MMM")}</span></div></div>
              </div>
            ))}
          </div>}
        </>
      )}
    </div>
  );
}

// ─── Exam Schedule Tab ────────────────────────────────────────────────────────
function ExamScheduleTab() {
  const { profile } = useAuth();
  const [cls, setCls] = useState(profile?.class || "6");
  const [examType, setExamType] = useState(examTypes[profile?.class || "6"][0]);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: schedule = [], isLoading } = useQuery<ExamEntry[]>({
    queryKey: ["exam-schedule", cls, examType, year],
    queryFn: async () => {
      const { data, error } = await supabase.from("exam_schedule").select("*").eq("class", cls).eq("exam_type", examType).eq("year", year).eq("is_published", true).order("exam_date", { ascending: true });
      if (error) throw error; return data ?? [];
    },
    enabled: !!cls,
  });

  const subjectColor: Record<string, string> = { English:"bg-blue-100 text-blue-700", Urdu:"bg-amber-100 text-amber-700", Maths:"bg-purple-100 text-purple-700", Mathematics:"bg-purple-100 text-purple-700", Physics:"bg-cyan-100 text-cyan-700", Chemistry:"bg-green-100 text-green-700", Biology:"bg-emerald-100 text-emerald-700" };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Exam Date Sheet</h2><p className="text-xs text-muted-foreground">{year} examination schedule</p></div>
        {schedule.length > 0 && <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary px-3 py-1.5 rounded-lg"><Printer className="w-3.5 h-3.5" />Print</button>}
      </div>
      <div className="flex gap-2 flex-wrap">{["6","7","8","9","10"].map(c => <button key={c} onClick={() => { setCls(c); setExamType(examTypes[c][0]); }} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${cls === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Class {c}</button>)}</div>
      <div className="flex gap-2 flex-wrap items-center">
        {examTypes[cls].map(e => <button key={e} onClick={() => setExamType(e)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${examType === e ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>{e}</button>)}
        <div className="ml-auto flex items-center gap-1.5"><label className="text-xs text-muted-foreground">Year:</label><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-20 text-xs bg-secondary border-none rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" /></div>
      </div>
      {isLoading ? <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : schedule.length === 0 ? <div className="bg-card rounded-2xl p-10 text-center shadow-card"><Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No exam schedule published for this class yet.</p></div>
        : <div className="space-y-2">{schedule.map(entry => {
            const date = new Date(entry.exam_date);
            const past = isPast(date) && !isToday(date);
            const today = isToday(date);
            const diff = differenceInDays(date, new Date());
            return (
              <div key={entry.id} className={`bg-card rounded-xl border p-4 flex items-center gap-4 shadow-sm ${today ? "border-amber-400 bg-amber-50/50 dark:bg-amber-900/10" : past ? "opacity-60 border-border" : "border-border"}`}>
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${today ? "bg-amber-500 text-white" : past ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                  <span className="text-lg font-black leading-none">{format(date, "dd")}</span>
                  <span className="text-[10px] font-semibold uppercase">{format(date, "MMM")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${subjectColor[entry.subject] || "bg-secondary text-secondary-foreground"}`}>{entry.subject}</span>
                    {entry.paper_code && <span className="text-[10px] font-mono bg-secondary text-muted-foreground px-2 py-0.5 rounded">{entry.paper_code}</span>}
                    {today && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">TODAY</span>}
                    {!past && !today && diff <= 3 && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{diff}d left</span>}
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{entry.subject}{entry.paper_code ? ` — ${entry.paper_code}` : ""}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{format(date, "EEEE, dd MMMM yyyy")}</span>
                    {entry.start_time && <span>{entry.start_time}{entry.end_time ? ` – ${entry.end_time}` : ""}</span>}
                    {entry.hall && <span>Hall: {entry.hall}</span>}
                    {entry.notes && <span className="italic">{entry.notes}</span>}
                  </div>
                </div>
              </div>
            );
          })}</div>}
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { user, profile } = useAuth();
  const [cls, setCls] = useState(profile?.class || "6");
  const [examType, setExamType] = useState(examTypes[profile?.class || "6"][0]);
  const { data: years = [] } = useResultYears();
  const [year, setYear] = useState<number | undefined>(undefined);
  const { data: results = [], isLoading } = useResults({ classFilter: cls, examType, year });

  const myResult = useMemo(() => {
    if (!profile?.roll_number) return null;
    return results.find(r => r.students?.roll_number === profile.roll_number) ?? null;
  }, [results, profile]);

  // Attendance stats
  const currentMonth = new Date().getMonth() + 1;
  const currentYear2 = new Date().getFullYear();
  const { data: attData } = useQuery<{ status: string }[]>({
    queryKey: ["att-stat", user?.id, currentMonth, currentYear2],
    queryFn: async () => {
      if (!user?.id) return [];
      const start = `${currentYear2}-${String(currentMonth).padStart(2,"0")}-01`;
      const end = `${currentYear2}-${String(currentMonth).padStart(2,"0")}-31`;
      const { data, error } = await supabase.from("attendance").select("status").eq("student_id", user.id).gte("date", start).lte("date", end);
      if (error) throw error; return data ?? [];
    },
    enabled: !!user?.id,
  });

  const attStat = useMemo(() => {
    if (!attData?.length) return null;
    const present = attData.filter(r => r.status === "present").length;
    const absent = attData.filter(r => r.status === "absent").length;
    const late = attData.filter(r => r.status === "late").length;
    const total = attData.length;
    return { present, absent, late, total, pct: total > 0 ? Math.round(((present + late) / total) * 100) : 0 };
  }, [attData]);

  const subjectChartData = useMemo(() => {
    if (!myResult?.subject_marks) return [];
    return Object.entries(myResult.subject_marks as Record<string, { obtained: number; total: number }>).map(([sub, m], i) => ({
      subject: sub.length > 9 ? sub.slice(0, 7) + "…" : sub, fullSubject: sub,
      obtained: m.obtained, total: m.total, pct: m.total > 0 ? Math.round((m.obtained / m.total) * 100) : 0,
      fill: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    }));
  }, [myResult]);

  // Trend: load both exam types
  const etList = examTypes[cls] || [];
  const tYear = years[0] || currentYear2;
  const { data: r1 = [] } = useResults({ classFilter: cls, examType: etList[0] || "", year: tYear });
  const { data: r2 = [] } = useResults({ classFilter: cls, examType: etList[1] || etList[0] || "", year: tYear });
  const trendData = useMemo(() => {
    const rn = profile?.roll_number;
    if (!rn) return [];
    const res1 = r1.find(r => r.students?.roll_number === rn);
    const res2 = r2.find(r => r.students?.roll_number === rn);
    return [
      res1 ? { exam: etList[0], pct: res1.percentage, marks: `${res1.obtained_marks}/${res1.total_marks}` } : null,
      res2 && etList[1] ? { exam: etList[1], pct: res2.percentage, marks: `${res2.obtained_marks}/${res2.total_marks}` } : null,
    ].filter(Boolean) as { exam: string; pct: number; marks: string }[];
  }, [r1, r2, profile, etList]);

  const pct = attStat?.pct ?? 0;
  const ringColor = pct >= 75 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const radius = 36; const circ = 2 * Math.PI * radius;

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />My Analytics</h2><p className="text-xs text-muted-foreground">Attendance, results & performance</p></div>
      <div className="flex gap-2 flex-wrap">{["6","7","8","9","10"].map(c => <button key={c} onClick={() => { setCls(c); setExamType(examTypes[c][0]); }} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${cls === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Class {c}</button>)}</div>
      <div className="flex gap-2 flex-wrap items-center">
        {examTypes[cls].map(e => <button key={e} onClick={() => setExamType(e)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${examType === e ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>{e}</button>)}
        <select value={year ?? ""} onChange={e => setYear(e.target.value ? Number(e.target.value) : undefined)} className="text-xs bg-secondary rounded-lg px-2 py-1.5 border-none outline-none ml-auto">
          <option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Attendance ring */}
      {attStat && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-primary" />Attendance — {MONTHS[currentMonth - 1]}</h3>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="48" cy="48" r={radius} fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} style={{ transform:"rotate(-90deg)", transformOrigin:"48px 48px", transition:"stroke-dashoffset 0.6s ease" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-black" style={{ color: ringColor }}>{pct}%</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-2"><p className="text-lg font-bold text-green-600">{attStat.present}</p><p className="text-[10px] text-muted-foreground">Present</p></div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-2"><p className="text-lg font-bold text-red-500">{attStat.absent}</p><p className="text-[10px] text-muted-foreground">Absent</p></div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2"><p className="text-lg font-bold text-amber-500">{attStat.late}</p><p className="text-[10px] text-muted-foreground">Late</p></div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2"><p className="text-lg font-bold text-blue-500">{attStat.total}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
            </div>
          </div>
          <div className={`mt-3 text-xs font-semibold text-center py-1.5 rounded-lg ${pct >= 75 ? "bg-green-100 text-green-700" : pct >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {pct >= 75 ? "✓ Good attendance" : pct >= 60 ? "⚠ Below recommended (75%)" : "✗ Critical — please improve"}
          </div>
        </div>
      )}

      {/* Subject chart */}
      {isLoading ? <Skeleton className="h-48 rounded-xl" /> : subjectChartData.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-primary" />Subject Performance — {examType}</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={subjectChartData} margin={{ top:5, right:5, left:-20, bottom:40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="subject" tick={{ fontSize:10 }} angle={-35} textAnchor="end" interval={0} /><YAxis tick={{ fontSize:10 }} domain={[0,100]} />
            <Tooltip formatter={(v: any, _n, p) => [`${p.payload.obtained}/${p.payload.total} (${v}%)`, p.payload.fullSubject]} />
            <ReferenceLine y={33} stroke="#ef4444" strokeDasharray="4 2" label={{ value:"Pass", fontSize:9, fill:"#ef4444" }} />
            <Bar dataKey="pct" radius={[4,4,0,0]}>{subjectChartData.map((_, i) => <Cell key={i} fill={subjectChartData[i].fill} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </div>
      ) : myResult ? <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">Subject-wise marks not available for this exam.</div>
        : <div className="bg-card rounded-2xl border border-border p-8 text-center"><BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Your results for {examType} are not published yet.</p></div>}

      {/* Trend */}
      {trendData.length >= 2 && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-primary" />Performance Trend — {tYear}</h3>
          {(() => { const diff = trendData[1].pct - trendData[0].pct; return <p className={`text-xs mb-4 font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>{diff > 0 ? `↑ Improved ${diff.toFixed(1)}%` : diff < 0 ? `↓ Dropped ${Math.abs(diff).toFixed(1)}%` : "→ No change"}</p>; })()}
          <ResponsiveContainer width="100%" height={160}><LineChart data={trendData} margin={{ top:5, right:10, left:-20, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="exam" tick={{ fontSize:11 }} /><YAxis tick={{ fontSize:10 }} domain={[0,100]} />
            <Tooltip formatter={(v: any, _n, p) => [`${v}% (${p.payload.marks})`, "Score"]} />
            <ReferenceLine y={33} stroke="#ef4444" strokeDasharray="3 2" />
            <Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2.5} dot={{ fill:"#6366f1", r:5 }} />
          </LineChart></ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Honor Roll Tab ───────────────────────────────────────────────────────────
function HonorRollTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const { data: entries = [], isLoading } = useQuery<HonorEntry[]>({
    queryKey: ["honor-roll", year, month],
    queryFn: async () => {
      const { data, error } = await supabase.from("honor_roll").select("*").eq("is_published", true).eq("year", year).eq("month", month).order("class");
      if (error) throw error; return data ?? [];
    },
  });

  const byClass = entries.reduce((acc, e) => { if (!acc[e.class]) acc[e.class] = []; acc[e.class].push(e); return acc; }, {} as Record<string, HonorEntry[]>);

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Honor Roll</h2><p className="text-xs text-muted-foreground">Students of the Month</p></div>
      <div className="flex gap-1.5 flex-wrap">{MONTHS.map((m, i) => <button key={m} onClick={() => setMonth(i+1)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${month === i+1 ? "bg-amber-500 text-white" : "bg-secondary text-secondary-foreground"}`}>{m.slice(0,3)}</button>)}</div>
      <div className="flex gap-2 items-center"><label className="text-xs text-muted-foreground">Year:</label><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-20 text-xs bg-secondary border-none rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" /></div>
      {isLoading ? <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        : entries.length === 0 ? <div className="bg-card rounded-2xl p-10 text-center shadow-card"><Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No honor roll for {MONTHS[month-1]} {year} yet.</p></div>
        : <div className="space-y-6">{Object.entries(byClass).sort((a,b) => Number(a[0])-Number(b[0])).map(([cls, students]) => (
          <div key={cls}><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Class {cls}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{students.map(e => (
              <div key={e.id} className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
                {e.photo_url ? <img src={e.photo_url} alt={e.student_name} className="w-14 h-14 rounded-full object-cover mx-auto mb-2 border-2 border-amber-400" />
                  : <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-2">{e.student_name[0]}</div>}
                <p className="text-sm font-bold text-foreground">{e.student_name}</p>
                <p className="text-xs text-muted-foreground">Class {e.class}</p>
                {e.reason && <p className="text-[10px] text-muted-foreground mt-1.5 italic line-clamp-2">"{e.reason}"</p>}
                <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">🏅 {MONTHS[e.month-1]} {e.year}</span>
              </div>
            ))}</div>
          </div>
        ))}</div>}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const tabComponents: Record<string, React.ComponentType<any>> = {
  overview:        OverviewTab,
  timetable:       TimetableTab,
  results:         ResultsTab,
  "exam-rolls":    RollNumbersTab,
  "result-card":   ResultCardTab,
  notices:         NoticesTab,
  news:            NewsTab,
  notes:           NotesTab,
  library:         LibraryTab,
  gallery:         GalleryTab,
  videos:          VideosTab,
  achievements:    AchievementsTab,
  tests:           TestsTab,
  teachers:        TeachersTab,
  profile:         ProfileTab,  // New features — embedded inline, no separate files needed
  homework:        HomeworkTab,
  "exam-schedule": ExamScheduleTab,
  analytics:       AnalyticsTab,
  "honor-roll":    HonorRollTab,
};

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const TabComponent = tabComponents[activeTab] || OverviewTab;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <TabComponent onNavigate={setActiveTab} />
    </DashboardLayout>
  );
};

export default UserDashboard;
