import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Loader2, Upload, Search, Download } from "lucide-react";
import toast from "react-hot-toast";
import { triggerConfetti } from "@/lib/confetti";
import { getGradeFromPercentage, getGradeColor } from "@/hooks/useResults";

const classes = ["6", "7", "8", "9", "10"];
const getExamTypes = (cls: string) =>
  ["9", "10"].includes(cls)
    ? ["Annual-I", "Annual-II"]
    : ["1st Semester", "2nd Semester"];

interface Student { id: string; full_name: string; roll_number: string; photo_url: string | null; }
interface Result {
  id: string; student_id: string; class: string; exam_type: string; year: number;
  total_marks: number; obtained_marks: number; percentage: number; grade: string | null;
  position: number | null; is_pass: boolean; remarks: string | null; created_at: string;
  students?: { full_name: string; roll_number: string; photo_url: string | null } | null;
}

const currentYear = new Date().getFullYear();

const AdminResults = () => {
  const qc = useQueryClient();
  const [cls, setCls] = useState("6");
  const examTypes = getExamTypes(cls);
  const [examType, setExamType] = useState(examTypes[0]);
  const [year, setYear] = useState(currentYear);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Result | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);

  const [form, setForm] = useState({
    student_id: "", total_marks: 100, obtained_marks: 0, remarks: "",
  });

  const handleClassChange = (c: string) => {
    setCls(c);
    const types = getExamTypes(c);
    setExamType(types[0]);
  };

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["admin-students-list", cls],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name, roll_number, photo_url").eq("class", cls).eq("is_active", true).order("roll_number");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const queryKey = ["admin-results", cls, examType, year];
  const { data: results = [], isLoading } = useQuery<Result[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("id, student_id, class, exam_type, year, total_marks, obtained_marks, percentage, grade, position, is_pass, remarks, created_at, students(full_name, roll_number, photo_url)")
        .eq("class", cls).eq("exam_type", examType).eq("year", year)
        .order("percentage", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Result[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const rankedResults = useMemo(() => {
    const filtered = search
      ? results.filter(r =>
          r.students?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          r.students?.roll_number?.toLowerCase().includes(search.toLowerCase())
        )
      : results;
    return filtered.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [results, search]);

  const pct = form.total_marks > 0 ? Math.round((form.obtained_marks / form.total_marks) * 100) : 0;
  const grade = getGradeFromPercentage(pct);

  const openAdd = () => {
    setEditing(null);
    setForm({ student_id: "", total_marks: 100, obtained_marks: 0, remarks: "" });
    setModalOpen(true);
  };

  const openEdit = (r: Result) => {
    setEditing(r);
    setForm({ student_id: r.student_id, total_marks: r.total_marks, obtained_marks: r.obtained_marks, remarks: r.remarks || "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.student_id) { toast.error("Select a student"); return; }
    setSaving(true);
    const percentage = form.total_marks > 0 ? Math.round((form.obtained_marks / form.total_marks) * 100) : 0;
    const g = getGradeFromPercentage(percentage);
    const payload = {
      student_id: form.student_id,
      class: cls, exam_type: examType, year,
      total_marks: form.total_marks, obtained_marks: form.obtained_marks,
      percentage, grade: g, is_pass: percentage >= 33,
      remarks: form.remarks || null,
    };
    const { error } = editing
      ? await supabase.from("results").update(payload).eq("id", editing.id)
      : await supabase.from("results").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Updated" : "Result added! 🎉"); triggerConfetti("burst"); qc.invalidateQueries({ queryKey }); setModalOpen(false); }
    setSaving(false);
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("results").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey }); },
  });

  const downloadCSVTemplate = () => {
    const csv = "student_name,roll_number,total_marks,obtained_marks,remarks\nAli Khan,001,100,85,Good performance\nSara Ahmed,002,100,72,";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSV = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    setCsvProgress(0);

    const text = await file.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) { toast.error("CSV is empty"); setCsvImporting(false); return; }

    // Parse headers
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const nameIdx = headers.indexOf("student_name");
    const rollIdx = headers.indexOf("roll_number");
    const totalIdx = headers.indexOf("total_marks");
    const obtainedIdx = headers.indexOf("obtained_marks");
    const remarksIdx = headers.indexOf("remarks");

    if (rollIdx === -1 || totalIdx === -1 || obtainedIdx === -1) {
      toast.error("CSV must have roll_number, total_marks, obtained_marks columns");
      setCsvImporting(false);
      return;
    }

    const dataLines = lines.slice(1).filter(l => l.trim());
    let added = 0;
    let skipped = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const cols = dataLines[i].split(",").map(s => s.trim().replace(/['"]/g, ""));
      const rollNumber = cols[rollIdx];
      const studentName = nameIdx !== -1 ? cols[nameIdx] : "";
      const totalMarks = Number(cols[totalIdx]);
      const obtainedMarks = Number(cols[obtainedIdx]);
      const remarks = remarksIdx !== -1 ? cols[remarksIdx] || null : null;

      if (!rollNumber || isNaN(totalMarks) || isNaN(obtainedMarks)) { skipped++; continue; }

      // Find student by roll number
      let student = students.find(s => s.roll_number === rollNumber);

      // If not found, try by name
      if (!student && studentName) {
        const { data } = await supabase
          .from("students")
          .select("id")
          .eq("class", cls)
          .ilike("full_name", studentName)
          .single();
        if (data) student = { ...data, full_name: studentName, roll_number: rollNumber, photo_url: null };
      }

      if (!student) { skipped++; setCsvProgress(Math.round(((i + 1) / dataLines.length) * 100)); continue; }

      const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
      const g = getGradeFromPercentage(percentage);
      const { error } = await supabase.from("results").upsert({
        student_id: student.id, class: cls, exam_type: examType, year,
        total_marks: totalMarks, obtained_marks: obtainedMarks,
        percentage, grade: g, is_pass: percentage >= 33, remarks,
      }, { onConflict: "student_id,class,exam_type,year" });
      if (!error) added++;
      else skipped++;

      setCsvProgress(Math.round(((i + 1) / dataLines.length) * 100));
    }

    toast.success(`✅ ${added} results imported, ${skipped} skipped (student not found)`);
    qc.invalidateQueries({ queryKey });
    setCsvImporting(false);
    setCsvProgress(0);
    if (csvRef.current) csvRef.current.value = "";
  }, [students, cls, examType, year, qc, queryKey]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-heading font-bold text-foreground">Manage Results</h2>

      {/* Class tabs */}
      <Tabs value={cls} onValueChange={handleClassChange}>
        <TabsList>
          {classes.map(c => <TabsTrigger key={c} value={c}>Class {c}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {/* Exam type sub-tabs + year + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={examType} onValueChange={setExamType}>
          <TabsList>
            {examTypes.map(t => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Year:</span>
          <input
            type="number"
            value={year}
            onChange={e => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1900 && val <= 2200) setYear(val);
            }}
            className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none"
            min="1900"
            max="2200"
            placeholder="Year"
          />
        </div>

        <Button onClick={openAdd} size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Result</Button>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => csvRef.current?.click()}>
          <Upload className="w-4 h-4" /> {csvImporting ? "Importing..." : "Import CSV"}
        </Button>
        <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />

        <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCSVTemplate}>
          <Download className="w-4 h-4" /> CSV Template
        </Button>
      </div>

      {csvImporting && (
        <div className="space-y-1">
          <Progress value={csvProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">Importing... {csvProgress}%</p>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search student..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Results table */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Roll No</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Obtained</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rankedResults.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No results found. Add results above.</TableCell></TableRow>
              )}
              {rankedResults.map(r => (
                <TableRow key={r.id} className="hover:bg-secondary/50">
                  <TableCell className="font-bold text-primary">{r.rank}</TableCell>
                  <TableCell>
                    {r.students?.photo_url
                      ? <img src={r.students.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" loading="lazy" decoding="async" />
                      : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{(r.students?.full_name || "S").charAt(0)}</div>}
                  </TableCell>
                  <TableCell className="font-medium">{r.students?.full_name || "—"}</TableCell>
                  <TableCell>{r.students?.roll_number || "—"}</TableCell>
                  <TableCell>{r.total_marks}</TableCell>
                  <TableCell>{r.obtained_marks}</TableCell>
                  <TableCell className="font-semibold">{r.percentage}%</TableCell>
                  <TableCell><Badge className={getGradeColor(r.grade || "Fail")}>{r.grade}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={r.is_pass ? "default" : "destructive"} className={r.is_pass ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]" : ""}>
                      {r.is_pass ? "Pass" : "Fail"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete result?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Result" : "Add Result"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm(p => ({ ...p, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.roll_number} — {s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total Marks</Label><Input type="number" value={form.total_marks} onChange={e => setForm(p => ({ ...p, total_marks: Number(e.target.value) }))} /></div>
              <div><Label>Obtained Marks</Label><Input type="number" value={form.obtained_marks} onChange={e => setForm(p => ({ ...p, obtained_marks: Number(e.target.value) }))} /></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Percentage:</span>
              <Badge className={getGradeColor(grade)}>{pct}% — {grade}</Badge>
              <Badge variant={pct >= 33 ? "default" : "destructive"} className={pct >= 33 ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]" : ""}>
                {pct >= 33 ? "Pass" : "Fail"}
              </Badge>
            </div>
            <div><Label>Remarks</Label><Textarea rows={2} value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminResults;
