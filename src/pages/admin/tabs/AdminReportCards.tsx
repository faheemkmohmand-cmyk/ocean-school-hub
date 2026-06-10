/**
 * AdminReportCards.tsx — GHS Babi Khel
 *
 * Feature 3.3: Batch Report Card PDF Generation
 * Feature 4.6: Attendance-Based Report Card Integration
 *
 * ─ Generates professional PDF report cards for ALL students in a class+exam+year
 * ─ Single student report card via dropdown
 * ─ Batch ZIP bundling with progress bar
 * ─ Uses jsPDF + jspdf-autotable for PDF generation
 * ─ Uses JSZip (dynamic import) for batch ZIP generation
 * ─ Enhanced attendance summary: percentage, half-day, eligibility, awards
 * ─ Attendance warnings for students below minimum threshold
 * ─ Professional styling: borders, alternating rows, header/footer, signatures
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Loader2, Users, User, AlertTriangle, Award, ShieldAlert, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { getGradeFromPercentage } from "@/hooks/useResultsEnhanced";
import { fetchReportCardAttendance, type ReportCardAttendance, useStudentAttendanceWarnings } from "@/hooks/useAttendanceAnalytics";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SubjectMark {
  obtained: number;
  total: number;
}

interface ResultRecord {
  id: string;
  student_id: string;
  class: string;
  exam_type: string;
  year: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string | null;
  position: number | null;
  is_pass: boolean;
  remarks: string | null;
  teacher_remarks: string | null;
  subject_marks: Record<string, SubjectMark> | null;
  exam_roll_no: string | null;
  students: {
    full_name: string;
    roll_number: string;
    photo_url: string | null;
    father_name: string | null;
  } | null;
}

interface AdminReportCardsProps {
  cls: string;
  examType: string;
  year: number;
}

// ─── Subject lists per class group ──────────────────────────────────────────────

const SUBJECTS_6_TO_8 = [
  "English", "Urdu", "Islamiyat", "M.Quran", "Geography",
  "Pashto", "Maths", "History", "G.Science", "Computer Science",
];

const SUBJECTS_9_TO_10 = [
  "English", "Urdu", "Pak-study", "Chemistry", "Physics",
  "Computer Science", "Biology", "Islamiyat", "M.Quran", "Mathematics",
];

const getSubjects = (cls: string) =>
  ["9", "10"].includes(cls) ? SUBJECTS_9_TO_10 : SUBJECTS_6_TO_8;

// ─── Helpers ────────────────────────────────────────────────────────────────────

const gradeHexColor = (grade: string | null): [number, number, number] => {
  switch (grade) {
    case "A+": return [3, 105, 161];
    case "A":  return [14, 165, 233];
    case "B":  return [13, 148, 136];
    case "C":  return [202, 138, 4];
    case "D":  return [234, 88, 12];
    default:   return [220, 38, 38];
  }
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");

// ─── PDF: Draw school header ────────────────────────────────────────────────────

function drawReportCardHeader(doc: jsPDF, w: number): number {
  // Top border
  doc.setDrawColor(3, 105, 161);
  doc.setLineWidth(2);
  doc.line(10, 8, w - 10, 8);

  // School name
  doc.setTextColor(3, 105, 161);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GOVERNMENT HIGH SCHOOL BABI KHEL", w / 2, 17, { align: "center" });

  // Address
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("District Mohmand, Khyber Pakhtunkhwa", w / 2, 23, { align: "center" });

  // Thin line
  doc.setDrawColor(3, 105, 161);
  doc.setLineWidth(0.5);
  doc.line(10, 26, w - 10, 26);

  return 28;
}

// ─── PDF: Draw exam bar ─────────────────────────────────────────────────────────

function drawExamBar(doc: jsPDF, w: number, y: number, examType: string, year: number, cls: string): number {
  const barHeight = 8;
  doc.setFillColor(3, 105, 161);
  doc.rect(10, y, w - 20, barHeight, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${examType} ${year} \u2014 Class ${cls}`, w / 2, y + 5.5, { align: "center" });

  return y + barHeight + 3;
}

// ─── PDF: Draw student info section ─────────────────────────────────────────────

function drawStudentInfo(
  doc: jsPDF,
  y: number,
  r: ResultRecord
): number {
  const leftCol = 14;
  const rightCol = 110;
  const lineH = 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const studentName = r.students?.full_name || "\u2014";
  const fatherName = r.students?.father_name || "\u2014";
  const rollNumber = r.students?.roll_number || "\u2014";
  const examRollNo = r.exam_roll_no || "\u2014";

  // Light background box
  doc.setFillColor(240, 248, 255);
  doc.rect(10, y - 2, 190, lineH * 2 + 4, "F");
  doc.setDrawColor(200, 220, 240);
  doc.setLineWidth(0.3);
  doc.rect(10, y - 2, 190, lineH * 2 + 4, "S");

  // Row 1: Student Name | Father Name
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text("Student Name:", leftCol, y + 2);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(studentName, leftCol + 28, y + 2);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Father Name:", rightCol, y + 2);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(fatherName, rightCol + 25, y + 2);

  y += lineH;

  // Row 2: Roll Number | Exam Roll Number
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Roll Number:", leftCol, y + 2);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(rollNumber, leftCol + 28, y + 2);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Exam Roll No:", rightCol, y + 2);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(examRollNo, rightCol + 25, y + 2);

  return y + lineH + 5;
}

// ─── PDF: Draw subject-wise marks table ─────────────────────────────────────────

function drawSubjectTable(
  doc: jsPDF,
  y: number,
  r: ResultRecord,
  subjects: string[]
): number {
  // Section title
  doc.setTextColor(3, 105, 161);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SUBJECT-WISE MARKS", 14, y);
  y += 3;

  // Filter subjects: exclude those where both obtained and total are 0 (not entered)
  const activeSubjects = r.subject_marks
    ? subjects.filter(sub => {
        const m = r.subject_marks![sub];
        return m && !(m.obtained === 0 && m.total === 0);
      })
    : [];

  const tableBody = activeSubjects.map(sub => {
    const m = r.subject_marks![sub];
    const pct = m.total > 0 ? Math.round((m.obtained / m.total) * 100) : 0;
    const grade = getGradeFromPercentage(pct);
    return [sub, String(m.obtained), String(m.total), `${pct}%`, grade];
  });

  // Grand total row
  tableBody.push([
    "GRAND TOTAL",
    String(r.obtained_marks),
    String(r.total_marks),
    `${r.percentage}%`,
    r.grade || "Fail",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Subject", "Obtained", "Total", "%", "Grade"]],
    body: tableBody,
    headStyles: {
      fillColor: [3, 105, 161],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 30, 30],
      halign: "center",
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    columnStyles: {
      0: { halign: "left", cellWidth: 55, fontStyle: "normal" },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25, fontStyle: "bold" },
      4: { cellWidth: 25, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      // Style the grand total row
      if (data.section === "body" && data.row.index === tableBody.length - 1) {
        data.cell.styles.fillColor = [3, 105, 161];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      }
      // Color grade column
      if (data.section === "body" && data.column.index === 4 && data.row.index < tableBody.length - 1) {
        const gradeVal = String(data.cell.raw);
        const [r, g, b] = gradeHexColor(gradeVal);
        data.cell.styles.textColor = [r, g, b];
      }
    },
    margin: { left: 14, right: 14 },
  });

  return (doc as any).lastAutoTable.finalY + 5;
}

// ─── PDF: Draw summary boxes ────────────────────────────────────────────────────

function drawSummary(doc: jsPDF, y: number, r: ResultRecord): number {
  const boxW = 42;
  const boxH = 16;
  const gap = 5;
  const startX = 14;

  const items = [
    { label: "Total Marks", value: String(r.total_marks), color: [3, 105, 161] as [number, number, number] },
    { label: "Obtained", value: String(r.obtained_marks), color: [14, 165, 233] as [number, number, number] },
    { label: "Percentage", value: `${r.percentage}%`, color: [3, 105, 161] as [number, number, number] },
    { label: "Grade", value: r.grade || "Fail", color: r.is_pass ? [22, 163, 74] as [number, number, number] : [220, 38, 38] as [number, number, number] },
  ];

  for (let i = 0; i < items.length; i++) {
    const x = startX + i * (boxW + gap);
    const item = items[i];

    // Box background
    doc.setFillColor(240, 248, 255);
    doc.rect(x, y, boxW, boxH, "F");
    // Box border
    doc.setDrawColor(200, 220, 240);
    doc.setLineWidth(0.3);
    doc.rect(x, y, boxW, boxH, "S");

    // Label
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(item.label.toUpperCase(), x + boxW / 2, y + 4.5, { align: "center" });

    // Value
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, x + boxW / 2, y + 12, { align: "center" });
  }

  return y + boxH + 5;
}

// ─── PDF: Draw pass/fail status & rank ──────────────────────────────────────────

function drawStatusAndRank(doc: jsPDF, y: number, w: number, r: ResultRecord): number {
  // Status bar
  const barH = 8;
  if (r.is_pass) {
    doc.setFillColor(240, 253, 244);
    doc.rect(14, y, w - 28, barH, "F");
    doc.setDrawColor(187, 247, 208);
    doc.setLineWidth(0.5);
    doc.rect(14, y, w - 28, barH, "S");
    doc.setTextColor(22, 163, 74);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.rect(14, y, w - 28, barH, "F");
    doc.setDrawColor(254, 202, 202);
    doc.setLineWidth(0.5);
    doc.rect(14, y, w - 28, barH, "S");
    doc.setTextColor(220, 38, 38);
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const statusText = r.is_pass ? "\u2713  PASS" : "\u2717  FAIL";
  doc.text(statusText, w / 2, y + 5.5, { align: "center" });

  // Rank badge if position available
  if (r.position && r.position <= 10) {
    const rankX = w - 55;
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(rankX, y + 0.5, 38, barH - 1, 2, 2, "F");
    doc.setTextColor(3, 105, 161);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const rankLabel = r.position === 1 ? "1st" : r.position === 2 ? "2nd" : r.position === 3 ? "3rd" : `#${r.position}`;
    doc.text(`Rank: ${rankLabel}`, rankX + 19, y + 5.5, { align: "center" });
  }

  return y + barH + 5;
}

// ─── PDF: Draw attendance summary (Enhanced - Feature 4.6) ────────────────────

function drawAttendance(doc: jsPDF, y: number, attendance: ReportCardAttendance, w: number): number {
  if (attendance.total === 0) return y;

  doc.setTextColor(3, 105, 161);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ATTENDANCE SUMMARY", 14, y + 1);
  y += 4;

  // Attendance boxes: Present, Absent, Late, Leave, Half-Day, Total, Percentage
  const boxW = 23;
  const boxH = 14;
  const gap = 3;
  const startX = 14;
  const items = [
    { label: "Present", value: String(attendance.present), color: [22, 163, 74] },
    { label: "Absent", value: String(attendance.absent), color: [220, 38, 38] },
    { label: "Late", value: String(attendance.late), color: [234, 88, 12] },
    { label: "Leave", value: String(attendance.leave), color: [100, 116, 139] },
    { label: "Half-Day", value: String(attendance.halfday), color: [147, 51, 234] },
    { label: "Total", value: String(attendance.total), color: [3, 105, 161] },
    { label: "Percentage", value: `${attendance.percentage}%`, color: attendance.percentage >= 75 ? [22, 163, 74] : [220, 38, 38] },
  ];

  for (let i = 0; i < items.length; i++) {
    const x = startX + i * (boxW + gap);
    const item = items[i];

    doc.setFillColor(250, 251, 253);
    doc.rect(x, y, boxW, boxH, "F");
    doc.setDrawColor(210, 218, 226);
    doc.setLineWidth(0.2);
    doc.rect(x, y, boxW, boxH, "S");

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text(item.label.toUpperCase(), x + boxW / 2, y + 4, { align: "center" });

    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, x + boxW / 2, y + 10.5, { align: "center" });
  }

  y += boxH + 3;

  // Eligibility status
  if (!attendance.isEligible) {
    // Red warning box
    doc.setFillColor(254, 242, 242);
    doc.rect(14, y, w - 28, 8, "F");
    doc.setDrawColor(254, 202, 202);
    doc.setLineWidth(0.3);
    doc.rect(14, y, w - 28, 8, "S");
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("ATTENDANCE BELOW MINIMUM — NOT ELIGIBLE FOR EXAM", w / 2, y + 5.5, { align: "center" });
    y += 10;
  } else if (attendance.warningLevel === "warning" || attendance.warningLevel === "caution") {
    // Yellow warning box
    doc.setFillColor(255, 251, 235);
    doc.rect(14, y, w - 28, 7, "F");
    doc.setDrawColor(253, 224, 137);
    doc.setLineWidth(0.3);
    doc.rect(14, y, w - 28, 7, "S");
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`ATTENDANCE WARNING: ${attendance.percentage}% — Please improve attendance to avoid eligibility issues`, w / 2, y + 4.5, { align: "center" });
    y += 9;
  }

  // Award badge
  if (attendance.award) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, y, w - 28, 8, 2, 2, "F");
    doc.setDrawColor(187, 247, 208);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, y, w - 28, 8, 2, 2, "S");
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`★  ${attendance.award.toUpperCase()} CERTIFICATE  ★`, w / 2, y + 5.5, { align: "center" });
    y += 10;
  }

  return y;
}

// ─── PDF: Draw teacher remarks ──────────────────────────────────────────────────

function drawRemarks(doc: jsPDF, y: number, w: number, r: ResultRecord): number {
  const remarksText = r.teacher_remarks || r.remarks || "";
  if (!remarksText) return y;

  doc.setTextColor(3, 105, 161);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TEACHER REMARKS", 14, y + 1);
  y += 4;

  // Remarks box
  doc.setFillColor(239, 246, 255);
  doc.rect(14, y, w - 28, 10, "F");
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.3);
  doc.rect(14, y, w - 28, 10, "S");

  doc.setTextColor(23, 37, 84);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const maxWidth = w - 32;
  const lines = doc.splitTextToSize(remarksText, maxWidth);
  doc.text(lines.slice(0, 2), 17, y + 5);

  return y + 13;
}

// ─── PDF: Draw signature lines ──────────────────────────────────────────────────

function drawSignatures(doc: jsPDF, y: number, w: number, h: number): void {
  // Make sure signatures don't overflow the page
  const sigY = Math.min(y, h - 25);

  // Separator line above signatures
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, sigY, w - 14, sigY);

  const sigLabels = ["Class Teacher", "Exam In-Charge", "Headmaster"];
  const sigSpacing = (w - 28) / 3;

  for (let i = 0; i < sigLabels.length; i++) {
    const x = 14 + sigSpacing * i + sigSpacing / 2;

    // Dotted signature line
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.3);
    const lineStartX = x - 22;
    const lineEndX = x + 22;
    for (let px = lineStartX; px < lineEndX; px += 2) {
      doc.line(px, sigY + 12, px + 1, sigY + 12);
    }

    // Label
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(sigLabels[i], x, sigY + 16, { align: "center" });
  }
}

// ─── PDF: Draw footer ───────────────────────────────────────────────────────────

function drawReportCardFooter(doc: jsPDF, w: number, h: number): void {
  doc.setDrawColor(3, 105, 161);
  doc.setLineWidth(0.5);
  doc.line(10, h - 12, w - 10, h - 12);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("GHS Babi Khel \u2014 Official Report Card", 14, h - 7);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, w / 2, h - 7, { align: "center" });
  doc.text("Confidential Document", w - 14, h - 7, { align: "right" });
}

// ─── Generate a single report card PDF ──────────────────────────────────────────

async function generateReportCardPDF(
  r: ResultRecord,
  attendance: ReportCardAttendance,
  includeFooter: boolean = true
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const subjects = getSubjects(r.class);

  // ── Header ──────────────────────────────────────────────────────
  let y = drawReportCardHeader(doc, w);

  // ── Exam bar ────────────────────────────────────────────────────
  y = drawExamBar(doc, w, y, r.exam_type, r.year, r.class);

  // ── Student info ────────────────────────────────────────────────
  y = drawStudentInfo(doc, y, r);

  // ── Subject-wise marks table ────────────────────────────────────
  y = drawSubjectTable(doc, y, r, subjects);

  // ── Summary boxes ───────────────────────────────────────────────
  y = drawSummary(doc, y, r);

  // ── Pass/fail status & rank ─────────────────────────────────────
  y = drawStatusAndRank(doc, y, w, r);

  // ── Attendance summary (Enhanced - Feature 4.6) ────────────────
  y = drawAttendance(doc, y, attendance, w);

  // ── Teacher remarks ─────────────────────────────────────────────
  y = drawRemarks(doc, y, w, r);

  // ── Signatures ──────────────────────────────────────────────────
  drawSignatures(doc, y, w, h);

  // ── Footer ──────────────────────────────────────────────────────
  if (includeFooter) {
    drawReportCardFooter(doc, w, h);
  }

  return doc;
}

// ─── Main Component ─────────────────────────────────────────────────────────────

function AdminReportCards({ cls, examType, year }: AdminReportCardsProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  // ── Fetch all results ──────────────────────────────────────────
  const { data: results = [], isLoading, error: fetchError } = useQuery<ResultRecord[]>({
    queryKey: ["admin-report-cards", cls, examType, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("id, student_id, class, exam_type, year, total_marks, obtained_marks, percentage, grade, position, is_pass, remarks, subject_marks, exam_roll_no, students(full_name, roll_number, photo_url)")
        .eq("class", cls)
        .eq("exam_type", examType)
        .eq("year", year)
        .order("percentage", { ascending: false });
      if (error) throw error;
      // Normalise: fill in optional fields that may not exist in DB
      return ((data ?? []) as any[]).map(r => ({
        ...r,
        teacher_remarks: r.teacher_remarks ?? null,
        students: r.students ? {
          ...r.students,
          father_name: r.students.father_name ?? null,
        } : null,
      })) as ResultRecord[];
    },
    enabled: !!cls && !!examType && !!year,
    staleTime: 10 * 60 * 1000,
  });

  // ── Deduplicated & ranked results ──────────────────────────────
  const rankedResults = useMemo(() => {
    const seen = new Map<string, ResultRecord>();
    for (const r of results) {
      if (!seen.has(r.student_id) || r.percentage > seen.get(r.student_id)!.percentage) {
        seen.set(r.student_id, r);
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => b.percentage - a.percentage)
      .map((r, i) => ({ ...r, position: r.position ?? i + 1 }));
  }, [results]);

  // ── Attendance warnings ────────────────────────────────────────
  const { data: warnings = [] } = useStudentAttendanceWarnings(cls, year);

  // ── Generate single report card ────────────────────────────────
  const handleGenerateSingle = async () => {
    const target = selectedStudentId === "all"
      ? rankedResults[0]
      : rankedResults.find(r => r.student_id === selectedStudentId);

    if (!target) {
      toast.error("No student selected or no results found");
      return;
    }

    setGenerating(true);
    setProgressLabel("Generating report card...");
    setProgress(30);

    try {
      const attendance = await fetchReportCardAttendance(target.student_id, year);
      setProgress(60);

      const doc = await generateReportCardPDF(target, attendance);
      setProgress(90);

      const fileName = `ReportCard_${sanitizeFileName(target.students?.full_name || "Student")}_${examType.replace(/\s/g, "")}_${year}.pdf`;
      doc.save(fileName);

      setProgress(100);
      toast.success("Report card PDF generated!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate report card");
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setProgress(0);
        setProgressLabel("");
      }, 800);
    }
  };

  // ── Generate batch ZIP ─────────────────────────────────────────
  const handleGenerateBatch = async () => {
    if (rankedResults.length === 0) {
      toast.error("No results found for this selection");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setProgressLabel("Initializing...");

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const folder = zip.folder(`ReportCards_Class${cls}_${examType.replace(/\s/g, "")}_${year}`);

      for (let i = 0; i < rankedResults.length; i++) {
        const r = rankedResults[i];
        const studentName = r.students?.full_name || "Unknown";
        setProgressLabel(`Generating: ${studentName} (${i + 1}/${rankedResults.length})`);
        setProgress(Math.round(((i + 0.3) / rankedResults.length) * 90));

        // Fetch enhanced attendance for each student
        const attendance = await fetchReportCardAttendance(r.student_id, year);

        // Generate PDF
        const doc = await generateReportCardPDF(r, attendance, true);
        const pdfBlob = doc.output("blob");

        const fileName = `${String(i + 1).padStart(2, "0")}_${sanitizeFileName(studentName)}.pdf`;
        folder!.file(fileName, pdfBlob);

        setProgress(Math.round(((i + 1) / rankedResults.length) * 90));
      }

      setProgressLabel("Creating ZIP file...");
      setProgress(93);

      const blob = await zip.generateAsync({ type: "blob" });
      setProgress(97);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `ReportCards_Class${cls}_${examType.replace(/\s/g, "")}_${year}.zip`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success(`${rankedResults.length} report cards bundled into ZIP!`);
    } catch (err: any) {
      toast.error(err?.message || "Batch generation failed");
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setProgress(0);
        setProgressLabel("");
      }, 800);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Report Card PDF Generation
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate professional PDF report cards for Class {cls} &middot; {examType} {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rankedResults.length > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Users className="w-3.5 h-3.5" />
              {rankedResults.length} student{rankedResults.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {warnings.length} attendance warning{warnings.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Attendance Warnings Banner */}
      {warnings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <p className="text-xs font-bold text-orange-700 dark:text-orange-400">
                {warnings.length} student{warnings.length !== 1 ? "s" : ""} below minimum attendance threshold
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {warnings.slice(0, 5).map((w) => (
                <Badge key={w.student_id} variant="outline" className="text-[10px] gap-1 border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
                  {w.student_name} ({w.attendance_percentage}%)
                </Badge>
              ))}
              {warnings.length > 5 && (
                <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
                  +{warnings.length - 5} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Student selector */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                Select Student
              </label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose student..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students (Batch)</SelectItem>
                  {rankedResults.map(r => (
                    <SelectItem key={r.student_id} value={r.student_id}>
                      {r.students?.full_name || "Unknown"} &middot; Roll: {r.students?.roll_number || "\u2014"}
                      {/* Show attendance warning icon for flagged students */}
                      {warnings.some(w => w.student_id === r.student_id) && " ⚠"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Single report card */}
            <Button
              onClick={handleGenerateSingle}
              disabled={generating || rankedResults.length === 0}
              className="gap-2 flex-1"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <User className="w-4 h-4" />
              )}
              {selectedStudentId === "all"
                ? "Generate First Student's Card"
                : "Generate Report Card"}
            </Button>

            {/* Batch ZIP */}
            <Button
              onClick={handleGenerateBatch}
              disabled={generating || rankedResults.length === 0}
              variant="outline"
              className="gap-2 flex-1 border-primary/30 hover:bg-primary/5"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              Generate All ({rankedResults.length}) & ZIP
            </Button>
          </div>

          {/* Progress bar */}
          {generating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2.5" />
              <p className="text-xs text-muted-foreground text-center animate-pulse">
                {progressLabel} &middot; {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {/* Error state */}
      {fetchError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5 text-center">
            <ShieldAlert className="w-10 h-10 text-destructive/50 mx-auto mb-2" />
            <p className="font-semibold text-foreground">Could not load results</p>
            <p className="text-sm text-muted-foreground mt-1">{(fetchError as any)?.message || "Database error — please check your connection and try again."}</p>
          </CardContent>
        </Card>
      )}

      {/* Student preview list */}
      {!isLoading && rankedResults.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border bg-primary/5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Students in this class &middot; {examType} {year}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {rankedResults.map((r, idx) => {
                const gradeColor = r.is_pass
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                const hasWarning = warnings.some(w => w.student_id === r.student_id);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {r.students?.full_name || "Unknown"}
                        {hasWarning && <AlertTriangle className="w-3 h-3 text-orange-500 inline ml-1" />}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Roll: {r.students?.roll_number || "\u2014"}
                        {r.students?.father_name && ` \u00B7 Father: ${r.students.father_name}`}
                        {r.exam_roll_no && ` \u00B7 Exam Roll: ${r.exam_roll_no}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{r.percentage}%</span>
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${gradeColor}`}>
                        {r.is_pass ? "Pass" : "Fail"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && rankedResults.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <FileDown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">No Results Found</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              No results are available for Class {cls} &middot; {examType} &middot; {year}.
              Please add results in the Manage Results tab first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdminReportCards;
