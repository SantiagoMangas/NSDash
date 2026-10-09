import { del, get, post, put } from "@/lib/api/client";

export async function getSprintLogs(athleteId: number): Promise<any> {
  return get(`/athletes/${athleteId}/sprint-logs`);
}

export async function createSprintLog(
  athleteId: number,
  distance: number,
  timeSeconds: number,
  date: string,
  notes: string | null,
): Promise<any> {
  return post("/sprint-logs", {
    athlete_id: athleteId,
    distance,
    time_seconds: timeSeconds,
    date,
    notes,
  });
}

export async function getVelocityDashboard(athleteId: number): Promise<any> {
  return get(`/athletes/${athleteId}/velocity-dashboard`, { cache: "no-store" });
}

export type AsrComparativaPorMss = {
  pct_mss: number;
  velocidad_kmh: number;
  srr_pct: number;
};

export type AsrComparativaPorSrr = {
  pct_srr: number;
  velocidad_kmh: number;
  mmss_pct: number;
};

export type AsrResponse = {
  athlete_id: number;
  missing: string[];
  mss_kmh: number | null;
  ift_kmh: number | null;
  asr_kmh: number | null;
  comparativa_por_mss: AsrComparativaPorMss | null;
  comparativa_por_srr: AsrComparativaPorSrr | null;
};

export async function getAsr(
  athleteId: number,
  pctMss?: number,
  pctSrr?: number,
): Promise<AsrResponse> {
  const params = new URLSearchParams();
  if (pctMss !== undefined) params.set("pct_mss", String(pctMss));
  if (pctSrr !== undefined) params.set("pct_srr", String(pctSrr));
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return get(`/athletes/${athleteId}/asr${suffix}`, { cache: "no-store" });
}

export type SpeedTestSummary = {
  id: number;
  athlete_id: number;
  date: string;
  distancia_m: number;
  tiempo_s: number;
  vel_kmh: number;
  velocidad_pico_kmh: number | null;
  mss_kmh: number;
  ritmo_str: string;
};

export type PreferredSpeedTestResponse = {
  athlete_id: number;
  preferred_speed_test_id: number | null;
};

export async function getSpeedTests(athleteId: number): Promise<SpeedTestSummary[]> {
  return get(`/athletes/${athleteId}/speed-tests`, { cache: "no-store" });
}

export async function setPreferredSpeedTest(
  athleteId: number,
  speedTestId: number | null,
): Promise<PreferredSpeedTestResponse> {
  return put(`/athletes/${athleteId}/preferred-speed-test`, {
    speed_test_id: speedTestId,
  });
}

export async function createSpeedTest(
  athleteId: number,
  date: string,
  distancia_m: number,
  tiempo_s: number,
  notes: string | null,
  velocidad_pico_kmh?: number | null,
): Promise<any> {
  return post("/speed-tests", {
    athlete_id: athleteId,
    date,
    distancia_m,
    tiempo_s,
    notes,
    velocidad_pico_kmh: velocidad_pico_kmh ?? null,
  });
}

export type NationalTableAthleteRow = {
  athlete_id: number;
  nombre: string;
  missing: string[];
  ift_kmh: number | null;
  mmss_kmh: number | null;
  asr_kmh: number | null;
  velocidad_referencia_kmh: number | null;
  pct_srr: number | null;
};

export type NationalTableResponse = {
  pct_srr: number;
  athletes: NationalTableAthleteRow[];
};

export type NationalGroupAthlete = {
  athlete_id: number;
  nombre: string;
  velocidad_referencia_kmh: number;
};

export type NationalGroup = {
  grupo: number;
  techo_kmh: number;
  athletes: NationalGroupAthlete[];
};

export type NationalTableGroupsResponse = {
  pct_srr: number;
  cantidad_grupos: number;
  diferencia_pct: number;
  athletes: NationalTableAthleteRow[];
  groups: NationalGroup[];
  sin_datos: NationalTableAthleteRow[];
};

export async function getNationalTable(pctSrr?: number): Promise<NationalTableResponse> {
  const params = new URLSearchParams();
  if (pctSrr !== undefined) params.set("pct_srr", String(pctSrr));
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return get(`/national-table${suffix}`, { cache: "no-store" });
}

export async function getNationalTableGroups(
  pctSrr?: number,
  cantidadGrupos?: number,
  diferenciaPct?: number,
  teamId?: number | null,
): Promise<NationalTableGroupsResponse> {
  const params = new URLSearchParams();
  if (pctSrr !== undefined) params.set("pct_srr", String(pctSrr));
  if (cantidadGrupos !== undefined) params.set("cantidad_grupos", String(cantidadGrupos));
  if (diferenciaPct !== undefined) params.set("diferencia_pct", String(diferenciaPct));
  if (teamId != null) params.set("team_id", String(teamId));
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return get(`/national-table/groups${suffix}`, { cache: "no-store" });
}

import type { NormalizedRsaFatigueTest } from "@/lib/rsaFatigue";

export type RsaFatigueTestSummary = NormalizedRsaFatigueTest;

export async function getRsaFatigueTests(athleteId: number): Promise<RsaFatigueTestSummary[]> {
  const { normalizeRsaFatigueSummary } = await import("@/lib/rsaFatigue");
  const { mergeRsaFatigueMetaCache } = await import("@/lib/rsaFatigueMetaCache");
  const data = await get(`/athletes/${athleteId}/rsa-fatigue-tests`, {
    cache: "no-store",
  });
  if (!Array.isArray(data)) return [];
  const normalized = data
    .map((item) => normalizeRsaFatigueSummary(item))
    .filter((item): item is RsaFatigueTestSummary => item !== null);
  return mergeRsaFatigueMetaCache(athleteId, normalized);
}

export type RsaFatigueTestDetail = RsaFatigueTestSummary & {
  tiempos: number[];
  notes: string | null;
  tiempo_medio: number;
};

export async function getRsaFatigueTest(testId: number): Promise<RsaFatigueTestDetail> {
  const { normalizeRsaFatigueSummary } = await import("@/lib/rsaFatigue");
  const data = await get<unknown>(`/rsa-fatigue-tests/${testId}`, { cache: "no-store" });
  const base = normalizeRsaFatigueSummary(data);
  if (!base) {
    throw new Error("Respuesta de test RSA inválida");
  }
  const o = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    ...base,
    tiempos: base.tiempos ?? [],
    notes: typeof o.notes === "string" ? o.notes : null,
    tiempo_medio:
      finiteNumber(o.tiempo_medio) ??
      (base.cantidad_sprints > 0 ? base.tiempo_total / base.cantidad_sprints : 0),
  };
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function createRsaFatigueTest(
  athleteId: number,
  date: string,
  tiempos: number[],
  distancia_sprint_m: number | null,
  pausa_s: number | null,
  notes: string | null,
): Promise<any> {
  const { rememberRsaFatigueTestMeta } = await import("@/lib/rsaFatigueMetaCache");
  const response = await post("/rsa-fatigue-tests", {
    athlete_id: athleteId,
    date,
    tiempos,
    distancia_sprint_m,
    pausa_s,
    notes,
  });
  rememberRsaFatigueTestMeta(response, athleteId);
  return response;
}

export async function deleteSpeedTest(testId: number): Promise<{ detail: string }> {
  return del(`/speed-tests/${testId}`);
}

export async function deleteRsaFatigueTest(testId: number): Promise<{ detail: string }> {
  return del(`/rsa-fatigue-tests/${testId}`);
}
