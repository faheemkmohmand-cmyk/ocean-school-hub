import { useState, useRef } from "react";
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
  Loader2, Save, Zap, HelpCircle, CreditCard
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

// ── (GraphBuilder removed — replaced by UnifiedCodeEditor below) ──────────────

// ── TEMPLATES ────────────────────────────────────────────────────────────────
const TEMPLATES: Record<string, string> = {
  pendulum: `<!DOCTYPE html>
<html><head><style>
body{margin:0;background:#f8f9ff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}
canvas{border-radius:16px;border:1px solid #e0e0e0}
p{color:#7C3AED;font-weight:bold;margin-bottom:8px;font-size:14px}
</style></head><body>
<p>⚡ Simple Pendulum — SHM Demo</p>
<canvas id="c" width="320" height="260"></canvas>
<script>
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
const cx=160,cy=30,L=180;
let angle=Math.PI/5,omega=0;
function draw(){
  const alpha=-(9.8/L)*Math.sin(angle);
  omega+=alpha*0.02; angle+=omega*0.02;
  ctx.clearRect(0,0,320,260);
  ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fillStyle='#374151';ctx.fill();
  const bx=cx+L*Math.sin(angle),by=cy+L*Math.cos(angle);
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(bx,by);
  ctx.strokeStyle='#6b7280';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(bx,by,22,0,Math.PI*2);
  ctx.fillStyle='#7C3AED';ctx.fill();ctx.strokeStyle='#5b21b6';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#374151';ctx.font='13px sans-serif';
  ctx.fillText('θ = '+(angle*180/Math.PI).toFixed(1)+'°',10,250);
  ctx.fillText('a ∝ −x',200,250);
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  spring: `<!DOCTYPE html>
<html><head><style>
body{margin:0;background:#f8f9ff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}
canvas{border-radius:16px;border:1px solid #e0e0e0}
p{color:#059669;font-weight:bold;margin-bottom:8px;font-size:14px}
</style></head><body>
<p>🔧 Mass-Spring System — Hooke's Law</p>
<canvas id="c" width="340" height="200"></canvas>
<script>
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
let pos=170,vel=0,eq=170;
function drawSpring(x1,x2,y,coils){
  ctx.beginPath();ctx.moveTo(x1,y);
  for(let i=0;i<=coils;i++){
    const sx=x1+(x2-x1)*i/coils;
    const sy=y+(i%2===0?-14:14);
    i===0?ctx.moveTo(sx,y):ctx.lineTo(sx,sy);
  }
  ctx.lineTo(x2,y);
  ctx.strokeStyle='#6366f1';ctx.lineWidth=2.5;ctx.stroke();
}
function draw(){
  const F=-300*(pos-eq)/60;
  vel+=(F/1)*0.016;pos+=vel*0.016;
  ctx.clearRect(0,0,340,200);
  ctx.fillStyle='#374151';ctx.fillRect(0,70,18,60);
  drawSpring(18,pos-35,100,12);
  ctx.fillStyle='#7C3AED';ctx.fillRect(pos-35,70,55,60);
  ctx.fillStyle='white';ctx.font='bold 16px sans-serif';ctx.fillText('m',pos-16,106);
  ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(eq,55);ctx.lineTo(eq,150);
  ctx.strokeStyle='#9ca3af';ctx.lineWidth=1;ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='#6b7280';ctx.font='11px sans-serif';
  ctx.fillText('F=−kx='+(-(pos-eq)/20).toFixed(1)+'N',10,185);
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  wave: `<!DOCTYPE html>
<html><head><style>
body{margin:0;background:#f0f9ff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}
canvas{border-radius:16px;border:1px solid #bae6fd}
p{color:#0891B2;font-weight:bold;margin-bottom:8px;font-size:14px}
</style></head><body>
<p>🌊 Transverse vs Longitudinal Waves</p>
<canvas id="c" width="340" height="280"></canvas>
<script>
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
let t=0;
function draw(){
  t+=0.05;
  ctx.clearRect(0,0,340,280);
  ctx.font='bold 13px sans-serif';
  ctx.fillStyle='#0891B2';ctx.fillText('Transverse Wave (light, water surface)',10,22);
  for(let x=0;x<=320;x+=20){
    const y=60+Math.sin(x/20+t)*35;
    ctx.beginPath();ctx.arc(x+10,y,6,0,Math.PI*2);
    ctx.fillStyle='hsl('+(200+Math.floor(x/3))+',80%,55%)';ctx.fill();
  }
  ctx.fillStyle='#059669';ctx.fillText('Longitudinal Wave (sound)',10,152);
  const density=[...Array(16)].map((_,i)=>{
    const base=i*20+10;
    return base+Math.sin(i*0.7-t)*12;
  });
  density.forEach((x,i)=>{
    const w=i<density.length-1?Math.abs(density[i+1]-x)-2:18;
    ctx.fillStyle='rgba(5,150,105,'+(0.4+Math.abs(Math.sin(i-t))*0.6)+')';
    ctx.fillRect(x,165,Math.max(4,w),30);
  });
  ctx.fillStyle='#6b7280';ctx.font='11px sans-serif';
  ctx.fillText('Compression / Rarefaction',10,215);
  ctx.fillText('v = fλ    (speed = frequency × wavelength)',10,265);
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  blank: `<!DOCTYPE html>
<html><head><style>
body{margin:0;padding:20px;background:#ffffff;font-family:sans-serif;min-height:100vh}
</style></head><body>
<!-- Write your interactive content here -->
<!-- You can use HTML, CSS, JavaScript, Canvas, SVG — anything! -->

<h2 style="color:#6366f1">Your Interactive Demo</h2>
<p>Replace this with your content</p>

<canvas id="c" width="400" height="300" style="background:#f0f9ff;border-radius:12px;border:1px solid #e0e0e0"></canvas>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// Your animation code here
ctx.fillStyle = '#6366f1';
ctx.font = 'bold 20px sans-serif';
ctx.fillText('Hello! Add your code here', 50, 150);
</script>
</body></html>`,
};

// ── UnifiedCodeEditor — single paste area for HTML/CSS/JS interactive content ──
const UnifiedCodeEditor = ({
  animCode, onAnimChange
}: {
  animCode: string;
  onAnimChange: (v: string) => void;
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [htmlContent, setHtmlContent] = useState(animCode || "");
  const [previewKey, setPreviewKey] = useState(0);

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setHtmlContent(t);
    onAnimChange(t);
    setShowPreview(true);
    setPreviewKey(k => k + 1);
  };

  const handleChange = (v: string) => {
    setHtmlContent(v);
    onAnimChange(v);
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        {/* Info banner */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-700/30 rounded-2xl p-4">
          <p className="text-sm font-bold text-violet-700 dark:text-violet-300 mb-1">⚡ Interactive Animation / Demo</p>
          <p className="text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
            Paste <strong>any HTML, CSS &amp; JavaScript</strong> here — animations, simulations, charts, Canvas, SVG, anything a browser supports.
            Students see it live <strong>below the chapter notes</strong>. Fully interactive and sandboxed.
          </p>
        </div>

        {/* Quick-start templates */}
        <div>
          <Label className="mb-2 block text-sm font-semibold">Quick Start Templates</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "pendulum", label: "🔮 Pendulum (SHM)" },
              { key: "spring",   label: "🔧 Mass-Spring" },
              { key: "wave",     label: "🌊 Wave Motion" },
              { key: "blank",    label: "📄 Blank Canvas" },
            ].map(t => (
              <button key={t.key} onClick={() => applyTemplate(t.key)}
                className="px-3 py-1.5 bg-secondary hover:bg-primary hover:text-primary-foreground border border-border rounded-xl text-xs font-semibold transition-all">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code editor + optional live preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Paste Your HTML / CSS / JavaScript Code</Label>
            <button
              onClick={() => { setShowPreview(v => !v); setPreviewKey(k => k + 1); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
              {showPreview ? "✕ Hide Preview" : "▶ Live Preview"}
            </button>
          </div>

          <div className={`grid gap-4 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {/* Single unified code textarea */}
            <div>
              <textarea
                value={htmlContent}
                onChange={e => handleChange(e.target.value)}
                rows={showPreview ? 22 : 20}
                spellCheck={false}
                placeholder={[
                  "<!DOCTYPE html>",
                  "<html>",
                  "<head>",
                  "  <style>",
                  "    body { margin: 0; background: #f8f9ff; font-family: sans-serif; }",
                  "  </style>",
                  "</head>",
                  "<body>",
                  "",
                  "  <!-- Paste any animation, chart, simulation, diagram here -->",
                  "",
                  "  <canvas id=\"c\" width=\"400\" height=\"300\"></canvas>",
                  "  <script>",
                  "    const ctx = document.getElementById(\'c\').getContext(\'2d\');",
                  "    // Your JavaScript animation here...",
                  "  </script>",
                  "",
                  "</body>",
                  "</html>"
                ].join("\n")}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-ring resize-y leading-relaxed"
                style={{ minHeight: "420px", tabSize: 2 }}
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                <span>{htmlContent.length.toLocaleString()} characters</span>
                <span>•</span>
                <span>Full HTML + CSS + JS supported</span>
                <span>•</span>
                <span>Students see this as an interactive demo below the notes</span>
              </p>
            </div>

            {/* Live preview panel */}
            {showPreview && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Live Preview</p>
                  <button onClick={() => setPreviewKey(k => k + 1)}
                    className="text-[10px] text-primary hover:underline px-2">↺ Reload</button>
                </div>
                <div className="rounded-2xl overflow-hidden border-2 border-violet-200 dark:border-violet-700/40 shadow-lg" style={{ height: "420px" }}>
                  <iframe
                    key={previewKey}
                    srcDoc={htmlContent}
                    sandbox="allow-scripts"
                    className="w-full h-full"
                    style={{ border: "none" }}
                    title="Interactive Demo Preview"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  🔒 Sandboxed — exactly what students will see
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-xl p-3 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">💡 Tips for best results</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Use <code className="bg-background px-1 rounded">requestAnimationFrame()</code> for smooth canvas animations</p>
            <p>• Add sliders, buttons or <code className="bg-background px-1 rounded">mousemove</code> for student interactivity</p>
            <p>• Load any CDN library: Chart.js, D3, Three.js, p5.js, MathJax, etc.</p>
            <p>• Set <code className="bg-background px-1 rounded">{"body{margin:0;overflow:hidden}"}</code> for clean fullscreen display</p>
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
        <UnifiedCodeEditor
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
