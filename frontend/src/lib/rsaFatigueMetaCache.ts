import type { NormalizedRsaFatigueTest } from "@/lib/rsaFatigue";
import { normalizeRsaFatigueSummary } from "@/lib/rsaFatigue";

const STORAGE_KEY = "nsdash_rsa_test_meta_v1";

type StoredRsaMeta = {
  athlete_id: number;
  distancia_sprint_m: number | null;
  pausa_s: number | null;
  tiempos: number[];
  mejor_tiempo: number;
  peor_tiempo: number;
  tiempo_total: number;
  tiempo_ideal: number;
};

function storageKey(athleteId: number, testId: number): string {
  return `${athleteId}:${testId}`;
}

function readStore(): Record<string, StoredRsaMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredRsaMeta>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredRsaMeta>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

/** Guarda distancia/pausa/tiempos del POST (el listado legacy del API no los trae). */
export function rememberRsaFatigueTestMeta(
  raw: unknown,
  athleteId: number,
): NormalizedRsaFatigueTest | null {
  const normalized = normalizeRsaFatigueSummary(raw);
  if (!normalized) return null;

  const store = readStore();
  store[storageKey(athleteId, normalized.id)] = {
    athlete_id: athleteId,
    distancia_sprint_m: normalized.distancia_sprint_m,
    pausa_s: normalized.pausa_s,
    tiempos: normalized.tiempos,
    mejor_tiempo: normalized.mejor_tiempo,
    peor_tiempo: normalized.peor_tiempo,
    tiempo_total: normalized.tiempo_total,
    tiempo_ideal: normalized.tiempo_ideal,
  };
  writeStore(store);
  return normalized;
}

export function forgetRsaFatigueTestMeta(athleteId: number, testId: number): void {
  const store = readStore();
  const key = storageKey(athleteId, testId);
  if (!(key in store)) return;
  delete store[key];
  writeStore(store);
}

function mergeOne(athleteId: number, test: NormalizedRsaFatigueTest): NormalizedRsaFatigueTest {
  const stored = readStore()[storageKey(athleteId, test.id)];
  if (!stored) return test;

  return {
    ...test,
    distancia_sprint_m: test.distancia_sprint_m ?? stored.distancia_sprint_m,
    pausa_s: test.pausa_s ?? stored.pausa_s,
    tiempos: test.tiempos.length > 0 ? test.tiempos : stored.tiempos,
    mejor_tiempo: test.mejor_tiempo > 0 ? test.mejor_tiempo : stored.mejor_tiempo,
    peor_tiempo: test.peor_tiempo > 0 ? test.peor_tiempo : stored.peor_tiempo,
    tiempo_total: test.tiempo_total > 0 ? test.tiempo_total : stored.tiempo_total,
    tiempo_ideal: test.tiempo_ideal > 0 ? test.tiempo_ideal : stored.tiempo_ideal,
  };
}

export function mergeRsaFatigueMetaCache(
  athleteId: number,
  tests: NormalizedRsaFatigueTest[],
): NormalizedRsaFatigueTest[] {
  return tests.map((test) => mergeOne(athleteId, test));
}
