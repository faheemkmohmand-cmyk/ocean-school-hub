import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Hash, Search, Download, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

interface ExamSession {
  id: string; title: string; exam_year: number; exam_term: string;
  classes: string[]; class_order: string[]; is_published: boolean;
}
interface RollEntry {
  id: string; student_name: string; father_name: string | null;
  class: string; class_roll_no: string; exam_roll_no: string; serial_number: number;
}

const RollNumbersTab = () => {
  const { profile } = useAuth();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ExamSession[]>({
    queryKey: ["dash-exam-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_roll_sessions")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;

  const { data: rollNumbers = [], isLoading: loadingRolls } = useQuery<RollEntry[]>({
    queryKey: ["dash-exam-rolls", selectedSession?.id],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await supabase
        .from("exam_roll_numbers")
        .select("id, student_name, father_name, class, class_roll_no, exam_roll_no, serial_number")
        .eq("session_id", selectedSession.id)
        .order("serial_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedSession,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-search if user is a student
  const myRollNumber = profile?.roll_number;
  const myClass = profile?.class;

  const myRecord = myRollNumber
    ? rollNumbers.find(r => r.class_roll_no === myRollNumber && r.class === myClass)
    : null;

  const filtered = search
    ? rollNumbers.filter(r =>
        r.student_name.toLowerCase().includes(search.toLowerCase()) ||
        r.exam_roll_no.includes(search) ||
        r.class_roll_no.includes(search) ||
        r.class.includes(search)
      )
    : rollNumbers;

  const downloadSlip = (r: RollEntry) => {
    if (!selectedSession) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(240, 249, 255);
    doc.rect(0, 0, pageW, pageH, "F");

    // Border
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(1.2);
    doc.roundedRect(6, 6, pageW - 12, pageH - 12, 4, 4, "S");

    // Header bar
    doc.setFillColor(14, 165, 233);
    doc.roundedRect(6, 6, pageW - 12, 28, 4, 4, "F");
    doc.setFillColor(14, 165, 233);
    doc.rect(6, 22, pageW - 12, 12, "F"); // fill bottom corners

    // School name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Government High School Babi Khel", pageW / 2, 18, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Examination Admit Card", pageW / 2, 26, { align: "center" });

    // Exam Roll Number box
    doc.setFillColor(3, 105, 161);
    doc.roundedRect(pageW / 2 - 30, 40, 60, 22, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("EXAM ROLL NUMBER", pageW / 2, 47, { align: "center" });
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(r.exam_roll_no, pageW / 2, 58, { align: "center" });

    // Divider
    doc.setDrawColor(224, 242, 254);
    doc.setLineWidth(0.5);
    doc.line(14, 70, pageW - 14, 70);

    // Info rows
    const rows: [string, string][] = [
      ["Student Name", r.student_name],
      ["Father Name", r.father_name || "—"],
      ["Class", `Class ${r.class}`],
      ["Class Roll No", r.class_roll_no],
      ["Examination", `${selectedSession.exam_term} ${selectedSession.exam_year}`],
    ];

    let y = 78;
    rows.forEach(([label, value]) => {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(label, 16, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(value, pageW - 16, y, { align: "right" });
      doc.setDrawColor(240, 249, 255);
      doc.setLineWidth(0.3);
      doc.line(14, y + 3, pageW - 14, y + 3);
      y += 12;
    });

    // Footer
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text("GHS Babi Khel · ghs-babi-khel.vercel.app", pageW / 2, pageH - 12, { align: "center" });
    doc.text("Keep this card safe. Bring it to the examination hall.", pageW / 2, pageH - 7, { align: "center" });

    doc.save(`AdmitCard-${r.exam_roll_no}-${r.student_name.replace(/\s+/g, "_")}.pdf`);
    toast.success("Admit card PDF downloaded!");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Hash className="w-6 h-6 text-primary" />
          Exam Roll Numbers
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Find your exam roll number and download your admit card
        </p>
      </div>

      {/* My Roll Number Card */}
      {myRecord && selectedSession && (
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-elevated">
          <p className="text-sm opacity-80 mb-1">Your Exam Roll Number</p>
          <h3 className="text-4xl font-bold tracking-widest mb-3">{myRecord.exam_roll_no}</h3>
          <p className="text-sm opacity-90">{myRecord.student_name} &nbsp;·&nbsp; Class {myRecord.class} &nbsp;·&nbsp; {selectedSession.exam_term} {selectedSession.exam_year}</p>
          <button
            onClick={() => downloadSlip(myRecord)}
            className="mt-4 inline-flex items-center gap-2 bg-white text-primary font-semibold px-4 py-2 rounded-xl text-sm hover:bg-white/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Admit Card
          </button>
        </div>
      )}

      {/* Session tabs */}
      {loadingSessions ? (
        <div className="flex gap-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-32 rounded-xl" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-card rounded-xl p-10 text-center shadow-card">
          <Hash className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No Roll Numbers Published</p>
          <p className="text-sm text-muted-foreground mt-1">Check back when exam roll numbers are published</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                  selectedSession?.id === s.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {s.exam_term} {s.exam_year}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, roll no, class..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring outline-none"
            />
          </div>

          {/* List */}
          {loadingRolls ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {filtered.slice(0, 50).map(r => (
                <div key={r.id} className="bg-card rounded-xl px-4 py-3 shadow-card flex items-center gap-3">
                  <span className="font-mono font-bold text-primary w-20 shrink-0 text-base">{r.exam_roll_no}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{r.student_name}</p>
                    <p className="text-xs text-muted-foreground">Class {r.class} &nbsp;·&nbsp; Roll: {r.class_roll_no}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">Class {r.class}</Badge>
                  <button
                    onClick={() => downloadSlip(r)}
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
                  >
                    <Download className="w-3 h-3" /> Card
                  </button>
                </div>
              ))}
              {filtered.length > 50 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Showing 50 of {filtered.length} — use search to find specific student
                </p>
              )}
              {filtered.length === 0 && search && (
                <div className="text-center py-8 text-muted-foreground">
                  No students found for "{search}"
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RollNumbersTab;
