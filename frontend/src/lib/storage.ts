import { SPRINT_DISTANCES } from "./constants";
import type { DateRange, Module } from "./types";

const PREFIX = "nsdash_";

/** Claves usadas por la app con rutas (y módulos embebidos). */
export const STORAGE_KEYS = {
  /** Última pestaña Fuerza / Resistencia (lupa en lista + tabs en ficha). */
  module: `${PREFIX}module`,
  exerciseId: `${PREFIX}exercise_id`,
  dateRange: `${PREFIX}date_range`,
  sprintDateRange: `${PREFIX}sprint_date_range`,
  sprintDistance: `${PREFIX}sprint_distance`,
  /** Atleta elegido en Fuerza/Resistencia (sesión del navegador). */
  sessionAtletaId: `${PREFIX}session_atleta_id`,
  /** Último filtro de equipo en /atletas. */
  atletasTeamId: `${PREFIX}atletas_team_id`,
} as const;

const LEGACY_DASHBOARD_KEYS = [`${PREFIX}athlete_id`, `${PREFIX}team_id`] as const;

/** Limpia selección del dashboard viejo al entrar al shell /atletas|/equipos. */
export function clearLegacyDashboardSelectionPrefs(): void {
  for (const key of LEGACY_DASHBOARD_KEYS) {
    safeRemove(key);
  }
}

const DATE_RANGES: DateRange[] = ["7d", "30d", "90d", "all"];

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
    /* quota / private mode */
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

export function isValidDateRange(value: string | null): value is DateRange {
  return value !== null && DATE_RANGES.includes(value as DateRange);
}

export function readStoredModule(): Module {
  const value = safeGet(STORAGE_KEYS.module);
  if (value === "resistencia" || value === "speed") return "resistencia";
  return "strength";
}

export function readStoredDateRange(key: string): DateRange {
  const value = safeGet(key);
  return isValidDateRange(value) ? value : "all";
}

export function readStoredExerciseId(): number | null {
  const raw = safeGet(STORAGE_KEYS.exerciseId);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function readStoredSprintDistance(): number | null {
  const raw = safeGet(STORAGE_KEYS.sprintDistance);
  if (!raw) return null;
  const distance = Number.parseFloat(raw);
  if (!Number.isFinite(distance)) return null;
  return (SPRINT_DISTANCES as readonly number[]).includes(distance) ? distance : null;
}

export function persistModule(module: Module): void {
  safeSet(STORAGE_KEYS.module, module);
}

export function persistExerciseId(id: number | null): void {
  if (id === null) safeRemove(STORAGE_KEYS.exerciseId);
  else safeSet(STORAGE_KEYS.exerciseId, String(id));
}

export function persistDateRange(range: DateRange): void {
  safeSet(STORAGE_KEYS.dateRange, range);
}

export function persistSprintDateRange(range: DateRange): void {
  safeSet(STORAGE_KEYS.sprintDateRange, range);
}

export function persistSprintDistance(distance: number | null): void {
  if (distance === null) safeRemove(STORAGE_KEYS.sprintDistance);
  else safeSet(STORAGE_KEYS.sprintDistance, String(distance));
}

function safeSessionGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeSessionRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readSessionAtletaId(): number | null {
  const raw = safeSessionGet(STORAGE_KEYS.sessionAtletaId);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function persistSessionAtletaId(id: number | null): void {
  if (id === null) safeSessionRemove(STORAGE_KEYS.sessionAtletaId);
  else safeSessionSet(STORAGE_KEYS.sessionAtletaId, String(id));
}

export function readStoredAtletasTeamId(): number | null {
  const raw = safeGet(STORAGE_KEYS.atletasTeamId);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function persistAtletasTeamId(teamId: number | null): void {
  if (teamId === null) safeRemove(STORAGE_KEYS.atletasTeamId);
  else safeSet(STORAGE_KEYS.atletasTeamId, String(teamId));
}

// ─── Auth Token ────────────────────────────────────────────────────────────

const TOKEN_KEY = `${PREFIX}token`;

export function getToken(): string | null {
  return safeGet(TOKEN_KEY);
}

export function setToken(token: string): void {
  safeSet(TOKEN_KEY, token);
}

export function clearToken(): void {
  safeRemove(TOKEN_KEY);
}