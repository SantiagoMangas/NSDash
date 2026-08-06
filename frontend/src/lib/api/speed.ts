import { get, post, put } from "@/lib/api/client";

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
): Promise<any> {
  return post("/speed-tests", {
    athlete_id: athleteId,
    date,
    distancia_m,
    tiempo_s,
    notes,
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
): Promise<NationalTableGroupsResponse> {
  const params = new URLSearchParams();
  if (pctSrr !== undefined) params.set("pct_srr", String(pctSrr));
  if (cantidadGrupos !== undefined) params.set("cantidad_grupos", String(cantidadGrupos));
  if (diferenciaPct !== undefined) params.set("diferencia_pct", String(diferenciaPct));
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return get(`/national-table/groups${suffix}`, { cache: "no-store" });
}

export async function getRsaFatigueTests(athleteId: number): Promise<any> {
  return get(`/athletes/${athleteId}/rsa-fatigue-tests`, { cache: "no-store" });
}

export async function createRsaFatigueTest(
  athleteId: number,
  date: string,
  tiempos: number[],
  distancia_sprint_m: number | null,
  pausa_s: number | null,
  notes: string | null,
): Promise<any> {
  return post("/rsa-fatigue-tests", {
    athlete_id: athleteId,
    date,
    tiempos,
    distancia_sprint_m,
    pausa_s,
    notes,
  });
}
