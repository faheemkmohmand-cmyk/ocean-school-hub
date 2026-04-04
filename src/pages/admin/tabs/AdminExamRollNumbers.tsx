import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Hash, Plus, Trash2, Eye, EyeOff, Loader2,
  ChevronUp, ChevronDown, Download, RefreshCw, ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { triggerConfetti } from "@/lib/confetti";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamSession {
  id: string;
  title: string;
  exam_year: number;
  exam_term: string;
  classes: string[];
  class_order: string[];
  starting_number: number;
  is_published: boolean;
  created_at: string;
}

interface ExamRollEntry {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  father_name: string | null;
  class: string;
  class_roll_no: string;
  exam_roll_no: string;
  serial_number: number;
}

interface Student {
  id: string;
  full_name: string;
  roll_number: string;
  class: string;
  father_name: string | null;
}

const ALL_CLASSES = ["6", "7", "8", "9", "10"];
const TERMS = ["1st Semester", "2nd Semester", "Annual-I", "Annual-II", "Annual"];

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminExamRollNumbers = () => {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);

  // ─ Create form state ────────────────────────────────────────────────────────
  const [formTitle, setFormTitle] = useState("");
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formTerm, setFormTerm] = useState("1st Semester");
  const [selectedClasses, setSelectedClasses] = useState<string[]>(["6", "7", "8"]);
  const [classOrder, setClassOrder] = useState<string[]>(["6", "7", "8"]);
  const [startingNumber, setStartingNumber] = useState(100000);
  const [generating, setGenerating] = useState(false);

  // ─ Detail search ─────────────────────────────────────────────────────────────
  const [detailSearch, setDetailSearch] = useState("");

  // ─── Fetch all sessions ─────────────────────────────────────────────────────
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ExamSession[]>({
    queryKey: ["exam-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_roll_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── Fetch roll numbers for selected session ─────────────────────────────────
  const { data: rollNumbers = [], isLoading: loadingRolls } = useQuery<ExamRollEntry[]>({
    queryKey: ["exam-rolls", selectedSession?.id],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await supabase
        .from("exam_roll_numbers")
        .select("*")
        .eq("session_id", selectedSession.id)
        .order("serial_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedSession,
  });

  // ─── Toggle class selection ───────────────────────────────────────────────────
  const toggleClass = useCallback((cls: string) => {
    setSelectedClasses(prev => {
      const next = prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls];
      // Update order: keep existing order, add new at end
      setClassOrder(ord => {
        const filtered = ord.filter(c => next.includes(c));
        const added = next.filter(c => !filtered.includes(c));
        return [...filtered, ...added];
      });
      return next;
    });
  }, []);

  // ─── Move class up/down in order ────────────────────────────────────────────
  const moveClass = useCallback((cls: string, dir: "up" | "down") => {
    setClassOrder(prev => {
      const idx = prev.indexOf(cls);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  // ─── Generate roll numbers ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!formTitle.trim()) { toast.error("Enter a session title"); return; }
    if (selectedClasses.length === 0) { toast.error("Select at least one class"); return; }
    if (startingNumber < 100000 || startingNumber > 999999) {
      toast.error("Starting number must be 6 digits (100000–999999)");
      return;
    }

    setGenerating(true);

    try {
      // 1. Fetch students from selected classes IN ORDER
      const studentsPerClass: Record<string, Student[]> = {};
      for (const cls of classOrder) {
        if (!selectedClasses.includes(cls)) continue;
        const { data, error } = await supabase
          .from("students")
          .select("id, full_name, roll_number, class, father_name")
          .eq("class", cls)
          .eq("is_active", true)
          .order("roll_number", { ascending: true });
        if (error) throw error;
        studentsPerClass[cls] = data ?? [];
      }

      // 2. Build ordered student list
      const orderedStudents: Student[] = [];
      for (const cls of classOrder) {
        if (studentsPerClass[cls]) {
          orderedStudents.push(...studentsPerClass[cls]);
        }
      }

      if (orderedStudents.length === 0) {
        toast.error("No active students found in selected classes");
        setGenerating(false);
        return;
      }

      // 3. Create session
      const { data: sessionData, error: sessionError } = await supabase
        .from("exam_roll_sessions")
        .insert({
          title: formTitle.trim(),
          exam_year: formYear,
          exam_term: formTerm,
          classes: selectedClasses,
          class_order: classOrder.filter(c => selectedClasses.includes(c)),
          starting_number: startingNumber,
          is_published: false,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 4. Generate exam roll numbers in sequence
      const rows = orderedStudents.map((s, idx) => ({
        session_id: sessionData.id,
        student_id: s.id,
        student_name: s.full_name,
        father_name: s.father_name,
        class: s.class,
        class_roll_no: s.roll_number,
        exam_roll_no: String(startingNumber + idx),
        serial_number: idx + 1,
      }));

      // Insert in batches of 100
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from("exam_roll_numbers")
          .insert(batch);
        if (insertError) throw insertError;
      }

      toast.success(`✅ Generated ${rows.length} exam roll numbers!`);
      triggerConfetti("burst");
      qc.invalidateQueries({ queryKey: ["exam-sessions"] });

      // Go to detail view of new session
      setSelectedSession(sessionData);
      setView("detail");

    } catch (err: any) {
      console.error(err);
      toast.error(`Failed: ${err.message}`);
    }
    setGenerating(false);
  };

  // ─── Toggle publish ──────────────────────────────────────────────────────────
  const togglePublish = async (session: ExamSession) => {
    const { error } = await supabase
      .from("exam_roll_sessions")
      .update({ is_published: !session.is_published })
      .eq("id", session.id);
    if (error) { toast.error("Failed"); return; }
    toast.success(session.is_published ? "Unpublished" : "Published!");
    qc.invalidateQueries({ queryKey: ["exam-sessions"] });
    if (selectedSession?.id === session.id) {
      setSelectedSession({ ...session, is_published: !session.is_published });
    }
  };

  // ─── Delete session ─────────────────────────────────────────────────────────
  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("exam_roll_sessions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["exam-sessions"] });
      if (view === "detail") setView("list");
    },
    onError: () => toast.error("Delete failed"),
  });

  // ─── Download CSV ────────────────────────────────────────────────────────────
  const downloadCSV = () => {
    if (!selectedSession || rollNumbers.length === 0) return;
    const header = "Serial No,Exam Roll No,Student Name,Father Name,Class,Class Roll No\n";
    const rows = rollNumbers
      .map(r => `${r.serial_number},${r.exam_roll_no},"${r.student_name}","${r.father_name || ""}",${r.class},${r.class_roll_no}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam-rollnumbers-${selectedSession.title}-${selectedSession.exam_year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV Downloaded!");
  };

  // ─── Download printable PDF ──────────────────────────────────────────────────
  const downloadPrint = () => {
    if (!selectedSession || rollNumbers.length === 0) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let isFirstPage = true;

    // Group by class in session order
    const byClass: Record<string, ExamRollEntry[]> = {};
    for (const r of rollNumbers) {
      if (!byClass[r.class]) byClass[r.class] = [];
      byClass[r.class].push(r);
    }

    const drawHeader = () => {
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Government High School Babi Khel", pageW / 2, 10, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Exam Roll Number List  |  ${selectedSession.title}  |  ${selectedSession.exam_term} ${selectedSession.exam_year}`, pageW / 2, 17, { align: "center" });
      doc.text(`Total Students: ${rollNumbers.length}  |  Classes: ${selectedSession.class_order.join(", ")}`, pageW / 2, 23, { align: "center" });
    };

    drawHeader();

    for (const cls of selectedSession.class_order) {
      const students = byClass[cls];
      if (!students || students.length === 0) continue;

      if (!isFirstPage) {
        doc.addPage();
        drawHeader();
      }
      isFirstPage = false;

      const tableData = students.map(s => [
        s.serial_number.toString(),
        s.exam_roll_no,
        s.student_name,
        s.father_name || "—",
        s.class_roll_no,
      ]);

      autoTable(doc, {
        head: [["#", "Exam Roll No", "Student Name", "Father Name", "Class Roll No"]],
        body: tableData,
        startY: 33,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 28, fontStyle: "bold", textColor: [3, 105, 161] },
          2: { cellWidth: 55 },
          3: { cellWidth: 55 },
          4: { cellWidth: 28 },
        },
        didDrawPage: (data) => {
          // Class label above table on each page
          const y = data.settings.startY - 5;
          doc.setFillColor(14, 165, 233);
          doc.roundedRect(10, y - 5, 50, 7, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`Class ${cls}  (${students.length} students)`, 14, y);
          // Footer
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150, 150, 150);
          doc.text("GHS Babi Khel · ghs-babi-khel.vercel.app", pageW / 2, 290, { align: "center" });
        },
      });
    }

    doc.save(`ExamRollNumbers-${selectedSession.title}-${selectedSession.exam_year}.pdf`);
    toast.success("PDF downloaded successfully!");
  };

  // ─── Filtered roll numbers for search ────────────────────────────────────────
  const filteredRolls = detailSearch
    ? rollNumbers.filter(r =>
        r.student_name.toLowerCase().includes(detailSearch.toLowerCase()) ||
        r.exam_roll_no.includes(detailSearch) ||
        r.class_roll_no.includes(detailSearch) ||
        r.class.includes(detailSearch)
      )
    : rollNumbers;

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER: LIST VIEW
  // ──────────────────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Hash className="w-6 h-6 text-primary" />
              Exam Roll Numbers
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate and manage exam roll numbers for all classes
            </p>
          </div>
          <Button onClick={() => setView("create")} className="gap-2">
            <Plus className="w-4 h-4" />
            Generate New
          </Button>
        </div>

        {loadingSessions ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Hash className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-heading font-semibold text-foreground">No sessions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Generate New" to create your first exam roll number list</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Hash className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-semibold text-foreground">{s.title}</h3>
                      <Badge variant="secondary">{s.exam_term} {s.exam_year}</Badge>
                      <Badge className={s.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}>
                        {s.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Classes: {s.class_order.join(" → ")} &nbsp;|&nbsp; Starting No: {s.starting_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { setSelectedSession(s); setView("detail"); }}
                      className="gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => togglePublish(s)}
                      className="gap-1.5"
                    >
                      {s.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {s.is_published ? "Unpublish" : "Publish"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{s.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all {s.classes.length} classes' roll numbers. Cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSession.mutate(s.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER: CREATE VIEW
  // ──────────────────────────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h2 className="text-2xl font-heading font-bold text-foreground">Generate Exam Roll Numbers</h2>
        </div>

        {/* Session Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Session Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>Session Title *</Label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. First Semester Examination 2025"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Exam Year *</Label>
                <Input
                  type="number"
                  value={formYear}
                  onChange={e => setFormYear(Number(e.target.value))}
                  min={2000} max={2100}
                />
              </div>
              <div>
                <Label>Exam Term *</Label>
                <select
                  value={formTerm}
                  onChange={e => setFormTerm(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Starting Roll Number (6 digits) *</Label>
              <Input
                type="number"
                value={startingNumber}
                onChange={e => setStartingNumber(Number(e.target.value))}
                min={100000} max={999999}
                placeholder="100000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Roll numbers will be {startingNumber}, {startingNumber + 1}, {startingNumber + 2}...
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Class Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Classes & Order</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select classes and arrange order. Roll numbers follow this order.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Checkboxes */}
            <div className="flex flex-wrap gap-3">
              {ALL_CLASSES.map(cls => (
                <button
                  key={cls}
                  onClick={() => toggleClass(cls)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                    selectedClasses.includes(cls)
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  Class {cls}
                </button>
              ))}
            </div>

            {/* Order arrangement */}
            {classOrder.filter(c => selectedClasses.includes(c)).length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Drag to arrange order (first class gets first roll numbers)
                </Label>
                {classOrder.filter(c => selectedClasses.includes(c)).map((cls, idx, arr) => (
                  <div key={cls} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-4 py-2.5">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-medium text-foreground">Class {cls}</span>
                    <div className="flex gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        onClick={() => moveClass(cls, "up")}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7"
                        disabled={idx === arr.length - 1}
                        onClick={() => moveClass(cls, "down")}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedClasses.length === 0 && (
              <p className="text-sm text-destructive">Please select at least one class</p>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {selectedClasses.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-semibold text-primary mb-1">Preview</p>
              <p className="text-sm text-foreground">
                <strong>Session:</strong> {formTitle || "Untitled"} &nbsp;|&nbsp;
                <strong>Year:</strong> {formYear} &nbsp;|&nbsp;
                <strong>Term:</strong> {formTerm}
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>Order:</strong>{" "}
                {classOrder.filter(c => selectedClasses.includes(c)).map(c => `Class ${c}`).join(" → ")}
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>Roll Numbers Start at:</strong> {startingNumber}
              </p>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generating || selectedClasses.length === 0 || !formTitle.trim()}
          className="gap-2 w-full"
          size="lg"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating Roll Numbers...</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Generate Roll Numbers</>
          )}
        </Button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER: DETAIL VIEW
  // ──────────────────────────────────────────────────────────────────────────────
  if (view === "detail" && selectedSession) {
    // Group by class
    const byClass: Record<string, ExamRollEntry[]> = {};
    for (const r of filteredRolls) {
      if (!byClass[r.class]) byClass[r.class] = [];
      byClass[r.class].push(r);
    }

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setDetailSearch(""); }} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-heading font-bold text-foreground truncate">{selectedSession.title}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedSession.exam_term} {selectedSession.exam_year} &nbsp;·&nbsp;
              {rollNumbers.length} students &nbsp;·&nbsp;
              Classes: {selectedSession.class_order.join(" → ")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPrint} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Print List
            </Button>
            <Button
              size="sm"
              onClick={() => togglePublish(selectedSession)}
              className={`gap-1.5 ${selectedSession.is_published ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"} text-white`}
            >
              {selectedSession.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {selectedSession.is_published ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by name, exam roll no, class..."
          value={detailSearch}
          onChange={e => setDetailSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Roll Numbers Table — grouped by class */}
        {loadingRolls ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : filteredRolls.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No results found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {selectedSession.class_order.map(cls => {
              const students = byClass[cls];
              if (!students || students.length === 0) return null;
              return (
                <Card key={cls}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {cls}
                      </span>
                      Class {cls}
                      <Badge variant="secondary">{students.length} students</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Exam Roll No</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Father Name</TableHead>
                            <TableHead>Class Roll No</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {students.map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="text-muted-foreground text-sm">{r.serial_number}</TableCell>
                              <TableCell>
                                <span className="font-mono font-bold text-primary text-base">{r.exam_roll_no}</span>
                              </TableCell>
                              <TableCell className="font-medium">{r.student_name}</TableCell>
                              <TableCell className="text-muted-foreground">{r.father_name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{r.class_roll_no}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default AdminExamRollNumbers;
