import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyCharges, getMyPayments, getStudentLedger,
  resolveStudentRecord, submitWalletPayment,
} from "@/lib/financeService";
import type { StudentCharge, Payment } from "@/lib/financeService";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle, AlertTriangle, Clock, DollarSign,
  CreditCard, Receipt, ChevronDown, ChevronUp,
  Wallet, Smartphone, Upload, X, Info, RefreshCw,
  Banknote, FileText, ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

// ─── Utilities ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `Rs. ${Number(n).toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;

const statusColor = (s: string) =>
  s === "paid"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : s === "partial"
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : s === "completed"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : s === "rejected"
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

const statusIcon = (s: string) =>
  s === "paid" || s === "completed" ? (
    <CheckCircle className="w-4 h-4 text-emerald-600" />
  ) : s === "partial" ? (
    <Clock className="w-4 h-4 text-amber-600" />
  ) : s === "rejected" ? (
    <AlertTriangle className="w-4 h-4 text-red-600" />
  ) : (
    <AlertTriangle className="w-4 h-4 text-red-600" />
  );

const paymentStatusLabel = (s: string) => {
  switch (s) {
    case "completed": return "Verified";
    case "pending": return "Pending Verification";
    case "rejected": return "Rejected";
    default: return s;
  }
};

// ─── Main Finance Tab ─────────────────────────────────────────────────────────

export default function FinanceTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  // ── Step 1: Resolve the student record (CRITICAL FIX) ──────────────────
  // Admin writes charges using students.id, not profiles.id.
  // We must resolve the correct student ID to query finance data.
  const { data: studentRecord, isLoading: resolvingStudent } = useQuery({
    queryKey: ["resolve-student", profile?.id],
    queryFn: () => resolveStudentRecord(profile!),
    enabled: !!profile?.id && !!profile?.full_name,
    staleTime: 5 * 60 * 1000,
  });

  // Use the resolved students.id — NOT profile.id
  const studentId = studentRecord?.id ?? "";

  const [activeTab, setActiveTab] = useState<"charges" | "payments" | "pay">("charges");
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  // ── Queries (only enabled when studentId is resolved) ──────────────────
  const { data: charges = [], isLoading: loadingCharges } = useQuery({
    queryKey: ["my-charges", studentId],
    queryFn: () => getMyCharges(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["my-payments", studentId],
    queryFn: () => getMyPayments(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
  });

  const { data: ledger, isLoading: loadingLedger } = useQuery({
    queryKey: ["my-ledger", studentId],
    queryFn: () => getStudentLedger(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
  });

  const isLoading = loadingCharges || loadingLedger || resolvingStudent;

  // Computed finance stats
  const totalCharged = ledger?.total_charged ?? 0;
  const totalPaid = ledger?.total_paid ?? 0;
  const balance = ledger?.balance ?? 0;

  const pendingCharges = useMemo(
    () => charges.filter((c) => c.status === "pending" || c.status === "partial"),
    [charges]
  );
  const totalPending = useMemo(
    () => pendingCharges.reduce((s, c) => s + (c.amount - (c.amount_paid || 0)), 0),
    [pendingCharges]
  );

  // ── Show resolution status ─────────────────────────────────────────────
  if (resolvingStudent) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-heading font-bold text-foreground">Finance & Fees</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!studentRecord && profile?.role === "student") {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-heading font-bold text-foreground">Finance & Fees</h2>
        </div>
        <div className="bg-card border border-amber-200 dark:border-amber-800 rounded-2xl p-8 text-center">
          <Info className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground">Student Record Not Linked</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Your account is not yet linked to a student record in the system. Please ask the admin
            to add you to the Students list with your name (<strong>{profile?.full_name}</strong>),
            class (<strong>Class {profile?.class}</strong>), and roll number (<strong>{profile?.roll_number}</strong>).
            Once linked, your fees and finance data will appear here.
          </p>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["resolve-student"] })}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retry Linking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Finance & Fees
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your fee charges, payment history & online payment
          </p>
        </div>
        {studentRecord && (
          <div className="text-right">
            <p className="text-xs font-semibold text-foreground">{studentRecord.full_name}</p>
            <p className="text-[10px] text-muted-foreground">
              Class {studentRecord.class} &middot; Roll #{studentRecord.roll_number}
            </p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {loadingLedger ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-1.5">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-black text-foreground">{fmt(totalCharged)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Charged</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 text-center shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-sm font-black text-emerald-600">{fmt(totalPaid)}</p>
            <p className="text-[10px] text-emerald-600/70 mt-0.5">Total Paid</p>
          </div>
          <div className={`border rounded-2xl p-3 text-center shadow-sm ${
            balance > 0
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5 ${
              balance > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-emerald-100 dark:bg-emerald-900/40"
            }`}>
              {balance > 0
                ? <AlertTriangle className="w-4 h-4 text-red-600" />
                : <ShieldCheck className="w-4 h-4 text-emerald-600" />
              }
            </div>
            <p className={`text-sm font-black ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {balance <= 0 ? "All Clear" : fmt(balance)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Balance Due</p>
          </div>
        </div>
      )}

      {/* Quick Pay Banner */}
      {totalPending > 0 && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {fmt(totalPending)} Pending
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pendingCharges.length} charge{pendingCharges.length !== 1 ? "s" : ""} awaiting payment
            </p>
          </div>
          <button
            onClick={() => setActiveTab("pay")}
            className="text-xs font-bold bg-primary text-white px-3 py-2 rounded-xl hover:bg-primary/90 transition-colors shrink-0"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1">
        <button
          onClick={() => setActiveTab("charges")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "charges"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" /> Charges
          {charges.length > 0 && (
            <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === "charges" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {charges.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "payments"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Payments
          {payments.length > 0 && (
            <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === "payments" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {payments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("pay")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "pay"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" /> Pay Online
        </button>
      </div>

      {/* ── Charges Tab ── */}
      {activeTab === "charges" && (
        <>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : charges.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-foreground">No charges yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                No fees or fines have been assigned to your account. Check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Charge summary bar */}
              <div className="flex gap-2 flex-wrap">
                {charges.some(c => c.status === "pending") && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {charges.filter(c => c.status === "pending").length} Pending
                  </span>
                )}
                {charges.some(c => c.status === "partial") && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {charges.filter(c => c.status === "partial").length} Partial
                  </span>
                )}
                {charges.some(c => c.status === "paid") && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {charges.filter(c => c.status === "paid").length} Paid
                  </span>
                )}
              </div>

              {charges.map((c) => {
                const remaining = c.amount - (c.amount_paid || 0);
                const isOpen = expandedCharge === c.id;
                const isOverdue = c.due_date && new Date(c.due_date) < new Date() && c.status !== "paid";
                return (
                  <div key={c.id} className={`bg-card border rounded-xl overflow-hidden transition-colors ${
                    isOverdue ? "border-red-300 dark:border-red-800" : "border-border"
                  }`}>
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left"
                      onClick={() => setExpandedCharge(isOpen ? null : c.id)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        c.status === "paid" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                        c.status === "partial" ? "bg-amber-100 dark:bg-amber-900/30" :
                        "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {statusIcon(c.status)}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {fmt(c.amount)}
                          {c.fee_type?.category && (
                            <span className="ml-1 capitalize text-primary/70">&middot; {c.fee_type.category}</span>
                          )}
                          {isOverdue && (
                            <span className="ml-1 text-red-600 font-semibold">&middot; Overdue</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColor(c.status)}`}>
                          {c.status}
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border bg-secondary/20 p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Charged</span>
                          <span className="font-semibold">{fmt(c.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount Paid</span>
                          <span className="font-semibold text-emerald-600">{fmt(c.amount_paid || 0)}</span>
                        </div>
                        {c.status !== "paid" && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Remaining</span>
                            <span className="font-bold text-red-600">{fmt(remaining)}</span>
                          </div>
                        )}
                        {c.due_date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Due Date</span>
                            <span className={`font-semibold ${isOverdue ? "text-red-600" : ""}`}>
                              {format(new Date(c.due_date), "dd MMM yyyy")}
                              {isOverdue && " (Overdue)"}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Added On</span>
                          <span className="font-semibold">
                            {format(new Date(c.created_at), "dd MMM yyyy")}
                          </span>
                        </div>
                        {/* Progress bar for partial payments */}
                        {c.status !== "paid" && (
                          <div className="pt-1.5">
                            <div className="flex justify-between mb-1">
                              <span className="text-muted-foreground">Payment Progress</span>
                              <span className="font-semibold">{Math.round(((c.amount_paid || 0) / c.amount) * 100)}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.round(((c.amount_paid || 0) / c.amount) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Payments Tab ── */}
      {activeTab === "payments" && (
        <>
          {loadingPayments ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-foreground">No payments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your payment history will appear here once payments are made.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => {
                const isOpen = expandedPayment === p.id;
                const items = (p.items ?? []) as Array<{ charge_id: string; amount_paid: number; charge?: { title: string; amount: number } }>;
                return (
                  <div key={p.id} className={`bg-card border rounded-xl overflow-hidden ${
                    p.status === "pending" ? "border-amber-200 dark:border-amber-800" :
                    p.status === "rejected" ? "border-red-200 dark:border-red-800" :
                    "border-border"
                  }`}>
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left"
                      onClick={() => setExpandedPayment(isOpen ? null : p.id)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        p.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                        p.status === "rejected" ? "bg-red-100 dark:bg-red-900/30" :
                        "bg-amber-100 dark:bg-amber-900/30"
                      }`}>
                        {p.status === "completed"
                          ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                          : p.status === "rejected"
                          ? <AlertTriangle className="w-5 h-5 text-red-600" />
                          : <Clock className="w-5 h-5 text-amber-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{fmt(p.total_amount)}</p>
                          <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded capitalize">
                            {p.payment_method.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(p.paid_at), "dd MMM yyyy")}
                          {p.receipt && (
                            <span className="ml-1.5 text-primary">&middot; Receipt: {p.receipt.receipt_number}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>
                          {paymentStatusLabel(p.status)}
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border bg-secondary/20 p-3 space-y-2 text-xs">
                        {/* Payment items breakdown */}
                        {items.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Charge Breakdown</p>
                            {items.map((item, i) => (
                              <div key={i} className="flex justify-between">
                                <span className="text-foreground">{item.charge?.title || "Fee"}</span>
                                <span className="font-semibold">{fmt(item.amount_paid)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="border-t border-border/50 pt-1.5 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-bold text-foreground">{fmt(p.total_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Method</span>
                            <span className="font-semibold capitalize">{p.payment_method.replace("_", " ")}</span>
                          </div>
                          {p.reference_number && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reference</span>
                              <span className="font-mono font-semibold">{p.reference_number}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-semibold">{format(new Date(p.paid_at), "dd MMM yyyy, hh:mm a")}</span>
                          </div>
                        </div>
                        {p.status === "rejected" && p.rejection_reason && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 mt-1">
                            <p className="text-[10px] font-semibold text-red-600 mb-0.5">Rejection Reason:</p>
                            <p className="text-red-700 dark:text-red-400">{p.rejection_reason}</p>
                          </div>
                        )}
                        {p.status === "pending" && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mt-1 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <p className="text-amber-700 dark:text-amber-400">
                              Your payment is being verified by the admin. This usually takes 1-24 hours.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Pay Online Tab ── */}
      {activeTab === "pay" && (
        <WalletPaymentPanel
          studentId={studentId}
          pendingCharges={pendingCharges}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["my-charges"] });
            qc.invalidateQueries({ queryKey: ["my-payments"] });
            qc.invalidateQueries({ queryKey: ["my-ledger"] });
          }}
        />
      )}
    </div>
  );
}

// ─── Wallet Payment Panel ────────────────────────────────────────────────────

function WalletPaymentPanel({
  studentId,
  pendingCharges,
  onSuccess,
}: {
  studentId: string;
  pendingCharges: StudentCharge[];
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<"jazzcash" | "easypaisa">("jazzcash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleCharge = (id: string) => {
    setSelectedChargeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedTotal = useMemo(() => {
    return pendingCharges
      .filter((c) => selectedChargeIds.includes(c.id))
      .reduce((s, c) => s + (c.amount - (c.amount_paid || 0)), 0);
  }, [pendingCharges, selectedChargeIds]);

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast.error("Please enter the transaction reference number");
      return;
    }
    if (selectedChargeIds.length === 0) {
      toast.error("Please select at least one charge to pay");
      return;
    }
    if (selectedTotal <= 0) {
      toast.error("Total amount must be greater than zero");
      return;
    }

    setSubmitting(true);
    try {
      // Upload screenshot to Cloudinary if provided
      let screenshotUrl: string | undefined;
      if (screenshotFile) {
        const formData = new FormData();
        formData.append("file", screenshotFile);
        formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "school_uploads");
        formData.append("folder", "payment-screenshots");

        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        if (cloudName) {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.secure_url) screenshotUrl = data.secure_url;
        }
      }

      await submitWalletPayment({
        student_id: studentId,
        charge_ids: selectedChargeIds,
        total_amount: selectedTotal,
        payment_method: method,
        reference_number: referenceNumber.trim(),
        screenshot_url: screenshotUrl,
      });

      toast.success("Payment submitted successfully! Admin will verify it shortly.");
      setReferenceNumber("");
      setSelectedChargeIds([]);
      setScreenshotFile(null);
      setScreenshotPreview(null);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">How to Pay Online</p>
          <ol className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-0.5 list-decimal list-inside">
            <li>Open your {method === "jazzcash" ? "JazzCash" : "EasyPaisa"} app and send the payment</li>
            <li>Copy the transaction reference number</li>
            <li>Take a screenshot of the payment confirmation</li>
            <li>Enter the reference number and upload the screenshot below</li>
            <li>Your payment will be verified by admin within 24 hours</li>
          </ol>
        </div>
      </div>

      {pendingCharges.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No pending charges</p>
          <p className="text-xs text-muted-foreground mt-1">
            All your fees are paid. Nothing to pay right now.
          </p>
        </div>
      ) : (
        <>
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod("jazzcash")}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  method === "jazzcash"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  method === "jazzcash" ? "bg-red-500" : "bg-muted"
                }`}>
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${method === "jazzcash" ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
                    JazzCash
                  </p>
                  <p className="text-[10px] text-muted-foreground">Mobile Wallet</p>
                </div>
              </button>
              <button
                onClick={() => setMethod("easypaisa")}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  method === "easypaisa"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  method === "easypaisa" ? "bg-green-500" : "bg-muted"
                }`}>
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${method === "easypaisa" ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>
                    EasyPaisa
                  </p>
                  <p className="text-[10px] text-muted-foreground">Mobile Wallet</p>
                </div>
              </button>
            </div>
          </div>

          {/* Select Charges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Charges to Pay</p>
              {pendingCharges.length > 1 && (
                <button
                  onClick={() => {
                    if (selectedChargeIds.length === pendingCharges.length) {
                      setSelectedChargeIds([]);
                    } else {
                      setSelectedChargeIds(pendingCharges.map((c) => c.id));
                    }
                  }}
                  className="text-[10px] font-semibold text-primary hover:underline"
                >
                  {selectedChargeIds.length === pendingCharges.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {pendingCharges.map((c) => {
                const remaining = c.amount - (c.amount_paid || 0);
                const selected = selectedChargeIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCharge(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      selected ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}>
                      {selected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.status === "partial"
                          ? `Paid ${fmt(c.amount_paid || 0)} of ${fmt(c.amount)}`
                          : fmt(c.amount)
                        }
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-red-600">{fmt(remaining)}</p>
                      <p className="text-[10px] text-muted-foreground">due</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Details</p>
            <input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Enter transaction reference number *"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
            />

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Payment Screenshot (optional but recommended)</p>
              {screenshotPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img
                    src={screenshotPreview}
                    alt="Payment screenshot"
                    className="w-full max-h-48 object-contain bg-card"
                  />
                  <button
                    onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upload Screenshot</p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshot}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit */}
          {selectedChargeIds.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Total to Pay</span>
                <span className="text-2xl font-black text-primary">{fmt(selectedTotal)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {selectedChargeIds.length} charge{selectedChargeIds.length > 1 ? "s" : ""} selected &middot; Via {method === "jazzcash" ? "JazzCash" : "EasyPaisa"}
              </p>
              <button
                onClick={handleSubmit}
                disabled={submitting || !referenceNumber.trim() || selectedTotal <= 0}
                className="w-full py-3 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" /> Submit Payment ({fmt(selectedTotal)})
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
