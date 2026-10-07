"use client";

import { useRef, useState } from "react";
import { updateAthlete } from "@/lib/api/athletes";
import { ATHLETE_PHOTO_MAX_BYTES, athletePhotoUploadErrorMessage } from "@/lib/api/athletePhotoUpload";
import { resolveAthletePhotoUrl, uploadAthletePhoto } from "@/lib/api/uploads";
import { athleteInitials } from "@/lib/athleteName";
type Props = {
  idPrefix: string;
  photoUrl: string;
  onPhotoUrlChange: (url: string) => void;
  firstName: string;
  lastName: string;
  /** Si está editando un atleta existente, guarda la foto en la ficha al subir. */
  persistAthleteId?: number | null;
  onPhotoPersisted?: () => void;
};

export function AthletePhotoField({
  idPrefix,
  photoUrl,
  onPhotoUrlChange,
  firstName,
  lastName,
  persistAthleteId,
  onPhotoPersisted,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);

  const previewSrc = resolveAthletePhotoUrl(photoUrl);
  const hasPhoto = Boolean(previewSrc);

  const handleFile = async (file: File) => {
    setError(null);
    setJustUploaded(false);
    setUploading(true);
    try {
      const url = await uploadAthletePhoto(file);
      onPhotoUrlChange(url);
      if (persistAthleteId != null) {
        await updateAthlete(persistAthleteId, { photo_url: url });
        onPhotoPersisted?.();
      }
      setJustUploaded(true);
    } catch (err) {
      setError(athletePhotoUploadErrorMessage(err, "No se pudo subir la imagen."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sm:col-span-2">
      <span className="block text-xs text-slate-500 mb-1">Foto de perfil</span>
      <p className="text-xs text-slate-400 mb-3">
        JPG, PNG o WebP · máximo {ATHLETE_PHOTO_MAX_BYTES / (1024 * 1024)} MB
      </p>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className={`w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-lg font-semibold border-2 ${
            hasPhoto ? "border-emerald-400 bg-slate-100" : "border-slate-200 bg-slate-100 text-slate-600"
          }`}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            athleteInitials(firstName, lastName)
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <input
            ref={inputRef}
            id={`${idPrefix}-photo-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
          >
            {uploading ? "Subiendo…" : hasPhoto ? "Cambiar foto" : "Elegir foto"}
          </button>

          {justUploaded && hasPhoto ? (
            <p
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
              role="status"
            >
              <span className="text-emerald-600" aria-hidden>✓</span>
              {persistAthleteId != null
                ? "Foto guardada en la ficha del atleta"
                : "Foto lista — guardá el formulario para aplicarla"}
            </p>
          ) : null}

          {persistAthleteId == null && hasPhoto && !justUploaded ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Recordá guardar el atleta para que la foto quede en su perfil.
            </p>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-xs text-red-600 mt-2">{error}</p> : null}
    </div>
  );
}
