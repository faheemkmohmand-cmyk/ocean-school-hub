import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Loader2, Upload, Search, FileUp, Download, GraduationCap, ArrowRight, User, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

interface Student {
  id: string; full_name: string; roll_number: string; class: string;
  father_name: string | null; photo_url: string | null; is_active: boolean; created_at: string;
}

const classes = ["6", "7", "8", "9", "10"];

const emptyStudent = {
  full_name: "", roll_number: "", class: "6", father_name: "", photo_url: null as string | null, is_active: true,
};

const AdminStudents = () => {
  const qc = useQueryClient();
  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyStudent);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotionFrom, setPromotionFrom] = useState("6");
  const [promotionTo, setPromotionTo] = useState("7");
  const [promoting, setPromoting] = useState(false);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students", classFilter, search, page],
    queryFn: async () => {
      let query = supabase.from("students").select("id, full_name, roll_number, class, father_name, photo_url, is_active, created_at", { count: "exact" })
        .order("roll_number").range(page * pageSize, (page + 1) * pageSize - 1);
      if (classFilter !== "all") query = query.eq("class", classFilter);
      if (search) query = query.or(`full_name.ilike.%${search}%,roll_number.ilike.%${search}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      return { students: (data ?? []) as Student[], total: count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("students").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-students"] }); },
    onError: () => toast.error("Delete failed"),
  });

  const openAdd = () => { setEditing(null); setForm(emptyStudent); setPhotoFile(null); setModalOpen(true); };
  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({ full_name: s.full_name, roll_number: s.roll_number, class: s.class, father_name: s.father_name || "", photo_url: s.photo_url, is_active: s.is_active });
    setPhotoFile(null); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.roll_number) { toast.error("Name and Roll No required"); return; }
    setSaving(true);
    try {
      let dupQuery = supabase
        .from("students")
        .select("id")
        .eq("roll_number", form.roll_number)
        .eq("class", form.class);
      if (editing) dupQuery = dupQuery.neq("id", editing.id);
      const { data: existing } = await dupQuery;
      if (existing && existing.length > 0) {
        toast.error(`Roll number ${form.roll_number} already exists in Class ${form.class}. Each class has its own roll numbers.`);
        setSaving(false);
        return;
      }

      let photo_url = form.photo_url;
      if (photoFile) {
        photo_url = await uploadToCloudinary(photoFile, "students");
      }
      const payload = { ...form, photo_url };
      const { error } = editing
        ? await supabase.from("students").update(payload).eq("id", editing.id)
        : await supabase.from("students").insert(payload);
      if (error) toast.error(error.message);
      else {
        toast.success(editing ? "Updated" : "Added");
        qc.invalidateQueries({ queryKey: ["admin-students"] });
        setModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Save failed. Check Cloudinary env vars.");
    }
    setSaving(false);
  };

  const downloadCSVTemplate = () => {
    const csv = "full_name,roll_number,class,father_name\nAli Khan,001,9,Muhammad Khan\nSara Ahmed,002,10,Ahmed Ali";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportProgress(0);
    const text = await file.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) { toast.error("CSV is empty"); setImporting(false); return; }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const nameIdx = headers.indexOf("full_name");
    const rollIdx = headers.indexOf("roll_number");
    const classIdx = headers.indexOf("class");
    const fatherIdx = headers.indexOf("father_name");

    if (nameIdx === -1 || rollIdx === -1 || classIdx === -1) {
      toast.error("CSV must have full_name, roll_number, class columns");
      setImporting(false);
      return;
    }

    const dataLines = lines.slice(1).filter(l => l.trim());
    const validClasses = ["6", "7", "8", "9", "10"];
    const rows: Array<{ full_name: string; roll_number: string; class: string; father_name: string | null; is_active: boolean }> = [];
    let skipped = 0;

    for (const line of dataLines) {
      const cols = line.split(",").map(s => s.trim().replace(/['"]/g, ""));
      const full_name = cols[nameIdx];
      const roll_number = cols[rollIdx];
      const cls = cols[classIdx];
      const father_name = fatherIdx !== -1 ? cols[fatherIdx] || null : null;

      if (!full_name || !roll_number || !cls || !validClasses.includes(cls)) {
        skipped++;
        continue;
      }

      rows.push({ full_name, roll_number, class: cls, father_name, is_active: true });
    }

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await supabase.from("students").upsert(batch, { onConflict: "roll_number,class" });
      setImportProgress(Math.round(((i + batchSize) / rows.length) * 100));
    }

    toast.success(`✅ ${rows.length} students imported, ${skipped} skipped`);
    qc.invalidateQueries({ queryKey: ["admin-students"] });
    setImporting(false);
    e.target.value = "";
  }, [qc]);

  const handlePromotion = async () => {
    if (promotionFrom === promotionTo) { toast.error("From and To classes must be different"); return; }
    setPromoting(true);
    const { data: studentsToPromote, error: fetchErr } = await supabase
      .from("students")
      .select("id, roll_number")
      .eq("class", promotionFrom)
      .eq("is_active", true);
    if (fetchErr) { toast.error(fetchErr.message); setPromoting(false); return; }
    if (!studentsToPromote || studentsToPromote.length === 0) {
      toast.error(`No active students found in Class ${promotionFrom}`);
      setPromoting(false); return;
    }
    const ids = studentsToPromote.map(s => s.id);
    const { error: updateErr } = await supabase
      .from("students")
      .update({ class: promotionTo })
      .in("id", ids);
    if (updateErr) { toast.error(updateErr.message); setPromoting(false); return; }
    toast.success(`✅ ${studentsToPromote.length} students promoted from Class ${promotionFrom} to Class ${promotionTo}!`);
    qc.invalidateQueries({ queryKey: ["admin-students"] });
    setPromotionOpen(false);
    setPromoting(false);
  };

  const set = (k: string, v: string | boolean | null) => setForm((p) => ({ ...p, [k]: v }));
  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);
  const students = data?.students ?? [];

  return (
    <div className="space-y-4">
      {/* ── Header + Action Buttons (mobile-friendly) ──────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Manage Students</h2>
          <span className="text-xs text-muted-foreground">{data?.total ?? 0} total</span>
        </div>
        {/* Action buttons — stack on mobile, row on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadCSVTemplate}>
            <Download className="w-3.5 h-3.5" /> CSV Template
          </Button>
          <label className="inline-flex">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={importing} asChild>
              <span><FileUp className="w-3.5 h-3.5" /> Import CSV
                <input type="file" accept=".csv,text/csv,application/vnd.ms-excel,text/plain,application/octet-stream" className="hidden" onChange={handleCSVImport} />
              </span>
            </Button>
          </label>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-blue-700 border-blue-400 hover:bg-blue-50" onClick={() => setPromotionOpen(true)}>
            <GraduationCap className="w-3.5 h-3.5" /> Promote
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Student</Button>
        </div>
      </div>

      {importing && <Progress value={importProgress} className="h-2" />}

      {/* ── Search + Class Filter (mobile-friendly) ────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name or roll no..." className="pl-9 h-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Button variant={classFilter === "all" ? "default" : "outline"} size="sm" className="text-xs shrink-0" onClick={() => { setClassFilter("all"); setPage(0); }}>All</Button>
          {classes.map((c) => (
            <Button key={c} variant={classFilter === c ? "default" : "outline"} size="sm" className="text-xs shrink-0" onClick={() => { setClassFilter(c); setPage(0); }}>
              {c}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Student List — Mobile Cards + Desktop Table ────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : students.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No students found</p>
          <p className="text-muted-foreground text-xs mt-1">Add students or adjust your search filter</p>
        </div>
      ) : (
        <>
          {/* ── Mobile Card Layout (< 640px) ── */}
          <div className="sm:hidden space-y-2.5">
            {students.map((s) => (
              <Card key={s.id} className="overflow-hidden">
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-3">
                    {/* Photo / Avatar */}
                    {s.photo_url ? (
                      <img src={s.photo_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-background shadow-sm" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0 border-2 border-background shadow-sm">
                        {s.full_name.charAt(0)}
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{s.full_name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${s.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">#{s.roll_number}</span>
                        <span className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">Class {s.class}</span>
                      </div>
                      {s.father_name && (
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">Father: {s.father_name}</p>
                      )}
                    </div>
                  </div>
                  {/* Action buttons — full width, easy to tap */}
                  <div className="flex gap-2 mt-3 pt-2.5 border-t border-border/60">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-9" onClick={() => openEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-9 text-destructive hover:bg-destructive/10 border-destructive/30">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {s.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMut.mutate(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Desktop Table Layout (≥ 640px) ── */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Photo</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Roll No</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Name</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Class</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Father</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{s.full_name.charAt(0)}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-sm">{s.roll_number}</td>
                        <td className="px-4 py-2.5 font-medium text-sm">{s.full_name}</td>
                        <td className="px-4 py-2.5">
                          <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">Class {s.class}</span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{s.father_name || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {s.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete {s.full_name}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Pagination (mobile-friendly) ───────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="gap-1">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Add/Edit Student Dialog ────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Student" : "Add Student"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Roll Number *</Label><Input value={form.roll_number} onChange={(e) => set("roll_number", e.target.value)} /></div>
              <div>
                <Label>Class</Label>
                <Select value={form.class} onValueChange={(v) => set("class", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Father Name</Label><Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} /><Label>Active</Label>
            </div>
            <div>
              <Label>Photo</Label>
              <div className="flex items-center gap-3 mt-1">
                {(form.photo_url || photoFile) && <img src={photoFile ? URL.createObjectURL(photoFile) : form.photo_url!} alt="" className="w-10 h-10 rounded-full object-cover" />}
                <label className="flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline">
                  <Upload className="w-4 h-4" /> Choose Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Promote Students Dialog ────────────────────────────────────────── */}
      <Dialog open={promotionOpen} onOpenChange={setPromotionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" /> Promote Students
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Move <strong>all active students</strong> from one class to another. History is preserved.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                <Select value={promotionFrom} onValueChange={v => { setPromotionFrom(v); const idx = classes.indexOf(v); setPromotionTo(classes[Math.min(idx + 1, classes.length - 1)]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground mt-5 shrink-0" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                <Select value={promotionTo} onValueChange={setPromotionTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-900">
              ⚠️ <strong>Warning:</strong> All active students in Class {promotionFrom} will be moved to Class {promotionTo}. This cannot be undone automatically.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromotionOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePromotion}
              disabled={promoting || promotionFrom === promotionTo}
              className="gap-1.5 bg-blue-500 hover:bg-blue-700 text-white"
            >
              {promoting && <Loader2 className="w-4 h-4 animate-spin" />}
              {promoting ? "Promoting..." : `Promote ${promotionFrom} → ${promotionTo}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudents;
