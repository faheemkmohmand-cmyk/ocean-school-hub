import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Loader2, Upload, ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import type { GalleryAlbum, GalleryPhoto } from "@/hooks/useGallery";

// Sanitise filename so Supabase storage never chokes on spaces / special chars
const sanitiseFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");

const AdminGallery = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: albums = [], isLoading } = useQuery<GalleryAlbum[]>({
    queryKey: ["admin-albums"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_albums")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: photos = [], isLoading: loadingPhotos } = useQuery<GalleryPhoto[]>({
    queryKey: ["admin-photos", selectedAlbum?.id],
    queryFn: async () => {
      if (!selectedAlbum) return [];
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("album_id", selectedAlbum.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedAlbum,
  });

  // ── Cover file picker ──────────────────────────────────
  const handleCoverChange = (file: File | null) => {
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const clearCover = () => {
    handleCoverChange(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  // ── Create album ───────────────────────────────────────
  const handleCreateAlbum = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);

    let cover_url: string | null = null;

    if (coverFile) {
      const safeName = sanitiseFilename(coverFile.name);
      const path = `covers/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(path, coverFile, { upsert: true });

      if (uploadError) {
        toast.error(`Cover upload failed: ${uploadError.message}`);
        setSaving(false);   // ← always reset, never hang
        return;
      }

      cover_url = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase
      .from("gallery_albums")
      .insert({ title: form.title.trim(), description: form.description.trim() || null, cover_url });

    if (error) {
      toast.error(`Failed to create album: ${error.message}`);
    } else {
      toast.success("Album created!");
      qc.invalidateQueries({ queryKey: ["admin-albums"] });
      setModalOpen(false);
      setForm({ title: "", description: "" });
      clearCover();
    }

    setSaving(false);  // ← always reset
  };

  // ── Delete album ───────────────────────────────────────
  const deleteAlbum = useMutation({
    mutationFn: async (id: string) => {
      const { data: albumPhotos } = await supabase
        .from("gallery_photos")
        .select("photo_url")
        .eq("album_id", id);

      if (albumPhotos?.length) {
        const paths = albumPhotos
          .map((p) => p.photo_url.split("/gallery/")[1])
          .filter(Boolean);
        if (paths.length) await supabase.storage.from("gallery").remove(paths);
      }

      await supabase.from("gallery_photos").delete().eq("album_id", id);
      const { error } = await supabase.from("gallery_albums").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Album deleted");
      setSelectedAlbum(null);
      qc.invalidateQueries({ queryKey: ["admin-albums"] });
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  // ── Upload photos into album ───────────────────────────
  const onDropPhotos = useCallback(
    async (acceptedFiles: File[]) => {
      if (!selectedAlbum || !acceptedFiles.length) return;
      setUploading(true);
      setUploadProgress(0);
      let uploaded = 0;

      for (const file of acceptedFiles) {
        const safeName = sanitiseFilename(file.name);
        const path = `photos/${selectedAlbum.id}/${Date.now()}-${safeName}`;

        const { error } = await supabase.storage.from("gallery").upload(path, file);
        if (!error) {
          const url = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
          await supabase
            .from("gallery_photos")
            .insert({ album_id: selectedAlbum.id, photo_url: url });
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }

        uploaded++;
        setUploadProgress(Math.round((uploaded / acceptedFiles.length) * 100));
      }

      toast.success(`${uploaded} photo${uploaded !== 1 ? "s" : ""} uploaded!`);
      qc.invalidateQueries({ queryKey: ["admin-photos", selectedAlbum.id] });
      setUploading(false);
      setUploadProgress(0);
    },
    [selectedAlbum, qc]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropPhotos,
    accept: { "image/*": [] },
    multiple: true,
    disabled: uploading,
  });

  // ── Delete single photo ────────────────────────────────
  const deletePhoto = useMutation({
    mutationFn: async (photo: GalleryPhoto) => {
      const path = photo.photo_url.split("/gallery/")[1];
      if (path) await supabase.storage.from("gallery").remove([path]);
      const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo deleted");
      qc.invalidateQueries({ queryKey: ["admin-photos", selectedAlbum?.id] });
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  // ══════════════════════════════════════════════════════
  // Album detail view
  // ══════════════════════════════════════════════════════
  if (selectedAlbum) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAlbum(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-heading font-bold text-foreground">{selectedAlbum.title}</h2>
          <Badge variant="secondary">{photos.length} photos</Badge>
        </div>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Drag & drop photos here, or click to select</p>
          <p className="text-xs text-muted-foreground mt-1">Multiple images supported</p>
        </div>

        {uploading && (
          <div className="space-y-1">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{uploadProgress}% uploaded</p>
          </div>
        )}

        {loadingPhotos ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-card rounded-xl p-12 text-center text-muted-foreground shadow-card">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No photos yet. Upload some above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square bg-muted">
                <img src={p.photo_url} alt={p.caption || ""} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="destructive" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete photo?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePhoto.mutate(p)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // Albums list
  // ══════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-foreground">Manage Gallery</h2>
        <Button
          onClick={() => {
            setForm({ title: "", description: "" });
            clearCover();
            setModalOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create Album
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : albums.length === 0 ? (
        <div className="bg-card rounded-xl p-16 text-center text-muted-foreground shadow-card">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No albums yet</p>
          <p className="text-sm mt-1">Create your first album to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((a) => (
            <Card
              key={a.id}
              className="overflow-hidden cursor-pointer hover:shadow-elevated transition-shadow border-border"
              onClick={() => setSelectedAlbum(a)}
            >
              <div className="aspect-video bg-muted relative">
                {a.cover_url ? (
                  <img src={a.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-heading font-semibold text-foreground">{a.title}</h3>
                {a.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="secondary">Album</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete album and all photos?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAlbum.mutate(a.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Album Modal ── */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Album</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Sports Day 2024"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description..."
              />
            </div>

            <div>
              <Label>Cover Photo (optional)</Label>
              <div className="mt-2 space-y-2">
                {/* Preview */}
                {coverPreview && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                    <button
                      onClick={clearCover}
                      className="absolute top-1 right-1 p-1 bg-foreground/70 text-background rounded-full hover:bg-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Pick button */}
                <label className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline w-fit">
                  <Upload className="w-4 h-4" />
                  {coverPreview ? "Change Cover" : "Choose Cover Photo"}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreateAlbum} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Creating…" : "Create Album"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGallery;
