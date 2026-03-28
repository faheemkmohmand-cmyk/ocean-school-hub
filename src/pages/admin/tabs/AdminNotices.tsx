import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface Notice {
  id: string; title: string; content: string | null; category: string;
  is_urgent: boolean; is_published: boolean; created_at: string;
}

const categories = ["general", "academic", "events", "examination"];

const AdminNotices = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "general", is_urgent: false, is_published: true });
  const [saving, setSaving] = useState(false);

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["admin-notices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("notices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-notices"] }); },
  });

  const openAdd = () => { setEditing(null); setForm({ title: "", content: "", category: "general", is_urgent: false, is_published: true }); setModalOpen(true); };
  const openEdit = (n: Notice) => {
    setEditing(n); setForm({ title: n.title, content: n.content || "", category: n.category, is_urgent: n.is_urgent, is_published: n.is_published }); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    setSaving(true);
    const { error } = editing
      ? await supabase.from("notices").update(form).eq("id", editing.id)
      : await supabase.from("notices").insert(form);
    if (error) toast.error("Save failed");
    else { toast.success(editing ? "Updated" : "Added"); qc.invalidateQueries({ queryKey: ["admin-notices"] }); setModalOpen(false); }
    setSaving(false);
  };

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-foreground">Manage Notices</h2>
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> Add Notice</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Urgent</TableHead><TableHead>Published</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {notices.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{n.title}</TableCell>
                <TableCell><span className="capitalize text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{n.category}</span></TableCell>
                <TableCell>{n.is_urgent && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">Urgent</span>}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${n.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{n.is_published ? "Yes" : "Draft"}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(n.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(n)}><Pencil className="w-4 h-4" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete notice?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(n.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent></AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Notice" : "Add Notice"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><Label>Content</Label><Textarea rows={4} value={form.content} onChange={(e) => set("content", e.target.value)} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.is_urgent} onCheckedChange={(v) => set("is_urgent", v)} /><Label>Urgent</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => set("is_published", v)} /><Label>Published</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNotices;
