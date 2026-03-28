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
import { Save, Upload, Loader2, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";

const ImageUploader = ({
  label, currentUrl, bucket, path, onUploaded,
}: {
  label: string; currentUrl: string | null; bucket: string; path: string; onUploaded: (url: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${path}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
    onUploaded(publicUrl);
    toast.success(`${label} uploaded`);
    setUploading(false);
  }, [bucket, path, label, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, maxFiles: 1, disabled: uploading,
  });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {currentUrl && (
        <img src={currentUrl} alt={label} className="w-full max-h-40 object-cover rounded-lg border border-border" />
      )}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
            <p className="text-sm">Drop image or click to upload</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminSchoolSettings = () => {
  const { data: settings, isLoading } = useSchoolSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    school_name: "", tagline: "", description: "", emis_code: "",
    address: "", phone: "", email: "", established_year: 2018,
    total_students: 0, total_teachers: 0, pass_percentage: 0,
    logo_url: "" as string | null, banner_url: "" as string | null,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        school_name: settings.school_name,
        tagline: settings.tagline,
        description: settings.description || "",
        emis_code: settings.emis_code,
        address: settings.address,
        phone: settings.phone || "",
        email: settings.email || "",
        established_year: settings.established_year,
        total_students: settings.total_students,
        total_teachers: settings.total_teachers,
        pass_percentage: settings.pass_percentage,
        logo_url: settings.logo_url,
        banner_url: settings.banner_url,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("school_settings").update(form).eq("id", 1);
    if (error) toast.error("Failed to save");
    else {
      toast.success("Settings saved!");
      queryClient.invalidateQueries({ queryKey: ["school-settings"] });
    }
    setSaving(false);
  };

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;

  const set = (key: string, val: string | number | null) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-heading font-bold text-foreground">School Settings</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>School Name</Label><Input value={form.school_name} onChange={(e) => set("school_name", e.target.value)} /></div>
            <div><Label>Tagline</Label><Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></div>
          </div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>EMIS Code</Label><Input value={form.emis_code} onChange={(e) => set("emis_code", e.target.value)} /></div>
            <div><Label>Established Year</Label><Input type="number" value={form.established_year} onChange={(e) => set("established_year", +e.target.value)} /></div>
          </div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Statistics</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div><Label>Total Students</Label><Input type="number" value={form.total_students} onChange={(e) => set("total_students", +e.target.value)} /></div>
          <div><Label>Total Teachers</Label><Input type="number" value={form.total_teachers} onChange={(e) => set("total_teachers", +e.target.value)} /></div>
          <div><Label>Pass Percentage</Label><Input type="number" value={form.pass_percentage} onChange={(e) => set("pass_percentage", +e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          <ImageUploader label="School Logo" currentUrl={form.logo_url} bucket="school-assets" path="logos" onUploaded={(url) => set("logo_url", url)} />
          <ImageUploader label="Hero Banner" currentUrl={form.banner_url} bucket="school-assets" path="banners" onUploaded={(url) => set("banner_url", url)} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save All Changes
      </Button>
    </div>
  );
};

export default AdminSchoolSettings;
