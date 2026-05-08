import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyCharges, getMyPayments, getStudentLedger } from "@/lib/financeService";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle, AlertTriangle, Clock, DollarSign,
  CreditCard, Receipt, ChevronDown, ChevronUp,
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

const statusIcon = (s: string) =>
  s === "paid" ? (
    <CheckCircle className="w-4 h-4 text-green-600" />
  ) : s === "partial" ? (
    <Clock className="w-4 h-4 text-yellow-600" />
  ) : (
    <AlertTriangle className="w-4 h-4 text-red-600" />
  );

// ─── Main Finance Tab ─────────────────────────────────────────────────────────

export default function FinanceTab() {
  const { profile } = useAuth();
  const studentId = profile?.id ?? "";

  const [activeTab, setActiveTab] = useState<"charges" | "payments">("charges");
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);

  // My charges (only this student's)
  const { data: charges = [], isLoading: loadingCharges } = useQuery({
    queryKey: ["my-charges", studentId],
    queryFn: () => getMyCharges(studentId),
    enabled: !!studentId,
    staleTime: 60_000,
  });

  // My payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["my-payments", studentId],
    queryFn: () => getMyPayments(studentId),
    enabled: !!studentId,
    staleTime: 60_000,
  });

  // My ledger (totals)
  const { data: ledger, isLoading: loadingLedger } = useQuery({
    queryKey: ["my-ledger", studentId],
    queryFn: () => getStudentLedger(studentId),
    enabled: !!studentId,
    staleTime: 60_000,
  });

  const isLoading = loadingCharges || loadingLedger;

  const totalCharged = ledger?.total_charged ?? 0;
  const totalPaid    = ledger?.total_paid    ?? 0;
  const balance      = ledger?.balance       ?? 0;

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div>
        <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" /> Finance & Fees
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your fee charges and payment history
        </p>
      </div>

      {/* Summary totals */}
      {loadingLedger ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-sm font-black text-foreground">{fmt(totalCharged)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Charged</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-3 text-center">
            <p className="text-sm font-black text-green-600">{fmt(totalPaid)}</p>
            <p className="text-[10px] text-green-600/70 mt-0.5">Total Paid</p>
          </div>
          <div className={`border rounded-2xl p-3 text-center ${
            balance > 0
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          }`}>
            <p className={`text-sm font-black ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {balance <= 0 ? "✓ Clear" : fmt(balance)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Balance Due</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-secondary rounded-xl p-1">
        <button
          onClick={() => setActiveTab("charges")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "charges"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" /> Charges
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "payments"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Payments
        </button>
      </div>

      {/* ── Charges Tab ── */}
      {activeTab === "charges" && (
        <>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : charges.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No charges yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                No fees or fines have been assigned to your account.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {charges.map((c) => {
                const remaining = c.amount - (c.amount_paid || 0);
                const isOpen = expandedCharge === c.id;
                return (
                  <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left"
                      onClick={() => setExpandedCharge(isOpen ? null : c.id)}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        c.status === "paid" ? "bg-green-100" : c.status === "partial" ? "bg-yellow-100" : "bg-red-100"
                      }`}>
                        {statusIcon(c.status)}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {fmt(c.amount)}
                          {c.fee_type?.category && (
                            <span className="ml-1 capitalize text-primary/70">· {c.fee_type.category}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>
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
                          <span className="text-muted-foreground">Charged</span>
                          <span className="font-semibold">{fmt(c.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="font-semibold text-green-600">{fmt(c.amount_paid || 0)}</span>
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
                            <span className="font-semibold">
                              {format(new Date(c.due_date), "dd MMM yyyy")}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Added On</span>
                          <span className="font-semibold">
                            {format(new Date(c.created_at), "dd MMM yyyy")}
                          </span>
                        </div>
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
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No payments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your payment history will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    p.status === "completed" ? "bg-green-100" : p.status === "rejected" ? "bg-red-100" : "bg-yellow-100"
                  }`}>
                    {p.status === "completed"
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : p.status === "rejected"
                      ? <AlertTriangle className="w-4 h-4 text-red-600" />
                      : <Clock className="w-4 h-4 text-yellow-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{fmt(p.total_amount)}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {p.payment_method.replace("_", " ")} · {format(new Date(p.paid_at), "dd MMM yyyy")}
                    </p>
                    {p.receipt && (
                      <p className="text-[10px] text-primary mt-0.5">
                        Receipt: {p.receipt.receipt_number}
                      </p>
                    )}
                    {p.status === "rejected" && p.rejection_reason && (
                      <p className="text-[10px] text-red-600 mt-0.5">
                        Rejected: {p.rejection_reason}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    p.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : p.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
                          }
