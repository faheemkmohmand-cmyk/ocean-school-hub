import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  useNoteSubjects, useNoteChapters, useNoteQuiz, useNoteQuestions,
  useMutateSubject, useMutateChapter, useMutateQuestion,
  NoteSubject, NoteChapter, NoteQuestion
} from "@/hooks/useNotes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, BookOpen, ChevronRight, ArrowLeft,
  Eye, EyeOff, Loader2, Save, Zap, HelpCircle, BarChart2
} from "lucide-react";
import toast from "react-hot-toast";

type View = "subjects" | "chapters" | "chapter-edit" | "quiz";

// ── Rich Text Toolbar ─────────────────────────────────────────────────────────
const BOXES = [
  { id: "tip",     label: "💡 Tip",     bg: "#FEF9C3", border: "#FDE047", text: "#713F12" },
  { id: "example", label: "📝 Example", bg: "#F0FDF4", border: "#86EFAC", text: "#14532D" },
  { id: "warning", label: "⚠️ Warning", bg: "#FEF2F2", border: "#FCA5A5", text: "#7F1D1D" },
  { id: "info",    label: "ℹ️ Info",    bg: "#EFF6FF", border: "#93C5FD", text: "#1E3A8A" },
  { id: "formula", label: "🔢 Formula", bg: "#FAF5FF", border: "#C4B5FD", text: "#4C1D95" },
];

function insertBox(ta: HTMLTextAreaElement, type: string, setContent: (v: string) => void) {
  const box = BOXES.find(b => b.id === type);
  if (!box) return;
  const snippet = `\n<div style="background:${box.bg};border-left:4px solid ${box.border};padding:14px 16px;border-radius:8px;margin:12px 0;color:${box.text}">\n  ${box.label}: Write here...\n</div>\n`;
  const val = ta.value;
  const start = ta.selectionStart;
  const newVal = val.slice(0, start) + snippet + val.slice(start);
  setContent(newVal);
}

// ── Subject Form ──────────────────────────────────────────────────────────────
const SubjectForm = ({ initial, onSave, onCancel }: { initial?: NoteSubject | null; onSave: (data: Partial<NoteSubject>) => void; onCancel: () => void }) => {
  const [form, setForm] = useState({
    name: initial?.name || "", slug: initial?.slug || "", emoji: initial?.emoji || "📚",
    color: initial?.color || "#6366f1", description: initial?.description || "",
    class_level: initial?.class_level || "6-10", is_visible: initial?.is_visible ?? true,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Card>
      <CardHeader><CardTitle>{initial ? "Edit Subject" : "New Subject"}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label>Subject Name *</Label><Input value={form.name} onChange={e => { set("name", e.target.value); if (!initial) set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Mathematics" /></div>
          <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="mathematics" /></div>
          <div><Label>Class Level</Label><Input value={form.class_level} onChange={e => set("class_level", e.target.value)} placeholder="6-10" /></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label>Emoji Icon</Label><Input value={form.emoji} onChange={e => set("emoji", e.target.value)} placeholder="📚" className="text-2xl" /></div>
          <div><Label>Color</Label>
            <div className="flex gap-2 mt-1">
              <input type="color" value={form.color} onChange={e => set("color", e.target.value)} className="w-12 h-10 rounded cursor-pointer border" />
              <Input value={form.color} onChange={e => set("color", e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6"><Switch checked={form.is_visible} onCheckedChange={v => set("is_visible", v)} /><Label>Visible to students</Label></div>
        </div>
        <div><Label>Description</Label><Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="What students will learn..." /></div>
        <div className="flex gap-2">
          <Button onClick={() => onSave({ ...form, ...(initial ? { id: initial.id } : {}) })} className="gap-2"><Save className="w-4 h-4" /> Save Subject</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Chapter Form ──────────────────────────────────────────────────────────────
const ChapterForm = ({ initial, subjectId, onSave, onCancel }: {
  initial?: NoteChapter | null; subjectId: string; onSave: (d: Partial<NoteChapter>) => void; onCancel: () => void;
}) => {
  const taRef = useState<HTMLTextAreaElement | null>(null);
  const [ta, setTa] = useState<HTMLTextAreaElement | null>(null);
  const [form, setForm] = useState({
    title: initial?.title || "", slug: initial?.slug || "",
    description: initial?.description || "", content: initial?.content || "",
    animation_code: initial?.animation_code || "",
    graph_config: initial?.graph_config ? JSON.stringify(initial.graph_config, null, 2) : "",
    pdf_url: initial?.pdf_url || "", read_time_mins: initial?.read_time_mins ?? 5,
    difficulty: initial?.difficulty ?? "medium", chapter_number: initial?.chapter_number ?? 1,
    is_published: initial?.is_published ?? false,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const [tab, setTab] = useState("content");

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    let gc = null;
    if (form.graph_config.trim()) {
      try { gc = JSON.parse(form.graph_config); } catch { toast.error("Graph config must be valid JSON"); return; }
    }
    onSave({ ...form, subject_id: subjectId, graph_config: gc, ...(initial ? { id: initial.id } : {}) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <h2 className="text-xl font-bold">{initial ? `Edit: ${initial.title}` : "New Chapter"}</h2>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="content">📝 Content</TabsTrigger><TabsTrigger value="interactive">⚡ Interactive</TabsTrigger><TabsTrigger value="settings">⚙️ Settings</TabsTrigger></TabsList>
      </Tabs>

      {tab === "content" && (
        <Card><CardContent className="pt-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>Chapter Title *</Label><Input value={form.title} onChange={e => { set("title", e.target.value); if (!initial) set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Introduction to Algebra" /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={e => set("slug", e.target.value)} /></div>
            <div><Label>Chapter #</Label><Input type="number" value={form.chapter_number} onChange={e => set("chapter_number", +e.target.value)} /></div>
          </div>
          <div><Label>Short Description</Label><Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief overview of chapter" /></div>

          {/* Toolbar */}
          <div>
            <Label className="mb-2 block">Content (HTML supported)</Label>
            <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-secondary rounded-xl border border-border">
              {[["<strong>B</strong>", "<strong>Bold text</strong>"], ["<em>I</em>", "<em>Italic text</em>"],
                ["H2", "<h2>Section Title</h2>"], ["H3", "<h3>Sub Section</h3>"],
                ["• List", "<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>"],
                ["Table", "<table border='1' style='border-collapse:collapse;width:100%'>\n  <tr><th>Header 1</th><th>Header 2</th></tr>\n  <tr><td>Cell 1</td><td>Cell 2</td></tr>\n</table>"],
              ].map(([label, snippet]) => (
                <button key={label as string} type="button"
                  onClick={() => { if (ta) { const v = ta.value; const s = ta.selectionStart; setForm(p => ({ ...p, content: v.slice(0, s) + snippet + v.slice(s) })); } }}
                  className="px-2.5 py-1 bg-card border border-border rounded-lg text-xs font-semibold hover:bg-secondary"
                  dangerouslySetInnerHTML={{ __html: label as string }} />
              ))}
              <div className="w-px bg-border mx-1" />
              {BOXES.map(b => (
                <button key={b.id} type="button"
                  onClick={() => { if (ta) insertBox(ta, b.id, v => setForm(p => ({ ...p, content: v }))); }}
                  className="px-2.5 py-1 bg-card border border-border rounded-lg text-xs hover:bg-secondary">{b.label}</button>
              ))}
            </div>
            <textarea ref={el => setTa(el)} value={form.content} onChange={e => set("content", e.target.value)}
              rows={18} placeholder="Paste or type HTML content here..."
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring resize-y" />
          </div>

          {/* Preview */}
          {form.content && (
            <div>
              <Label className="mb-2 block">Preview</Label>
              <div className="border border-border rounded-xl p-6 prose prose-sm max-w-none dark:prose-invert max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: form.content }} />
            </div>
          )}
        </CardContent></Card>
      )}

      {tab === "interactive" && (
        <Card><CardContent className="pt-5 space-y-4">
          <div>
            <Label className="mb-1 block">
              Custom Animation / Interactive Code (JavaScript)
              <span className="ml-2 text-xs text-muted-foreground font-normal">Use "container" variable to add elements</span>
            </Label>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-700 dark:text-amber-400">
              <p className="font-semibold mb-1">💡 Example: Simple pendulum animation</p>
              <code className="block whitespace-pre">{`container.innerHTML = '<canvas id="c" width="300" height="200"></canvas>';
const c = container.querySelector('#c').getContext('2d');
let angle = 0;
setInterval(() => {
  c.clearRect(0,0,300,200);
  c.beginPath(); c.arc(150,20,5,0,Math.PI*2); c.fill();
  const x = 150 + Math.sin(angle)*80;
  const y = 20 + Math.cos(angle)*80;
  c.beginPath(); c.moveTo(150,20); c.lineTo(x,y); c.stroke();
  c.beginPath(); c.arc(x,y,15,0,Math.PI*2); c.fill();
  angle += 0.05;
}, 16);`}</code>
            </div>
            <textarea value={form.animation_code} onChange={e => set("animation_code", e.target.value)}
              rows={14} placeholder="// JavaScript code for interactive demo..."
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-ring resize-y" />
          </div>

          <div>
            <Label className="mb-1 block">Graph / Chart Configuration (JSON)</Label>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-3 mb-3 text-xs text-blue-700 dark:text-blue-400">
              <p className="font-semibold">ℹ️ Paste any Recharts or chart config JSON here</p>
            </div>
            <textarea value={form.graph_config} onChange={e => set("graph_config", e.target.value)}
              rows={8} placeholder='{"type": "bar", "data": [...]}'
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-ring resize-y" />
          </div>
        </CardContent></Card>
      )}

      {tab === "settings" && (
        <Card><CardContent className="pt-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>Difficulty</Label>
              <select value={form.difficulty} onChange={e => set("difficulty", e.target.value)}
                className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm">
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
            <div><Label>Read Time (minutes)</Label><Input type="number" value={form.read_time_mins} onChange={e => set("read_time_mins", +e.target.value)} /></div>
            <div><Label>PDF URL (optional)</Label><Input value={form.pdf_url} onChange={e => set("pdf_url", e.target.value)} placeholder="https://..." /></div>
          </div>
          <div className="flex items-center gap-3"><Switch checked={form.is_published} onCheckedChange={v => set("is_published", v)} /><Label>Published (visible to students)</Label></div>
        </CardContent></Card>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Save Chapter</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

// ── Quiz Manager ──────────────────────────────────────────────────────────────
const QuizManager = ({ chapterId, onBack }: { chapterId: string; onBack: () => void }) => {
  const qc = useQueryClient();
  const { data: quiz } = useNoteQuiz(chapterId);
  const { data: questions = [], isLoading } = useNoteQuestions(quiz?.id);
  const { upsert, remove } = useMutateQuestion();
  const [editQ, setEditQ] = useState<Partial<NoteQuestion> | null>(null);
  const [saving, setSaving] = useState(false);

  const blankQ = (): Partial<NoteQuestion> => ({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct: "a", explanation: "", display_order: questions.length });

  const createQuiz = async () => {
    if (quiz) return;
    const { error } = await supabase.from("note_quizzes").insert({ chapter_id: chapterId, title: "Chapter Quiz", pass_score: 60, is_active: true });
    if (error) toast.error("Failed to create quiz");
    else { toast.success("Quiz created!"); qc.invalidateQueries({ queryKey: ["note-quiz", chapterId] }); }
  };

  const saveQ = async () => {
    if (!editQ || !quiz) return;
    if (!editQ.question?.trim()) { toast.error("Question required"); return; }
    setSaving(true);
    await upsert.mutateAsync({ ...editQ, quiz_id: quiz.id });
    toast.success("Question saved!");
    setEditQ(null);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="w-4 h-4" /> Back to Chapters</Button>
        <h2 className="text-xl font-bold flex items-center gap-2"><HelpCircle className="w-5 h-5 text-violet-500" /> Quiz Manager</h2>
      </div>

      {!quiz ? (
        <Card><CardContent className="py-12 text-center">
          <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">No quiz for this chapter yet</p>
          <Button onClick={createQuiz} className="mt-3 gap-2"><Plus className="w-4 h-4" /> Create Quiz</Button>
        </CardContent></Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <Badge variant="secondary">{questions.length} questions</Badge>
            <Button onClick={() => setEditQ(blankQ())} className="gap-2" size="sm"><Plus className="w-4 h-4" /> Add Question</Button>
          </div>

          {/* Question form */}
          {editQ && (
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="text-base">{editQ.id ? "Edit Question" : "New Question"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Question *</Label><textarea value={editQ.question} onChange={e => setEditQ(p => ({ ...p!, question: e.target.value }))} rows={3} className="w-full mt-1 rounded-xl border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(["a","b","c","d"] as const).map(opt => (
                    <div key={opt}>
                      <Label>Option {opt.toUpperCase()}</Label>
                      <Input value={(editQ as any)[`option_${opt}`] || ""} onChange={e => setEditQ(p => ({ ...p!, [`option_${opt}`]: e.target.value }))} placeholder={`Option ${opt.toUpperCase()}`} className="mt-1" />
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Correct Answer</Label>
                    <select value={editQ.correct} onChange={e => setEditQ(p => ({ ...p!, correct: e.target.value as any }))}
                      className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option>
                    </select>
                  </div>
                  <div><Label>Explanation (optional)</Label><Input value={editQ.explanation || ""} onChange={e => setEditQ(p => ({ ...p!, explanation: e.target.value }))} className="mt-1" /></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveQ} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</Button>
                  <Button variant="outline" onClick={() => setEditQ(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions list */}
          {isLoading ? <Skeleton className="h-32 rounded-2xl" /> : questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 text-sm">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm mb-1">{q.question}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(["a","b","c","d"] as const).map(opt => (
                      <p key={opt} className={`text-xs px-2 py-1 rounded ${q.correct === opt ? "bg-green-100 text-green-700 font-bold" : "text-muted-foreground"}`}>
                        {opt.toUpperCase()}. {(q as any)[`option_${opt}`]}
                        {q.correct === opt && " ✓"}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setEditQ(q)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(q.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

// ── Main Admin Notes Manager ──────────────────────────────────────────────────
const AdminNotes = () => {
  const [view, setView] = useState<View>("subjects");
  const [selectedSubject, setSelectedSubject] = useState<NoteSubject | null>(null);
  const [editingSubject, setEditingSubject] = useState<NoteSubject | null | "new">(null);
  const [selectedChapter, setSelectedChapter] = useState<NoteChapter | null>(null);
  const [editingChapter, setEditingChapter] = useState<NoteChapter | null | "new">(null);

  const { data: subjects = [], isLoading: loadingSubjects } = useNoteSubjects(true);
  const { data: chapters = [], isLoading: loadingChapters } = useNoteChapters(selectedSubject?.id, true);
  const { upsert: upsertSubject, remove: removeSubject } = useMutateSubject();
  const { upsert: upsertChapter, remove: removeChapter } = useMutateChapter();

  // ── SUBJECTS VIEW ────────────────────────────────────────────────────────────
  if (view === "subjects" && !editingSubject) return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> Notes Manager</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all subjects, chapters, quizzes and interactive content</p>
        </div>
        <Button onClick={() => setEditingSubject("new")} className="gap-2"><Plus className="w-4 h-4" /> Add Subject</Button>
      </div>

      {loadingSubjects ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: s.color }} />
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">Class {s.class_level} · {!s.is_visible && <span className="text-amber-500">Hidden</span>}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1"
                    onClick={() => { setSelectedSubject(s); setView("chapters"); }}>
                    <ChevronRight className="w-3.5 h-3.5" /> Chapters
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingSubject(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete subject and all chapters?")) removeSubject.mutate(s.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (editingSubject) return (
    <SubjectForm
      initial={editingSubject === "new" ? null : editingSubject}
      onSave={async (data) => {
        await upsertSubject.mutateAsync(data);
        toast.success("Subject saved!");
        setEditingSubject(null);
      }}
      onCancel={() => setEditingSubject(null)}
    />
  );

  // ── CHAPTERS VIEW ────────────────────────────────────────────────────────────
  if (view === "chapters" && selectedSubject && !editingChapter) return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("subjects")} className="gap-1"><ArrowLeft className="w-4 h-4" /> Subjects</Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selectedSubject.emoji}</span>
            <div>
              <h2 className="text-xl font-bold">{selectedSubject.name}</h2>
              <p className="text-xs text-muted-foreground">{chapters.length} chapters</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setEditingChapter("new")} className="gap-2"><Plus className="w-4 h-4" /> Add Chapter</Button>
      </div>

      {loadingChapters ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : chapters.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold">No chapters yet</p>
          <Button onClick={() => setEditingChapter("new")} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Add First Chapter</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {chapters.map(ch => (
            <Card key={ch.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shrink-0"
                  style={{ backgroundColor: selectedSubject.color }}>{ch.chapter_number}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{ch.title}</h3>
                    <Badge className={ch.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}>
                      {ch.is_published ? "Published" : "Draft"}
                    </Badge>
                    {ch.animation_code && <Badge className="bg-violet-100 text-violet-700"><Zap className="w-3 h-3 mr-1" />Interactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ch.read_time_mins} min · {ch.difficulty} · {ch.view_count} views</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1"
                    onClick={() => { setSelectedChapter(ch); setView("quiz"); }}>
                    <HelpCircle className="w-3.5 h-3.5" /> Quiz
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingChapter(ch)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive"
                    onClick={() => { if (confirm("Delete this chapter?")) removeChapter.mutate(ch.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (editingChapter && selectedSubject) return (
    <ChapterForm
      initial={editingChapter === "new" ? null : editingChapter}
      subjectId={selectedSubject.id}
      onSave={async (data) => {
        await upsertChapter.mutateAsync(data);
        toast.success("Chapter saved!");
        setEditingChapter(null);
      }}
      onCancel={() => setEditingChapter(null)}
    />
  );

  if (view === "quiz" && selectedChapter) return (
    <QuizManager chapterId={selectedChapter.id} onBack={() => { setView("chapters"); setSelectedChapter(null); }} />
  );

  return null;
};

export default AdminNotes;
