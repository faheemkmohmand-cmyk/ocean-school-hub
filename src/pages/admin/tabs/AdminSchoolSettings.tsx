import { useState, useEffect, useCallback } from "react";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Loader2, ImageIcon, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";

// ✅ FIXED ImageUploader — proper error handling + timeout + file size check
const ImageUploader = ({
  label, currentUrl, bucket, path, onUploaded,
}: {
  label: string;
  currentUrl: string | null;
  bucket: string;
  path: string;
  onUploaded: (url: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  // Keep preview in sync with currentUrl from parent
  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // ✅ File size check — max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    // ✅ Show local preview immediately (don't wait for upload)
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${path}/${Date.now()}.${ext}`;

      // ✅ Upload with timeout (30 seconds)
      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timed out after 30 seconds. Check your storage bucket policies.")), 30000)
      );

      const { error } = await Promise.race([uploadPromise, timeoutPromise]) as { error: Error | null };

      if (error) {
        console.error("Upload error:", error);
        // ✅ Show specific error message
        if (error.message?.includes("policy") || error.message?.includes("403") || error.message?.includes("Unauthorized")) {
          toast.error("❌ Upload blocked by storage policy. Run the Storage_RLS_Fix.sql in Supabase.");
        } else if (error.message?.includes("timed out")) {
          toast.error("⏱ Upload timed out. Check storage bucket policies in Supabase.");
        } else if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
          toast.error(`❌ Bucket "${bucket}" not found. Create it in Supabase Storage.`);
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
        setPreview(currentUrl); // revert preview
        setUploading(false);
        return;
      }

      // ✅ Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUploaded(publicUrl);
      setPreview(publicUrl);
      toast.success(`✅ ${label} uploaded successfully!`);

    } catch (err: any) {
      console.error("Upload exception:", err);
      toast.error(err?.message || "Upload failed. Check console for details.");
      setPreview(currentUrl);
    }

    setUploading(false);
  }, [bucket, path, label, onUploaded, currentUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-2">
      <Label className="font-semibold">{label}</Label>

      {/* Preview */}
      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt={label}
            className="w-full max-h-40 object-cover rounded-lg border border-border"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-1" />
                <p className="text-xs font-medium">Uploading...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          uploading
            ? "opacity-50 cursor-not-allowed border-border"
            : isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/60 hover:bg-secondary/30"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm font-medium">Uploading to Supabase...</p>
            <p className="text-xs text-muted-foreground">Please wait, do not close this page</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
            <p className="text-sm font-medium">
              {isDragActive ? "Drop image here" : "Click to upload or drag & drop"}
            </p>
            <p className="text-xs">PNG, JPG, WEBP — max 5MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Settings Component ───────────────────────────────────────────────

const AdminSchoolSettings = () => {
  const { data: settings, isLoading } = useSchoolSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    school_name: "",
    tagline: "",
    description: "",
    emis_code: "",
    address: "",
    phone: "",
    email: "",
    established_year: 2018,
    total_students: 0,
    total_teachers: 0,
    pass_percentage: 0,
    logo_url: null as string | null,
    banner_url: null as string | null,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        school_name: settings.school_name || "",
        tagline: settings.tagline || "",
        description: settings.description || "",
        emis_code: settings.emis_code || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        established_year: settings.established_year || 2018,
        total_students: settings.total_students || 0,
        total_teachers: settings.total_teachers || 0,
        pass_percentage: settings.pass_percentage || 0,
        logo_url: settings.logo_url || null,
        banner_url: settings.banner_url || null,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("school_settings")
      .update(form)
      .eq("id", 1);

    setSaving(false);

    if (error) {
      console.error("Save error:", error);
      toast.error(`Failed to save: ${error.message}`);
    } else {
      setSaved(true);
      toast.success("✅ Settings saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["school-settings"] });
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const set = (key: string, val: string | number | null) =>
    setForm((p) => ({ ...p, [key]: val }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-heading font-bold text-foreground">School Settings</h2>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>School Name</Label>
              <Input value={form.school_name} onChange={(e) => set("school_name", e.target.value)} />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>EMIS Code</Label>
              <Input value={form.emis_code} onChange={(e) => set("emis_code", e.target.value)} />
            </div>
            <div>
              <Label>Established Year</Label>
              <Input type="number" value={form.established_year} onChange={(e) => set("established_year", +e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader><CardTitle className="text-base">Statistics</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Total Students</Label>
            <Input type="number" value={form.total_students} onChange={(e) => set("total_students", +e.target.value)} />
          </div>
          <div>
            <Label>Total Teachers</Label>
            <Input type="number" value={form.total_teachers} onChange={(e) => set("total_teachers", +e.target.value)} />
          </div>
          <div>
            <Label>Pass Percentage</Label>
            <Input type="number" value={form.pass_percentage} onChange={(e) => set("pass_percentage", +e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Branding — Logo + Banner upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            ⚠️ If upload hangs forever, run <strong>Storage_RLS_Fix.sql</strong> in Supabase SQL Editor first.
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          <ImageUploader
            label="School Logo"
            currentUrl={form.logo_url}
            bucket="school-assets"
            path="logos"
            onUploaded={(url) => set("logo_url", url)}
          />
          <ImageUploader
            label="Hero Banner"
            currentUrl={form.banner_url}
            bucket="school-assets"
            path="banners"
            onUploaded={(url) => set("banner_url", url)}
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="gap-2 min-w-[160px]"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save All Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default AdminSchoolSettings;
