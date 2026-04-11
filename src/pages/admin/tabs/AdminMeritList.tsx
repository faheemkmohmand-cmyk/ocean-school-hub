// src/pages/admin/tabs/AdminMeritList.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePublishMeritList, useMeritLists } from "@/hooks/useNewFeatures";
import { getGradeFromPercentage } from "@/hooks/useResults";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Download, Send } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

const classes = ["6", "7", "8", "9", "10"];
const getExamTypes = (cls: string) => ["9", "10"].includes(cls) ? ["Annual-I", "Annual-II"] : ["1st Semester", "2nd Semester"];

const medalEmoji = (pos: number) => pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `#${pos}`;

interface MeritEntry {
  student_id: string; full_name: string; roll_number: string; photo_url: string | null;
  obtained_marks: number; total_marks: number; percentage: number; grade: string; position: number;
}

function useMeritData(cls: string, examType: string, year: number) {
  return useQuery<MeritEntry[]>({
    queryKey: ["merit-data", cls, examType, year],
    queryFn: async () => {
      if (!year || year < 2000) return [];
      const { data, error } = await supabase
        .from("results")
        .select("student_id, obtained_marks, total_marks, percentage, grade, position, is_pass, students(full_name, roll_number, photo_url)")
        .eq("class", cls).eq("exam_type", examType).eq("year", year)
        .eq("is_published", true).eq("is_pass", true)
        .order("percentage", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any, i: number) => ({
        student_id: r.student_id,
        full_name: r.students?.full_name || "Unknown",
        roll_number: r.students?.roll_number || "-",
        photo_url: r.students?.photo_url || null,
        obtained_marks: r.obtained_marks, total_marks: r.total_marks,
        percentage: r.percentage, grade: r.grade || getGradeFromPercentage(r.percentage),
        position: r.position || (i + 1),
      }));
    },
    enabled: !!cls && !!examType && year >= 2000,
  });
}

function generatePDF(entries: MeritEntry[], cls: string, examType: string, year: number) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(4, 44, 83);
  doc.rect(0, 0, w, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text("Government High School Babi Khel", w / 2, 13, { align: "center" });
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("District Mohmand, KPK", w / 2, 20, { align: "center" });
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(`MERIT LIST — Class ${cls} | ${examType} | ${year}`, w / 2, 30, { align: "center" });

  doc.setFillColor(240, 247, 255);
  doc.rect(10, 42, w - 20, 12, "F");
  doc.setTextColor(4, 44, 83); doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(`Total Students: ${entries.length}`, 16, 50);
  doc.text(`Highest: ${Math.max(...entries.map(e => e.percentage))}%`, 80, 50);
  doc.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, 150, 50);

  (doc as any).autoTable({
    startY: 58,
    head: [["Pos", "Roll No", "Student Name", "Marks", "Percentage", "Grade"]],
    body: entries.map((e, i) => [
      i < 3 ? medalEmoji(e.position) : `#${e.position}`,
      e.roll_number, e.full_name,
      `${e.obtained_marks}/${e.total_marks}`, `${e.percentage}%`, e.grade,
    ]),
    headStyles: { fillColor: [4, 44, 83], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0:{ halign:"center", cellWidth:16 }, 1:{ cellWidth:22 }, 3:{ halign:"center", cellWidth:24 }, 4:{ halign:"center", cellWidth:24 }, 5:{ halign:"center", cellWidth:18 } },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.row.index < 3) {
        data.cell.styles.fillColor = data.row.index === 0 ? [255,247,205] : data.row.index === 1 ? [245,245,245] : [255,243,224];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.setFillColor(4, 44, 83);
  doc.rect(0, pageH - 12, w, 12, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("GHS Babi Khel — Official Merit List", w / 2, pageH - 4, { align: "center" });

  doc.save(`Merit_List_Class${cls}_${examType}_${year}.pdf`);
}

const AdminMeritList = () => {
  const [cls, setCls] = useState("6");
  const [examType, setExamType] = useState("1st Semester");
  // ── Year is now a free-input number, not a static dropdown ──
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const year = parseInt(yearInput, 10);
  const validYear = !isNaN(year) && year >= 2000 && year <= 2099;

  const { data: entries = [], isLoading } = useMeritData(cls, examType, validYear ? year : 0);
  const publishMerit = usePublishMeritList();
  const { data: published = [] } = useMeritLists();

  const isPublished = published.some(m => m.class === cls && m.exam_type === examType && m.year === year && m.is_published);

  const handlePublish = async () => {
    if (!validYear) { toast.error("Enter a valid year first"); return; }
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
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[110px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Class</Label>
            <Select value={cls} onValueChange={v => { setCls(v); setExamType(getExamTypes(v)[0]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Exam Type</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{getExamTypes(cls).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-xs text-muted-foreground mb-1 block">Year</Label>
            <Input
              type="number"
              value={yearInput}
              onChange={e => setYearInput(e.target.value)}
              placeholder="e.g. 2025"
              min={2000} max={2099}
              className={!validYear && yearInput.length > 0 ? "border-destructive" : ""}
            />
            {!validYear && yearInput.length > 0 && <p className="text-[10px] text-destructive mt-1">Enter valid year (2000–2099)</p>}
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

      {/* Preview */}
      {!validYear ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">Enter a valid year above to generate merit list.</CardContent></Card>
      ) : isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No published passing results for Class {cls} · {examType} · {year}.</p>
          <p className="text-xs text-muted-foreground mt-1">Publish results first in Manage Results.</p>
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
                <thead><tr className="bg-muted/50 border-b border-border">
                  <th className="p-3 text-left font-semibold">Position</th>
                  <th className="p-3 text-left font-semibold">Roll No</th>
                  <th className="p-3 text-left font-semibold">Student Name</th>
                  <th className="p-3 text-center font-semibold">Marks</th>
                  <th className="p-3 text-center font-semibold">%</th>
                  <th className="p-3 text-center font-semibold">Grade</th>
                </tr></thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.student_id} className={`border-b border-border ${i === 0 ? "bg-yellow-50 dark:bg-yellow-900/15 font-semibold" : i === 1 ? "bg-gray-50 dark:bg-gray-900/15 font-medium" : i === 2 ? "bg-orange-50 dark:bg-orange-900/15 font-medium" : "hover:bg-muted/30"}`}>
                      <td className="p-3 font-bold text-lg">{medalEmoji(e.position)}</td>
                      <td className="p-3 text-muted-foreground">{e.roll_number}</td>
                      <td className="p-3 text-foreground">
                        <div className="flex items-center gap-2">
                          {e.photo_url ? <img src={e.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">{e.full_name[0]}</div>}
                          {e.full_name}
                        </div>
                      </td>
                      <td className="p-3 text-center">{e.obtained_marks}/{e.total_marks}</td>
                      <td className="p-3 text-center font-semibold">{e.percentage}%</td>
                      <td className="p-3 text-center">
                        <Badge className={e.grade === "A+" || e.grade === "A" ? "bg-primary" : e.grade === "B" ? "bg-green-500" : "bg-amber-500"}>{e.grade}</Badge>
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
                
