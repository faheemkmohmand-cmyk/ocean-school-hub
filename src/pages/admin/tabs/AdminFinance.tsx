import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  getFeeTypes, createFeeType, deleteFeeType,
  getChargesAdmin, createCharge, bulkCreateCharges, deleteCharge,
  collectCashPayment, getPendingPayments, getAllPayments,
  approveWalletPayment, rejectWalletPayment,
  getAllStudentLedgers, getTodayStats,
} from "@/lib/financeService";
import type { FeeType, StudentCharge, Payment } from "@/lib/financeService";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, Plus, Trash2, Check, X, Eye, Printer,
  Users, AlertTriangle, CreditCard, TrendingDown, FileText,
  ChevronDown, ChevronUp, Search, Filter, Download,
  Banknote, Smartphone, Clock, CheckCircle, XCircle, Receipt,
} from "lucide-react";
import { format } from "date-fns";

// ─── Utility ──────────────────────────────────────────────────────────────────

const statusColor = (s: string) =>
  s === "paid" || s === "completed"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : s === "partial"
    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    : s === "rejected"
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

const methodIcon = (m: string) =>
  m === "cash" ? <Banknote className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />;

const fmt = (n: number) => `Rs. ${Number(n).toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color} flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-white/80 text-xs font-medium">{label}</p>
        <p className="text-white text-xl font-black">{value}</p>
      </div>
    </div>
  );
}

// ─── Receipt Print ────────────────────────────────────────────────────────────

function printReceipt(payment: Payment) {
  const receipt = (payment as any).receipt;
  const student = (payment as any).student;
  const items = (payment as any).items ?? [];

  const html = `
    <html><head><title>Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; max-width: 360px; margin: auto; }
      h1 { font-size: 18px; text-align: center; margin: 0; }
      p.sub { font-size: 11px; text-align: center; color: #555; margin: 2px 0 12px; }
      hr { border: 1px dashed #ccc; }
      .row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
      .label { color: #555; } .bold { font-weight: bold; }
      .total { font-size: 15px; font-weight: bold; margin-top: 8px; }
      .green { color: green; }
    </style></head>
    <body>
      <h1>GHS Babi Khel</h1>
      <p class="sub">Payment Receipt</p>
      <hr/>
      <div class="row"><span class="label">Receipt #</span><span class="bold">${receipt?.receipt_number || "N/A"}</span></div>
      <div class="row"><span class="label">Student</span><span class="bold">${student?.full_name || "—"}</span></div>
      <div class="row"><span class="label">Class</span><span>${student?.class || "—"}</span></div>
      <div class="row"><span class="label">Method</span><span>${payment.payment_method.toUpperCase()}</span></div>
      <div class="row"><span class="label">Date</span><span>${format(new Date(payment.paid_at), "dd MMM yyyy hh:mm a")}</span></div>
      <hr/>
      ${items.map((i: any) => `<div class="row"><span>${i.charge?.title || "Fee"}</span><span>Rs. ${i.amount_paid}</span></div>`).join("")}
      <hr/>
      <div class="row total"><span>Total Paid</span><span class="green">Rs. ${payment.total_amount}</span></div>
      <hr/>
      <p style="font-size:10px;text-align:center;color:#888;margin-top:8px;">Thank you. Keep this receipt for your records.</p>
    </body></html>
  `;

  const win = window.open("", "_blank", "width=420,height=600");
  win?.document.write(html);
  win?.document.close();
  win?.print();
}

// ─── TAB 1: Fee Types Manager ─────────────────────────────────────────────────

function FeeTypesPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FeeType["category"]>("fee");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [adding, setAdding] = useState(false);

  const { data: feeTypes = [], isLoading } = useQuery({
    queryKey: ["fee-types"],
    queryFn: getFeeTypes,
  });

  const addMut = useMutation({
    mutationFn: () =>
      createFeeType({ name, category, default_amount: Number(amount), is_recurring: recurring }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-types"] });
      setName(""); setAmount(""); setAdding(false);
    },
  });

  const delMut = useMutation({
    mutationFn: deleteFeeType,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee-types"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-base">Fee Types</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-white px-3 py-2 rounded-xl"
        >
          <Plus className="w-3.5 h-3.5" /> Add Type
        </button>
      </div>

      {adding && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">New Fee Type</p>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Monthly Fee, Admission Fee"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            {(["fee", "fine", "other"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${category === c ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Default amount (Rs.)"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="accent-primary" />
            Recurring (monthly)
          </label>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-secondary text-muted-foreground">Cancel</button>
            <button
              onClick={() => addMut.mutate()}
              disabled={!name || !amount || addMut.isPending}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary text-white disabled:opacity-50"
            >
              {addMut.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : feeTypes.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No fee types created yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feeTypes.map((ft) => (
            <div key={ft.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{ft.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ft.category === "fee" ? "bg-blue-100 text-blue-700" : ft.category === "fine" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>
                    {ft.category}
                  </span>
                  {ft.is_recurring && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recurring</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Default: {fmt(ft.default_amount)}</p>
              </div>
              <button
                onClick={() => delMut.mutate(ft.id)}
                disabled={delMut.isPending}
                className="p-2 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB 2: Assign Charges ─────────────────────────────────────────────────────

function AssignChargesPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selStudents, setSelStudents] = useState<string[]>([]);
  const [feeTypeId, setFeeTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [bulkClass, setBulkClass] = useState("");
  const [chargeFilter, setChargeFilter] = useState<{ status: string; class: string }>({ status: "", class: "" });
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);

  const { data: students = [] } = useQuery({
    queryKey: ["all-students-finance"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, full_name, roll_number, class").order("class").order("full_name");
      return data ?? [];
    },
  });

  const { data: feeTypes = [] } = useQuery({ queryKey: ["fee-types"], queryFn: getFeeTypes });

  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ["charges-admin", chargeFilter],
    queryFn: () => getChargesAdmin({ status: chargeFilter.status || undefined, class: chargeFilter.class || undefined }),
  });

  const filtered = students.filter(
    (s: any) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  const assignMut = useMutation({
    mutationFn: () => {
      if (selStudents.length === 1) {
        return createCharge({
          student_id: selStudents[0],
          fee_type_id: feeTypeId || null,
          title,
          amount: Number(amount),
          due_date: dueDate || null,
          created_by: user!.id,
        } as any);
      }
      return bulkCreateCharges(selStudents, {
        fee_type_id: feeTypeId || undefined,
        title,
        amount: Number(amount),
        due_date: dueDate || undefined,
        created_by: user!.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charges-admin"] });
      setSelStudents([]); setTitle(""); setAmount(""); setFeeTypeId(""); setDueDate("");
    },
  });

  const bulkMut = useMutation({
    mutationFn: () => {
      const ids = students.filter((s: any) => s.class === bulkClass).map((s: any) => s.id);
      return bulkCreateCharges(ids, {
        fee_type_id: feeTypeId || undefined,
        title,
        amount: Number(amount),
        due_date: dueDate || undefined,
        created_by: user!.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charges-admin"] });
      setBulkClass(""); setTitle(""); setAmount("");
    },
  });

  const delChargeMut = useMutation({
    mutationFn: deleteCharge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["charges-admin"] }),
  });

  const toggleStudent = (id: string) =>
    setSelStudents((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleFeeTypeChange = (id: string) => {
    setFeeTypeId(id);
    const ft = feeTypes.find((f) => f.id === id);
    if (ft) { setTitle(ft.name); setAmount(String(ft.default_amount)); }
  };

  return (
    <div className="space-y-6">
      {/* Assign Form */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <p className="font-bold text-foreground text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Assign Charge
        </p>

        {/* Fee Type */}
        <select
          value={feeTypeId} onChange={(e) => handleFeeTypeChange(e.target.value)}
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select fee type (optional)</option>
          {feeTypes.map((ft) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
        </select>

        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Charge title *"
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          <input
            type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (Rs.) *"
            min="1"
            className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Bulk by class */}
        <div className="p-3 bg-secondary/50 rounded-xl space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Bulk Assign by Class</p>
          <div className="flex gap-1.5 flex-wrap">
            {["6", "7", "8", "9", "10"].map((c) => (
              <button
                key={c}
                onClick={() => setBulkClass(c === bulkClass ? "" : c)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${bulkClass === c ? "bg-primary text-white" : "bg-card text-muted-foreground"}`}
              >
                Class {c}
              </button>
            ))}
          </div>
          {bulkClass && (
            <button
              onClick={() => bulkMut.mutate()}
              disabled={!title || !amount || bulkMut.isPending}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-primary text-white disabled:opacity-50"
            >
              {bulkMut.isPending ? "Assigning…" : `Assign to all Class ${bulkClass} students`}
            </button>
          )}
        </div>

        {/* Student picker */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border bg-secondary/30 p-2">
            {filtered.slice(0, 30).map((s: any) => (
              <button
                key={s.id}
                onClick={() => toggleStudent(s.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${selStudents.includes(s.id) ? "bg-primary/20 text-primary font-semibold" : "hover:bg-secondary text-foreground"}`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selStudents.includes(s.id) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                  {selStudents.includes(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="flex-1 text-left truncate">{s.full_name}</span>
                <span className="text-[10px] text-muted-foreground">Cl.{s.class}</span>
              </button>
            ))}
          </div>
          {selStudents.length > 0 && (
            <button
              onClick={() => assignMut.mutate()}
              disabled={!title || !amount || assignMut.isPending}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-primary text-white disabled:opacity-50"
            >
              {assignMut.isPending ? "Assigning…" : `Assign to ${selStudents.length} student${selStudents.length > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {/* Charges List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-foreground text-sm flex-1">All Charges</p>
          <select
            value={chargeFilter.status}
            onChange={(e) => setChargeFilter((p) => ({ ...p, status: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-1.5 text-xs outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <select
            value={chargeFilter.class}
            onChange={(e) => setChargeFilter((p) => ({ ...p, class: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-1.5 text-xs outline-none"
          >
            <option value="">All Classes</option>
            {["6", "7", "8", "9", "10"].map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>

        {chargesLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : charges.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No charges found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {charges.map((c) => {
              const paid = c.amount_paid || 0;
              const remaining = c.amount - paid;
              const expanded = expandedCharge === c.id;
              return (
                <div key={c.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="p-3 flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedCharge(expanded ? null : c.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">{c.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(c.student as any)?.full_name} · Cl.{(c.student as any)?.class} ·{" "}
                        {fmt(c.amount)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{fmt(remaining)}</p>
                      <p className="text-[10px] text-muted-foreground">remaining</p>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                  {expanded && (
                    <div className="border-t border-border p-3 bg-secondary/30 space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Charged</span><span className="font-semibold">{fmt(c.amount)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Paid</span><span className="font-semibold text-green-600">{fmt(paid)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Remaining</span><span className="font-semibold text-red-600">{fmt(remaining)}</span></div>
                      {c.due_date && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Due Date</span><span>{format(new Date(c.due_date), "dd MMM yyyy")}</span></div>}
                      {c.status !== "paid" && (
                        <button
                          onClick={() => delChargeMut.mutate(c.id)}
                          className="flex items-center gap-1 text-xs text-red-600 hover:underline mt-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete Charge
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 3: Collect Cash Payment ──────────────────────────────────────────────

function CollectPaymentPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selStudent, setSelStudent] = useState<any>(null);
  const [selCharges, setSelCharges] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  const { data: students = [] } = useQuery({
    queryKey: ["all-students-finance"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, full_name, roll_number, class").order("full_name");
      return data ?? [];
    },
  });

  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ["pending-charges", selStudent?.id],
    queryFn: () => getChargesAdmin({ student_id: selStudent.id, status: "pending" }),
    enabled: !!selStudent,
  });

  const partialCharges = useQuery({
    queryKey: ["partial-charges", selStudent?.id],
    queryFn: () => getChargesAdmin({ student_id: selStudent.id, status: "partial" }),
    enabled: !!selStudent,
  });

  const allCharges = [...charges, ...(partialCharges.data ?? [])];

  const payMut = useMutation({
    mutationFn: () =>
      collectCashPayment({
        student_id: selStudent.id,
        received_by: user!.id,
        charge_allocations: selCharges.map((cid) => ({
          charge_id: cid,
          amount: Number(amounts[cid] || 0),
        })),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["charges-admin"] });
      qc.invalidateQueries({ queryKey: ["pending-charges"] });
      qc.invalidateQueries({ queryKey: ["partial-charges"] });
      qc.invalidateQueries({ queryKey: ["all-payments"] });
      setSuccessMsg(`Receipt ${res.receipt.receipt_number} generated!`);
      printReceipt({ ...res.payment, student: selStudent, items: selCharges.map((cid) => ({ charge_id: cid, amount_paid: Number(amounts[cid] || 0), charge: allCharges.find((c) => c.id === cid) as any })) } as any);
      setSelCharges([]); setAmounts({});
      setTimeout(() => setSuccessMsg(""), 4000);
    },
  });

  const toggleCharge = (id: string, charge: StudentCharge) => {
    setSelCharges((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );
    if (!amounts[id]) {
      const remaining = charge.amount - (charge.amount_paid || 0);
      setAmounts((a) => ({ ...a, [id]: String(remaining) }));
    }
  };

  const total = selCharges.reduce((s, cid) => s + Number(amounts[cid] || 0), 0);
  const filteredStudents = students.filter(
    (s: any) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <p className="font-bold text-foreground text-sm flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" /> Collect Cash Payment
      </p>

      {successMsg && (
        <div className="bg-green-100 text-green-800 border border-green-300 rounded-xl p-3 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Student Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student…"
            className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {search && !selStudent && (
          <div className="border border-border rounded-xl overflow-hidden bg-card max-h-48 overflow-y-auto">
            {filteredStudents.slice(0, 10).map((s: any) => (
              <button
                key={s.id}
                onClick={() => { setSelStudent(s); setSearch(""); setSelCharges([]); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-secondary text-left transition-colors border-b border-border/50 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {s.full_name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">Class {s.class} · {s.roll_number}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selStudent && (
        <div className="space-y-3">
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{selStudent.full_name}</p>
              <p className="text-xs text-muted-foreground">Class {selStudent.class} · {selStudent.roll_number}</p>
            </div>
            <button onClick={() => { setSelStudent(null); setSelCharges([]); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>

          {chargesLoading || partialCharges.isLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : allCharges.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pending charges</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Charges to Pay</p>
              {allCharges.map((c) => {
                const remaining = c.amount - (c.amount_paid || 0);
                const selected = selCharges.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className={`border rounded-xl p-3 transition-colors ${selected ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleCharge(c.id, c)}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Total: {fmt(c.amount)} · Paid: {fmt(c.amount_paid || 0)} · <span className="text-red-600 font-semibold">Due: {fmt(remaining)}</span>
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                    </div>
                    {selected && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Pay:</span>
                        <input
                          type="number"
                          value={amounts[c.id] || ""}
                          onChange={(e) => setAmounts((a) => ({ ...a, [c.id]: e.target.value }))}
                          max={remaining}
                          min={1}
                          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">/ {fmt(remaining)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selCharges.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm text-foreground">Total to Collect</span>
                <span className="text-xl font-black text-primary">{fmt(total)}</span>
              </div>
              <button
                onClick={() => payMut.mutate()}
                disabled={total <= 0 || payMut.isPending}
                className="w-full py-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                <Banknote className="w-4 h-4" />
                {payMut.isPending ? "Processing…" : `Collect ${fmt(total)} Cash`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TAB 4: Pending Wallet Payments ──────────────────────────────────────────

function PendingWalletPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: getPendingPayments,
    refetchInterval: 30000,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveWalletPayment(id, user!.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["pending-payments"] });
      qc.invalidateQueries({ queryKey: ["charges-admin"] });
      qc.invalidateQueries({ queryKey: ["all-payments"] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectWalletPayment(id, user!.id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-payments"] });
      setRejectId(null); setRejectReason("");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="font-bold text-foreground text-sm flex items-center gap-2 flex-1">
          <Clock className="w-4 h-4 text-yellow-500" /> Pending Wallet Payments
        </p>
        {pending.length > 0 && (
          <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
            {pending.length} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : pending.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">All clear!</p>
          <p className="text-xs text-muted-foreground mt-1">No pending payments to verify</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => {
            const expanded = expandedId === p.id;
            return (
              <div key={p.id} className="bg-card border border-yellow-200 dark:border-yellow-800 rounded-xl overflow-hidden">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4.5 h-4.5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{(p.student as any)?.full_name}</span>
                        <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase">{p.payment_method}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ref: <span className="font-mono font-semibold text-foreground">{p.reference_number}</span> ·{" "}
                        {fmt(p.total_amount)} · {format(new Date(p.created_at), "dd MMM, hh:mm a")}
                      </p>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border p-4 space-y-3 bg-secondary/20">
                    {/* Items */}
                    {((p.items ?? []) as any[]).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Charges:</p>
                        {((p.items ?? []) as any[]).map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-foreground">{item.charge?.title || "Fee"}</span>
                            <span className="font-semibold">{fmt(item.amount_paid)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Screenshot */}
                    {p.screenshot_url && (
                      <a href={p.screenshot_url} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={p.screenshot_url}
                          alt="Payment screenshot"
                          className="w-full max-h-48 object-contain rounded-xl border border-border"
                        />
                      </a>
                    )}

                    {/* Reject form */}
                    {rejectId === p.id ? (
                      <div className="space-y-2">
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rejection reason…"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setRejectId(null)} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-secondary text-muted-foreground">Cancel</button>
                          <button
                            onClick={() => rejectMut.mutate({ id: p.id, reason: rejectReason })}
                            disabled={!rejectReason || rejectMut.isPending}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white disabled:opacity-50"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRejectId(p.id)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => approveMut.mutate(p.id)}
                          disabled={approveMut.isPending}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
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

// ─── TAB 5: Ledger / Defaulters ───────────────────────────────────────────────

function LedgerPanel() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "defaulters">("all");

  const { data: ledgers = [], isLoading } = useQuery({
    queryKey: ["all-ledgers"],
    queryFn: getAllStudentLedgers,
  });

  const filtered = ledgers.filter((l) => {
    const matchSearch =
      !search ||
      l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      l.roll_number?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.balance > 0;
    return matchSearch && matchFilter;
  });

  const exportCSV = () => {
    const rows = [
      ["Name", "Roll No", "Class", "Total Charged", "Total Paid", "Balance"],
      ...filtered.map((l) => [l.full_name, l.roll_number, l.class, l.total_charged, l.total_paid, l.balance]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ledger.csv"; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-bold text-foreground text-sm flex-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Student Ledger
        </p>
        <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs font-semibold bg-secondary text-muted-foreground px-3 py-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setFilter("all")} className={`px-4 py-1.5 rounded-xl text-xs font-bold ${filter === "all" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>All Students</button>
        <button onClick={() => setFilter("defaulters")} className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${filter === "defaulters" ? "bg-red-600 text-white" : "bg-secondary text-muted-foreground"}`}>
          <AlertTriangle className="w-3 h-3" /> Defaulters
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…"
          className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No records found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs">
                  <th className="p-3 text-left font-semibold">Student</th>
                  <th className="p-3 text-center font-semibold">Charged</th>
                  <th className="p-3 text-center font-semibold">Paid</th>
                  <th className="p-3 text-center font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3">
                      <p className="font-semibold text-foreground text-sm">{l.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">Cl.{l.class} · {l.roll_number}</p>
                    </td>
                    <td className="p-3 text-center text-xs text-muted-foreground">{fmt(l.total_charged)}</td>
                    <td className="p-3 text-center text-xs text-green-600 font-semibold">{fmt(l.total_paid)}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.balance <= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {l.balance <= 0 ? "Cleared" : fmt(l.balance)}
                      </span>
                    </td>
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

// ─── TAB 6: Reports ───────────────────────────────────────────────────────────

function ReportsPanel() {
  const [statusFilter, setStatusFilter] = useState("completed");

  const { data: stats } = useQuery({
    queryKey: ["today-stats"],
    queryFn: getTodayStats,
    refetchInterval: 60000,
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["all-payments", statusFilter],
    queryFn: () => getAllPayments({ status: statusFilter || undefined }),
  });

  return (
    <div className="space-y-4">
      <p className="font-bold text-foreground text-sm flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-primary" /> Reports & Payments History
      </p>

      {/* Today Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-600 rounded-2xl p-3 text-center">
          <p className="text-white text-lg font-black">{fmt(stats?.collected_today ?? 0)}</p>
          <p className="text-green-200 text-[10px] font-medium">Today's Collection</p>
        </div>
        <div className="bg-red-500 rounded-2xl p-3 text-center">
          <p className="text-white text-lg font-black">{fmt(stats?.pending_dues ?? 0)}</p>
          <p className="text-red-200 text-[10px] font-medium">Pending Dues</p>
        </div>
        <div className="bg-orange-500 rounded-2xl p-3 text-center">
          <p className="text-white text-lg font-black">{stats?.total_defaulters ?? 0}</p>
          <p className="text-orange-200 text-[10px] font-medium">Defaulters</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "Completed", value: "completed" },
          { label: "Pending", value: "pending" },
          { label: "Rejected", value: "rejected" },
          { label: "All", value: "" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${statusFilter === f.value ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : payments.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No payments found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => {
            const rcpt = (p as any).receipt;
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.status === "completed" ? "bg-green-100" : p.status === "rejected" ? "bg-red-100" : "bg-yellow-100"}`}>
                  {p.status === "completed" ? <CheckCircle className="w-4.5 h-4.5 text-green-600" /> : p.status === "rejected" ? <XCircle className="w-4.5 h-4.5 text-red-600" /> : <Clock className="w-4.5 h-4.5 text-yellow-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{(p.student as any)?.full_name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                    <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground">{methodIcon(p.payment_method)}{p.payment_method}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmt(p.total_amount)} · {format(new Date(p.paid_at), "dd MMM, hh:mm a")}
                    {rcpt && <span className="ml-1 text-primary font-mono">#{rcpt.receipt_number}</span>}
                  </p>
                </div>
                {p.status === "completed" && (
                  <button onClick={() => printReceipt(p)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                    <Printer className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Finance Panel ─────────────────────────────────────────────────

const TABS = [
  { id: "fee-types", label: "Fee Types", icon: DollarSign },
  { id: "charges", label: "Charges", icon: FileText },
  { id: "collect", label: "Collect", icon: CreditCard },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "ledger", label: "Ledger", icon: Users },
  { id: "reports", label: "Reports", icon: Receipt },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminFinance() {
  const [activeTab, setActiveTab] = useState<TabId>("collect");

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: getPendingPayments,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" /> Finance & Payments
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Complete school financial management system
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 relative ${
              activeTab === t.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.id === "pending" && pendingPayments.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {pendingPayments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "fee-types" && <FeeTypesPanel />}
      {activeTab === "charges" && <AssignChargesPanel />}
      {activeTab === "collect" && <CollectPaymentPanel />}
      {activeTab === "pending" && <PendingWalletPanel />}
      {activeTab === "ledger" && <LedgerPanel />}
      {activeTab === "reports" && <ReportsPanel />}
    </div>
  );
}
