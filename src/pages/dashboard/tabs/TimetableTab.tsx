import { useState, useMemo } from "react";
import { Printer } from "lucide-react";
import { useTimetable } from "@/hooks/useTimetable";
import { Skeleton } from "@/components/ui/skeleton";

const classes = ["6", "7", "8", "9", "10"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const subjectColors: Record<string, string> = {
  Mathematics: "bg-primary/10 text-primary border-primary/20",
  English: "bg-[hsl(280,60%,50%)]/10 text-[hsl(280,60%,50%)] border-[hsl(280,60%,50%)]/20",
  Science: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/20",
  Urdu: "bg-warning/10 text-warning border-warning/20",
  Islamiat: "bg-[hsl(172,66%,40%)]/10 text-[hsl(172,66%,40%)] border-[hsl(172,66%,40%)]/20",
  "Pak Studies": "bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)] border-[hsl(25,95%,53%)]/20",
  "Social Studies": "bg-accent/10 text-accent-foreground border-accent/20",
  Computer: "bg-primary-dark/10 text-primary-dark border-primary-dark/20",
};

const getSubjectColor = (subject: string) => {
  for (const [key, val] of Object.entries(subjectColors)) {
    if (subject.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "bg-secondary text-secondary-foreground border-border";
};

const TimetableTab = () => {
  const [selectedClass, setSelectedClass] = useState("6");
  const { data: entries = [], isLoading } = useTimetable(selectedClass);

  const periods = useMemo(() => {
    if (!entries.length) return [];
    const nums = [...new Set(entries.map((e) => e.period_number))].sort((a, b) => a - b);
    return nums;
  }, [entries]);

  const getEntry = (day: string, period: number) =>
    entries.find((e) => e.day === day && e.period_number === period);

  return (
    <div className="space-y-6">
      {/* Class Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedClass === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary shadow-card"
              }`}
            >
              Class {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-card text-foreground shadow-card hover:bg-secondary transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl shadow-card">
          <p className="text-muted-foreground">No timetable data available for Class {selectedClass}.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="gradient-hero text-primary-foreground">
                  <th className="px-3 py-3 text-left font-medium w-20">Period</th>
                  {days.map((d) => (
                    <th key={d} className="px-3 py-3 text-left font-medium">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, pi) => (
                  <tr key={p} className={`border-t border-border ${pi % 2 === 1 ? "bg-secondary/20" : ""}`}>
                    <td className="px-3 py-3 font-semibold text-foreground">P{p}</td>
                    {days.map((day) => {
                      const entry = getEntry(day, p);
                      if (!entry) return <td key={day} className="px-3 py-3 text-muted-foreground text-xs">—</td>;
                      return (
                        <td key={day} className="px-2 py-2">
                          <div className={`rounded-lg border p-2 ${getSubjectColor(entry.subject)}`}>
                            <div className="font-semibold text-xs">{entry.subject}</div>
                            {entry.teacher_name && (
                              <div className="text-[10px] opacity-75 mt-0.5">{entry.teacher_name}</div>
                            )}
                            {entry.start_time && entry.end_time && (
                              <div className="text-[10px] opacity-60">{entry.start_time}-{entry.end_time}</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableTab;
