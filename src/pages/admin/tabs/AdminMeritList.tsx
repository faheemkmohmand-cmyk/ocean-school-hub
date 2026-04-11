// src/pages/admin/tabs/AdminMeritList.tsx
// Admin: generate + publish printable merit list from existing results

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePublishMeritList, useMeritLists } from "@/hooks/useNewFeatures";
import { getGradeFromPercentage } from "@/hooks/useResults";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Download, Eye, Send } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

const classes = ["6", "7", "8", "9", "10"];
const getExamTypes = (cls: string) => ["9", "10"].includes(cls) ? ["Annual-I", "Annual-II"] : ["1st Semester", "2nd Semester"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const medalEmoji = (pos: number) => pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `#${pos}`;

interface MeritEntry {
  student_id: string;
  full_name: string;
  roll_number: string;
  photo_url: string | null;
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  grade: string;
  position: number;
  is_pass: boolean;
}

function useMeritData(cls: string, examType: string, year: number) {
  return useQuery<MeritEntry[]>({
    queryKey: ["merit-data", cls, examType, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("student_id, obtained_marks, total_marks, percentage, grade, position, is_pass, students(full_name, roll_number, photo_url)")
        .eq("class", cls)
        .eq("exam_type", examType)
        .eq("year", year)
        .eq("is_published", true)
        .eq("is_pass", true)
        .order("percentage", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      return rows.map((r, i) => ({
        student_id: r.student_id,
        full_name: r.students?.full_name || "Unknown",
        roll_number: r.students?.roll_number || "-",
        photo_url: r.students?.photo_url || null,
        obtained_marks: r.obtained_marks,
        total_marks: r.total_marks,
        percentage: r.percentage,
        grade: r.grade || getGradeFromPercentage(r.percentage),
        position: r.position || (i + 1),
        is_pass: r.is_pass,
      }));
    },
    enabled: !!cls && !!examType && !!year,
  });
}

function generatePDF(entries: MeritEntry[], cls: string, examType: string, year: number) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(4, 44, 83);
  doc.rect(0, 0, w, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text("Government High School Babi Khel", w / 2, 13, { align: "center" });
  doc.setFontSize(12); doc.setFont("helvetica", "normal");
  doc.text("District Mohmand, KPK", w / 2, 20, { align: "center" });
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(`MERIT LIST — Class ${cls} | ${examType} | ${year}`, w / 2, 30, { align: "center" });

  // Stats bar
  doc.setFillColor(240, 247, 255);
  doc.rect(10, 42, w - 20, 12, "F");
  doc.setTextColor(4, 44, 83); doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(`Total Students: ${entries.length}`, 16, 50);
  doc.text(`Pass Rate: 100%`, 70, 50);
  doc.text(`Highest: ${Math.max(...entries.map(e => e.percentage))}%`, 120, 50);
  doc.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, 164, 50);

  // Table
  (doc as any).autoTable({
    startY: 58,
    head: [["Pos", "Roll No", "Student Name", "Marks", "Percentage", "Grade"]],
    body: entries.slice(0, 3).map((e) => [
      medalEmoji(e.position),
      e.roll_number,
      e.full_name,
      `${e.obtained_marks}/${e.total_marks}`,
      `${e.percentage}%`,
      e.grade,
    ]).concat(entries.slice(3).map((e) => [
      `#${e.position}`,
      e.roll_number,
      e.full_name,
      `${e.obtained_marks}/${e.total_marks}`,
      `${e.percentage}%`,
      e.grade,
    ])),
    headStyles: { fillColor: [4, 44, 83], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 16 },
      1: { cellWidth: 22 },
      3: { halign: "center", cellWidth: 24 },
      4: { halign: "center", cellWidth: 24 },
      5: { halign: "center", cellWidth: 18 },
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.row.index < 3) {
        data.cell.styles.fillColor = data.row.index === 0 ? [255, 247, 205] : data.row.index === 1 ? [245, 245, 245] : [255, 243, 224];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Footer
  doc.setFillColor(4, 44, 83);
  doc.rect(0, pageH - 12, w, 12, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("GHS Babi Khel — Official Merit List", w / 2, pageH - 4, { align: "center" });

  doc.save(`Merit_List_Class${cls}_${examType}_${year}.pdf`);
}

const AdminMeritList = () => {
  const [cls, setCls] = useState("6");
  const [examType, setExamType] = useState("1st Semester");
  const [year, setYear] = useState(currentYear);
  const { data: entries = [], isLoading } = useMeritData(cls, examType, year);
  const publishMerit = usePublishMeritList();
  const { data: published = [] } = useMeritLists();

  const isPublished = published.some(
    (m) => m.class === cls && m.exam_type === examType && m.year === year && m.is_published
  );

  const handlePublish = async () => {
    await publishMerit.mutateAsync({ cls, examType, year });
    toast.success("Merit list published to student dashboard!");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Merit List Generator
        </h2>
        <p className="text-sm text-muted-foreground">Auto-generated from published results</p>
      </div>

      {/* Filters */}
      <Card><CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Class</p>
            <Select value={cls} onValueChange={(v) => { setCls(v); setExamType(getExamTypes(v)[0]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Exam Type</p>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{getExamTypes(cls).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Year</p>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </CardContent></Card>

      {/* Actions */}
      {entries.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => generatePDF(entries, cls, examType, year)} variant="outline">
            <Download className="w-4 h-4 mr-1.5" /> Download PDF
          </Button>
          <Button onClick={handlePublish} disabled={isPublished || publishMerit.isPending}>
            <Send className="w-4 h-4 mr-1.5" />
            {isPublished ? "Published ✓" : "Publish to Dashboard"}
          </Button>
          {isPublished && <Badge className="self-center bg-green-500">Live on student dashboard</Badge>}
        </div>
      )}

      {/* Preview table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No published passing results found for this selection.</p>
          <p className="text-xs text-muted-foreground mt-1">Make sure results are published in Manage Results first.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground">
              <h3 className="font-bold text-sm">Class {cls} · {examType} · {year}</h3>
              <p className="text-xs opacity-80">{entries.length} students ranked</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-3 text-left font-semibold">Position</th>
                    <th className="p-3 text-left font-semibold">Roll No</th>
                    <th className="p-3 text-left font-semibold">Student Name</th>
                    <th className="p-3 text-center font-semibold">Marks</th>
                    <th className="p-3 text-center font-semibold">%</th>
                    <th className="p-3 text-center font-semibold">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.student_id} className={`border-b border-border transition-colors ${
                      i === 0 ? "bg-yellow-50 dark:bg-yellow-900/15 font-semibold" :
                      i === 1 ? "bg-gray-50 dark:bg-gray-900/15 font-medium" :
                      i === 2 ? "bg-orange-50 dark:bg-orange-900/15 font-medium" :
                      "hover:bg-muted/30"
                    }`}>
                      <td className="p-3 font-bold text-lg">{medalEmoji(e.position)}</td>
                      <td className="p-3 text-muted-foreground">{e.roll_number}</td>
                      <td className="p-3 text-foreground">
                        <div className="flex items-center gap-2">
                          {e.photo_url ? (
                            <img src={e.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                              {e.full_name[0]}
                            </div>
                          )}
                          {e.full_name}
                        </div>
                      </td>
                      <td className="p-3 text-center">{e.obtained_marks}/{e.total_marks}</td>
                      <td className="p-3 text-center font-semibold">{e.percentage}%</td>
                      <td className="p-3 text-center">
                        <Badge className={e.grade === "A+" || e.grade === "A" ? "bg-primary" : e.grade === "B" ? "bg-green-500" : "bg-amber-500"}>
                          {e.grade}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminMeritList;
