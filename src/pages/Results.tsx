
// ── Hook: fetch upcoming scheduled result publish times ────────────────────────
function useScheduledPublishes() {
  return useQuery({
    queryKey: ["scheduled-result-publishes"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("results")
        .select("class, exam_type, year, publish_at")
        .eq("is_published", false)
        .not("publish_at", "is", null)
        .gt("publish_at", now)
        .order("publish_at", { ascending: true });

      // Deduplicate by class+exam+year — one entry per group
      const seen = new Set<string>();
      const groups: { class: string; exam_type: string; year: number; publish_at: string }[] = [];
      for (const r of (data ?? [])) {
        const key = `${r.class}-${r.exam_type}-${r.year}`;
        if (!seen.has(key)) { seen.add(key); groups.push(r as any); }
      }
      return groups;
    },
    refetchInterval: 30000, // refetch every 30s
    staleTime: 0,
  });
}

// ── Countdown timer for a single scheduled publish ─────────────────────────────
function CountdownCard({ item }: { item: { class: string; exam_type: string; year: number; publish_at: string } }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(item.publish_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Publishing now..."); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [item.publish_at]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/40 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
          <Timer className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
            Class {item.class} — {item.exam_type} {item.year}
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400">Results coming soon</p>
        </div>
      </div>
      <div className="sm:ml-auto bg-amber-100 dark:bg-amber-900/40 rounded-xl px-4 py-2 text-center min-w-[120px]">
        <p className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono tracking-wide">{timeLeft}</p>
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Publishes in</p>
      </div>
    </div>
  );
}

// ── Banner shown above results when some are pending publish ──────────────────
function ScheduledResultsBanner() {
  const { data: scheduled = [] } = useScheduledPublishes();
  if (!scheduled.length) return null;
  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-bold text-foreground">
          Upcoming Result Publications
        </p>
      </div>
      {scheduled.map((item, i) => (
        <CountdownCard key={i} item={item} />
      ))}
    </div>
  );
}

import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, GraduationCap, Trophy, Medal, Users, TrendingUp, Award, XCircle, Timer, Clock } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";
import { useResults, useResultYears, getGradeFromPercentage, getGradeColor } from "@/hooks/useResults";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const classes = ["6", "7", "8", "9", "10"];
const examTypes: Record<string, string[]> = {
  "6": ["1st Semester", "2nd Semester"],
  "7": ["1st Semester", "2nd Semester"],
  "8": ["1st Semester", "2nd Semester"],
  "9": ["Annual-I", "Annual-II"],
  "10": ["Annual-I", "Annual-II"],
};

const positionStyles = [
  { border: "border-[hsl(45,93%,47%)]", bg: "bg-[hsl(45,93%,47%)]/10", badge: "bg-[hsl(45,93%,47%)]", label: "🥇 1st Position" },
  { border: "border-[hsl(0,0%,75%)]", bg: "bg-[hsl(0,0%,75%)]/10", badge: "bg-[hsl(0,0%,75%)]", label: "🥈 2nd Position" },
  { border: "border-[hsl(30,60%,50%)]", bg: "bg-[hsl(30,60%,50%)]/10", badge: "bg-[hsl(30,60%,50%)]", label: "🥉 3rd Position" },
];

const Results = () => {
  const [selectedClass, setSelectedClass] = useState("6");
  const [selectedExam, setSelectedExam] = useState("1st Semester");
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const { data: years = [] } = useResultYears();
  const { data: results = [], isLoading } = useResults({
    classFilter: selectedClass,
    examType: selectedExam,
    year: selectedYear,
    search: debouncedSearch,
  });

  const handleClassChange = (cls: string) => {
    setSelectedClass(cls);
    setSelectedExam(examTypes[cls][0]);
  };

  // Stats
  const stats = useMemo(() => {
    if (!results.length) return null;
    const total = results.length;
    const passed = results.filter((r) => r.is_pass).length;
    const failed = total - passed;
    const avgPct = results.reduce((sum, r) => sum + (r.percentage || 0), 0) / total;
    const highest = Math.max(...results.map((r) => r.obtained_marks));
    return { total, passed, failed, avgPct, highest, passPct: (passed / total) * 100 };
  }, [results]);

  // Top 3 & rest
  const top3 = results.filter((r) => r.position && r.position <= 3).sort((a, b) => (a.position || 99) - (b.position || 99));
  const tableResults = results.filter((r) => !r.position || r.position > 3);

  return (
    <PageLayout>
      <PageBanner title="Exam Results" subtitle="Check your examination results" />

      {/* Scheduled results countdown — shows when results are pending */}
      <div className="container mx-auto px-4 mt-6">
        <ScheduledResultsBanner />
      </div>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {/* Class Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {classes.map((cls) => (
              <button
                key={cls}
                onClick={() => handleClassChange(cls)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedClass === cls
                    ? "gradient-hero text-primary-foreground shadow-card"
                    : "bg-card text-muted-foreground hover:bg-secondary shadow-card"
                }`}
              >
                Class {cls}
              </button>
            ))}
          </div>

          {/* Sub-tabs: exam type */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {examTypes[selectedClass].map((exam) => (
              <button
                key={exam}
                onClick={() => setSelectedExam(exam)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedExam === exam
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {exam}
                {(selectedClass === "9" || selectedClass === "10") && (
                  <span className="text-xs opacity-75 ml-1">(BISE Peshawar)</span>
                )}
              </button>
            ))}

            {/* Year filter */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Year:</span>
              <input
                type="number"
                value={selectedYear || ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : undefined;
                  if (val === undefined || (!isNaN(val) && val >= 1900 && val <= 2200)) setSelectedYear(val);
                }}
                className="w-28 rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-card focus:ring-2 focus:ring-ring outline-none"
                min="1900"
                max="2200"
                placeholder="All Years"
              />
            </div>
          </div>

          {/* Search */}
          <div className="max-w-sm mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name or roll number..."
                className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm shadow-card focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-2xl mt-6" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl shadow-card">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No results found.</p>
              <p className="text-sm text-muted-foreground mt-1">Try selecting a different class, exam type, or year.</p>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                  {[
                    { icon: Users, label: "Total Students", value: stats.total },
                    { icon: Award, label: "Passed", value: `${stats.passed} (${stats.passPct.toFixed(0)}%)` },
                    { icon: XCircle, label: "Failed", value: stats.failed },
                    { icon: TrendingUp, label: "Class Average", value: `${stats.avgPct.toFixed(1)}%` },
                    { icon: Trophy, label: "Highest Marks", value: stats.highest },
                  ].map((s) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-card rounded-xl p-4 shadow-card text-center"
                    >
                      <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                      <div className="text-lg font-heading font-bold text-foreground">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Top 3 */}
              {top3.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {top3.map((r, i) => {
                    const style = positionStyles[i] || positionStyles[2];
                    const grade = r.grade || getGradeFromPercentage(r.percentage || 0);
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`bg-card rounded-2xl p-6 shadow-card border-2 ${style.border} ${style.bg} text-center`}
                      >
                        <div className={`inline-flex items-center gap-1 ${style.badge} text-white text-xs font-bold px-3 py-1 rounded-full mb-3`}>
                          {style.label}
                        </div>
                        {r.students?.photo_url ? (
                          <img
                            src={r.students.photo_url}
                            alt={r.students.full_name}
                            className="w-16 h-16 rounded-full mx-auto mb-3 object-cover ring-4 ring-card"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full mx-auto mb-3 gradient-hero flex items-center justify-center text-primary-foreground font-heading font-bold text-lg">
                            {r.students?.full_name?.charAt(0) || "?"}
                          </div>
                        )}
                        <h3 className="font-heading font-bold text-foreground">{r.students?.full_name || "Unknown"}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Roll # {r.students?.roll_number}</p>
                        <div className="mt-3 text-2xl font-heading font-extrabold text-primary">
                          {r.obtained_marks}/{r.total_marks}
                        </div>
                        <p className="text-sm text-muted-foreground">{(r.percentage || 0).toFixed(1)}%</p>
                        <span className={`inline-block mt-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${getGradeColor(grade)}`}>
                          {grade}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Results Table */}
              {(tableResults.length > 0 || top3.length === 0) && (
                <div className="bg-card rounded-2xl shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="gradient-hero text-primary-foreground">
                          <th className="px-4 py-3 text-left font-medium">Rank</th>
                          <th className="px-4 py-3 text-left font-medium">Photo</th>
                          <th className="px-4 py-3 text-left font-medium">Name</th>
                          <th className="px-4 py-3 text-left font-medium">Roll #</th>
                          <th className="px-4 py-3 text-left font-medium">Marks</th>
                          <th className="px-4 py-3 text-left font-medium">%</th>
                          <th className="px-4 py-3 text-left font-medium">Grade</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(top3.length === 0 ? results : tableResults).map((r, i) => {
                          const grade = r.grade || getGradeFromPercentage(r.percentage || 0);
                          return (
                            <tr
                              key={r.id}
                              className={`border-t border-border hover:bg-secondary/50 transition-colors ${
                                i % 2 === 1 ? "bg-secondary/20" : ""
                              }`}
                            >
                              <td className="px-4 py-3 font-medium text-foreground">{r.position || i + (top3.length > 0 ? 4 : 1)}</td>
                              <td className="px-4 py-3">
                                {r.students?.photo_url ? (
                                  <img src={r.students.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-primary-foreground text-xs font-bold">
                                    {r.students?.full_name?.charAt(0) || "?"}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground">{r.students?.full_name || "Unknown"}</td>
                              <td className="px-4 py-3 text-muted-foreground">{r.students?.roll_number}</td>
                              <td className="px-4 py-3 text-muted-foreground">{r.obtained_marks}/{r.total_marks}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{(r.percentage || 0).toFixed(1)}%</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${getGradeColor(grade)}`}>
                                  {grade}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {r.is_pass ? (
                                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]">
                                    Pass
                                  </span>
                                ) : (
                                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
                                    Fail
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Results;
                
