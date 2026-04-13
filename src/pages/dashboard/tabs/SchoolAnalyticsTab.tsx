// SchoolAnalyticsTab.tsx
// Live school-wide analytics — all classes 6-10 performance graphs
// Used in both Admin Dashboard (all classes view) and User Dashboard (personal + class)

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { TrendingUp, Users, Award, BarChart3, BookOpen, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_CLASSES = ["6", "7", "8", "9", "10"];
const CLASS_COLORS: Record<string, string> = {
  "6":  "#6366f1",
  "7":  "#10b981",
  "8":  "#f59e0b",
  "9":  "#ef4444",
  "10": "#8b5cf6",
};
const examTypes: Record<string, string[]> = {
  "6":  ["1st Semester","2nd Semester"],
  "7":  ["1st Semester","2nd Semester"],
  "8":  ["1st Semester","2nd Semester"],
  "9":  ["Annual-I","Annual-II"],
  "10": ["Annual-I","Annual-II"],
};

const currentYear = new Date().getFullYear();

// ── Data hook: fetch aggregated results for all classes ───────────────────────
function useSchoolAnalytics(year: number) {
  return useQuery({
    queryKey: ["school-analytics", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("class, exam_type, year, percentage, is_pass, obtained_marks, total_marks, subject_marks, grade")
        .eq("year", year)
        .eq("is_published", true)
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ── Data hook: attendance per class ───────────────────────────────────────────
function useClassAttendance(year: number) {
  return useQuery({
    queryKey: ["class-attendance-analytics", year],
    queryFn: async () => {
      const month = new Date().getMonth() + 1;
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id, status, students(class)")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`)
        .limit(5000);
      if (error) return [];
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-black text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}{p.name.includes("%") || p.name.toLowerCase().includes("rate") || p.name.toLowerCase().includes("avg") ? "%" : ""}</strong></p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SchoolAnalyticsTab = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "teacher";
  const [year, setYear] = useState(currentYear);
  const [activeClass, setActiveClass] = useState<string | "all">("all");

  const { data: rawResults = [], isLoading: resultsLoading } = useSchoolAnalytics(year);
  const { data: attendanceRaw = [] } = useClassAttendance(year);

  // ── Aggregate per-class stats ───────────────────────────────────────────────
  const classStats = useMemo(() => {
    return ALL_CLASSES.map(cls => {
      const clsResults = rawResults.filter(r => r.class === cls);
      if (!clsResults.length) return { class: cls, students: 0, avg: 0, passRate: 0, highest: 0, lowest: 0 };
      const avg = clsResults.reduce((s, r) => s + (r.percentage ?? 0), 0) / clsResults.length;
      const passed = clsResults.filter(r => r.is_pass).length;
      const percentages = clsResults.map(r => r.percentage ?? 0);
      return {
        class: `Class ${cls}`,
        classNum: cls,
        students: clsResults.length,
        avg: Math.round(avg * 10) / 10,
        passRate: Math.round((passed / clsResults.length) * 100),
        highest: Math.max(...percentages),
        lowest: Math.min(...percentages),
        passed,
        failed: clsResults.length - passed,
      };
    }).filter(c => c.students > 0);
  }, [rawResults]);

  // ── Grade distribution per class ───────────────────────────────────────────
  const gradeData = useMemo(() => {
    const grades = ["A+", "A", "B", "C", "D", "Fail"];
    return grades.map(grade => {
      const entry: Record<string, any> = { grade };
      ALL_CLASSES.forEach(cls => {
        const clsResults = rawResults.filter(r => r.class === cls);
        entry[`Class ${cls}`] = clsResults.filter(r => (r.grade || "Fail") === grade).length;
      });
      return entry;
    });
  }, [rawResults]);

  // ── Exam type comparison (1st vs 2nd semester / Annual I vs II) ────────────
  const examComparison = useMemo(() => {
    const byExam: Record<string, Record<string, number[]>> = {};
    rawResults.forEach(r => {
      if (!byExam[r.exam_type]) byExam[r.exam_type] = {};
      if (!byExam[r.exam_type][r.class]) byExam[r.exam_type][r.class] = [];
      byExam[r.exam_type][r.class].push(r.percentage ?? 0);
    });
    return Object.entries(byExam).map(([examType, byClass]) => {
      const entry: Record<string, any> = { exam: examType.replace(" Semester", " Sem").replace("Annual-", "Ann-") };
      Object.entries(byClass).forEach(([cls, pcts]) => {
        entry[`Class ${cls}`] = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length * 10) / 10;
      });
      return entry;
    });
  }, [rawResults]);

  // ── Subject performance (from subject_marks jsonb) ──────────────────────────
  const subjectData = useMemo(() => {
    const cls = activeClass === "all" ? null : activeClass;
    const filtered = cls ? rawResults.filter(r => r.class === cls) : rawResults;
    const subjectTotals: Record<string, { total: number; count: number }> = {};
    filtered.forEach(r => {
      if (!r.subject_marks) return;
      Object.entries(r.subject_marks as Record<string, { obtained: number; total: number }>).forEach(([sub, m]) => {
        if (m.total === 0 && m.obtained === 0) return;
        if (!subjectTotals[sub]) subjectTotals[sub] = { total: 0, count: 0 };
        subjectTotals[sub].total += m.total > 0 ? (m.obtained / m.total) * 100 : 0;
        subjectTotals[sub].count += 1;
      });
    });
    return Object.entries(subjectTotals)
      .map(([subject, { total, count }]) => ({
        subject: subject.length > 12 ? subject.slice(0, 11) + "…" : subject,
        avgPct: Math.round(total / count * 10) / 10,
        count,
      }))
      .sort((a, b) => b.avgPct - a.avgPct)
      .slice(0, 10);
  }, [rawResults, activeClass]);

  // ── Attendance by class ─────────────────────────────────────────────────────
  const attendanceByClass = useMemo(() => {
    return ALL_CLASSES.map(cls => {
      const clsAtt = attendanceRaw.filter((a: any) => a.students?.class === cls);
      if (!clsAtt.length) return null;
      const present = clsAtt.filter((a: any) => a.status === "present").length;
      return {
        class: `Class ${cls}`,
        classNum: cls,
        attendancePct: Math.round((present / clsAtt.length) * 100),
        total: clsAtt.length,
      };
    }).filter(Boolean);
  }, [attendanceRaw]);

  // ── Overall stats ───────────────────────────────────────────────────────────
  const overall = useMemo(() => {
    if (!rawResults.length) return null;
    const totalStudents = new Set(rawResults.map((r: any) => r.student_id)).size;
    const avg = rawResults.reduce((s, r) => s + (r.percentage ?? 0), 0) / rawResults.length;
    const passed = rawResults.filter(r => r.is_pass).length;
    return {
      totalStudents,
      avgScore: Math.round(avg * 10) / 10,
      passRate: Math.round((passed / rawResults.length) * 100),
      totalResults: rawResults.length,
    };
  }, [rawResults]);

  const loading = resultsLoading;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> School Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live performance data — all classes</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Year:</label>
          <input
            type="number"
            value={year}
            onChange={e => { const v = parseInt(e.target.value, 10); if (v >= 2000 && v <= 2099) setYear(v); }}
            min={2000}
            max={2099}
            className="text-sm bg-secondary border border-border rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary w-24 font-mono"
            placeholder="Year"
          />
        </div>
      </div>

      {/* Overall stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : overall ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Results" value={overall.totalResults} icon={BarChart3} color="#6366f1" />
          <StatCard label="School Avg %" value={`${overall.avgScore}%`} icon={TrendingUp} color="#10b981" />
          <StatCard label="Pass Rate" value={`${overall.passRate}%`} icon={CheckCircle} color="#f59e0b" />
          <StatCard label="Classes" value={classStats.length} icon={BookOpen} color="#8b5cf6" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No published results for {year}</p>
          <p className="text-xs text-muted-foreground mt-1">Publish results from Manage Results to see analytics</p>
        </div>
      )}

      {overall && (
        <>
          {/* ── CHART 1: Class Average % comparison ── */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Average Score by Class
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={classStats} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="class" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg" name="Avg %" radius={[6, 6, 0, 0]}>
                  {classStats.map((entry, i) => (
                    <Cell key={i} fill={CLASS_COLORS[entry.classNum] || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── CHART 2: Pass Rate per class ── */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Pass Rate by Class (%)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classStats} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="class" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="passRate" name="Pass Rate" radius={[6, 6, 0, 0]}>
                  {classStats.map((entry, i) => (
                    <Cell key={i} fill={entry.passRate >= 80 ? "#10b981" : entry.passRate >= 60 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── CHART 3: Highest vs Lowest per class ── */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Score Range — Highest vs Lowest vs Average
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={classStats} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="class" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="highest" name="Highest %" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avg" name="Average %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lowest" name="Lowest %" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── CHART 4: Exam type performance (semester comparison) ── */}
          {examComparison.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-500" /> Exam-wise Average — All Classes
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={examComparison} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="exam" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {ALL_CLASSES.filter(cls => classStats.some(c => c.classNum === cls)).map(cls => (
                    <Bar key={cls} dataKey={`Class ${cls}`} fill={CLASS_COLORS[cls]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── CHART 5: Students passed vs failed ── */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Students Passed vs Failed
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classStats} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="class" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="passed" name="Passed" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── CHART 6: Subject-wise performance ── */}
          {subjectData.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> Subject-wise Average Score
                </h3>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setActiveClass("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${activeClass === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    All
                  </button>
                  {ALL_CLASSES.filter(cls => classStats.some(c => c.classNum === cls)).map(cls => (
                    <button key={cls} onClick={() => setActiveClass(cls)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors`}
                      style={activeClass === cls ? { backgroundColor: CLASS_COLORS[cls], color: "#fff" } : { backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>
                      Class {cls}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={subjectData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="subject" type="category" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgPct" name="Avg %" radius={[0, 6, 6, 0]}>
                    {subjectData.map((_, i) => (
                      <Cell key={i} fill={["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4","#84cc16","#ec4899"][i % 10]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
  {/* ── Attendance (if data available) ── */}
          {attendanceByClass.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Attendance Rate by Class (This Year)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attendanceByClass} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="class" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="attendancePct" name="Attendance %" radius={[6, 6, 0, 0]}>
                    {attendanceByClass.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.attendancePct >= 75 ? "#10b981" : entry.attendancePct >= 60 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Per-class detail table ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-[#042C53] text-white px-5 py-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">Class Performance Summary — {year}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-3 text-left font-semibold text-xs">Class</th>
                    <th className="p-3 text-center font-semibold text-xs">Students</th>
                    <th className="p-3 text-center font-semibold text-xs">Avg %</th>
                    <th className="p-3 text-center font-semibold text-xs">Pass Rate</th>
                    <th className="p-3 text-center font-semibold text-xs">Highest</th>
                    <th className="p-3 text-center font-semibold text-xs">Lowest</th>
                  </tr>
                </thead>
                <tbody>
                  {classStats.map((c, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CLASS_COLORS[c.classNum] }} />
                          <span className="font-semibold text-foreground">{c.class}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-foreground font-medium">{c.students}</td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${c.avg >= 70 ? "text-green-600" : c.avg >= 50 ? "text-amber-600" : "text-red-500"}`}>
                          {c.avg}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.passRate >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          c.passRate >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>{c.passRate}%</span>
                      </td>
                      <td className="p-3 text-center text-green-600 font-semibold">{c.highest.toFixed(1)}%</td>
                      <td className="p-3 text-center text-red-500 font-semibold">{c.lowest.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SchoolAnalyticsTab;
