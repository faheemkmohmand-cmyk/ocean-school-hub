const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(
  file: File,
  folder: string = "ghs-school"
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", PRESET);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`,
    { method: "POST", body: form }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url; // this is the CDN URL of your file
}
