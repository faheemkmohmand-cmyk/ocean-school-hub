import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { NewsItem } from "@/hooks/useNews";

const AdminNews = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState({ title: "", content: "", image_url: null as string | null, is_published: true });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: news = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("news").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-news"] }); },
  });

  const openAdd = () => { setEditing(null); setForm({ title: "", content: "", image_url: null, is_published: true }); setImageFile(null); setModalOpen(true); };
  const openEdit = (n: NewsItem) => {
    setEditing(n); setForm({ title: n.title, content: n.content || "", image_url: n.image_url, is_published: n.is_published }); setImageFile(null); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    setSaving(true);
    let image_url = form.image_url;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `news/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("news-images").upload(path, imageFile, { upsert: true });
      if (!error) { const { data: { publicUrl } } = supabase.storage.from("news-images").getPublicUrl(path); image_url = publicUrl; }
    }
    const payload = { ...form, image_url };
    const { error } = editing
      ? await supabase.from("news").update(payload).eq("id", editing.id)
      : await supabase.from("news").insert(payload);
    if (error) toast.error("Save failed");
    else { toast.success(editing ? "Updated" : "Added"); qc.invalidateQueries({ queryKey: ["admin-news"] }); setModalOpen(false); }
    setSaving(false);
  };

  const set = (k: string, v: string | boolean | null) => setForm((p) => ({ ...p, [k]: v }));

  if (isLoading) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-foreground">Manage News</h2>
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> Add News</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Published</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {news.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.image_url ? <img src={n.image_url} alt="" className="w-12 h-8 rounded object-cover" /> : <div className="w-12 h-8 bg-muted rounded" />}</TableCell>
                <TableCell className="font-medium max-w-[250px] truncate">{n.title}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${n.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{n.is_published ? "Yes" : "Draft"}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(n.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(n)}><Pencil className="w-4 h-4" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this news?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
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
          <DialogHeader><DialogTitle>{editing ? "Edit News" : "Add News"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><Label>Content</Label><Textarea rows={5} value={form.content} onChange={(e) => set("content", e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => set("is_published", v)} /><Label>Published</Label></div>
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-3 mt-1">
                {(form.image_url || imageFile) && <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url!} alt="" className="w-16 h-10 rounded object-cover" />}
                <label className="flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline">
                  <Upload className="w-4 h-4" /> Choose Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </label>
              </div>
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

export default AdminNews;
