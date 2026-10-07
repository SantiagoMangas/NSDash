/** Debe coincidir con ATHLETE_PHOTO_MAX_BYTES en backend/app/main.py */
export const ATHLETE_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg", "image/pjpeg"]);

export function validateAthletePhotoFile(file: File): string | null {
  if (file.size > ATHLETE_PHOTO_MAX_BYTES) {
    const maxMb = ATHLETE_PHOTO_MAX_BYTES / (1024 * 1024);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `La imagen pesa ${sizeMb} MB. El máximo permitido es ${maxMb} MB.`;
  }
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif" || file.name.toLowerCase().endsWith(".heic")) {
    return "HEIC no está soportado. Exportá la foto como JPG o PNG desde el celular.";
  }
  if (type && !ALLOWED_TYPES.has(type)) {
    return `Formato no permitido (${type || "desconocido"}). Usá JPG, PNG o WebP.`;
  }
  return null;
}

export function athletePhotoUploadErrorMessage(err: unknown, fallback: string): string {
  const fromApi = parseApiErrorLoose(err);
  if (fromApi) return fromApi;

  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status;
    if (status === 401) return "Sesión vencida. Volvé a iniciar sesión.";
    if (status === 404 || status === 405) {
      return "La subida de fotos no está activa en este servidor (falta actualizar el backend). Si trabajás en local, reiniciá el API; si usás la app publicada, hay que desplegar el backend en Railway.";
    }
    if (status === 413) return "La imagen es demasiado pesada para el servidor.";
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      return "No se pudo conectar con el API. Verificá que el backend esté corriendo.";
    }
  }
  return fallback;
}

function parseApiErrorLoose(data: unknown): string | null {
  if (data instanceof Error && (data as Error & { detail?: unknown }).detail !== undefined) {
    return parseApiErrorLoose({ detail: (data as Error & { detail?: unknown }).detail });
  }
  if (!data || typeof data !== "object") return null;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") {
    if (detail === "Method Not Allowed") {
      return "La subida de fotos no está activa en este servidor (falta actualizar el backend). Si trabajás en local, reiniciá el API; si usás la app publicada, hay que desplegar el backend en Railway.";
    }
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "object" && first !== null && "msg" in first) {
      return String((first as { msg: string }).msg);
    }
  }
  return null;
}
