import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAllStudentLedgers, getChargesAdmin,
} from "@/lib/financeService";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Search, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, Clock, DollarSign,
} from "lucide-react";
import { format } from "date-fns";

// ─── Utilities ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `Rs. ${Number(n).toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;

const statusColor = (s: string) =>
  s === "paid"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : s === "partial"
    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

// ─── Main Finance Tab ─────────────────────────────────────────────────────────

export default function FinanceTab() {
  const [search,      setSearch]      = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [expanded,    setExpanded]    = useState<string | null>(null);

  // All student ledgers (totals per student)
  const { data: ledgers = [], isLoading: loadingLedgers } = useQuery({
    queryKey: ["all-student-ledgers"],
    queryFn: getAllStudentLedgers,
    staleTime: 60_000,
  });

  // All charges with student info
  const { data: allCharges = [], isLoading: loadingCharges } = useQuery({
    queryKey: ["all-charges-admin"],
    queryFn: () => getChargesAdmin({}),
    staleTime: 60_000,
  });

  const isLoading = loadingLedgers || loadingCharges;

  // Unique classes for filter
  const classes = Array.from(new Set(ledgers.map((r) => r.class).filter(Boolean))).sort();

  // Filter ledgers
  const q = search.trim().toLowerCase();
  const filtered = ledgers.filter((r) => {
    if (classFilter !== "all" && r.class !== classFilter) return false;
    if (!q) return true;
    return (
      (r.full_name || "").toLowerCase().includes(q) ||
      (r.roll_number || "").toLowerCase().includes(q) ||
      (r.class || "").toLowerCase().includes(q)
    );
  });

  // Totals across filtered students
  const totals = filtered.reduce(
    (acc, r) => { acc.charged += r.total_charged; acc.paid += r.total_paid; acc.balance += r.balance; return acc; },
    { charged: 0, paid: 0, balance: 0 }
  );

  // Charges per student (for expanded view)
  const chargesByStudent = allCharges.reduce<Record<string, typeof allCharges>>((acc, c) => {
    if (!acc[c.student_id]) acc[c.student_id] = [];
    acc[c.student_id].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div>
        <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" /> Finance & Fees
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">All students and classes fee data</p>
      </div>

      {/* Summary totals */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-sm font-black text-foreground">{fmt(totals.charged)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total Charged</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-3 text-center">
          <p className="text-sm font-black text-green-600">{fmt(totals.paid)}</p>
          <p className="text-[10px] text-green-600/70 mt-0.5">Total Paid</p>
        </div>
        <div className={`border rounded-2xl p-3 text-center ${totals.balance > 0 ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"}`}>
          <p className={`text-sm font-black ${totals.balance > 0 ? "text-red-600" : "text-green-600"}`}>
            {totals.balance <= 0 ? "✓ Clear" : fmt(totals.balance)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Balance Due</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student name, roll no…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Class filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setClassFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${classFilter === "all" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}
        >
          All Classes
        </button>
        {classes.map((c) => (
          <button
            key={c}
            onClick={() => setClassFilter(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${classFilter === c ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Student list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No students found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const cleared = r.balance <= 0;
            const isOpen  = expanded === r.student_id;
            const charges = chargesByStudent[r.student_id] ?? [];

            return (
              <div key={r.student_id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Student row */}
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : r.student_id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${cleared ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {(r.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">{r.full_name || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.class || "—"} · Roll {r.roll_number || "—"}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] flex-wrap">
                      <span className="text-muted-foreground">Charged <span className="font-semibold text-foreground">{fmt(r.total_charged)}</span></span>
                      <span className="text-muted-foreground">Paid <span className="font-semibold text-green-600">{fmt(r.total_paid)}</span></span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className={`text-sm font-bold ${cleared ? "text-green-600" : "text-red-600"}`}>
                      {cleared ? "✓ Clear" : fmt(r.balance)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{cleared ? "no dues" : "due"}</p>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded charge details */}
                {isOpen && (
                  <div className="border-t border-border bg-secondary/20 p-3 space-y-2">
                    {charges.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No charges found</p>
                    ) : (
                      charges.map((c) => {
                        const remaining = c.amount - (c.amount_paid || 0);
                        return (
                          <div key={c.id} className="bg-card rounded-xl p-3 flex items-center gap-3 border border-border">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.status === "paid" ? "bg-green-100" : c.status === "partial" ? "bg-yellow-100" : "bg-red-100"}`}>
                              {c.status === "paid" ? <CheckCircle className="w-4 h-4 text-green-600" /> : c.status === "partial" ? <Clock className="w-4 h-4 text-yellow-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground">{c.title}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {fmt(c.amount)}
                                {c.due_date ? ` · Due ${format(new Date(c.due_date), "dd MMM yyyy")}` : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                              {c.status !== "paid" && (
                                <p className="text-xs font-bold text-red-600 mt-0.5">{fmt(remaining)} due</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
