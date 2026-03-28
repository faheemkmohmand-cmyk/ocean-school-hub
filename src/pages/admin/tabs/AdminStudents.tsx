import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Loader2, Upload, Search, FileUp } from "lucide-react";
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
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students", classFilter, search, page],
    queryFn: async () => {
      let query = supabase.from("students").select("*", { count: "exact" })
        .order("roll_number").range(page * pageSize, (page + 1) * pageSize - 1);
      if (classFilter !== "all") query = query.eq("class", classFilter);
      if (search) query = query.or(`full_name.ilike.%${search}%,roll_number.ilike.%${search}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      return { students: (data ?? []) as Student[], total: count ?? 0 };
    },
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
    let photo_url = form.photo_url;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `students/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("student-photos").upload(path, photoFile, { upsert: true });
      if (!error) { const { data: { publicUrl } } = supabase.storage.from("student-photos").getPublicUrl(path); photo_url = publicUrl; }
    }
    const payload = { ...form, photo_url };
    const { error } = editing
      ? await supabase.from("students").update(payload).eq("id", editing.id)
      : await supabase.from("students").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Updated" : "Added"); qc.invalidateQueries({ queryKey: ["admin-students"] }); setModalOpen(false); }
    setSaving(false);
  };

  const handleCSVImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportProgress(0);
    const text = await file.text();
    const lines = text.trim().split("\n").slice(1); // skip header
    const rows = lines.map((l) => {
      const [roll_number, full_name, cls, father_name] = l.split(",").map((s) => s.trim());
      return { roll_number, full_name, class: cls, father_name: father_name || null, is_active: true };
    }).filter((r) => r.full_name && r.roll_number);

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await supabase.from("students").upsert(batch, { onConflict: "roll_number" });
      setImportProgress(Math.round(((i + batchSize) / rows.length) * 100));
    }
    toast.success(`Imported ${rows.length} students`);
    qc.invalidateQueries({ queryKey: ["admin-students"] });
    setImporting(false);
    e.target.value = "";
  }, [qc]);

  const set = (k: string, v: string | boolean | null) => setForm((p) => ({ ...p, [k]: v }));
  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-heading font-bold text-foreground">Manage Students</h2>
        <div className="flex gap-2">
          <label className="inline-flex">
            <Button variant="outline" className="gap-1.5" disabled={importing} asChild>
              <span><FileUp className="w-4 h-4" /> Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </span>
            </Button>
          </label>
          <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> Add Student</Button>
        </div>
      </div>

      {importing && <Progress value={importProgress} className="h-2" />}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name or roll no..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <div className="flex gap-1">
          <Button variant={classFilter === "all" ? "default" : "outline"} size="sm" onClick={() => { setClassFilter("all"); setPage(0); }}>All</Button>
          {classes.map((c) => (
            <Button key={c} variant={classFilter === c ? "default" : "outline"} size="sm" onClick={() => { setClassFilter(c); setPage(0); }}>
              {c}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead><TableHead>Roll No</TableHead><TableHead>Name</TableHead>
                  <TableHead>Class</TableHead><TableHead>Father</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{s.full_name.charAt(0)}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{s.roll_number}</TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell><span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">Class {s.class}</span></TableCell>
                    <TableCell>{s.father_name}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {s.is_active ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete {s.full_name}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.students.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No students found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

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
    </div>
  );
};

export default AdminStudents;
