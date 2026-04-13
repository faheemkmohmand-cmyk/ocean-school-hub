import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OverviewTab from "./tabs/OverviewTab";
import TimetableTab from "./tabs/TimetableTab";
import ResultsTab from "./tabs/ResultsTab";
import NoticesTab from "./tabs/NoticesTab";
import NewsTab from "./tabs/NewsTab";
import LibraryTab from "./tabs/LibraryTab";
import GalleryTab from "./tabs/GalleryTab";
import VideosTab from "./tabs/VideosTab";
import AchievementsTab from "./tabs/AchievementsTab";
import TeachersTab from "./tabs/TeachersTab";
import ProfileTab from "./tabs/ProfileTab";
import RollNumbersTab from "./tabs/RollNumbersTab";
import ResultCardTab from "./tabs/ResultCardTab";
import TestsTab from "./tabs/TestsTab";
import MessagesTab from "./tabs/MessagesTab";
import NotesTab from "../notes/NotesTab";
import DiscussionTab from "./tabs/DiscussionTab";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import {
  BookMarked, CheckCircle2, Circle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Calendar, Trophy, TrendingUp,
  BarChart3, Star, Download, School, ChevronRight
} from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { useResults, useResultYears } from "@/hooks/useResults";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Homework { id: string; title: string; description: string | null; class: string; subject: string; due_date: string; teacher_name: string | null; is_active: boolean; created_at: string; }
interface DailyQuote { id: string; text: string; author: string | null; category: string; fixed_date: string | null; }
interface ExamEntry { id: string; class: string; exam_type: string; year: number; subject: string; exam_date: string; start_time: string | null; end_time: string | null; hall: string | null; paper_code: string | null; notes: string | null; }
interface HonorEntry { id: string; student_name: string; class: string; month: number; year: number; reason: string | null; photo_url: string | null; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const examTypes: Record<string, string[]> = { "6":["1st Semester","2nd Semester"],"7":["1st Semester","2nd Semester"],"8":["1st Semester","2nd Semester"],"9":["Annual-I","Annual-II"],"10":["Annual-I","Annual-II"] };
const SUBJECT_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4","#84cc16","#ec4899"];

// ─── Homework Tab ─────────────────────────────────────────────────────────────
function HomeworkTab() {
  const { user, profile } = useAuth();
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: homeworks = [], isLoading } = useQuery<Homework[]>({
    queryKey: ["homework", profile?.class],
    queryFn: async () => {
      let q = supabase.from("homework").select("*").eq("is_active", true).order("due_date", { ascending: true });
      if (profile?.class) q = q.eq("class", profile.class);
      const { data, error } = await q; if (error) throw error; return data ?? [];
    },
    enabled: !!profile,
  });

  const { data: completions = [] } = useQuery<{ homework_id: string }[]>({
    queryKey: ["my-completions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("homework_completions").select("homework_id").eq("student_id", user.id);
      if (error) throw error; return data ?? [];
    },
    enabled: !!user?.id,
  });

  const completedIds = new Set(completions.map(c => c.homework_id));

  const handleToggle = async (hwId: string) => {
    if (!user?.id || toggling) return;
    setToggling(hwId);
    if (completedIds.has(hwId)) {
      await supabase.from("homework_completions").delete().eq("homework_id", hwId).eq("student_id", user.id);
    } else {
      await supabase.from("homework_completions").insert({ homework_id: hwId, student_id: user.id });
    }
    setToggling(null);
  };

  const filtered = homeworks.filter(h => subjectFilter === "All" || h.subject === subjectFilter);
  const pending = filtered.filter(h => !completedIds.has(h.id));
  const done = filtered.filter(h => completedIds.has(h.id));

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2"><BookMarked className="w-5 h-5 text-primary" /> Homework</h2><p className="text-xs text-muted-foreground mt-0.5">{pending.length} pending · {done.length} completed</p></div>
      <div className="flex gap-1.5 flex-wrap">
        {["All","English","Urdu","Maths","Physics","Chemistry","Biology","Islamiyat","Computer Science","G.Science"].map(s => (
          <button key={s} onClick={() => setSubjectFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${subjectFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{s}</button>
        ))}
      </div>
      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 text-center shadow-card"><BookMarked className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No homework assigned</p></div>
      ) : (
        <>
          {pending.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
            {pending.map(hw => {
              const overdue = isPast(new Date(hw.due_date)) && !isToday(new Date(hw.due_date));
              const diff = differenceInDays(new Date(hw.due_date), new Date());
              return (
                <div key={hw.id} className={`bg-card rounded-xl border p-4 flex items-start gap-3 shadow-sm ${overdue ? "border-red-200 dark:border-red-800" : "border-border"}`}>
                  <button onClick={() => handleToggle(hw.id)} disabled={!!toggling} className="mt-0.5 shrink-0"><Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" /></button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{hw.title}</span>
                      {overdue ? <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />Overdue</span>
                        : isToday(new Date(hw.due_date)) ? <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Due Today</span>
                        : diff <= 2 ? <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{diff}d left</span>
                        : <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">{diff}d left</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded">{hw.subject}</span>
                      <span>Due: {format(new Date(hw.due_date), "dd MMM yyyy")}</span>
                      {hw.teacher_name && <span>by {hw.teacher_name}</span>}
                    </div>
                    {hw.description && (<button onClick={() => setExpandedId(expandedId === hw.id ? null : hw.id)} className="text-[11px] text-primary mt-1 flex items-center gap-0.5">{expandedId === hw.id ? <><ChevronUp className="w-3 h-3" />Hide</> : <><ChevronDown className="w-3 h-3" />Details</>}</button>)}
                    {expandedId === hw.id && hw.description && <p className="text-xs text-muted-foreground mt-2 bg-secondary/50 rounded-lg p-2.5 leading-relaxed">{hw.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>}
          {done.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed ✓</p>
            {done.map(hw => (
              <div key={hw.id} className="bg-card/60 rounded-xl border border-border/50 p-4 flex items-start gap-3 opacity-70">
                <button onClick={() => handleToggle(hw.id)} disabled={!!toggling} className="mt-0.5 shrink-0"><CheckCircle2 className="w-5 h-5 text-green-500" /></button>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground line-through">{hw.title}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">{hw.subject}</span><span className="text-[11px] text-muted-foreground">Due: {format(new Date(hw.due_date), "dd MMM")}</span></div></div>
              </div>
            ))}
          </div>}
        </>
      )}
    </div>
  );
}

// ─── Exam Schedule Tab ─────────────────────────────────────────────────────────
const SCHED_SUBJECT_COLORS: Record<string, { bg: string; text: string; pdfRgb: [number,number,number] }> = {
  English:{ bg:"bg-blue-100 dark:bg-blue-900/30", text:"text-blue-700 dark:text-blue-300", pdfRgb:[219,234,254] },
  Urdu:{ bg:"bg-amber-100 dark:bg-amber-900/30", text:"text-amber-700 dark:text-amber-300", pdfRgb:[254,243,199] },
  Maths:{ bg:"bg-purple-100 dark:bg-purple-900/30", text:"text-purple-700 dark:text-purple-300", pdfRgb:[237,233,254] },
  Mathematics:{ bg:"bg-purple-100 dark:bg-purple-900/30", text:"text-purple-700 dark:text-purple-300", pdfRgb:[237,233,254] },
  Physics:{ bg:"bg-cyan-100 dark:bg-cyan-900/30", text:"text-cyan-700 dark:text-cyan-300", pdfRgb:[207,250,254] },
  Chemistry:{ bg:"bg-green-100 dark:bg-green-900/30", text:"text-green-700 dark:text-green-300", pdfRgb:[220,252,231] },
  Biology:{ bg:"bg-emerald-100 dark:bg-emerald-900/30", text:"text-emerald-700 dark:text-emerald-300", pdfRgb:[209,250,229] },
  Islamiyat:{ bg:"bg-teal-100 dark:bg-teal-900/30", text:"text-teal-700 dark:text-teal-300", pdfRgb:[204,251,241] },
  "Pak-study":{ bg:"bg-green-100 dark:bg-green-900/30", text:"text-green-700 dark:text-green-300", pdfRgb:[220,252,231] },
  "Computer Science":{ bg:"bg-indigo-100 dark:bg-indigo-900/30", text:"text-indigo-700 dark:text-indigo-300", pdfRgb:[224,231,255] },
  "G.Science":{ bg:"bg-lime-100 dark:bg-lime-900/30", text:"text-lime-700 dark:text-lime-300", pdfRgb:[236,252,203] },
  Geography:{ bg:"bg-orange-100 dark:bg-orange-900/30", text:"text-orange-700 dark:text-orange-300", pdfRgb:[255,237,213] },
  History:{ bg:"bg-rose-100 dark:bg-rose-900/30", text:"text-rose-700 dark:text-rose-300", pdfRgb:[255,228,230] },
  Pashto:{ bg:"bg-yellow-100 dark:bg-yellow-900/30", text:"text-yellow-700 dark:text-yellow-300", pdfRgb:[254,249,195] },
  "M.Quran":{ bg:"bg-teal-100 dark:bg-teal-900/30", text:"text-teal-700 dark:text-teal-300", pdfRgb:[204,251,241] },
};
function schedSubjectStyle(s: string){ return SCHED_SUBJECT_COLORS[s]??{bg:"bg-secondary",text:"text-secondary-foreground",pdfRgb:[243,244,246] as [number,number,number]}; }

function generateDateSheetPDF(schedule: ExamEntry[], cls: string, examType: string, year: number) {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  doc.setFillColor(4,44,83); doc.rect(0,0,w,48,"F");
  doc.setFillColor(212,175,55); doc.rect(0,48,w,3,"F");
  doc.setFillColor(212,175,55); doc.circle(w/2,18,10,"F");
  doc.setFillColor(4,44,83); doc.circle(w/2,18,7.5,"F");
  doc.setTextColor(212,175,55); doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.text("GHS",w/2,20,{align:"center"});
  doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.text("Government High School Babi Khel",w/2,33,{align:"center"});
  doc.setFontSize(8.5); doc.setFont("helvetica","normal"); doc.setTextColor(180,200,220); doc.text("District Mohmand, KPK  |  Est. 2018",w/2,39,{align:"center"});
  doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(212,175,55); doc.text("EXAMINATION DATE SHEET",w/2,46,{align:"center"});
  doc.setFillColor(240,247,255); doc.roundedRect(10,55,w-20,16,2,2,"F");
  doc.setDrawColor(4,44,83); doc.setLineWidth(0.3); doc.roundedRect(10,55,w-20,16,2,2,"S");
  const info=[{label:"CLASS",value:cls},{label:"EXAM",value:examType},{label:"YEAR",value:String(year)},{label:"SUBJECTS",value:String(schedule.length)},{label:"ISSUED",value:new Date().toLocaleDateString("en-GB")}];
  const cw=(w-20)/info.length;
  info.forEach((item,i)=>{ const x=10+i*cw+cw/2; doc.setTextColor(100,120,140); doc.setFontSize(6.5); doc.setFont("helvetica","normal"); doc.text(item.label,x,61,{align:"center"}); doc.setTextColor(4,44,83); doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.text(item.value,x,68,{align:"center"}); });
  autoTable(doc,{
    startY:76,
    head:[["Day","Date","Subject","Paper Name","Code","Time","Hall"]],
    body:schedule.map(e=>{ const d=new Date(e.exam_date); return [format(d,"EEEE"),format(d,"dd MMM yyyy"),e.subject,(e as any).paper_name||e.subject,(e as any).paper_code||"—",e.start_time&&e.end_time?`${e.start_time}–${e.end_time}`:e.start_time||"—",e.hall||"—"]; }),
    headStyles:{fillColor:[4,44,83],textColor:[255,255,255],fontStyle:"bold",fontSize:8,halign:"center",cellPadding:4},
    bodyStyles:{fontSize:8,cellPadding:3.5,valign:"middle"},
    columnStyles:{0:{cellWidth:22,halign:"center"},1:{cellWidth:28,halign:"center",fontStyle:"bold"},2:{cellWidth:24},3:{cellWidth:42},4:{cellWidth:18,halign:"center",fontStyle:"bold"},5:{cellWidth:28,halign:"center"},6:{cellWidth:18,halign:"center"}},
    alternateRowStyles:{fillColor:[248,252,255]},
    didParseCell:(data)=>{ if(data.section==="body"&&data.column.index===2){const st=SCHED_SUBJECT_COLORS[data.cell.raw as string];if(st){data.cell.styles.fillColor=st.pdfRgb;data.cell.styles.fontStyle="bold";}} if(data.section==="body"){const entry=schedule[data.row.index];if(entry&&isToday(new Date(entry.exam_date))){data.cell.styles.fillColor=[255,251,204];data.cell.styles.fontStyle="bold";}} },
    margin:{left:10,right:10,bottom:22},
  });
  const tp=(doc as any).internal.getNumberOfPages();
  for(let p=1;p<=tp;p++){ doc.setPage(p); doc.setFillColor(212,175,55); doc.rect(0,h-14,w,1,"F"); doc.setFillColor(4,44,83); doc.rect(0,h-13,w,13,"F"); doc.setTextColor(212,175,55); doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.text("GHS BABI KHEL — OFFICIAL EXAMINATION DATE SHEET",w/2,h-7,{align:"center"}); doc.setTextColor(160,180,200); doc.setFontSize(6.5); doc.text(`Page ${p}/${tp}`,w-14,h-7,{align:"right"}); doc.text(`Class ${cls}  |  ${examType}  |  ${year}`,14,h-7); }
  doc.save(`Datesheet_Class${cls}_${examType}_${year}.pdf`);
}

function ExamScheduleTab() {
  const { profile } = useAuth();
  const [cls, setCls] = useState(profile?.class || "6");
  const [examType, setExamType] = useState(examTypes[profile?.class || "6"][0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: schedule = [], isLoading } = useQuery<ExamEntry[]>({ queryKey:["exam-schedule",cls,examType,year], queryFn:async()=>{ const{data,error}=await supabase.from("exam_schedule").select("*").eq("class",cls).eq("exam_type",examType).eq("year",year).eq("is_published",true).order("exam_date",{ascending:true}); if(error)throw error; return data??[]; }, enabled:!!cls });
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2"><Calendar className="w-5 h-5 text-primary"/>Exam Date Sheet</h2><p className="text-xs text-muted-foreground">Official examination schedule</p></div>
        {schedule.length>0&&<button onClick={()=>generateDateSheetPDF(schedule,cls,examType,year)} className="flex items-center gap-1.5 text-xs font-semibold bg-[#042C53] text-white hover:bg-[#042C53]/90 px-4 py-2 rounded-xl transition-colors"><Download className="w-3.5 h-3.5"/>Download PDF</button>}
      </div>
      <div className="flex gap-2 flex-wrap">{["6","7","8","9","10"].map(c=><button key={c} onClick={()=>{setCls(c);setExamType(examTypes[c][0]);}} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${cls===c?"bg-[#042C53] text-white":"bg-secondary text-muted-foreground"}`}>Class {c}</button>)}</div>
      <div className="flex gap-2 flex-wrap items-center">
        {examTypes[cls].map(e=><button key={e} onClick={()=>setExamType(e)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${examType===e?"bg-primary/20 text-primary border border-primary/40":"bg-secondary text-muted-foreground"}`}>{e}</button>)}
        <div className="ml-auto flex items-center gap-2"><label className="text-xs text-muted-foreground">Year:</label><input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-20 text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary" min={2000} max={2099}/></div>
      </div>
      {isLoading?<div className="space-y-3">{[1,2,3,4].map(i=><Skeleton key={i} className="h-20 rounded-xl"/>)}</div>
        :schedule.length===0?<div className="bg-card rounded-2xl p-12 text-center border border-border"><Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3"/><p className="text-sm font-medium text-foreground">No exam schedule published yet</p><p className="text-xs text-muted-foreground mt-1">Admin will publish the schedule before exams begin.</p></div>
        :(<>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[{label:"Total",value:schedule.length,icon:"📋"},{label:"Upcoming",value:schedule.filter(e=>!isPast(new Date(e.exam_date))||isToday(new Date(e.exam_date))).length,icon:"⏳"},{label:"Today",value:schedule.filter(e=>isToday(new Date(e.exam_date))).length,icon:"📅"},{label:"Done",value:schedule.filter(e=>isPast(new Date(e.exam_date))&&!isToday(new Date(e.exam_date))).length,icon:"✅"}].map(s=><div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center"><p className="text-2xl mb-1">{s.icon}</p><p className="text-xl font-bold text-foreground">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>)}</div>
          <div className="space-y-2">{schedule.map(entry=>{ const date=new Date(entry.exam_date); const past=isPast(date)&&!isToday(date); const today=isToday(date); const diff=differenceInDays(date,new Date()); const style=schedSubjectStyle(entry.subject); return (<div key={entry.id} className={`bg-card rounded-xl border shadow-sm overflow-hidden ${today?"border-amber-400 ring-2 ring-amber-400/30":past?"opacity-55 border-border":"border-border hover:border-primary/40"}`}>{today&&<div className="bg-amber-400 text-amber-900 text-center text-[11px] font-black uppercase tracking-widest py-1">📢 EXAM TODAY</div>}<div className="p-4 flex items-center gap-4"><div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 font-black ${today?"bg-amber-500 text-white":past?"bg-muted text-muted-foreground":"bg-[#042C53] text-white"}`}><span className="text-2xl leading-none">{format(date,"dd")}</span><span className="text-[10px] font-semibold uppercase">{format(date,"MMM")}</span><span className="text-[9px] opacity-70">{format(date,"yyyy")}</span></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap mb-1"><span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>{entry.subject}</span>{(entry as any).paper_code&&<span className="text-[11px] font-mono font-bold bg-[#042C53]/10 text-[#042C53] dark:text-white px-2 py-0.5 rounded">{(entry as any).paper_code}</span>}{!past&&!today&&diff<=3&&diff>=0&&<span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full animate-pulse">{diff===0?"Tomorrow!":`${diff}d left`}</span>}{past&&<span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Done</span>}</div><p className="text-sm font-bold text-foreground">{(entry as any).paper_name||entry.subject}</p><div className="flex flex-wrap items-center gap-3 mt-1"><span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/>{format(date,"EEEE, dd MMMM yyyy")}</span>{entry.start_time&&<span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/>{entry.start_time}{entry.end_time?` – ${entry.end_time}`:""}</span>}{entry.hall&&<span className="text-xs text-muted-foreground flex items-center gap-1"><ChevronRight className="w-3 h-3"/>Hall: {entry.hall}</span>}{entry.notes&&<span className="text-xs italic text-muted-foreground">{entry.notes}</span>}</div></div>{!past&&!today&&diff>0&&<div className={`hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-xl shrink-0 ${diff<=7?"bg-orange-100":"bg-secondary"}`}><span className={`text-lg font-black ${diff<=7?"text-orange-600":"text-foreground"}`}>{diff}</span><span className="text-[9px] font-medium text-muted-foreground">days</span></div>}</div></div>); })}</div>
        </>)}
    </div>
  );
}


// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { user, profile } = useAuth();
  const [cls, setCls] = useState(profile?.class || "6");
  const [examType, setExamType] = useState(examTypes[profile?.class || "6"][0]);
  const { data: years = [] } = useResultYears();
  const [year, setYear] = useState<number | undefined>(undefined);
  const { data: results = [], isLoading } = useResults({ classFilter: cls, examType, year });

  const myResult = useMemo(() => {
    if (!profile?.roll_number) return null;
    return results.find(r => r.students?.roll_number === profile.roll_number) ?? null;
  }, [results, profile]);

  // Attendance stats
  const currentMonth = new Date().getMonth() + 1;
  const currentYear2 = new Date().getFullYear();
  const { data: attData } = useQuery<{ status: string }[]>({
    queryKey: ["att-stat", user?.id, currentMonth, currentYear2],
    queryFn: async () => {
      if (!user?.id) return [];
      const start = `${currentYear2}-${String(currentMonth).padStart(2,"0")}-01`;
      const end = `${currentYear2}-${String(currentMonth).padStart(2,"0")}-31`;
      const { data, error } = await supabase.from("attendance").select("status").eq("student_id", user.id).gte("date", start).lte("date", end);
      if (error) throw error; return data ?? [];
    },
    enabled: !!user?.id,
  });

  const attStat = useMemo(() => {
    if (!attData?.length) return null;
    const present = attData.filter(r => r.status === "present").length;
    const absent = attData.filter(r => r.status === "absent").length;
    const late = attData.filter(r => r.status === "late").length;
    const total = attData.length;
    return { present, absent, late, total, pct: total > 0 ? Math.round(((present + late) / total) * 100) : 0 };
  }, [attData]);

  const subjectChartData = useMemo(() => {
    if (!myResult?.subject_marks) return [];
    return Object.entries(myResult.subject_marks as Record<string, { obtained: number; total: number }>).map(([sub, m], i) => ({
      subject: sub.length > 9 ? sub.slice(0, 7) + "…" : sub, fullSubject: sub,
      obtained: m.obtained, total: m.total, pct: m.total > 0 ? Math.round((m.obtained / m.total) * 100) : 0,
      fill: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    }));
  }, [myResult]);

  // Trend: load both exam types
  const etList = examTypes[cls] || [];
  const tYear = years[0] || currentYear2;
  const { data: r1 = [] } = useResults({ classFilter: cls, examType: etList[0] || "", year: tYear });
  const { data: r2 = [] } = useResults({ classFilter: cls, examType: etList[1] || etList[0] || "", year: tYear });
  const trendData = useMemo(() => {
    const rn = profile?.roll_number;
    if (!rn) return [];
    const res1 = r1.find(r => r.students?.roll_number === rn);
    const res2 = r2.find(r => r.students?.roll_number === rn);
    return [
      res1 ? { exam: etList[0], pct: res1.percentage, marks: `${res1.obtained_marks}/${res1.total_marks}` } : null,
      res2 && etList[1] ? { exam: etList[1], pct: res2.percentage, marks: `${res2.obtained_marks}/${res2.total_marks}` } : null,
    ].filter(Boolean) as { exam: string; pct: number; marks: string }[];
  }, [r1, r2, profile, etList]);

  const pct = attStat?.pct ?? 0;
  const ringColor = pct >= 75 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const radius = 36; const circ = 2 * Math.PI * radius;

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />My Analytics</h2><p className="text-xs text-muted-foreground">Attendance, results & performance</p></div>
      <div className="flex gap-2 flex-wrap">{["6","7","8","9","10"].map(c => <button key={c} onClick={() => { setCls(c); setExamType(examTypes[c][0]); }} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${cls === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Class {c}</button>)}</div>
      <div className="flex gap-2 flex-wrap items-center">
        {examTypes[cls].map(e => <button key={e} onClick={() => setExamType(e)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${examType === e ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>{e}</button>)}
        <select value={year ?? ""} onChange={e => setYear(e.target.value ? Number(e.target.value) : undefined)} className="text-xs bg-secondary rounded-lg px-2 py-1.5 border-none outline-none ml-auto">
          <option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Attendance ring */}
      {attStat && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-primary" />Attendance — {MONTHS[currentMonth - 1]}</h3>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="48" cy="48" r={radius} fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} style={{ transform:"rotate(-90deg)", transformOrigin:"48px 48px", transition:"stroke-dashoffset 0.6s ease" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-black" style={{ color: ringColor }}>{pct}%</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-2"><p className="text-lg font-bold text-green-600">{attStat.present}</p><p className="text-[10px] text-muted-foreground">Present</p></div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-2"><p className="text-lg font-bold text-red-500">{attStat.absent}</p><p className="text-[10px] text-muted-foreground">Absent</p></div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2"><p className="text-lg font-bold text-amber-500">{attStat.late}</p><p className="text-[10px] text-muted-foreground">Late</p></div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2"><p className="text-lg font-bold text-blue-500">{attStat.total}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
            </div>
          </div>
          <div className={`mt-3 text-xs font-semibold text-center py-1.5 rounded-lg ${pct >= 75 ? "bg-green-100 text-green-700" : pct >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {pct >= 75 ? "✓ Good attendance" : pct >= 60 ? "⚠ Below recommended (75%)" : "✗ Critical — please improve"}
          </div>
        </div>
      )}

      {/* Subject chart */}
      {isLoading ? <Skeleton className="h-48 rounded-xl" /> : subjectChartData.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-primary" />Subject Performance — {examType}</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={subjectChartData} margin={{ top:5, right:5, left:-20, bottom:40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="subject" tick={{ fontSize:10 }} angle={-35} textAnchor="end" interval={0} /><YAxis tick={{ fontSize:10 }} domain={[0,100]} />
            <Tooltip formatter={(v: any, _n, p) => [`${p.payload.obtained}/${p.payload.total} (${v}%)`, p.payload.fullSubject]} />
            <ReferenceLine y={33} stroke="#ef4444" strokeDasharray="4 2" label={{ value:"Pass", fontSize:9, fill:"#ef4444" }} />
            <Bar dataKey="pct" radius={[4,4,0,0]}>{subjectChartData.map((_, i) => <Cell key={i} fill={subjectChartData[i].fill} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </div>
      ) : myResult ? <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">Subject-wise marks not available for this exam.</div>
        : <div className="bg-card rounded-2xl border border-border p-8 text-center"><BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Your results for {examType} are not published yet.</p></div>}

      {/* Trend */}
      {trendData.length >= 2 && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-primary" />Performance Trend — {tYear}</h3>
          {(() => { const diff = trendData[1].pct - trendData[0].pct; return <p className={`text-xs mb-4 font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>{diff > 0 ? `↑ Improved ${diff.toFixed(1)}%` : diff < 0 ? `↓ Dropped ${Math.abs(diff).toFixed(1)}%` : "→ No change"}</p>; })()}
          <ResponsiveContainer width="100%" height={160}><LineChart data={trendData} margin={{ top:5, right:10, left:-20, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="exam" tick={{ fontSize:11 }} /><YAxis tick={{ fontSize:10 }} domain={[0,100]} />
            <Tooltip formatter={(v: any, _n, p) => [`${v}% (${p.payload.marks})`, "Score"]} />
            <ReferenceLine y={33} stroke="#ef4444" strokeDasharray="3 2" />
            <Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2.5} dot={{ fill:"#6366f1", r:5 }} />
          </LineChart></ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Honor Roll Tab ───────────────────────────────────────────────────────────
function HonorRollTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const { data: entries = [], isLoading } = useQuery<HonorEntry[]>({
    queryKey: ["honor-roll", year, month],
    queryFn: async () => {
      const { data, error } = await supabase.from("honor_roll").select("*").eq("is_published", true).eq("year", year).eq("month", month).order("class");
      if (error) throw error; return data ?? [];
    },
  });

  const byClass = entries.reduce((acc, e) => { if (!acc[e.class]) acc[e.class] = []; acc[e.class].push(e); return acc; }, {} as Record<string, HonorEntry[]>);

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Honor Roll</h2><p className="text-xs text-muted-foreground">Students of the Month</p></div>
      <div className="flex gap-1.5 flex-wrap">{MONTHS.map((m, i) => <button key={m} onClick={() => setMonth(i+1)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${month === i+1 ? "bg-amber-500 text-white" : "bg-secondary text-secondary-foreground"}`}>{m.slice(0,3)}</button>)}</div>
      <div className="flex gap-2 items-center"><label className="text-xs text-muted-foreground">Year:</label><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-20 text-xs bg-secondary border-none rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" /></div>
      {isLoading ? <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        : entries.length === 0 ? <div className="bg-card rounded-2xl p-10 text-center shadow-card"><Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No honor roll for {MONTHS[month-1]} {year} yet.</p></div>
        : <div className="space-y-6">{Object.entries(byClass).sort((a,b) => Number(a[0])-Number(b[0])).map(([cls, students]) => (
          <div key={cls}><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Class {cls}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{students.map(e => (
              <div key={e.id} className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
                {e.photo_url ? <img src={e.photo_url} alt={e.student_name} className="w-14 h-14 rounded-full object-cover mx-auto mb-2 border-2 border-amber-400" />
                  : <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-2">{e.student_name[0]}</div>}
                <p className="text-sm font-bold text-foreground">{e.student_name}</p>
                <p className="text-xs text-muted-foreground">Class {e.class}</p>
                {e.reason && <p className="text-[10px] text-muted-foreground mt-1.5 italic line-clamp-2">"{e.reason}"</p>}
                <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">🏅 {MONTHS[e.month-1]} {e.year}</span>
              </div>
            ))}</div>
          </div>
        ))}</div>}
    </div>
  );
}

// ─── Merit List Tab (Student View) ───────────────────────────────────────────
interface MeritStudentEntry { student_id:string; full_name:string; roll_number:string; class:string; exam_type?:string; photo_url:string|null; obtained_marks:number; total_marks:number; percentage:number; grade:string; position:number; }
const ALL_EXAM_TYPES_ML = ["1st Semester","2nd Semester","Annual-I","Annual-II"];
const ALL_CLASSES_ML = ["6","7","8","9","10"];

function buildMeritPDF(all: MeritStudentEntry[], examType: string, year: number, singleClass?: string) {
  // ── helpers ──────────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();  // 210
  const h = doc.internal.pageSize.getHeight(); // 297
  const ML = 12; // margin left
  const MR = 12; // margin right

  function drawHeader(title: string, subtitle: string) {
    // Top rule
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.8);
    doc.line(ML, 8, w - MR, 8);
    // School name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(10, 10, 10);
    doc.text("GOVERNMENT HIGH SCHOOL BABI KHEL", w / 2, 15, { align: "center" });
    // Sub-info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text("District Mohmand, Khyber Pakhtunkhwa", w / 2, 20, { align: "center" });
    // Divider
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.25);
    doc.line(ML, 24, w - MR, 24);
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 10, 10);
    doc.text(title, w / 2, 31, { align: "center" });
    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text(subtitle, w / 2, 37, { align: "center" });
    // Bottom rule
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.8);
    doc.line(ML, 41, w - MR, 41);
  }

  function drawStats(ent: MeritStudentEntry[], startY: number) {
    const passing = ent.filter(e => e.percentage >= 33);
    const highest = Math.max(...ent.map(e => e.percentage));
    const avg = Math.round(ent.reduce((s, e) => s + e.percentage, 0) / ent.length);
    const passRate = Math.round((passing.length / ent.length) * 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    doc.text(
      `Total: ${ent.length}   |   Passed: ${passing.length}   |   Failed: ${ent.length - passing.length}   |   Highest: ${highest.toFixed(1)}%   |   Average: ${avg}%   |   Pass Rate: ${passRate}%`,
      w / 2, startY, { align: "center" }
    );
  }

  function drawFooter(pageNum: number, totalPages: number) {
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.25);
    doc.line(ML, h - 12, w - MR, h - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text("GHS Babi Khel — Official Merit List", ML, h - 7);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, w / 2, h - 7, { align: "center" });
    doc.text(`Page ${pageNum} / ${totalPages}`, w - MR, h - 7, { align: "right" });
  }

  // ── build pages ───────────────────────────────────────────────────────────────
  if (singleClass) {
    // Single class: one PDF page for that class only
    const ent = all.filter(e => e.class === singleClass);
    if (!ent.length) { return; }
    const clsExamType = (ent[0] as any).exam_type || examType;
    drawHeader(
      `MERIT LIST — CLASS ${singleClass}`,
      `${clsExamType}  |  Year ${year}  |  ${ent.length} Students`
    );
    drawStats(ent, 47);
    autoTable(doc, {
      startY: 52,
      head: [["Rank", "Roll No", "Student Name", "Marks Obtained", "%", "Grade"]],
      body: ent.map((e, i) => [
        i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`,
        e.roll_number,
        e.full_name,
        `${e.obtained_marks} / ${e.total_marks}`,
        `${Number(e.percentage).toFixed(1)}%`,
        e.grade,
      ]),
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5, halign: "center", cellPadding: 3.5 },
      bodyStyles: { fontSize: 8.5, cellPadding: 3, textColor: [20, 20, 20], fontStyle: "normal", overflow: "linebreak" },
      alternateRowStyles: { fillColor: [246, 247, 250] },
      columnStyles: {
        0: { halign: "center", cellWidth: 16, fontStyle: "bold" },
        1: { halign: "center", cellWidth: 22 },
        2: { halign: "left",   cellWidth: 72, overflow: "linebreak" },
        3: { halign: "center", cellWidth: 30 },
        4: { halign: "center", cellWidth: 22, fontStyle: "bold" },
        5: { halign: "center", cellWidth: 16 },
      },
      didParseCell: (data) => { if (data.section === "body" && data.row.index < 3) data.cell.styles.fontStyle = "bold"; },
      margin: { left: ML, right: MR, bottom: 18 },
      didDrawPage: (data) => { const total = (doc as any).internal.getNumberOfPages(); drawFooter(data.pageNumber, total); },
    });
  } else {
    // WHOLE SCHOOL: merge ALL students, sort by percentage, ONE combined ranked list
    const allSorted = [...all].sort((a, b) => b.percentage - a.percentage);
    drawHeader(
      "WHOLE SCHOOL MERIT LIST",
      `Year ${year}  |  All Classes Combined  |  ${allSorted.length} Students`
    );
    drawStats(allSorted, 47);
    autoTable(doc, {
      startY: 52,
      head: [["Rank", "Class", "Roll No", "Student Name", "Marks Obtained", "%", "Grade"]],
      body: allSorted.map((e, i) => [
        i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`,
        `Cls ${e.class}`,
        e.roll_number,
        e.full_name,
        `${e.obtained_marks} / ${e.total_marks}`,
        `${Number(e.percentage).toFixed(1)}%`,
        e.grade,
      ]),
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, halign: "center", cellPadding: 3 },
      bodyStyles: { fontSize: 8, cellPadding: 2.8, textColor: [20, 20, 20], overflow: "linebreak" },
      alternateRowStyles: { fillColor: [246, 247, 250] },
      columnStyles: {
        0: { halign: "center", cellWidth: 16, fontStyle: "bold" },
        1: { halign: "center", cellWidth: 16 },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "left",   cellWidth: 60, overflow: "linebreak" },
        4: { halign: "center", cellWidth: 28 },
        5: { halign: "center", cellWidth: 20, fontStyle: "bold" },
        6: { halign: "center", cellWidth: 14 },
      },
      didParseCell: (data) => { if (data.section === "body" && data.row.index < 3) data.cell.styles.fontStyle = "bold"; },
      margin: { left: ML, right: MR, bottom: 18 },
      didDrawPage: (data) => { const total = (doc as any).internal.getNumberOfPages(); drawFooter(data.pageNumber, total); },
    });
  }

  // Final pass — redraw footers with correct total page count
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  doc.save(
    singleClass
      ? `Merit_Class${singleClass}_${year}.pdf`
      : `School_Merit_${year}.pdf`
  );
}

function MeritListTab() {
  const [viewMode, setViewMode] = useState<"class"|"school">("school");
  const [cls, setCls] = useState("6");
  const [examType, setExamType] = useState("1st Semester");
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const year = parseInt(yearInput, 10);
  const validYear = !isNaN(year) && year >= 2000 && year <= 2099;

  // Class merit — always fetched when validYear (not gated by viewMode)
  const { data: classEntries = [], isLoading: clsLoading } = useQuery<MeritStudentEntry[]>({
    queryKey: ["ml-class", cls, examType, validYear ? year : 0],
    queryFn: async () => {
      if (!validYear) return [];
      const { data, error } = await supabase
        .from("results")
        .select("student_id,obtained_marks,total_marks,percentage,grade,position,class,students(full_name,roll_number,photo_url)")
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
        grade: r.grade || "—",
        position: r.position || i + 1,
      }));
    },
    enabled: validYear,
  });

  // School merit — fetches ALL classes for the year (NO exam_type filter)
  // Each class has its own exam type: classes 6-8 use Semester, 9-10 use Annual
  // So we must NOT filter by exam_type here — we fetch all published results for the year
  const { data: schoolEntries = [], isLoading: schoolLoading } = useQuery<MeritStudentEntry[]>({
    queryKey: ["ml-school-all", validYear ? year : 0],
    queryFn: async () => {
      if (!validYear) return [];
      const { data, error } = await supabase
        .from("results")
        .select("student_id,obtained_marks,total_marks,percentage,grade,position,class,exam_type,students(full_name,roll_number,photo_url)")
        .eq("year", year)
        .eq("is_published", true)
        .order("percentage", { ascending: false })
        .limit(1000);
      if (error) throw error;
      // Deduplicate: keep best result per student per class
      const best = new Map<string, any>();
      for (const r of (data ?? [])) {
        const key = r.student_id + "_" + r.class;
        if (!best.has(key) || r.percentage > best.get(key).percentage) {
          best.set(key, r);
        }
      }
      return Array.from(best.values())
        .sort((a, b) => b.percentage - a.percentage)
        .map((r: any, i: number) => ({
          student_id: r.student_id,
          full_name: r.students?.full_name || "Unknown",
          roll_number: r.students?.roll_number || "-",
          class: r.class,
          exam_type: r.exam_type,
          photo_url: r.students?.photo_url || null,
          obtained_marks: r.obtained_marks,
          total_marks: r.total_marks,
          percentage: r.percentage,
          grade: r.grade || "—",
          position: i + 1,
        }));
    },
    enabled: validYear,
  });

  const displayEntries = viewMode === "class" ? classEntries : schoolEntries;
  const isLoading = viewMode === "class" ? clsLoading : schoolLoading;

  const GBadge = ({ g }: { g: string }) => {
    const c = g === "A+" ? "bg-[#042C53] text-white" : g === "A" ? "bg-primary text-primary-foreground" : g === "B" ? "bg-green-500 text-white" : g === "C" ? "bg-amber-500 text-white" : "bg-red-500 text-white";
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c}`}>{g}</span>;
  };

  const tableTitle = viewMode === "class"
    ? `Class ${cls} — ${examType} ${year}`
    : `Whole School — ${year} (All Classes)`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Merit List
          </h2>
          <p className="text-xs text-muted-foreground">School examination rankings</p>
        </div>
        {displayEntries.length > 0 && (
          <button
            onClick={() => buildMeritPDF(displayEntries, examType, year, viewMode === "class" ? cls : undefined)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#042C53] text-white hover:bg-[#042C53]/90 px-4 py-2 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {viewMode === "class" ? "Download Class PDF" : "Download School PDF"}
          </button>
        )}
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setViewMode("class")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${viewMode === "class" ? "bg-[#042C53] text-white" : "bg-secondary text-muted-foreground"}`}>
          <Trophy className="w-4 h-4" /> Class Merit
        </button>
        <button onClick={() => setViewMode("school")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${viewMode === "school" ? "bg-[#042C53] text-white" : "bg-secondary text-muted-foreground"}`}>
          <School className="w-4 h-4" /> Whole School
        </button>
      </div>

      {/* Class selector — only in class mode */}
      {viewMode === "class" && (
        <div className="flex gap-2 flex-wrap">
          {ALL_CLASSES_ML.map(c => (
            <button key={c} onClick={() => setCls(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${cls === c ? "bg-[#042C53] text-white" : "bg-secondary text-muted-foreground"}`}>
              Class {c}
            </button>
          ))}
        </div>
      )}

      {/* Exam type + year filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {ALL_EXAM_TYPES_ML.map(e => (
          <button key={e} onClick={() => setExamType(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${examType === e ? "bg-primary/20 text-primary border border-primary/40" : "bg-secondary text-muted-foreground"}`}>
            {e}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Year:</label>
          <input type="number" value={yearInput} onChange={e => setYearInput(e.target.value)}
            className="w-20 text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary"
            min={2000} max={2099} />
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && displayEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: displayEntries.length, bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-700" },
            { label: "Passed", value: displayEntries.filter(e => e.percentage >= 33).length, bg: "bg-green-50 dark:bg-green-900/20 text-green-700" },
            { label: "Top Score", value: `${Math.max(...displayEntries.map(e => e.percentage))}%`, bg: "bg-amber-50 dark:bg-amber-900/20 text-amber-700" },
            { label: "Average", value: `${Math.round(displayEntries.reduce((s, e) => s + e.percentage, 0) / displayEntries.length)}%`, bg: "bg-purple-50 dark:bg-purple-900/20 text-purple-700" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.bg}`}>
              <p className="text-xl font-black">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!validYear ? (
        <div className="bg-card rounded-2xl p-8 text-center border border-border">
          <p className="text-sm text-muted-foreground">Enter a valid year to view merit list.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : displayEntries.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center border border-border">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No merit list available</p>
          <p className="text-xs text-muted-foreground mt-1">
            Results for {examType} · {year} {viewMode === "class" ? `(Class ${cls})` : "(All Classes)"} not published yet.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="bg-[#042C53] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">{tableTitle}</h3>
              <p className="text-xs text-blue-200">{displayEntries.length} students ranked</p>
            </div>
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-3 text-center font-semibold text-xs">Rank</th>
                  {viewMode === "school" && <th className="p-3 text-center font-semibold text-xs">Class</th>}
                  <th className="p-3 text-left font-semibold text-xs">Roll No</th>
                  <th className="p-3 text-left font-semibold text-xs">Student Name</th>
                  <th className="p-3 text-center font-semibold text-xs">Marks</th>
                  <th className="p-3 text-center font-semibold text-xs">%</th>
                  <th className="p-3 text-center font-semibold text-xs">Grade</th>
                </tr>
              </thead>
              <tbody>
                {displayEntries.map((e, i) => (
                  <tr key={`${e.student_id}-${i}`} className={`border-b border-border/50 ${
                    i === 0 ? "bg-yellow-50/80 dark:bg-yellow-900/20" :
                    i === 1 ? "bg-gray-50 dark:bg-gray-900/20" :
                    i === 2 ? "bg-orange-50/80 dark:bg-orange-900/20" :
                    "hover:bg-muted/30"
                  }`}>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                        i === 0 ? "bg-yellow-400 text-yellow-900" :
                        i === 1 ? "bg-gray-300 text-gray-800" :
                        i === 2 ? "bg-orange-300 text-orange-900" :
                        "bg-muted text-muted-foreground"
                      }`}>{i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}</span>
                    </td>
                    {viewMode === "school" && (
                      <td className="p-3 text-center">
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {e.class}
                        </span>
                      </td>
                    )}
                    <td className="p-3 font-mono text-xs text-muted-foreground">{e.roll_number}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {e.photo_url
                          ? <img src={e.photo_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">{e.full_name[0]}</div>
                        }
                        <span className={`text-sm ${i < 3 ? "font-bold text-foreground" : "text-foreground"}`}>{e.full_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-xs text-muted-foreground">{e.obtained_marks}/{e.total_marks}</td>
                    <td className="p-3 text-center font-bold text-sm">{e.percentage}%</td>
                    <td className="p-3 text-center"><GBadge g={e.grade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const tabComponents: Record<string, React.ComponentType<any>> = {
  overview:        OverviewTab,
  timetable:       TimetableTab,
  results:         ResultsTab,
  "exam-rolls":    RollNumbersTab,
  "result-card":   ResultCardTab,
  notices:         NoticesTab,
  news:            NewsTab,
  notes:           NotesTab,
  library:         LibraryTab,
  gallery:         GalleryTab,
  videos:          VideosTab,
  achievements:    AchievementsTab,
  tests:           TestsTab,
  teachers:        TeachersTab,
  profile:         ProfileTab,
  messages:        MessagesTab,
  discussion:      DiscussionTab,
  // New features — embedded inline, no separate files needed
  homework:        HomeworkTab,
  "exam-schedule": ExamScheduleTab,
  analytics:       AnalyticsTab,
  "honor-roll":    HonorRollTab,
  "merit-list":    MeritListTab,
};

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const TabComponent = tabComponents[activeTab] || OverviewTab;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <TabComponent onNavigate={setActiveTab} />
    </DashboardLayout>
  );
};

export default UserDashboard;
