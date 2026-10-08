import { get } from "@/lib/api/client";
import { clearToken, getToken } from "@/lib/storage";

/** Confirma que el JWT guardado es aceptado por el backend actual. */
export async function validateStoredSession(): Promise<boolean> {
  if (!getToken()) {
    return false;
  }
  try {
    await get<{ user_id: number }>("/test-auth");
    return true;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) {
      clearToken();
    }
    return false;
  }
}
