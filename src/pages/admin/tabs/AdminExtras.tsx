// src/pages/admin/tabs/AdminExtras.tsx
// Manages: Daily Quotes (Feature 3), Honor Roll (Feature 8), Exam Schedule (Feature 6)
// Three tabs in one file to keep admin nav clean

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import {
  useAllQuotes, useUpsertQuote, useDeleteQuote, type DailyQuote,
  useAllHonorRoll, useUpsertHonorRoll, useDeleteHonorRoll, type HonorRollEntry,
  useAllExamSchedule, useUpsertExamSchedule, useDeleteExamEntry, type ExamScheduleEntry,
} from "@/hooks/useNewFeatures";

// ─── QUOTES MANAGER ───────────────────────────────────────────────────────────
function QuotesManager() {
  const { data: quotes = [], isLoading } = useAllQuotes();
  const upsert = useUpsertQuote();
  const remove = useDeleteQuote();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyQuote | null>(null);
  const [form, setForm] = useState({ text: "", author: "", category: "motivational", fixed_date: "" });
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditing(null); setForm({ text: "", author: "", category: "motivational", fixed_date: "" }); setOpen(true); };
  const openEdit = (q: DailyQuote) => { setEditing(q); setForm({ text: q.text, author: q.author || "", category: q.category, fixed_date: q.fixed_date || "" }); setOpen(true); };

  const handleSave = async () => {
    if (!form.text.trim()) { toast.error("Quote text required"); return; }
    setSaving(true);
    try {
      await upsert.mutateAsync({ ...(editing ? { id: editing.id } : {}), text: form.text, author: form.author || null, category: form.category, fixed_date: form.fixed_date || null, is_active: true });
      toast.success(editing ? "Updated" : "Quote added");
      setOpen(false);
    } catch { toast.error("Failed"); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Daily Quotes & Hadith</h3>
          <p className="text-xs text-muted-foreground">{quotes.filter(q => q.is_active).length} active quotes</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Quote</Button>
      </div>

      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <Card key={q.id} className={!q.is_active ? "opacity-50" : ""}>
              <CardContent className="p-3 flex items-start gap-3">
                <span className="text-lg shrink-0">{q.category === "islamic" ? "🌙" : q.category === "educational" ? "📚" : "💡"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2">"{q.text}"</p>
                  {q.author && <p className="text-xs text-muted-foreground mt-0.5">— {q.author}</p>}
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{q.category}</Badge>
                    {q.fixed_date && <Badge variant="outline" className="text-[10px]">📅 {q.fixed_date}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(q)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete quote?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutateAsync(q.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Quote" : "Add Quote"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Quote Text *</Label>
              <Textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="Enter the quote..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Author</Label>
                <Input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="e.g. Prophet Muhammad ﷺ" />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motivational">Motivational</SelectItem>
                    <SelectItem value="islamic">Islamic / Hadith</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fixed Date (optional — shows only on this day)</Label>
              <Input type="date" value={form.fixed_date} onChange={e => setForm({ ...form, fixed_date: e.target.value })} />
              <p className="text-[10px] text-muted-foreground">Leave empty for random daily rotation</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── HONOR ROLL MANAGER ───────────────────────────────────────────────────────
const classes = ["6", "7", "8", "9", "10"];
const currentYear = new Date().getFullYear();
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function HonorRollManager() {
  const { data: entries = [], isLoading } = useAllHonorRoll();
  const upsert = useUpsertHonorRoll();
  const remove = useDeleteHonorRoll();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HonorRollEntry | null>(null);
  const [form, setForm] = useState({ student_name: "", class: "6", month: new Date().getMonth() + 1, year: currentYear, reason: "", photo_url: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditing(null); setForm({ student_name: "", class: "6", month: new Date().getMonth() + 1, year: currentYear, reason: "", photo_url: "" }); setPhotoFile(null); setOpen(true); };
  const openEdit = (e: HonorRollEntry) => { setEditing(e); setForm({ student_name: e.student_name, class: e.class, month: e.month, year: e.year, reason: e.reason || "", photo_url: e.photo_url || "" }); setPhotoFile(null); setOpen(true); };

  const handleSave = async () => {
    if (!form.student_name.trim()) { toast.error("Student name required"); return; }
    setSaving(true);
    try {
      let photo_url = form.photo_url;
      if (photoFile) {
        const path = `honor-roll/${Date.now()}-${photoFile.name}`;
        const { error } = await supabase.storage.from("achievement-images").upload(path, photoFile);
        if (!error) photo_url = supabase.storage.from("achievement-images").getPublicUrl(path).data.publicUrl;
      }
      await upsert.mutateAsync({ ...(editing ? { id: editing.id } : {}), ...form, photo_url: photo_url || null, is_published: true });
      toast.success(editing ? "Updated" : "Honor Roll entry added");
      setOpen(false);
    } catch { toast.error("Failed"); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Student of the Month / Honor Roll</h3>
          <p className="text-xs text-muted-foreground">{entries.length} entries</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
      </div>

      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-3 flex items-center gap-3">
                {e.photo_url ? (
                  <img src={e.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {e.student_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{e.student_name}</p>
                  <p className="text-xs text-muted-foreground">Class {e.class} · {MONTHS[e.month - 1]} {e.year}</p>
                  {e.reason && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{e.reason}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Remove from Honor Roll?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutateAsync(e.id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
          {entries.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No honor roll entries yet.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Entry" : "Add to Honor Roll"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Student Name *</Label>
              <Input value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Class</Label>
                <Select value={form.class} onValueChange={v => setForm({ ...form, class: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Month</Label>
                <Select value={String(form.month)} onValueChange={v => setForm({ ...form, month: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason / Achievement</Label>
              <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Top scorer in Annual exams" rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Photo</Label>
              <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                className="text-xs text-muted-foreground file:mr-2 file:px-3 file:py-1 file:rounded-lg file:bg-secondary file:text-foreground file:text-xs file:border-0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── EXAM SCHEDULE MANAGER ────────────────────────────────────────────────────
const getExamTypes = (cls: string) => ["9", "10"].includes(cls) ? ["Annual-I", "Annual-II"] : ["1st Semester", "2nd Semester"];
const SUBJECTS_6_8 = ["English", "Urdu", "Islamiyat", "M.Quran", "Geography", "Pashto", "Maths", "History", "G.Science", "Computer Science"];
const SUBJECTS_9_10 = ["English", "Urdu", "Pak-study", "Chemistry", "Physics", "Computer Science", "Biology", "Islamiyat", "M.Quran", "Mathematics"];
const getSubjects = (cls: string) => ["9", "10"].includes(cls) ? SUBJECTS_9_10 : SUBJECTS_6_8;

function ExamScheduleManager() {
  const { data: allEntries = [], isLoading } = useAllExamSchedule();
  const addEntries = useUpsertExamSchedule();
  const deleteEntry = useDeleteExamEntry();

  const [filterCls, setFilterCls] = useState("6");
  const [filterExam, setFilterExam] = useState("1st Semester");

  // Bulk add form
  const [bulkCls, setBulkCls] = useState("6");
  const [bulkExam, setBulkExam] = useState("1st Semester");
  const [bulkYear, setBulkYear] = useState(currentYear);
  const [rows, setRows] = useState<{ subject: string; exam_date: string; start_time: string; end_time: string; hall: string }[]>([
    { subject: "", exam_date: "", start_time: "09:00", end_time: "12:00", hall: "" }
  ]);
  const [saving, setSaving] = useState(false);

  const filtered = allEntries.filter(e => e.class === filterCls && e.exam_type === filterExam);

  const addRow = () => setRows(r => [...r, { subject: "", exam_date: "", start_time: "09:00", end_time: "12:00", hall: "" }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: string, val: string) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleBulkSave = async () => {
    const valid = rows.filter(r => r.subject && r.exam_date);
    if (!valid.length) { toast.error("Add at least one row with subject and date"); return; }
    setSaving(true);
    try {
      await addEntries.mutateAsync(valid.map(r => ({ class: bulkCls, exam_type: bulkExam, year: bulkYear, subject: r.subject, exam_date: r.exam_date, start_time: r.start_time || null, end_time: r.end_time || null, hall: r.hall || null, notes: null, is_published: true })));
      toast.success(`${valid.length} exam entries added`);
      setRows([{ subject: "", exam_date: "", start_time: "09:00", end_time: "12:00", hall: "" }]);
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-foreground">Exam Date Sheet Manager</h3>
        <p className="text-xs text-muted-foreground">Create and publish exam schedules per class</p>
      </div>

      {/* Add form */}
      <Card><CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Add New Exam Schedule</p>
        <div className="flex gap-3 flex-wrap">
          <Select value={bulkCls} onValueChange={v => { setBulkCls(v); setBulkExam(getExamTypes(v)[0]); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={bulkExam} onValueChange={setBulkExam}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{getExamTypes(bulkCls).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" value={bulkYear} onChange={e => setBulkYear(Number(e.target.value))} className="w-24" />
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <Select value={row.subject} onValueChange={v => updateRow(i, "subject", v)}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>{getSubjects(bulkCls).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={row.exam_date} onChange={e => updateRow(i, "exam_date", e.target.value)} />
              <Input type="time" value={row.start_time} onChange={e => updateRow(i, "start_time", e.target.value)} placeholder="Start" />
              <Input type="time" value={row.end_time} onChange={e => updateRow(i, "end_time", e.target.value)} placeholder="End" />
              <div className="flex gap-1">
                <Input value={row.hall} onChange={e => updateRow(i, "hall", e.target.value)} placeholder="Hall" />
                {rows.length > 1 && <Button size="sm" variant="ghost" onClick={() => removeRow(i)} className="text-destructive px-2"><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-3.5 h-3.5 mr-1" /> Add Row</Button>
          <Button size="sm" onClick={handleBulkSave} disabled={saving}>{saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}Save All</Button>
        </div>
      </CardContent></Card>

      {/* View existing */}
      <div className="flex gap-2 flex-wrap">
        {classes.map(c => <button key={c} onClick={() => { setFilterCls(c); setFilterExam(getExamTypes(c)[0]); }} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterCls === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Class {c}</button>)}
      </div>
      <div className="flex gap-2">{getExamTypes(filterCls).map(e => <button key={e} onClick={() => setFilterExam(e)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterExam === e ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>{e}</button>)}</div>

      {isLoading ? <Skeleton className="h-32 rounded-xl" /> : (
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No schedule for this class yet.</p>}
          {filtered.map(e => (
            <div key={e.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {format(new Date(e.exam_date), "dd\nMMM").split("\n").map((t, i) => <div key={i}>{t}</div>)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{e.subject}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(e.exam_date), "EEEE, dd MMMM yyyy")}{e.start_time ? ` · ${e.start_time}${e.end_time ? `–${e.end_time}` : ""}` : ""}{e.hall ? ` · ${e.hall}` : ""}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete this exam entry?</AlertDialogTitle></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteEntry.mutateAsync(e.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AdminExtras = () => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-heading font-bold text-foreground">Extras Management</h2>
      <p className="text-sm text-muted-foreground">Daily quotes, honor roll, exam schedule</p>
    </div>
    <Tabs defaultValue="quotes">
      <TabsList>
        <TabsTrigger value="quotes">🌙 Daily Quotes</TabsTrigger>
        <TabsTrigger value="honor">🏅 Honor Roll</TabsTrigger>
        <TabsTrigger value="schedule">📅 Exam Schedule</TabsTrigger>
      </TabsList>
      <TabsContent value="quotes" className="mt-4"><QuotesManager /></TabsContent>
      <TabsContent value="honor" className="mt-4"><HonorRollManager /></TabsContent>
      <TabsContent value="schedule" className="mt-4"><ExamScheduleManager /></TabsContent>
    </Tabs>
  </div>
);

export default AdminExtras;
