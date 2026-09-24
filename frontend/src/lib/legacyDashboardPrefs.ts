/**
 * Preferencias del dashboard monolítico (/legacy).
 * Las rutas nuevas no usan athlete_id ni team_id en localStorage (URL y query params).
 */

const PREFIX = "nsdash_";

const KEYS = {
  athleteId: `${PREFIX}athlete_id`,
  teamId: `${PREFIX}team_id`,
} as const;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readStoredTeamId(): number | null {
  const raw = safeGet(KEYS.teamId);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function persistTeamId(id: number | null): void {
  if (id === null) safeRemove(KEYS.teamId);
  else safeSet(KEYS.teamId, String(id));
}

export function readStoredAthleteId(): number | null {
  const raw = safeGet(KEYS.athleteId);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function persistAthleteId(id: number | null): void {
  if (id === null) safeRemove(KEYS.athleteId);
  else safeSet(KEYS.athleteId, String(id));
}
