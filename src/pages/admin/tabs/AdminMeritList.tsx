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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Download, Send, School } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_CLASSES = ["6", "7", "8", "9", "10"];
const getExamTypes = (cls: string) =>
  ["9", "10"].includes(cls) ? ["Annual-I", "Annual-II"] : ["1st Semester", "2nd Semester"];
const ALL_EXAM_TYPES = ["1st Semester", "2nd Semester", "Annual-I", "Annual-II"];

const medalLabel = (pos: number) =>
  pos === 1 ? "1st" : pos === 2 ? "2nd" : pos === 3 ? "3rd" : `#${pos}`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface MeritEntry {
  student_id: string;
  full_name: string;
  roll_number: string;
  class: string;
  photo_url: string | null;
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  grade: string;
  position: number;
}

// ─── Data hooks ───────────────────────────────────────────────────────────────
function useMeritData(cls: string, examType: string, year: number) {
  return useQuery<MeritEntry[]>({
    queryKey: ["merit-data", cls, examType, year],
    queryFn: async () => {
      if (!year || year < 2000) return [];
      const { data, error } = await supabase
        .from("results")
        .select("student_id, obtained_marks, total_marks, percentage, grade, position, class, is_pass, students(full_name, roll_number, photo_url)")
        .eq("class", cls)
        .eq("exam_type", examType)
        .eq("year", year)
        .eq("is_published", true)
        .order("percentage", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any, i: number) => ({
        student_id: r.student_id,
        full_name: r.students?.full_name || "Unknown",
        roll_number: r.students?.roll_number || "-",
        class: r.class,
        photo_url: r.students?.photo_url || null,
        obtained_marks: r.obtained_marks,
        total_marks: r.total_marks,
        percentage: r.percentage,
        grade: r.grade || getGradeFromPercentage(r.percentage),
        position: r.position || i + 1,
      }));
    },
    enabled: !!cls && !!examType && year >= 2000,
  });
}

function useWholeSchoolMerit(examType: string, year: number) {
  // examType "" means fetch ALL exam types (whole school across classes 6-10)
  return useQuery<MeritEntry[]>({
    queryKey: ["merit-school", examType, year],
    queryFn: async () => {
      if (!year || year < 2000) return [];
      let q = supabase
        .from("results")
        .select("student_id, obtained_marks, total_marks, percentage, grade, position, class, exam_type, is_pass, students(full_name, roll_number, photo_url)")
        .eq("year", year)
        .eq("is_published", true)
        .order("class", { ascending: true })
        .order("percentage", { ascending: false });
      // Only filter by exam_type if one is specifically selected
      if (examType) q = q.eq("exam_type", examType);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any, i: number) => ({
        student_id: r.student_id,
        full_name: r.students?.full_name || "Unknown",
        roll_number: r.students?.roll_number || "-",
        class: r.class,
        photo_url: r.students?.photo_url || null,
        obtained_marks: r.obtained_marks,
        total_marks: r.total_marks,
        percentage: r.percentage,
        grade: r.grade || getGradeFromPercentage(r.percentage),
        position: r.position || i + 1,
      }));
    },
    enabled: year >= 2000,
  });
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────
function drawPDFHeader(doc: jsPDF, title: string, subtitle: string, w: number) {
  // Clean white header with thin border lines — professional look
  // Top border line
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(1.2);
  doc.line(12, 8, w - 12, 8);

  // School name — large bold
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("GOVERNMENT HIGH SCHOOL BABI KHEL", w / 2, 16, { align: "center" });

  // Info line
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("District Mohmand, Khyber Pakhtunkhwa  |  Established 2018", w / 2, 22, { align: "center" });

  // Thin divider
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(12, 26, w - 12, 26);

  // Document title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(10, 10, 10);
  doc.text(title, w / 2, 33, { align: "center" });

  // Subtitle
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(subtitle, w / 2, 39, { align: "center" });

  // Bottom border line
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(1.2);
  doc.line(12, 43, w - 12, 43);
}

function drawPDFFooter(doc: jsPDF, w: number, h: number, pageNum: number, totalPages: number) {
  // Thin top line
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(12, h - 12, w - 12, h - 12);
  // Footer text
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("GHS Babi Khel — Official Merit List", 12, h - 7);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, w / 2, h - 7, { align: "center" });
  doc.text(`Page ${pageNum} / ${totalPages}`, w - 12, h - 7, { align: "right" });
}

function generateClassPDF(entries: MeritEntry[], cls: string, examType: string, year: number) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  drawPDFHeader(doc, `MERIT LIST - CLASS ${cls}`, `${examType}  |  Year ${year}  |  Total Students: ${entries.length}`, w);

  // Stats row
  const passing = entries.filter(e => e.percentage >= 33);
  const highest = entries.length ? Math.max(...entries.map(e => e.percentage)) : 0;
  const avg = entries.length ? Math.round(entries.reduce((s, e) => s + e.percentage, 0) / entries.length) : 0;

  // Clean stats row — no color background
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const classPassRate = entries.length ? Math.round((passing.length / entries.length) * 100) : 0;
  doc.text(`Total Students: ${entries.length}   |   Passed: ${passing.length}   |   Failed: ${entries.length - passing.length}   |   Highest: ${highest}%   |   Average: ${avg}%   |   Pass Rate: ${classPassRate}%`, w / 2, 48, { align: "center" });

  autoTable(doc, {
    startY: 50,
    head: [["Rank", "Roll No", "Student Name", "Marks Obtained", "Percentage", "Grade"]],
    body: entries.map((e, i) => [
      medalLabel(i + 1),
      e.roll_number,
      e.full_name,
      `${e.obtained_marks} / ${e.total_marks}`,
      `${Number(e.percentage).toFixed(1)}%`,
      e.grade,
    ]),
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [20, 20, 20],
      fontStyle: "normal",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { halign: "center", cellWidth: 15, fontStyle: "bold" },
      1: { cellWidth: 24, halign: "center" },
      2: { cellWidth: 75 },
      3: { halign: "center", cellWidth: 30 },
      4: { halign: "center", cellWidth: 22, fontStyle: "bold" },
      5: { halign: "center", cellWidth: 16 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index < 3) {
        // Only very subtle: bold text for top 3, no background color
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 12, right: 12, bottom: 16 },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      drawPDFFooter(doc, w, h, data.pageNumber, pageCount);
    },
  });

  // Final footer on last page
  const totalPagesNow = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPagesNow; p++) {
    doc.setPage(p);
    drawPDFFooter(doc, w, h, p, totalPagesNow);
  }

  doc.save(`Merit_List_Class${cls}_${examType}_${year}.pdf`);
}

function generateSchoolPDF(entries: MeritEntry[], examType: string, year: number) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Sort ALL students together by percentage (unified school ranking)
  const sorted = [...entries].sort((a, b) => b.percentage - a.percentage);

  const totalStudents = sorted.length;
  const passing = sorted.filter(e => e.percentage >= 33);
  const highest = totalStudents ? Math.max(...sorted.map(e => e.percentage)) : 0;
  const avg = totalStudents ? Math.round(sorted.reduce((s, e) => s + e.percentage, 0) / totalStudents) : 0;

  drawPDFHeader(
    doc,
    "WHOLE SCHOOL MERIT LIST",
    `${examType}  |  Year ${year}  |  All Classes  |  ${totalStudents} Students`,
    w
  );

  // Clean stats row
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const schoolPassRate = totalStudents ? Math.round((passing.length / totalStudents) * 100) : 0;
  doc.text(`Total Students: ${totalStudents}   |   Passed: ${passing.length}   |   Failed: ${totalStudents - passing.length}   |   Highest: ${highest}%   |   Average: ${avg}%   |   Pass Rate: ${schoolPassRate}%`, w / 2, 48, { align: "center" });

  // ONE unified table — all students ranked by percentage across all classes
  autoTable(doc, {
    startY: 52,
    head: [["Rank", "Class", "Roll No", "Student Name", "Marks Obtained", "Percentage", "Grade"]],
    body: sorted.map((e, i) => [
      medalLabel(i + 1),
      `Cls ${e.class}`,
      e.roll_number,
      e.full_name,
      `${e.obtained_marks} / ${e.total_marks}`,
      `${Number(e.percentage).toFixed(1)}%`,
      e.grade,
    ]),
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [20, 20, 20],
      fontStyle: "normal",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 13 },
      2: { halign: "center", cellWidth: 20 },
      3: { cellWidth: 65 },
      4: { halign: "center", cellWidth: 28 },
      5: { halign: "center", cellWidth: 20, fontStyle: "bold" },
      6: { halign: "center", cellWidth: 14 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index < 3) {
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 10, right: 10, bottom: 16 },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      drawPDFFooter(doc, w, h, data.pageNumber, pageCount);
    },
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPDFFooter(doc, w, h, p, totalPages);
  }

  doc.save(`School_Merit_List_${examType}_${year}.pdf`);
}

// ─── Merit Table UI ───────────────────────────────────────────────────────────
function MeritTable({ entries, showClass = false }: { entries: MeritEntry[]; showClass?: boolean }) {
  if (!entries.length) return (
    <Card><CardContent className="p-10 text-center">
      <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
      <p className="text-muted-foreground text-sm">No published results found for this selection.</p>
      <p className="text-xs text-muted-foreground mt-1">Publish results first in Manage Results.</p>
    </CardContent></Card>
  );

  return (
    <Card><CardContent className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#042C53] text-white">
              <th className="p-3 text-center font-semibold">Rank</th>
              {showClass && <th className="p-3 text-left font-semibold">Class</th>}
              <th className="p-3 text-left font-semibold">Roll No</th>
              <th className="p-3 text-left font-semibold">Student Name</th>
              <th className="p-3 text-center font-semibold">Marks</th>
              <th className="p-3 text-center font-semibold">%</th>
              <th className="p-3 text-center font-semibold">Grade</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={`${e.student_id}-${i}`} className={`border-b border-border transition-colors ${
                i === 0 ? "bg-yellow-50 dark:bg-yellow-900/20 font-bold" :
                i === 1 ? "bg-gray-50 dark:bg-gray-900/20 font-semibold" :
                i === 2 ? "bg-orange-50 dark:bg-orange-900/20 font-semibold" :
                "hover:bg-muted/30"
              }`}>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                    i === 1 ? "bg-gray-300 text-gray-800" :
                    i === 2 ? "bg-orange-300 text-orange-900" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                  </span>
                </td>
                {showClass && <td className="p-3"><span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">Class {e.class}</span></td>}
                <td className="p-3 text-muted-foreground font-mono text-xs">{e.roll_number}</td>
                <td className="p-3 text-foreground">
                  <div className="flex items-center gap-2">
                    {e.photo_url
                      ? <img src={e.photo_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      : <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">{e.full_name[0]}</div>
                    }
                    {e.full_name}
                  </div>
                </td>
                <td className="p-3 text-center text-xs">{e.obtained_marks}/{e.total_marks}</td>
                <td className="p-3 text-center font-bold text-sm">{e.percentage}%</td>
                <td className="p-3 text-center">
                  <Badge className={
                    e.grade === "A+" ? "bg-[#042C53]" :
                    e.grade === "A" ? "bg-primary" :
                    e.grade === "B" ? "bg-green-500" :
                    e.grade === "C" ? "bg-amber-500" : "bg-red-500"
                  }>{e.grade}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent></Card>
  );
}

// ─── Class Merit Tab ──────────────────────────────────────────────────────────
function ClassMeritTab() {
  const [cls, setCls] = useState("6");
  const [examType, setExamType] = useState("1st Semester");
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const year = parseInt(yearInput, 10);
  const validYear = !isNaN(year) && year >= 2000 && year <= 2099;

  const { data: entries = [], isLoading } = useMeritData(cls, examType, validYear ? year : 0);
  const publishMerit = usePublishMeritList();
  const { data: published = [] } = useMeritLists();
  const isPublished = published.some(m => m.class === cls && m.exam_type === examType && m.year === year && m.is_published);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card><CardContent className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[110px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Class</Label>
            <Select value={cls} onValueChange={v => { setCls(v); setExamType(getExamTypes(v)[0]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
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
            <Input type="number" value={yearInput} onChange={e => setYearInput(e.target.value)}
              placeholder="e.g. 2025" min={2000} max={2099}
              className={!validYear && yearInput.length > 0 ? "border-destructive" : ""} />
          </div>
        </div>
      </CardContent></Card>

      {/* Actions */}
      {!isLoading && entries.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => generateClassPDF(entries, cls, examType, year)} variant="outline">
            <Download className="w-4 h-4 mr-1.5" /> Download PDF
          </Button>
          <Button onClick={async () => {
            if (!validYear) { toast.error("Enter a valid year first"); return; }
            await publishMerit.mutateAsync({ cls, examType, year });
            toast.success("Merit list published!");
          }} disabled={isPublished || publishMerit.isPending}>
            <Send className="w-4 h-4 mr-1.5" />
            {isPublished ? "Published ✓" : "Publish to Dashboard"}
          </Button>
          {isPublished && <Badge className="self-center bg-green-500">Live on student dashboard</Badge>}
        </div>
      )}

     {/* Stats */}
      {!isLoading && entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: entries.length, color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20" },
            { label: "Passed", value: entries.filter(e => e.percentage >= 33).length, color: "bg-green-50 text-green-700 dark:bg-green-900/20" },
            { label: "Highest", value: `${Math.max(...entries.map(e => e.percentage))}%`, color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20" },
            { label: "Average", value: `${Math.round(entries.reduce((s, e) => s + e.percentage, 0) / entries.length)}%`, color: "bg-purple-50 text-purple-700 dark:bg-purple-900/20" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!validYear ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Enter a valid year to generate merit list.</CardContent></Card>
      ) : isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : (
        <MeritTable entries={entries} />
      )}
    </div>
  );
}

// ─── Whole School Merit Tab ───────────────────────────────────────────────────
function SchoolMeritTab() {
  // "" = All Exam Types (fetches all classes including 6-10 with their respective exam types)
  const [examType, setExamType] = useState("");
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const year = parseInt(yearInput, 10);
  const validYear = !isNaN(year) && year >= 2000 && year <= 2099;

  const { data: entries = [], isLoading } = useWholeSchoolMerit(examType, validYear ? year : 0);

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Exam Type</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger><SelectValue placeholder="All Exam Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Exam Types (Whole School)</SelectItem>
                {ALL_EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-xs text-muted-foreground mb-1 block">Year</Label>
            <Input type="number" value={yearInput} onChange={e => setYearInput(e.target.value)}
              placeholder="e.g. 2025" min={2000} max={2099}
              className={!validYear && yearInput.length > 0 ? "border-destructive" : ""} />
          </div>
        </div>
      </CardContent></Card>

      {!isLoading && entries.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => generateSchoolPDF(entries, examType, year)} variant="outline">
            <Download className="w-4 h-4 mr-1.5" /> Download Full School PDF
          </Button>
          <span className="self-center text-xs text-muted-foreground">({entries.length} total students across all classes)</span>
        </div>
      )}

      {/* Stats across all classes */}
      {!isLoading && entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Students", value: entries.length, color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20" },
            { label: "Passed", value: entries.filter(e => e.percentage >= 33).length, color: "bg-green-50 text-green-700 dark:bg-green-900/20" },
            { label: "Highest %", value: `${Math.max(...entries.map(e => e.percentage))}%`, color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20" },
            { label: "School Avg", value: `${Math.round(entries.reduce((s, e) => s + e.percentage, 0) / entries.length)}%`, color: "bg-purple-50 text-purple-700 dark:bg-purple-900/20" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {!validYear ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Enter a valid year to view school merit list.</CardContent></Card>
      ) : isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <School className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No published results found for {examType} · {year}.</p>
        </CardContent></Card>
      ) : (
        /* Show ALL students together, sorted by percentage — unified school ranking */
        <MeritTable entries={[...entries].sort((a, b) => b.percentage - a.percentage)} showClass={true} />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminMeritList = () => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" /> Merit List Generator
      </h2>
      <p className="text-sm text-muted-foreground">Auto-generated from published results — download PDF or publish to student dashboard</p>
    </div>

    <Tabs defaultValue="class">
      <TabsList>
        <TabsTrigger value="class">📋 Class Merit List</TabsTrigger>
        <TabsTrigger value="school">🏫 Whole School Merit</TabsTrigger>
      </TabsList>
      <TabsContent value="class" className="mt-4"><ClassMeritTab /></TabsContent>
      <TabsContent value="school" className="mt-4"><SchoolMeritTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminMeritList;
      
