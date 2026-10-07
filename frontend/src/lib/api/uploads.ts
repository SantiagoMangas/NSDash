import { BASE_URL, postForm } from "@/lib/api/client";
import { validateAthletePhotoFile } from "@/lib/api/athletePhotoUpload";

export async function uploadAthletePhoto(file: File): Promise<string> {
  const validation = validateAthletePhotoFile(file);
  if (validation) {
    const error = new Error(validation);
    (error as Error & { detail?: string }).detail = validation;
    throw error;
  }
  const form = new FormData();
  form.append("file", file);
  const res = await postForm<{ photo_url: string }>("/athletes/photo-upload", form);
  return res.photo_url;
}

/** URL absoluta para mostrar fotos guardadas en el backend. */
export function resolveAthletePhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl?.trim()) return null;
  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://") || photoUrl.startsWith("data:")) {
    return photoUrl;
  }
  if (photoUrl.startsWith("/")) {
    return `${BASE_URL}${photoUrl}`;
  }
  return photoUrl;
}
