import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  useNoteSubjects, useNoteChapters, useNoteQuiz, useNoteQuestions,
  useFlashcards, useMutateSubject, useMutateChapter, useMutateQuestion, useMutateFlashcard,
  NoteSubject, NoteChapter, NoteQuestion, Flashcard
} from "@/hooks/useNotes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Pencil, Trash2, BookOpen, ChevronRight, ArrowLeft,
  Loader2, Save, Zap, HelpCircle, RotateCcw, Play, Eye, EyeOff
} from "lucide-react";
import toast from "react-hot-toast";

type View = "subjects" | "chapters" | "chapter-edit" | "quiz" | "flashcards";

const BOXES = [
  { id: "tip",     label: "💡 Tip",     bg: "#FEF9C3", border: "#FDE047", text: "#713F12" },
  { id: "example", label: "📝 Example", bg: "#F0FDF4", border: "#86EFAC", text: "#14532D" },
  { id: "warning", label: "⚠️ Warning", bg: "#FEF2F2", border: "#FCA5A5", text: "#7F1D1D" },
  { id: "info",    label: "ℹ️ Info",    bg: "#EFF6FF", border: "#93C5FD", text: "#1E3A8A" },
  { id: "formula", label: "🔢 Formula", bg: "#FAF5FF", border: "#C4B5FD", text: "#4C1D95" },
];

function insertBox(ta: HTMLTextAreaElement | null, type: string, setContent: (v: string) => void) {
  if (!ta) return;
  const box = BOXES.find(b => b.id === type);
  if (!box) return;
  const snippet = `\n<div style="background:${box.bg};border-left:4px solid ${box.border};padding:14px 16px;border-radius:8px;margin:12px 0;color:${box.text}">\n  ${box.label}: Write here...\n</div>\n`;
  const val = ta.value, start = ta.selectionStart;
  setContent(val.slice(0, start) + snippet + val.slice(start));
}

// ── p5.js wrapper: wraps bare p5 sketch code into full HTML ──────────────────
// Uses p5 GLOBAL MODE — sketch runs as a plain <script> after p5 loads.
// Global mode means p5 auto-calls window.setup and window.draw.
// Do NOT use IIFE or instance mode — that's what breaks the preview.
function wrapP5Code(code: string): string {
  const trimmed = code.trim().toLowerCase();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    return code;
  }

  const safe = code.replace(/<\/script>/gi, "<\\/script>");

  const isP5 = /\bfunction\s+setup\s*\(/.test(code) || /\bfunction\s+draw\s*\(/.test(code);

  if (isP5) {
    // p5 GLOBAL MODE — load library, then sketch. p5 calls setup/draw automatically.
    return [
      "<!DOCTYPE html><html><head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
      "<style>",
      "*{margin:0;padding:0;box-sizing:border-box}",
      "html,body{width:100%;height:100%;overflow:hidden;background:#f8f9ff}",
      "canvas{display:block;touch-action:none}",
      "</style>",
      "</head><body>",
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>',
      "<script>" + safe + "</script>",
      "</body></html>",
    ].join("");
  }

  return [
    "<!DOCTYPE html><html><head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
    "<style>",
    "*{margin:0;padding:0;box-sizing:border-box}",
    "html,body{width:100%;height:100%;overflow:hidden;background:#f8f9ff;font-family:sans-serif}",
    "canvas{display:block;touch-action:none}",
    "</style>",
    "</head><body>",
    "<script>" + safe + "</script>",
    "</body></html>",
  ].join("");
}


// ── p5.js template sketches ──────────────────────────────────────────────────
const P5_TEMPLATES: Record<string, { label: string; emoji: string; code: string }> = {
  pendulum: {
    label: "Pendulum",
    emoji: "🔮",
    code: `// Simple Pendulum — SHM
let angle = Math.PI / 5;
let angleV = 0;
let len;

function setup() {
  createCanvas(windowWidth, windowHeight);
  len = min(width, height) * 0.55;
  textAlign(CENTER);
}

function draw() {
  background(248, 249, 255);
  translate(width / 2, height * 0.08);

  let angleA = (-9.8 / len) * sin(angle);
  angleV += angleA * 0.05;
  angle += angleV * 0.05;

  let bx = len * sin(angle);
  let by = len * cos(angle);

  // Rod
  stroke(100, 110, 130);
  strokeWeight(2);
  line(0, 0, bx, by);

  // Pivot
  fill(55, 65, 81);
  noStroke();
  circle(0, 0, 14);

  // Bob
  fill(124, 58, 237);
  stroke(91, 33, 182);
  strokeWeight(2.5);
  circle(bx, by, min(width, height) * 0.085);

  // Labels
  noStroke();
  fill(55, 65, 81);
  textSize(max(12, width * 0.025));
  text("θ = " + nf(degrees(angle), 1, 1) + "°", 0, by + min(width,height)*0.07);
  fill(124, 58, 237);
  textSize(max(11, width * 0.022));
  text("Simple Harmonic Motion  |  a ∝ −x", 0, height * 0.88);
}`,
  },
  wave: {
    label: "Waves",
    emoji: "🌊",
    code: `// Transverse vs Longitudinal Waves
let t = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(LEFT, CENTER);
}

function draw() {
  background(240, 249, 255);
  t += 0.05;

  let mid = height / 2;
  let amp = height * 0.12;
  let spacing = width / 18;

  // ── Transverse wave (top half)
  fill(8, 145, 178);
  noStroke();
  textSize(max(12, width * 0.025));
  text("Transverse Wave (light, water surface)", width * 0.04, height * 0.12);

  for (let i = 0; i < 18; i++) {
    let x = spacing * i + spacing / 2;
    let y = mid * 0.45 + sin(i * 0.55 + t) * amp;
    fill(lerpColor(color(99, 102, 241), color(16, 185, 129), (sin(i - t) + 1) / 2));
    noStroke();
    circle(x, y, max(10, width * 0.022));
  }

  // Divider
  stroke(200, 220, 240);
  strokeWeight(1);
  line(width * 0.04, mid, width * 0.96, mid);

  // ── Longitudinal wave (bottom half)
  noStroke();
  fill(5, 150, 105);
  text("Longitudinal Wave (sound)", width * 0.04, height * 0.6);

  for (let i = 0; i < 18; i++) {
    let baseX = spacing * i + spacing / 2;
    let x = baseX + sin(i * 0.7 - t) * (spacing * 0.45);
    let compression = abs(sin(i * 0.7 - t));
    fill(5, 150, 105, 80 + compression * 160);
    let bw = max(4, spacing * (0.3 + compression * 0.5));
    rect(x - bw / 2, mid * 1.28, bw, height * 0.1, 4);
  }

  noStroke();
  fill(100, 120, 140);
  textSize(max(11, width * 0.022));
  text("v = fλ    (speed = frequency × wavelength)", width * 0.04, height * 0.9);
}`,
  },
  spring: {
    label: "Spring",
    emoji: "🔧",
    code: `// Mass-Spring — Hooke's Law
let pos, vel, eq, k, m;

function setup() {
  createCanvas(windowWidth, windowHeight);
  eq = width * 0.55;
  pos = eq;
  vel = 0;
  k = 8;
  m = 1;
  textAlign(LEFT, CENTER);
}

function draw() {
  background(248, 249, 255);

  let F = -k * (pos - eq);
  let a = F / m;
  vel += a * 0.016;
  pos += vel;
  pos = constrain(pos, width * 0.22, width * 0.85);

  let wallW = width * 0.04;
  let boxW = width * 0.1;
  let boxH = height * 0.18;
  let boxY = height / 2 - boxH / 2;

  // Wall
  fill(55, 65, 81);
  noStroke();
  rect(0, boxY - 10, wallW, boxH + 20, 0, 4, 4, 0);

  // Spring (zigzag)
  let coils = 14;
  let sx1 = wallW;
  let sx2 = pos - boxW / 2;
  let sy = height / 2;
  stroke(99, 102, 241);
  strokeWeight(max(2, width * 0.004));
  noFill();
  beginShape();
  vertex(sx1, sy);
  for (let i = 1; i <= coils; i++) {
    let cx = map(i, 0, coils + 1, sx1, sx2);
    let cy = sy + (i % 2 === 0 ? -1 : 1) * height * 0.06;
    vertex(cx, cy);
  }
  vertex(sx2, sy);
  endShape();

  // Mass block
  fill(124, 58, 237);
  stroke(91, 33, 182);
  strokeWeight(2);
  rect(pos - boxW / 2, boxY, boxW, boxH, 8);
  fill(255);
  noStroke();
  textSize(max(14, width * 0.03));
  textAlign(CENTER, CENTER);
  text("m", pos, height / 2);

  // Equilibrium dashed line
  stroke(150, 160, 170);
  strokeWeight(1);
  drawingContext.setLineDash([5, 5]);
  line(eq, boxY - 20, eq, boxY + boxH + 20);
  drawingContext.setLineDash([]);

  // Label
  noStroke();
  fill(55, 65, 81);
  textAlign(LEFT, CENTER);
  textSize(max(12, width * 0.025));
  text("F = −kx = " + nf(-k * (pos - eq) / 50, 1, 1) + " N", width * 0.05, height * 0.88);
  fill(99, 102, 241);
  textAlign(RIGHT, CENTER);
  text("Hooke's Law", width * 0.96, height * 0.88);
}`,
  },
  blank: {
    label: "Blank",
    emoji: "📄",
    code: `// Your p5.js sketch
// Paste or write your code here
// setup() and draw() are required

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(248, 249, 255);
}

function draw() {
  // Animation loop — runs ~60fps
  // windowWidth and windowHeight auto-resize to mobile/desktop

  fill(99, 102, 241);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(max(16, width * 0.035));
  text("Write your p5.js sketch above ✨", width / 2, height / 2);
}`,
  },
};

// ── p5.js Code Playground (Admin) ────────────────────────────────────────────
const P5Playground = ({
  animCode, onAnimChange
}: {
  animCode: string;
  onAnimChange: (v: string) => void;
}) => {
  const [code, setCode] = useState(animCode || "");
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string>("");

  // Use blob URL for preview — bypasses parent-page CSP so p5.js CDN loads fine
  useEffect(() => {
    if (!code.trim()) { setBlobUrl(""); return; }
    const html = wrapP5Code(code);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [code, previewKey]);

  const handleChange = (v: string) => {
    setCode(v);
    onAnimChange(v);
  };

  const applyTemplate = (key: string) => {
    const t = P5_TEMPLATES[key];
    if (!t) return;
    handleChange(t.code);
    setShowPreview(true);
    setPreviewKey(k => k + 1);
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-700/30 rounded-2xl p-4">
          <p className="text-sm font-bold text-violet-700 dark:text-violet-300 mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4" /> p5.js Interactive Animation
          </p>
          <p className="text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
            Paste your <strong>p5.js sketch code</strong> (just the <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded">setup()</code> and <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded">draw()</code> functions — no boilerplate needed).
            Students see a fully responsive, mobile-friendly live animation below the chapter notes.
          </p>
        </div>

        {/* Templates */}
        <div>
          <Label className="mb-2 block text-sm font-semibold">Example Sketches</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(P5_TEMPLATES).map(([key, t]) => (
              <button key={key} onClick={() => applyTemplate(key)}
                className="px-3 py-1.5 bg-secondary hover:bg-primary hover:text-primary-foreground border border-border rounded-xl text-xs font-semibold transition-all">
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Editor + preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">p5.js Sketch Code</Label>
            <button
              onClick={() => { setShowPreview(v => !v); setPreviewKey(k => k + 1); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
              {showPreview ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Preview</>}
            </button>
          </div>

          <div className={`grid gap-4 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {/* Code area */}
            <div>
              <textarea
                value={code}
                onChange={e => handleChange(e.target.value)}
                rows={showPreview ? 24 : 22}
                spellCheck={false}
                placeholder={"// Paste your p5.js sketch here\n// Just setup() and draw() — no HTML needed!\n\nfunction setup() {\n  createCanvas(windowWidth, windowHeight);\n  background(248, 249, 255);\n}\n\nfunction draw() {\n  // Your animation here...\n}"}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-ring resize-y leading-relaxed"
                style={{ minHeight: "440px", tabSize: 2 }}
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
                <span>{code.length.toLocaleString()} chars</span>
                <span>•</span>
                <span>p5.js 1.9.4 via CDN</span>
                <span>•</span>
                <span>Auto-resizes on mobile</span>
              </p>
            </div>

            {/* Live preview */}
            {showPreview && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Live Preview</p>
                  <button onClick={() => setPreviewKey(k => k + 1)}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline px-2">
                    <RotateCcw className="w-3 h-3" /> Reload
                  </button>
                </div>
                <div className="rounded-2xl overflow-hidden border-2 border-violet-200 dark:border-violet-700/40 shadow-lg" style={{ height: "440px" }}>
                  {blobUrl ? (
                    <iframe
                      key={previewKey}
                      src={blobUrl}
                      style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                      title="p5.js Preview"
                      allow="accelerometer; gyroscope"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm bg-muted/30">
                      Paste code to see preview
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  🔒 Sandboxed — exactly what students see
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-xl p-3 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">💡 p5.js tips</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
            <p>• Use <code className="bg-background px-1 rounded">windowWidth / windowHeight</code> for responsive canvas</p>
            <p>• <code className="bg-background px-1 rounded">mouseX, mouseY</code> work on desktop; <code className="bg-background px-1 rounded">touches[]</code> on mobile</p>
            <p>• <code className="bg-background px-1 rounded">mousePressed()</code> fires on both tap and click</p>
            <p>• <code className="bg-background px-1 rounded">windowResized()</code> is auto-called on orientation change</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Subject Form ──────────────────────────────────────────────────────────────
const SubjectForm = ({ initial, onSave, onCancel }: { initial?: NoteSubject | null; onSave: (d: Partial<NoteSubject>) => void; onCancel: () => void }) => {
  const [form, setForm] = useState({
    name: initial?.name||"", slug: initial?.slug||"", emoji: initial?.emoji||"📚",
    color: initial?.color||"#6366f1", description: initial?.description||"",
    class_level: initial?.class_level||"6-10", is_visible: initial?.is_visible??true,
  });
  const set = (k: string, v: any) => setForm(p=>({...p,[k]:v}));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{initial?"Edit Subject":"New Subject"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e=>{set("name",e.target.value);if(!initial)set("slug",e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""));}} placeholder="Mathematics" className="mt-1" /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={e=>set("slug",e.target.value)} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><Label>Emoji</Label><Input value={form.emoji} onChange={e=>set("emoji",e.target.value)} className="mt-1 text-2xl" /></div>
          <div><Label>Color</Label>
            <div className="flex gap-2 mt-1"><input type="color" value={form.color} onChange={e=>set("color",e.target.value)} className="w-11 h-10 rounded cursor-pointer border" /><Input value={form.color} onChange={e=>set("color",e.target.value)} className="font-mono flex-1" /></div>
          </div>
          <div><Label>Class Level</Label><Input value={form.class_level} onChange={e=>set("class_level",e.target.value)} placeholder="6-10" className="mt-1" /></div>
        </div>
        <div><Label>Description</Label><Input value={form.description} onChange={e=>set("description",e.target.value)} className="mt-1" /></div>
        <div className="flex items-center gap-3"><Switch checked={form.is_visible} onCheckedChange={v=>set("is_visible",v)} /><Label>Visible to students</Label></div>
        <div className="flex gap-2 pt-2">
          <Button onClick={()=>onSave({...form,...(initial?{id:initial.id}:{})})} className="gap-2 flex-1 sm:flex-none"><Save className="w-4 h-4" /> Save</Button>
          <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Chapter Form ──────────────────────────────────────────────────────────────
const ChapterForm = ({ initial, subjectId, onSave, onCancel }: {
  initial?: NoteChapter|null; subjectId: string; onSave: (d: Partial<NoteChapter>)=>void; onCancel: ()=>void;
}) => {
  const [ta, setTa] = useState<HTMLTextAreaElement|null>(null);
  const [tab, setTab] = useState("content");
  const [form, setForm] = useState({
    title: initial?.title||"", slug: initial?.slug||"",
    description: initial?.description||"", content: initial?.content||"",
    animation_code: initial?.animation_code||"",
    graph_config: initial?.graph_config?JSON.stringify(initial.graph_config,null,2):"",
    pdf_url: initial?.pdf_url||"", read_time_mins: initial?.read_time_mins??5,
    difficulty: initial?.difficulty??"medium", chapter_number: initial?.chapter_number??1,
    is_published: initial?.is_published??false, audio_enabled: initial?.audio_enabled??true,
  });
  const set = (k: string, v: any) => setForm(p=>({...p,[k]:v}));

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    let gc = null;
    if (form.graph_config.trim()) {
      try { gc = JSON.parse(form.graph_config); } catch { toast.error("Graph config: invalid JSON"); return; }
    }
    onSave({...form, subject_id:subjectId, graph_config:gc, ...(initial?{id:initial.id}:{})});
  };

  const tabs = [
    { id:"content",     label:"📝 Content",     short:"📝" },
    { id:"interactive", label:"⚡ Interactive",  short:"⚡" },
    { id:"settings",    label:"⚙️ Settings",    short:"⚙️" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1 shrink-0"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <h2 className="text-lg font-bold truncate">{initial?`Edit: ${initial.title}`:"New Chapter"}</h2>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-2xl bg-secondary p-1 gap-1">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab===t.id?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab==="content" && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2"><Label>Chapter Title *</Label><Input value={form.title} onChange={e=>{set("title",e.target.value);if(!initial)set("slug",e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""));}} placeholder="Introduction to Algebra" className="mt-1" /></div>
              <div><Label>Chapter #</Label><Input type="number" value={form.chapter_number} onChange={e=>set("chapter_number",+e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label>Short Description</Label><Input value={form.description} onChange={e=>set("description",e.target.value)} className="mt-1" /></div>

            {/* Toolbar */}
            <div>
              <Label className="mb-2 block">Content (HTML)</Label>
              <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-secondary rounded-xl border border-border">
                {[["<b>B</b>","<strong>Bold</strong>"],["<i>I</i>","<em>Italic</em>"],["H2","<h2>Section Title</h2>"],["H3","<h3>Sub Title</h3>"],
                  ["• List","<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>"],
                  ["Table","<table border='1' style='border-collapse:collapse;width:100%'>\n  <tr><th>Header 1</th><th>Header 2</th></tr>\n  <tr><td>Cell 1</td><td>Cell 2</td></tr>\n</table>"],
                ].map(([label,snippet])=>(
                  <button key={label as string} type="button"
                    onClick={()=>{if(ta){const v=ta.value,s=ta.selectionStart;set("content",v.slice(0,s)+snippet+v.slice(s));}}}
                    className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs font-semibold hover:bg-muted min-h-[36px]"
                    dangerouslySetInnerHTML={{__html:label as string}} />
                ))}
                <div className="w-px bg-border mx-1" />
                {BOXES.map(b=>(
                  <button key={b.id} type="button"
                    onClick={()=>insertBox(ta,b.id,v=>set("content",v))}
                    className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs hover:bg-muted min-h-[36px]">{b.label}</button>
                ))}
              </div>
              <textarea ref={el=>setTa(el)} value={form.content} onChange={e=>set("content",e.target.value)}
                rows={14} placeholder="Type or paste HTML content..."
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring resize-y min-h-[200px]" />
            </div>

            {form.content && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-primary flex items-center gap-2 py-2">
                  👁️ Preview <span className="text-xs text-muted-foreground">(click to toggle)</span>
                </summary>
                <div className="border border-border rounded-xl p-5 prose prose-sm max-w-none dark:prose-invert mt-2 max-h-80 overflow-y-auto"
                  dangerouslySetInnerHTML={{__html:form.content}} />
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {tab==="interactive" && (
        <P5Playground
          animCode={form.animation_code}
          onAnimChange={v=>set("animation_code",v)}
        />
      )}

      {tab==="settings" && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label>Difficulty</Label>
                <select value={form.difficulty} onChange={e=>set("difficulty",e.target.value)}
                  className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="easy">🟢 Easy</option><option value="medium">🟡 Medium</option><option value="hard">🔴 Hard</option>
                </select>
              </div>
              <div><Label>Read Time (min)</Label><Input type="number" value={form.read_time_mins} onChange={e=>set("read_time_mins",+e.target.value)} className="mt-1" /></div>
              <div><Label>PDF URL</Label><Input value={form.pdf_url} onChange={e=>set("pdf_url",e.target.value)} placeholder="https://..." className="mt-1" /></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Switch checked={form.is_published} onCheckedChange={v=>set("is_published",v)} /><Label>Published (visible to students)</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.audio_enabled} onCheckedChange={v=>set("audio_enabled",v)} /><Label>Enable Read Aloud for this chapter</Label></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky save button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 border-t border-border -mx-4 px-4 flex gap-3">
        <Button onClick={handleSave} className="gap-2 flex-1 sm:flex-none"><Save className="w-4 h-4" /> Save Chapter</Button>
        <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">Cancel</Button>
      </div>
    </div>
  );
};

// ── Quiz Manager ──────────────────────────────────────────────────────────────
const QuizManager = ({ chapterId, onBack }: { chapterId: string; onBack: ()=>void }) => {
  const qc = useQueryClient();
  const { data: quiz } = useNoteQuiz(chapterId);
  const { data: questions = [], isLoading } = useNoteQuestions(quiz?.id);
  const { upsert, remove } = useMutateQuestion();
  const [editQ, setEditQ] = useState<Partial<NoteQuestion>|null>(null);
  const [saving, setSaving] = useState(false);

  const blank = (): Partial<NoteQuestion> => ({
    question:"", option_a:"", option_b:"", option_c:"", option_d:"",
    correct:"a", explanation:"", display_order:questions.length, difficulty:"medium"
  });

  const createQuiz = async () => {
    if (quiz) return;
    const { error } = await supabase.from("note_quizzes").insert({
      chapter_id:chapterId, title:"Chapter Quiz", pass_score:60, time_limit_secs:0, is_active:true
    });
    if (error) toast.error("Failed"); else { toast.success("Quiz created!"); qc.invalidateQueries({queryKey:["note-quiz",chapterId]}); }
  };

  const saveQ = async () => {
    if (!editQ||!quiz) return;
    if (!editQ.question?.trim()) { toast.error("Question required"); return; }
    setSaving(true);
    await upsert.mutateAsync({...editQ, quiz_id:quiz.id});
    toast.success("Saved!"); setEditQ(null); setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 shrink-0"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <h2 className="text-lg font-bold flex items-center gap-2"><HelpCircle className="w-5 h-5 text-violet-500" /> Quiz Manager</h2>
      </div>

      {!quiz ? (
        <Card><CardContent className="py-12 text-center">
          <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold mb-3">No quiz yet</p>
          <Button onClick={createQuiz} className="gap-2"><Plus className="w-4 h-4" /> Create Quiz</Button>
        </CardContent></Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <Badge variant="secondary">{questions.length} questions</Badge>
            <Button onClick={()=>setEditQ(blank())} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Question</Button>
          </div>

          {editQ && (
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="text-base">{editQ.id?"Edit Question":"New Question"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Question *</Label>
                  <textarea value={editQ.question} onChange={e=>setEditQ(p=>({...p!,question:e.target.value}))}
                    rows={3} className="w-full mt-1 rounded-xl border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(["a","b","c","d"] as const).map(opt=>(
                    <div key={opt}>
                      <Label>Option {opt.toUpperCase()}</Label>
                      <Input value={(editQ as any)[`option_${opt}`]||""} onChange={e=>setEditQ(p=>({...p!,[`option_${opt}`]:e.target.value}))} placeholder={`Option ${opt.toUpperCase()}`} className="mt-1" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Correct</Label>
                    <select value={editQ.correct} onChange={e=>setEditQ(p=>({...p!,correct:e.target.value as any}))}
                      className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option>
                    </select>
                  </div>
                  <div><Label>Difficulty</Label>
                    <select value={editQ.difficulty||"medium"} onChange={e=>setEditQ(p=>({...p!,difficulty:e.target.value as any}))}
                      className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option value="easy">🟢 Easy</option><option value="medium">🟡 Medium</option><option value="hard">🔴 Hard</option>
                    </select>
                  </div>
                  <div><Label>Explanation</Label><Input value={editQ.explanation||""} onChange={e=>setEditQ(p=>({...p!,explanation:e.target.value}))} className="mt-1" /></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveQ} disabled={saving} className="gap-2 flex-1 sm:flex-none">
                    {saving?<Loader2 className="w-4 h-4 animate-spin" />:<Save className="w-4 h-4" />} Save
                  </Button>
                  <Button variant="outline" onClick={()=>setEditQ(null)} className="flex-1 sm:flex-none">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? <Skeleton className="h-32 rounded-2xl" /> : questions.map((q,i)=>(
            <Card key={q.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 text-sm">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1.5">{q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {(["a","b","c","d"] as const).map(opt=>(
                      <p key={opt} className={`text-xs px-2 py-1 rounded-lg ${q.correct===opt?"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold":"text-muted-foreground"}`}>
                        {opt.toUpperCase()}. {(q as any)[`option_${opt}`]} {q.correct===opt?"✓":""}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="secondary" className="text-[10px]">{q.difficulty||"medium"}</Badge>
                    {q.explanation && <span className="text-[10px] text-muted-foreground">💡 Has explanation</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={()=>setEditQ(q)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={()=>remove.mutate(q.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

// ── Flashcard Manager ─────────────────────────────────────────────────────────
const FlashcardManager = ({ chapterId, onBack }: { chapterId: string; onBack: ()=>void }) => {
  const { data: cards = [], isLoading } = useFlashcards(chapterId);
  const { upsert, remove } = useMutateFlashcard();
  const [editF, setEditF] = useState<Partial<Flashcard>|null>(null);

  const blank = (): Partial<Flashcard> => ({ front:"", back:"", display_order:cards.length, chapter_id:chapterId });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 shrink-0"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <h2 className="text-lg font-bold flex items-center gap-2">📇 Flashcard Manager</h2>
      </div>

      <div className="flex justify-between items-center">
        <Badge variant="secondary">{cards.length} flashcards</Badge>
        <Button onClick={()=>setEditF(blank())} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Card</Button>
      </div>

      {editF && (
        <Card className="border-emerald-300 dark:border-emerald-700">
          <CardHeader><CardTitle className="text-base">{editF.id?"Edit Card":"New Flashcard"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Front (Question / Term)</Label>
              <textarea value={editF.front} onChange={e=>setEditF(p=>({...p!,front:e.target.value}))} rows={3}
                className="w-full mt-1 rounded-xl border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div>
              <Label>Back (Answer / Definition)</Label>
              <textarea value={editF.back} onChange={e=>setEditF(p=>({...p!,back:e.target.value}))} rows={3}
                className="w-full mt-1 rounded-xl border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="flex gap-2">
              <Button onClick={async()=>{if(!editF.front?.trim()||!editF.back?.trim()){toast.error("Both sides required");return;}await upsert.mutateAsync(editF);toast.success("Card saved!");setEditF(null);}} className="gap-2 flex-1 sm:flex-none"><Save className="w-4 h-4" /> Save Card</Button>
              <Button variant="outline" onClick={()=>setEditF(null)} className="flex-1 sm:flex-none">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? <Skeleton className="h-32 rounded-2xl" /> : cards.length === 0 && !editF ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          <p className="text-3xl mb-2">📇</p><p className="font-medium">No flashcards yet</p>
        </CardContent></Card>
      ) : cards.map((c,i)=>(
        <Card key={c.id}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-black flex items-center justify-center shrink-0 text-sm">{i+1}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{c.front}</p>
              <p className="text-xs text-muted-foreground mt-1 border-t border-border pt-1">{c.back}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={()=>setEditF(c)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={()=>remove.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ── Main AdminNotes ───────────────────────────────────────────────────────────
const AdminNotes = () => {
  const [view, setView] = useState<View>("subjects");
  const [selectedSubject, setSelectedSubject] = useState<NoteSubject|null>(null);
  const [editingSubject, setEditingSubject] = useState<NoteSubject|null|"new">(null);
  const [selectedChapter, setSelectedChapter] = useState<NoteChapter|null>(null);
  const [editingChapter, setEditingChapter] = useState<NoteChapter|null|"new">(null);

  const { data: subjects = [], isLoading: loadingSubjects } = useNoteSubjects(true);
  const { data: chapters = [], isLoading: loadingChapters } = useNoteChapters(selectedSubject?.id, true);
  const { upsert: upsertSubject, remove: removeSubject } = useMutateSubject();
  const { upsert: upsertChapter, remove: removeChapter } = useMutateChapter();

  // SUBJECTS
  if (view==="subjects" && !editingSubject) return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-heading font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Notes Manager</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage subjects, chapters, quizzes and flashcards</p>
        </div>
        <Button onClick={()=>setEditingSubject("new")} className="gap-2"><Plus className="w-4 h-4" /> Add Subject</Button>
      </div>

      {loadingSubjects ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : subjects.length===0 ? (
        <Card><CardContent className="py-16 text-center"><BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="font-semibold mb-3">No subjects yet</p><Button onClick={()=>setEditingSubject("new")} className="gap-2"><Plus className="w-4 h-4" /> Add First Subject</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s=>(
            <Card key={s.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-1.5" style={{backgroundColor:s.color}} />
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl shrink-0">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">Class {s.class_level} {!s.is_visible&&"· Hidden"}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 min-w-0"
                    onClick={()=>{setSelectedSubject(s);setView("chapters");}}>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Chapters</span>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={()=>setEditingSubject(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive"
                    onClick={()=>{if(confirm(`Delete "${s.name}" and all chapters?`))removeSubject.mutate(s.id);}}>
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
      initial={editingSubject==="new"?null:editingSubject}
      onSave={async d=>{await upsertSubject.mutateAsync(d);toast.success("Subject saved!");setEditingSubject(null);}}
      onCancel={()=>setEditingSubject(null)}
    />
  );

  // CHAPTERS
  if (view==="chapters" && selectedSubject && !editingChapter) return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={()=>{setView("subjects");setSelectedSubject(null);}} className="gap-1 shrink-0"><ArrowLeft className="w-4 h-4" /> Subjects</Button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{selectedSubject.emoji}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{selectedSubject.name}</h2>
              <p className="text-xs text-muted-foreground">{chapters.length} chapters</p>
            </div>
          </div>
        </div>
        <Button onClick={()=>setEditingChapter("new")} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Add Chapter</Button>
      </div>

      {loadingChapters ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : chapters.length===0 ? (
        <Card><CardContent className="py-16 text-center"><BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="font-semibold mb-3">No chapters</p><Button onClick={()=>setEditingChapter("new")} className="gap-2"><Plus className="w-4 h-4" /> Add First Chapter</Button></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {chapters.map(ch=>(
            <Card key={ch.id}>
              <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shrink-0 text-base"
                  style={{backgroundColor:selectedSubject.color}}>{ch.chapter_number}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{ch.title}</h3>
                    <Badge className={ch.is_published?"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400":"bg-muted text-muted-foreground"}>
                      {ch.is_published?"Published":"Draft"}
                    </Badge>
                    {ch.animation_code&&<Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"><Zap className="w-3 h-3 mr-1" />Interactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ch.read_time_mins} min · {ch.difficulty} · {ch.view_count} views</p>
                </div>
                <div className="flex gap-1.5 flex-wrap shrink-0">
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={()=>{setSelectedChapter(ch);setView("quiz");}}>
                    <HelpCircle className="w-3.5 h-3.5" /> Quiz
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={()=>{setSelectedChapter(ch);setView("flashcards");}}>
                    📇 Cards
                  </Button>
                  <Button size="icon" variant="ghost" onClick={()=>setEditingChapter(ch)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive"
                    onClick={()=>{if(confirm("Delete this chapter?"))removeChapter.mutate(ch.id);}}>
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
      initial={editingChapter==="new"?null:editingChapter}
      subjectId={selectedSubject.id}
      onSave={async d=>{await upsertChapter.mutateAsync(d);toast.success("Chapter saved!");setEditingChapter(null);}}
      onCancel={()=>setEditingChapter(null)}
    />
  );

  if (view==="quiz" && selectedChapter) return (
    <QuizManager chapterId={selectedChapter.id} onBack={()=>{setView("chapters");setSelectedChapter(null);}} />
  );

  if (view==="flashcards" && selectedChapter) return (
    <FlashcardManager chapterId={selectedChapter.id} onBack={()=>{setView("chapters");setSelectedChapter(null);}} />
  );

  return null;
};

export default AdminNotes;
