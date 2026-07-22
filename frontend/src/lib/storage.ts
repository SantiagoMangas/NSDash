import { EXERCISES, SPRINT_DISTANCES } from "./constants";
import type { DateRange, Module } from "./types";

const PREFIX = "nsdash_";

export const STORAGE_KEYS = {
  athleteId: `${PREFIX}athlete_id`,
  module: `${PREFIX}module`,
  exerciseId: `${PREFIX}exercise_id`,
  dateRange: `${PREFIX}date_range`,
  sprintDateRange: `${PREFIX}sprint_date_range`,
  sprintDistance: `${PREFIX}sprint_distance`,
} as const;

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
  return value === "speed" ? "speed" : "strength";
}

export function readStoredDateRange(key: string): DateRange {
  const value = safeGet(key);
  return isValidDateRange(value) ? value : "all";
}

export function readStoredAthleteId(): number | null {
  const raw = safeGet(STORAGE_KEYS.athleteId);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function readStoredExerciseId(): number | null {
  const raw = safeGet(STORAGE_KEYS.exerciseId);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return EXERCISES.some((e) => e.id === id) ? id : null;
}

export function readStoredSprintDistance(): number | null {
  const raw = safeGet(STORAGE_KEYS.sprintDistance);
  if (!raw) return null;
  const distance = Number.parseFloat(raw);
  if (!Number.isFinite(distance)) return null;
  return (SPRINT_DISTANCES as readonly number[]).includes(distance) ? distance : null;
}

export function persistAthleteId(id: number | null): void {
  if (id === null) safeRemove(STORAGE_KEYS.athleteId);
  else safeSet(STORAGE_KEYS.athleteId, String(id));
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