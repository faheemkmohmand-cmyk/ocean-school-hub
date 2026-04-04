import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, FileText, Trophy, CheckCircle, XCircle, Loader2 } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";
import { supabase } from "@/lib/supabase";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectMark { obtained: number; total: number; }

interface ResultRecord {
  id: string;
  class: string;
  exam_type: string;
  year: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string | null;
  is_pass: boolean;
  remarks: string | null;
  exam_roll_no: string | null;
  position: number | null;
  subject_marks: Record<string, SubjectMark> | null;
  students: {
    full_name: string;
    roll_number: string;
    father_name: string | null;
    photo_url: string | null;
  } | null;
}

// ─── Grade color helper ───────────────────────────────────────────────────────
const gradeColor = (grade: string | null) => {
  switch (grade) {
    case "A+": return "#0369A1";
    case "A":  return "#0EA5E9";
    case "B":  return "#0D9488";
    case "C":  return "#D97706";
    case "D":  return "#EA580C";
    default:   return "#DC2626";
  }
};

// ─── Download Result Card as HTML ─────────────────────────────────────────────
const downloadResultCard = (r: ResultRecord, schoolName: string) => {
  const passColor = r.is_pass ? "#16A34A" : "#DC2626";
  const passText  = r.is_pass ? "PASS" : "FAIL";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Result Card — ${r.students?.full_name || "Student"}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; background:#F0F9FF; display:flex; justify-content:center; align-items:flex-start; min-height:100vh; padding:30px 20px; }
  .card { background:white; border-radius:20px; max-width:480px; width:100%; box-shadow:0 10px 40px rgba(14,165,233,0.15); overflow:hidden; }

  /* Header */
  .header { background:linear-gradient(135deg,#0369A1,#0EA5E9,#38BDF8); padding:28px 32px 24px; text-align:center; color:white; }
  .header h1 { font-size:20px; font-weight:800; letter-spacing:0.3px; }
  .header h2 { font-size:13px; font-weight:400; opacity:0.85; margin-top:3px; }
  .header .badge { display:inline-block; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:20px; padding:4px 14px; font-size:12px; margin-top:10px; }

  /* Student info */
  .student { display:flex; align-items:center; gap:16px; padding:20px 28px; border-bottom:1px solid #E0F2FE; }
  .avatar { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#0EA5E9,#38BDF8); display:flex; align-items:center; justify-content:center; color:white; font-size:26px; font-weight:800; flex-shrink:0; overflow:hidden; }
  .avatar img { width:100%; height:100%; object-fit:cover; }
  .student-name { font-size:18px; font-weight:700; color:#0F172A; }
  .student-meta { font-size:12px; color:#64748B; margin-top:3px; }

  /* Exam Roll Number highlight */
  .roll-highlight { background:#0EA5E9; color:white; padding:12px 28px; display:flex; justify-content:space-between; align-items:center; }
  .roll-highlight p { font-size:11px; opacity:0.85; }
  .roll-highlight h3 { font-size:24px; font-weight:800; letter-spacing:3px; }

  /* Result grid */
  .result-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; }
  .result-box { padding:16px 20px; border-right:1px solid #F0F9FF; border-bottom:1px solid #F0F9FF; }
  .result-box:nth-child(even) { border-right:none; }
  .result-label { font-size:11px; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; }
  .result-value { font-size:22px; font-weight:800; color:#0F172A; margin-top:2px; }

  /* Grade + Status */
  .grade-status { display:grid; grid-template-columns:1fr 1fr; }
  .grade-box { padding:20px; text-align:center; background:#F0F9FF; }
  .grade-box .label { font-size:11px; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; }
  .grade-box .value { font-size:36px; font-weight:900; margin-top:4px; }
  .status-box { padding:20px; text-align:center; }
  .status-box .label { font-size:11px; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; }
  .status-box .value { font-size:28px; font-weight:900; margin-top:4px; letter-spacing:1px; }

  /* Remarks */
  .remarks { padding:14px 28px; background:#FFFBEB; border-top:1px solid #FEF08A; font-size:13px; color:#78350F; }

  /* Footer */
  .footer { padding:14px 28px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center; }
  .footer .school { font-size:11px; color:#64748B; }
  .footer .verified { font-size:11px; color:#0EA5E9; font-weight:600; }

  /* Position badge */
  .position { position:relative; }
  .pos-badge { display:inline-flex; align-items:center; gap:4px; background:#FFFBEB; border:1px solid #FEF08A; border-radius:20px; padding:3px 10px; font-size:11px; color:#92400E; font-weight:600; margin-top:6px; }

  @media print {
    body { background:white; padding:0; }
    .card { box-shadow:none; border-radius:0; max-width:100%; }
  }
</style>
</head>
<body>
  <div class="card">

    <!-- Header -->
    <div class="header">
      <h1>${schoolName}</h1>
      <h2>Official Result Card</h2>
      <div class="badge">${r.exam_type} — ${r.year} &nbsp;|&nbsp; Class ${r.class}</div>
    </div>

    <!-- Exam Roll Number -->
    ${r.exam_roll_no ? `
    <div class="roll-highlight">
      <div>
        <p>EXAM ROLL NUMBER</p>
        <h3>${r.exam_roll_no}</h3>
      </div>
      <div style="text-align:right">
        <p>CLASS</p>
        <h3>${r.class}</h3>
      </div>
    </div>` : ""}

    <!-- Student Info -->
    <div class="student">
      <div class="avatar">
        ${r.students?.photo_url
          ? `<img src="${r.students.photo_url}" alt=""/>`
          : (r.students?.full_name || "S").charAt(0).toUpperCase()
        }
      </div>
      <div>
        <div class="student-name position">
          ${r.students?.full_name || "—"}
          ${r.position && r.position <= 3
            ? `<div class="pos-badge">${r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : "🥉"} Position ${r.position}</div>`
            : ""}
        </div>
        <div class="student-meta">
          Father: ${r.students?.father_name || "—"} &nbsp;|&nbsp;
          Roll No: ${r.students?.roll_number || "—"}
        </div>
      </div>
    </div>

    <!-- Result Grid -->
    <div class="result-grid">
      <div class="result-box">
        <div class="result-label">Total Marks</div>
        <div class="result-value">${r.total_marks}</div>
      </div>
      <div class="result-box">
        <div class="result-label">Obtained Marks</div>
        <div class="result-value">${r.obtained_marks}</div>
      </div>
      <div class="result-box">
        <div class="result-label">Percentage</div>
        <div class="result-value" style="color:#0EA5E9">${r.percentage}%</div>
      </div>
      <div class="result-box">
        <div class="result-label">Class Position</div>
        <div class="result-value">${r.position ? `#${r.position}` : "—"}</div>
      </div>
    </div>

    <!-- Subject-wise Marks Table -->
    \${r.subject_marks && Object.keys(r.subject_marks).length > 0 ? `
    <div style="padding:0 28px 16px;">
      <h4 style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 8px;">Subject-wise Marks</h4>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#F0F9FF;">
            <th style="padding:8px 10px;text-align:left;font-weight:700;color:#0369A1;border:1px solid #E0F2FE;">Subject</th>
            <th style="padding:8px 10px;text-align:center;font-weight:700;color:#0369A1;border:1px solid #E0F2FE;">Obtained</th>
            <th style="padding:8px 10px;text-align:center;font-weight:700;color:#0369A1;border:1px solid #E0F2FE;">Total</th>
            <th style="padding:8px 10px;text-align:center;font-weight:700;color:#0369A1;border:1px solid #E0F2FE;">%</th>
          </tr>
        </thead>
        <tbody>
          \${Object.entries(r.subject_marks).map(([sub, marks], i) => {
            const pct = marks.total > 0 ? Math.round((marks.obtained / marks.total) * 100) : 0;
            const bg = i % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
            const color = pct >= 33 ? "#16A34A" : "#DC2626";
            return `<tr style="background:\${bg};">
              <td style="padding:7px 10px;border:1px solid #E2E8F0;font-weight:600;color:#0F172A;">\${sub}</td>
              <td style="padding:7px 10px;border:1px solid #E2E8F0;text-align:center;font-weight:700;color:\${color};">\${marks.obtained}</td>
              <td style="padding:7px 10px;border:1px solid #E2E8F0;text-align:center;color:#64748B;">\${marks.total}</td>
              <td style="padding:7px 10px;border:1px solid #E2E8F0;text-align:center;font-weight:600;color:\${color};">\${pct}%</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    ` : ""}

    <!-- Grade + Status -->
    <div class="grade-status">
      <div class="grade-box">
        <div class="label">Grade</div>
        <div class="value" style="color:${gradeColor(r.grade)}">${r.grade || "—"}</div>
      </div>
      <div class="status-box" style="background:${r.is_pass ? "#F0FDF4" : "#FEF2F2"}">
        <div class="label">Result</div>
        <div class="value" style="color:${passColor}">${passText}</div>
      </div>
    </div>

    <!-- Remarks -->
    ${r.remarks ? `<div class="remarks">📝 ${r.remarks}</div>` : ""}

    <!-- Footer -->
    <div class="footer">
      <div class="school">${schoolName} &nbsp;|&nbsp; ghs-babi-khel.vercel.app</div>
      <div class="verified">✓ Official Result</div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `result-card-${r.exam_roll_no || r.students?.roll_number || "student"}-${r.year}.html`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Result card downloaded! Open the file and press Ctrl+P to print.");
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ResultCard = () => {
  const { data: settings } = useSchoolSettings();
  const schoolName = settings?.school_name || "GHS Babi Khel";

  const [searchName, setSearchName] = useState("");
  const [searchRoll, setSearchRoll] = useState("");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [foundResults, setFoundResults] = useState<ResultRecord[]>([]);

  const handleSearch = async () => {
    if (!searchName.trim() && !searchRoll.trim()) {
      toast.error("Enter your name or exam roll number to search");
      return;
    }
    setSearching(true);
    setSearched(false);

    try {
      let query = supabase
        .from("results")
        .select("id, class, exam_type, year, total_marks, obtained_marks, percentage, grade, is_pass, remarks, exam_roll_no, position, subject_marks, students(full_name, roll_number, father_name, photo_url)")
        .order("year", { ascending: false });

      // Search by exam roll number (most specific)
      if (searchRoll.trim()) {
        query = query.eq("exam_roll_no", searchRoll.trim());
      } else if (searchName.trim()) {
        // Search by student name via join
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .ilike("full_name", `%${searchName.trim()}%`);

        if (!studentData || studentData.length === 0) {
          setFoundResults([]);
          setSearched(true);
          setSearching(false);
          return;
        }
        const ids = studentData.map(s => s.id);
        query = query.in("student_id", ids);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;
      setFoundResults((data ?? []) as unknown as ResultRecord[]);
    } catch (err: any) {
      toast.error("Search failed. Please try again.");
      console.error(err);
    }

    setSearched(true);
    setSearching(false);
  };

  return (
    <PageLayout>
      <PageBanner
        title="Result Card"
        subtitle="Search your result by name or exam roll number and download your official result card"
      />

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-2xl">

          {/* Search Box */}
          <div className="bg-card rounded-2xl shadow-elevated p-6 mb-8 border border-border">
            <h3 className="font-heading font-bold text-foreground text-lg mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Search Your Result
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Student Name
                </label>
                <input
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Enter your full name..."
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-ring outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Exam Roll Number
                </label>
                <input
                  value={searchRoll}
                  onChange={e => setSearchRoll(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Enter your exam roll number (e.g. 100001)..."
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-ring outline-none"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={searching}
                className="w-full gradient-accent text-primary-foreground font-semibold py-3 rounded-xl shadow-card hover:shadow-elevated transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {searching
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                  : <><Search className="w-4 h-4" /> Search Result</>
                }
              </button>
            </div>
          </div>

          {/* Results */}
          <AnimatePresence>
            {searched && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {foundResults.length === 0 ? (
                  <div className="bg-card rounded-2xl p-10 text-center shadow-card">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="font-heading font-semibold text-foreground">No Result Found</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                      No result found for your search. Check your name or exam roll number and try again.
                      Results must be published by admin to appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Found {foundResults.length} result{foundResults.length > 1 ? "s" : ""}
                    </p>
                    {foundResults.map(r => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card rounded-2xl shadow-elevated overflow-hidden border border-border"
                      >
                        {/* Card header */}
                        <div className="gradient-hero px-6 py-4 text-primary-foreground">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-80">{r.exam_type} — {r.year}</p>
                              <h3 className="font-heading font-bold text-lg">{r.students?.full_name}</h3>
                              <p className="text-sm opacity-80">Class {r.class}</p>
                            </div>
                            {r.exam_roll_no && (
                              <div className="text-right">
                                <p className="text-xs opacity-70">Exam Roll No</p>
                                <p className="font-mono font-bold text-2xl tracking-wider">{r.exam_roll_no}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Result details */}
                        <div className="p-6 space-y-4">
                          {/* Marks row */}
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { label: "Total Marks", value: r.total_marks },
                              { label: "Obtained", value: r.obtained_marks },
                              { label: "Percentage", value: `${r.percentage}%` },
                            ].map(item => (
                              <div key={item.label} className="bg-secondary/50 rounded-xl p-3 text-center">
                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                <p className="text-xl font-bold text-foreground mt-0.5">{item.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Subject-wise Marks Table */}
                          {r.subject_marks && Object.keys(r.subject_marks).length > 0 && (
                            <div className="border border-border rounded-xl overflow-hidden">
                              <div className="bg-primary/10 px-4 py-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-primary">Subject-wise Marks</span>
                              </div>
                              <div className="divide-y divide-border">
                                <div className="grid grid-cols-4 gap-0 bg-secondary/80 px-4 py-1.5">
                                  <span className="text-xs font-bold text-muted-foreground col-span-2">Subject</span>
                                  <span className="text-xs font-bold text-muted-foreground text-center">Obtained</span>
                                  <span className="text-xs font-bold text-muted-foreground text-center">Total</span>
                                </div>
                                {Object.entries(r.subject_marks).map(([subject, marks]) => {
                                  const pct = marks.total > 0 ? Math.round((marks.obtained / marks.total) * 100) : 0;
                                  const pass = pct >= 33;
                                  return (
                                    <div key={subject} className="grid grid-cols-4 gap-0 px-4 py-2 items-center">
                                      <span className="text-sm font-medium text-foreground col-span-2 truncate">{subject}</span>
                                      <span className={`text-sm font-bold text-center ${pass ? "text-green-600" : "text-red-500"}`}>{marks.obtained}</span>
                                      <span className="text-sm text-muted-foreground text-center">{marks.total}</span>
                                    </div>
                                  );
                                })}
                                <div className="grid grid-cols-4 gap-0 px-4 py-2 bg-secondary/50 font-bold">
                                  <span className="text-sm text-foreground col-span-2">Total</span>
                                  <span className="text-sm text-primary text-center">{r.obtained_marks}</span>
                                  <span className="text-sm text-muted-foreground text-center">{r.total_marks}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Grade + Pass/Fail */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-secondary/50 rounded-xl p-4 text-center">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Grade</p>
                              <p className="text-4xl font-black mt-1" style={{ color: gradeColor(r.grade) }}>
                                {r.grade || "—"}
                              </p>
                            </div>
                            <div
                              className="rounded-xl p-4 text-center"
                              style={{ background: r.is_pass ? "#F0FDF4" : "#FEF2F2" }}
                            >
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Result</p>
                              <div className="flex items-center justify-center gap-2 mt-2">
                                {r.is_pass
                                  ? <CheckCircle className="w-8 h-8 text-green-600" />
                                  : <XCircle className="w-8 h-8 text-red-600" />
                                }
                              </div>
                              <p
                                className="text-xl font-bold mt-1"
                                style={{ color: r.is_pass ? "#16A34A" : "#DC2626" }}
                              >
                                {r.is_pass ? "PASS" : "FAIL"}
                              </p>
                            </div>
                          </div>

                          {/* Position */}
                          {r.position && r.position <= 10 && (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                              <Trophy className="w-5 h-5 text-amber-600" />
                              <p className="text-sm font-semibold text-amber-800">
                                {r.position === 1 ? "🥇 1st" : r.position === 2 ? "🥈 2nd" : r.position === 3 ? "🥉 3rd" : `#${r.position}`} Position in Class
                              </p>
                            </div>
                          )}

                          {/* Remarks */}
                          {r.remarks && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                              <p className="text-sm text-blue-800">
                                <span className="font-semibold">Remarks: </span>{r.remarks}
                              </p>
                            </div>
                          )}

                          {/* Download button */}
                          <button
                            onClick={() => downloadResultCard(r, schoolName)}
                            className="w-full gradient-accent text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                          >
                            <Download className="w-4 h-4" />
                            Download Result Card
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PageLayout>
  );
};

export default ResultCard;
