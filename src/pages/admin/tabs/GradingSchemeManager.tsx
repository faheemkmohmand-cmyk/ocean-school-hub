import { useState } from "react";
import { useGradingSchemes, useSaveGradingScheme, useActivateGradingScheme, useDeleteGradingScheme } from "@/hooks/useResultsEnhanced";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Check, Loader2, Sliders } from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GradeRange {
  min_percentage: number;
  max_percentage: number;
  grade: string;
  gpa: number;
}

interface SchemeFormData {
  id?: string;
  scheme_name: string;
  pass_threshold: number;
  ranges: GradeRange[];
}

const EMPTY_RANGE: GradeRange = {
  min_percentage: 0,
  max_percentage: 0,
  grade: "",
  gpa: 0,
};

const DEFAULT_RANGES: GradeRange[] = [
  { min_percentage: 90, max_percentage: 100, grade: "A+", gpa: 4.0 },
  { min_percentage: 80, max_percentage: 89, grade: "A", gpa: 3.7 },
  { min_percentage: 60, max_percentage: 79, grade: "B", gpa: 3.0 },
  { min_percentage: 45, max_percentage: 59, grade: "C", gpa: 2.0 },
  { min_percentage: 33, max_percentage: 44, grade: "D", gpa: 1.0 },
  { min_percentage: 0, max_percentage: 32, grade: "Fail", gpa: 0.0 },
];

const DEFAULT_FORM: SchemeFormData = {
  scheme_name: "",
  pass_threshold: 33,
  ranges: DEFAULT_RANGES.map((r) => ({ ...r })),
};

// ─── Component ──────────────────────────────────────────────────────────────

function GradingSchemeManager() {
  const { data: schemes = [], isLoading } = useGradingSchemes();
  const saveMutation = useSaveGradingScheme();
  const activateMutation = useActivateGradingScheme();
  const deleteMutation = useDeleteGradingScheme();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SchemeFormData>({ ...DEFAULT_FORM });

  // ── Active scheme ────────────────────────────────────────────────────────
  const activeScheme = schemes.find((s) => s.is_active);

  // ── Open Add dialog ─────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, ranges: DEFAULT_RANGES.map((r) => ({ ...r })) });
    setDialogOpen(true);
  };

  // ── Open Edit dialog ────────────────────────────────────────────────────
  const openEdit = (schemeId: string) => {
    const scheme = schemes.find((s) => s.id === schemeId);
    if (!scheme) return;
    setEditingId(scheme.id);
    setForm({
      id: scheme.id,
      scheme_name: scheme.scheme_name,
      pass_threshold: scheme.pass_threshold,
      ranges: scheme.ranges.map((r) => ({ ...r })),
    });
    setDialogOpen(true);
  };

  // ── Update a single range field ─────────────────────────────────────────
  const updateRange = (
    index: number,
    field: keyof GradeRange,
    value: string | number
  ) => {
    setForm((prev) => {
      const updated = prev.ranges.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      );
      return { ...prev, ranges: updated };
    });
  };

  // ── Add a blank range row ───────────────────────────────────────────────
  const addRange = () => {
    setForm((prev) => ({
      ...prev,
      ranges: [...prev.ranges, { ...EMPTY_RANGE }],
    }));
  };

  // ── Remove a range row ──────────────────────────────────────────────────
  const removeRange = (index: number) => {
    setForm((prev) => ({
      ...prev,
      ranges: prev.ranges.filter((_, i) => i !== index),
    }));
  };

  // ── Validate & Save ─────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.scheme_name.trim()) {
      toast.error("Scheme name is required");
      return;
    }
    if (form.ranges.length === 0) {
      toast.error("At least one grade range is required");
      return;
    }
    for (let i = 0; i < form.ranges.length; i++) {
      const r = form.ranges[i];
      if (!r.grade.trim()) {
        toast.error(`Grade label is empty in row ${i + 1}`);
        return;
      }
      if (r.min_percentage < 0 || r.max_percentage < 0) {
        toast.error(`Percentages cannot be negative in row ${i + 1}`);
        return;
      }
      if (r.min_percentage > r.max_percentage) {
        toast.error(`Min% cannot exceed Max% in row ${i + 1}`);
        return;
      }
    }

    const payload: any = {
      scheme_name: form.scheme_name.trim(),
      pass_threshold: form.pass_threshold,
      ranges: form.ranges,
      is_default: false,
    };

    if (editingId) {
      payload.id = editingId;
    }

    saveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(editingId ? "Scheme updated!" : "Scheme created!");
        setDialogOpen(false);
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to save scheme");
      },
    });
  };

  // ── Activate ────────────────────────────────────────────────────────────
  const handleActivate = (id: string) => {
    activateMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Scheme activated!");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to activate scheme");
      },
    });
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Scheme deleted");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to delete scheme");
      },
    });
  };

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Sliders className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-heading font-bold text-foreground">
            Grading Schemes
          </h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sliders className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-heading font-bold text-foreground">
            Grading Schemes
          </h2>
        </div>
        <Button onClick={openAdd} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Add Scheme
        </Button>
      </div>

      {/* Active Scheme Banner */}
      {activeScheme && (
        <Card className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-foreground">
                Active Scheme:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium">
                {activeScheme.scheme_name}
              </span>
              <Badge className="bg-green-600 hover:bg-green-600 text-white">
                Active
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground sm:ml-auto">
              Pass threshold: {activeScheme.pass_threshold}% ·{" "}
              {activeScheme.ranges.length} grade ranges
            </span>
          </CardContent>
        </Card>
      )}

      {!activeScheme && schemes.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Sliders className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-foreground">
              No active scheme — activate one below to apply grading.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {schemes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-3">
            <Sliders className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">
              No grading schemes yet
            </p>
            <p className="text-sm text-muted-foreground">
              Create your first grading scheme to define how percentages map to
              grades and GPA.
            </p>
            <Button onClick={openAdd} className="gap-2 mt-2">
              <Plus className="w-4 h-4" />
              Create First Scheme
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scheme Cards */}
      <div className="grid gap-4">
        {schemes.map((scheme) => (
          <Card
            key={scheme.id}
            className={`overflow-hidden transition-shadow hover:shadow-md ${
              scheme.is_active
                ? "ring-2 ring-green-400 dark:ring-green-600"
                : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    {scheme.scheme_name}
                  </CardTitle>
                  {scheme.is_active ? (
                    <Badge className="bg-green-600 hover:bg-green-600 text-white">
                      Active
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivate(scheme.id)}
                      disabled={activateMutation.isPending}
                      className="gap-1.5"
                    >
                      {activateMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Set as Active
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(scheme.id)}
                    className="gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete &quot;{scheme.scheme_name}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove this grading scheme.{" "}
                          {scheme.is_active && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              This is the currently active scheme — you&apos;ll
                              need to activate another one after deletion.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(scheme.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              {/* Pass threshold badge */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Pass threshold:</span>
                <Badge variant="secondary" className="font-mono">
                  {scheme.pass_threshold}%
                </Badge>
              </div>

              {/* Grade ranges table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                        Grade
                      </th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">
                        Min %
                      </th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">
                        Max %
                      </th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">
                        GPA
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scheme.ranges.map((range, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium">
                          <Badge
                            variant={
                              range.grade.toLowerCase() === "fail"
                                ? "destructive"
                                : "secondary"
                            }
                            className="font-semibold"
                          >
                            {range.grade}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {range.min_percentage}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {range.max_percentage}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {range.gpa.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Visual percentage bar */}
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                {scheme.ranges.map((range, idx) => {
                  const span = range.max_percentage - range.min_percentage;
                  if (span <= 0) return null;
                  const colors = [
                    "bg-green-500",
                    "bg-green-400",
                    "bg-emerald-400",
                    "bg-yellow-400",
                    "bg-orange-400",
                    "bg-red-500",
                    "bg-red-400",
                    "bg-rose-400",
                    "bg-amber-400",
                    "bg-lime-400",
                  ];
                  return (
                    <div
                      key={idx}
                      className={`${colors[idx % colors.length]} transition-all`}
                      style={{
                        width: `${span}%`,
                      }}
                      title={`${range.grade}: ${range.min_percentage}%–${range.max_percentage}%`}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Add / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Grading Scheme" : "New Grading Scheme"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {/* Scheme Name */}
            <div className="grid gap-2">
              <Label htmlFor="scheme-name">Scheme Name *</Label>
              <Input
                id="scheme-name"
                value={form.scheme_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, scheme_name: e.target.value }))
                }
                placeholder="e.g. CBSE Standard, Cambridge IGCSE..."
              />
            </div>

            {/* Pass Threshold */}
            <div className="grid gap-2">
              <Label htmlFor="pass-threshold">Pass Threshold (%)</Label>
              <Input
                id="pass-threshold"
                type="number"
                min={0}
                max={100}
                value={form.pass_threshold}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    pass_threshold: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Students scoring below this percentage are marked as Fail.
                Default: 33
              </p>
            </div>

            {/* Grade Ranges */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Grade Ranges</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRange}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                        Grade
                      </th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">
                        Min %
                      </th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">
                        Max %
                      </th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">
                        GPA
                      </th>
                      <th className="w-12 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {form.ranges.map((range, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="px-2 py-1.5">
                          <Input
                            value={range.grade}
                            onChange={(e) =>
                              updateRange(idx, "grade", e.target.value)
                            }
                            placeholder="A+"
                            className="h-8 text-sm font-medium"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={range.min_percentage}
                            onChange={(e) =>
                              updateRange(
                                idx,
                                "min_percentage",
                                Number(e.target.value)
                              )
                            }
                            className="h-8 text-sm text-center font-mono"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={range.max_percentage}
                            onChange={(e) =>
                              updateRange(
                                idx,
                                "max_percentage",
                                Number(e.target.value)
                              )
                            }
                            className="h-8 text-sm text-center font-mono"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={4}
                            step={0.1}
                            value={range.gpa}
                            onChange={(e) =>
                              updateRange(
                                idx,
                                "gpa",
                                Number(e.target.value)
                              )
                            }
                            className="h-8 text-sm text-center font-mono"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {form.ranges.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeRange(idx)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {form.ranges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No grade ranges. Click &quot;Add Row&quot; to add one.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {editingId ? "Update Scheme" : "Create Scheme"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GradingSchemeManager;
