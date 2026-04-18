import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface NewsItem {
  id: string; title: string; content: string | null; image_url: string | null;
  is_published: boolean; created_at: string;
}

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

  const togglePublish = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("news").update({ is_published: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-news"] }),
  });

  const openAdd = () => { setEditing(null); setForm({ title: "", content: "", image_url: null, is_published: true }); setImageFile(null); setModalOpen(true); };
  const openEdit = (n: NewsItem) => {
    setEditing(n); setForm({ title: n.title, content: n.content || "", image_url: n.image_url, is_published: n.is_published }); setImageFile(null); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      let image_url = form.image_url;
      if (imageFile) {
        image_url = await uploadToCloudinary(imageFile, "branding");
      }
      const payload = { ...form, image_url };
      const { error } = editing
        ? await supabase.from("news").update(payload).eq("id", editing.id)
        : await supabase.from("news").insert(payload);
      if (error) toast.error("Save failed: " + error.message);
      else { toast.success(editing ? "Updated" : "Added"); qc.invalidateQueries({ queryKey: ["admin-news"] }); setModalOpen(false); }
    } catch (err: any) {
      toast.error(err?.message || "Upload failed. Check Cloudinary env vars.");
    }
    setSaving(false);
  };

  const set = (k: string, v: string | boolean | null) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-foreground">Manage News</h2>
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> Add News</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.map(n => (
          <Card key={n.id} className={`border-border overflow-hidden ${!n.is_published ? "opacity-60" : ""}`}>
            <div className="aspect-video bg-muted relative">
              {n.image_url
                ? <img src={n.image_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground/30" /></div>}
              <Badge className={`absolute top-2 right-2 ${n.is_published ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]" : "bg-muted-foreground"}`}>
                {n.is_published ? "Published" : "Draft"}
              </Badge>
            </div>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-heading font-semibold text-foreground truncate">{n.title}</h3>
              <p className="text-xs text-muted-foreground">{format(new Date(n.created_at), "dd MMM yyyy")}</p>
              {n.content && <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>}
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={n.is_published} onCheckedChange={v => togglePublish.mutate({ id: n.id, val: v })} />
                <Button size="icon" variant="ghost" onClick={() => openEdit(n)}><Pencil className="w-4 h-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete this news?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(n.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit News" : "Add News"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} /></div>
            <div><Label>Content</Label><Textarea rows={5} value={form.content} onChange={e => set("content", e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={v => set("is_published", v)} /><Label>Published</Label></div>
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-3 mt-1">
                {(form.image_url || imageFile) && <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url!} alt="" className="w-16 h-10 rounded object-cover" />}
                <label className="flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline">
                  <Upload className="w-4 h-4" /> Choose Image
                  <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
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
                                                                                                                 

    
