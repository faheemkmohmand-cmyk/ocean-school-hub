import { useState } from "react";
import { motion } from "framer-motion";
import { Search, GraduationCap, Award, TrendingUp } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";

const classes = ["6", "7", "8", "9", "10"];
const examTypes: Record<string, string[]> = {
  "6": ["1st Semester", "2nd Semester"],
  "7": ["1st Semester", "2nd Semester"],
  "8": ["1st Semester", "2nd Semester"],
  "9": ["Annual-I", "Annual-II"],
  "10": ["Annual-I", "Annual-II"],
};

const mockResults = [
  { id: "1", student_name: "Ahmad Ali", roll_number: "601", class: "6", exam_type: "1st Semester", total_marks: 550, obtained_marks: 480, grade: "A", position: 1 },
  { id: "2", student_name: "Bilal Khan", roll_number: "602", class: "6", exam_type: "1st Semester", total_marks: 550, obtained_marks: 450, grade: "A", position: 2 },
  { id: "3", student_name: "Farhan Ullah", roll_number: "603", class: "6", exam_type: "1st Semester", total_marks: 550, obtained_marks: 420, grade: "B+", position: 3 },
  { id: "4", student_name: "Hassan Shah", roll_number: "901", class: "9", exam_type: "Annual-I", total_marks: 850, obtained_marks: 780, grade: "A+", position: 1 },
  { id: "5", student_name: "Imran Yousaf", roll_number: "902", class: "9", exam_type: "Annual-I", total_marks: 850, obtained_marks: 720, grade: "A", position: 2 },
];

const Results = () => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [searchRoll, setSearchRoll] = useState("");

  const filtered = mockResults.filter((r) => {
    if (selectedClass && r.class !== selectedClass) return false;
    if (selectedExam && r.exam_type !== selectedExam) return false;
    if (searchRoll && !r.roll_number.includes(searchRoll)) return false;
    return true;
  });

  return (
    <PageLayout>
      <PageBanner title="Exam Results" subtitle="Check your examination results" />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Filters */}
          <div className="bg-card rounded-2xl p-6 shadow-card mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setSelectedExam(""); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring outline-none"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Exam</label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring outline-none"
                  disabled={!selectedClass}
                >
                  <option value="">All Exams</option>
                  {selectedClass && examTypes[selectedClass]?.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Roll Number</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={searchRoll}
                    onChange={(e) => setSearchRoll(e.target.value)}
                    placeholder="Search by roll #"
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-ring outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          {filtered.length > 0 ? (
            <div className="bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="gradient-hero text-primary-foreground">
                      <th className="px-4 py-3 text-left font-medium">Pos</th>
                      <th className="px-4 py-3 text-left font-medium">Roll #</th>
                      <th className="px-4 py-3 text-left font-medium">Student</th>
                      <th className="px-4 py-3 text-left font-medium">Class</th>
                      <th className="px-4 py-3 text-left font-medium">Obtained</th>
                      <th className="px-4 py-3 text-left font-medium">%</th>
                      <th className="px-4 py-3 text-left font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-t border-border hover:bg-secondary/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          {r.position && r.position <= 3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full gradient-accent text-primary-foreground text-xs font-bold">
                              {r.position}
                            </span>
                          ) : r.position}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.roll_number}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.student_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.class}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.obtained_marks}/{r.total_marks}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {((r.obtained_marks / r.total_marks) * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                            {r.grade}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-2xl shadow-card">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No results found. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Results;
