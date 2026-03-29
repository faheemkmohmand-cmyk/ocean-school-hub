import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Check, X, Clock, Palmtree, Loader2, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

type Status = "present" | "absent" | "late" | "leave";

interface Student { id: string; full_name: string; roll_number: string; photo_url: string | null; }
interface AttendanceRecord { id?: string; student_id: string; date: string; status: Status; }

const statusConfig: Record<Status, { icon: React.ReactNode; label: string; color: string }> = {
  present: { icon: <Check className="w-4 h-4" />, label: "Present", color: "bg-[hsl(var(--success))] text-white" },
  absent: { icon: <X className="w-4 h-4" />, label: "Absent", color: "bg-destructive text-destructive-foreground" },
  late: { icon: <Clock className="w-4 h-4" />, label: "Late", color: "bg-[hsl(var(--warning))] text-white" },
  leave: { icon: <Palmtree className="w-4 h-4" />, label: "Leave", color: "bg-primary/70 text-primary-foreground" },
};

const classes = ["6", "7", "8", "9", "10"];

const AdminAttendance = () => {
  const qc = useQueryClient();
  const [cls, setCls] = useState("6");
  const [date, setDate] = useState(new Date());
  const [tab, setTab] = useState("mark");
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date());

  const dateStr = format(date, "yyyy-MM-dd");

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["attendance-students", cls],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name, roll_number, photo_url").eq("class", cls).eq("is_active", true).order("roll_number");
      if (error) throw error; return data ?? [];
    },
  });

  const { data: existingAttendance = [], isLoading: loadingAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-day", cls, dateStr],
    queryFn: async () => {
      const studentIds = students.map(s => s.id);
      if (!studentIds.length) return [];
      const { data, error } = await supabase.from("attendance").select("*").eq("date", dateStr).in("student_id", studentIds);
      if (error) throw error; return (data ?? []) as AttendanceRecord[];
    },
    enabled: students.length > 0,
  });

  // Initialize statuses from existing data
  useMemo(() => {
    const map: Record<string, Status> = {};
    students.forEach(s => { map[s.id] = "present"; });
    existingAttendance.forEach(a => { map[a.student_id] = a.status; });
    setStatuses(map);
  }, [students, existingAttendance]);

  const toggleStatus = (studentId: string) => {
    const order: Status[] = ["present", "absent", "late", "leave"];
    setStatuses(prev => {
      const current = prev[studentId] || "present";
      const next = order[(order.indexOf(current) + 1) % order.length];
      return { ...prev, [studentId]: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const rows = students.map(s => ({
      student_id: s.id, date: dateStr, status: statuses[s.id] || "present",
    }));

    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    if (error) { toast.error("Save failed"); setSaving(false); return; }

    toast.success("Attendance saved!");
    qc.invalidateQueries({ queryKey: ["attendance-day", cls, dateStr] });

    const allPresent = Object.values(statuses).every(s => s === "present");
    if (allPresent && students.length > 0) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    setSaving(false);
  };

  // Monthly report
  const monthStart = startOfMonth(reportMonth);
  const monthEnd = endOfMonth(reportMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d));

  const { data: monthlyData = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-month", cls, format(reportMonth, "yyyy-MM")],
    queryFn: async () => {
      const studentIds = students.map(s => s.id);
      if (!studentIds.length) return [];
      const { data, error } = await supabase.from("attendance").select("*")
        .in("student_id", studentIds)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error; return (data ?? []) as AttendanceRecord[];
    },
    enabled: tab === "report" && students.length > 0,
  });

  const reportData = useMemo(() => {
    return students.map(s => {
      const records = monthlyData.filter(r => r.student_id === s.id);
      const present = records.filter(r => r.status === "present").length;
      const absent = records.filter(r => r.status === "absent").length;
      const late = records.filter(r => r.status === "late").length;
      const leave = records.filter(r => r.status === "leave").length;
      const total = monthDays.length;
      const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
      return { ...s, present, absent, late, leave, total, pct };
    });
  }, [students, monthlyData, monthDays]);

  const exportCSV = () => {
    const header = "Roll No,Name,Present,Absent,Late,Leave,Total Days,Percentage\n";
    const rows = reportData.map(r => `${r.roll_number},${r.full_name},${r.present},${r.absent},${r.late},${r.leave},${r.total},${r.pct}%`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-class${cls}-${format(reportMonth, "MMM-yyyy")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-heading font-bold text-foreground">Attendance</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={cls} onValueChange={setCls}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
        </Select>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="report">Monthly Report</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "mark" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2"><CalendarIcon className="w-4 h-4" />{format(date, "dd MMM yyyy")}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} /></PopoverContent>
            </Popover>
            <Badge variant="secondary">{students.length} students</Badge>
          </div>

          {loadingAttendance ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {students.map(s => {
                  const status = statuses[s.id] || "present";
                  const cfg = statusConfig[status];
                  return (
                    <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow border-border" onClick={() => toggleStatus(s.id)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        {s.photo_url
                          ? <img src={s.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">{s.full_name.charAt(0)}</div>}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">{s.roll_number}</p>
                        </div>
                        <Badge className={`${cfg.color} gap-1 shrink-0`}>{cfg.icon}{cfg.label}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Attendance
              </Button>
            </>
          )}
        </div>
      )}

      {tab === "report" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input type="month" value={format(reportMonth, "yyyy-MM")} onChange={e => setReportMonth(new Date(e.target.value + "-01"))} className="w-44" />
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="w-4 h-4" /> Export CSV</Button>
          </div>

          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Roll No</TableHead><TableHead>Name</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-center">Late</TableHead>
                <TableHead className="text-center">Leave</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">%</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {reportData.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.roll_number}</TableCell>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="text-center text-[hsl(var(--success))] font-semibold">{r.present}</TableCell>
                    <TableCell className="text-center text-destructive font-semibold">{r.absent}</TableCell>
                    <TableCell className="text-center text-[hsl(var(--warning))] font-semibold">{r.late}</TableCell>
                    <TableCell className="text-center text-primary font-semibold">{r.leave}</TableCell>
                    <TableCell className="text-center">{r.total}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.pct >= 75 ? "default" : "destructive"} className={r.pct >= 75 ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]" : ""}>
                        {r.pct}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;
