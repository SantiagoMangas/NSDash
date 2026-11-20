import { del, get, post } from "@/lib/api/client";

export type MasTrainingIntensityResult = {
  velocidad_kmh: number;
  ritmo_str: string;
  distancia_m: number;
  trabajo_s: number;
  trabajo_str: string;
  pausa_s: number;
  pausa_str: string;
  volumen_serie_m: number;
  volumen_trabajo_m: number;
};

export type MasTrainingCalculateResponse = {
  metodologia: string;
  entrenamiento: string;
  fecha: string | null;
  cod: string;
  shuttles: number;
  ciclos: number;
  min: MasTrainingIntensityResult;
  max: MasTrainingIntensityResult;
  serie_min: number;
  densidad_min: number;
  densidad_str: string;
};

export type MasTrainingCalculateRequest = {
  reference_kmh: number;
  intensidad_pct_min: number;
  intensidad_pct_max: number;
  trabajo_s: number;
  serie_min: number;
  bloques: number;
  macro_pausa_min: number;
  ratio: string;
  entrenamiento: string;
  cod: "SI" | "NO";
  shuttles: number;
  fecha?: string | null;
};

export async function calculateMasTraining(
  payload: MasTrainingCalculateRequest,
): Promise<MasTrainingCalculateResponse> {
  return post("/training-sessions/mas-training/calculate", payload);
}

export type HiitCortoCalculateRequest = {
  reference_kmh: number;
  intensidad_pct_min: number;
  intensidad_pct_max: number;
  distancia_m: number;
  reps: number;
  series: number;
  macro_pausa_min: number;
  ratio: string;
};

export type HiitCortoCalculateResponse = {
  min: { velocidad_kmh: number; ritmo_str: string; trabajo_s: number; pausa_s: number };
  max: { velocidad_kmh: number; ritmo_str: string; trabajo_s: number; pausa_s: number };
  volumen_m: number;
  densidad_min: number;
};

export async function calculateHiitCorto(
  payload: HiitCortoCalculateRequest,
): Promise<HiitCortoCalculateResponse> {
  return post("/training-sessions/hiit-corto/calculate", payload);
}

export type HiitLargoCalculateRequest = HiitCortoCalculateRequest;

export type HiitLargoCalculateResponse = {
  min: {
    velocidad_kmh: number;
    ritmo_str: string;
    trabajo_s: number;
    trabajo_str: string;
    pausa_s: number;
    pausa_str: string;
  };
  max: {
    velocidad_kmh: number;
    ritmo_str: string;
    trabajo_s: number;
    trabajo_str: string;
    pausa_s: number;
    pausa_str: string;
  };
  volumen_m: number;
  densidad_min: number;
};

export async function calculateHiitLargo(
  payload: HiitLargoCalculateRequest,
): Promise<HiitLargoCalculateResponse> {
  return post("/training-sessions/hiit-largo/calculate", payload);
}

export type HiitContinuoIntensityResult = {
  velocidad_kmh: number;
  ritmo_str: string;
  distancia_m: number;
  trabajo_s: number;
  trabajo_str: string;
  pausa_s: number;
  pausa_str: string;
};

export type HiitContinuoCalculateResponse = {
  entrenamiento: string;
  min: HiitContinuoIntensityResult;
  max: HiitContinuoIntensityResult;
  serie_min: number;
  densidad_min: number;
  densidad_str: string;
  volumen_serie_m: number;
  volumen_trabajo_m: number;
  z2_kmh: number;
  z2_ritmo_str: string;
  z2_pct_min: number;
  z2_pct_max: number;
};

export type HiitContinuoLargoCalculateRequest = {
  reference_kmh: number;
  intensidad_pct_min: number;
  intensidad_pct_max: number;
  trabajo_min: number;
  serie_min: number;
  bloques: number;
  macro_pausa_min: number;
  ratio: string;
};

export type HiitContinuoCortoCalculateRequest = {
  reference_kmh: number;
  intensidad_pct_min: number;
  intensidad_pct_max: number;
  trabajo_s: number;
  serie_min: number;
  bloques: number;
  macro_pausa_min: number;
  ratio: string;
};

export async function calculateHiitContinuoLargo(
  payload: HiitContinuoLargoCalculateRequest,
): Promise<HiitContinuoCalculateResponse> {
  return post("/training-sessions/hiit-continuo-largo/calculate", payload);
}

export async function calculateHiitContinuoCorto(
  payload: HiitContinuoCortoCalculateRequest,
): Promise<HiitContinuoCalculateResponse> {
  return post("/training-sessions/hiit-continuo-corto/calculate", payload);
}

export type TempoRunCalculateRequest = {
  reference_kmh: number;
  intensidad_pct_min: number;
  intensidad_pct_max: number;
  distancia_m: number;
  pausa_m: number;
  series: number;
  bloques: number;
  ratio: string;
  entrenamiento: string;
  cod: "SI" | "NO";
  shuttles: number;
  fecha?: string | null;
};

export type TempoRunCalculateResponse = {
  metodologia: string;
  entrenamiento: string;
  fecha: string | null;
  cod: string;
  shuttles: number;
  distancia_m: number;
  distancia_ajustada_m: number;
  pausa_m: number;
  series: number;
  bloques: number;
  min: {
    velocidad_kmh: number;
    ritmo_str: string;
    trabajo_s: number;
    trabajo_str: string;
    pausa_s: number;
    pausa_str: string;
  };
  max: {
    velocidad_kmh: number;
    ritmo_str: string;
    trabajo_s: number;
    trabajo_str: string;
    pausa_s: number;
    pausa_str: string;
  };
  volumen_serie_m: number;
  volumen_trabajo_m: number;
};

export async function calculateTempoRun(
  payload: TempoRunCalculateRequest,
): Promise<TempoRunCalculateResponse> {
  return post("/training-sessions/tempo-run/calculate", payload);
}

export type TempoRunSessionSummary = {
  id: number;
  athlete_id: number;
  date: string;
  entrenamiento: string;
  reference_kmh: number;
  summary: string;
};

export async function saveTempoRunSession(
  athleteId: number,
  payload: TempoRunCalculateRequest,
): Promise<TempoRunSessionSummary> {
  return post("/tempo-run-sessions", { athlete_id: athleteId, payload });
}

export async function getTempoRunSessions(athleteId: number): Promise<TempoRunSessionSummary[]> {
  return get(`/athletes/${athleteId}/tempo-run-sessions`, { cache: "no-store" });
}

export async function deleteTempoRunSession(sessionId: number): Promise<void> {
  await del(`/tempo-run-sessions/${sessionId}`);
}

export type TempoRunSessionDetailResponse = {
  id: number;
  athlete_id: number;
  date: string;
  reference_kmh: number;
  snapshot: {
    request: TempoRunCalculateRequest;
    result: TempoRunCalculateResponse;
  };
};

export async function getTempoRunSessionDetail(sessionId: number): Promise<TempoRunSessionDetailResponse> {
  return get(`/tempo-run-sessions/${sessionId}`, { cache: "no-store" });
}

export type TrainingSessionHistoryItem = {
  id: number;
  athlete_id: number;
  date: string;
  calculator: string;
  entrenamiento: string;
  reference_kmh: number;
  summary: string;
  source: string;
  saved_at?: string | null;
};

function mapTempoSessionsToHistory(tempo: TempoRunSessionSummary[]): TrainingSessionHistoryItem[] {
  return tempo.map((row) => ({
    id: row.id,
    athlete_id: row.athlete_id,
    date: row.date,
    calculator: "Tempo Run",
    entrenamiento: "Tempo Run",
    reference_kmh: row.reference_kmh,
    summary: row.summary,
    source: "tempo_run",
  }));
}

export async function getTrainingSessions(athleteId: number): Promise<TrainingSessionHistoryItem[]> {
  try {
    return await get(`/athletes/${athleteId}/training-sessions`, { cache: "no-store" });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return mapTempoSessionsToHistory(await getTempoRunSessions(athleteId));
    }
    throw err;
  }
}

export type SavedTrainingSessionSource =
  | "mas_training"
  | "hiit_corto"
  | "hiit_largo"
  | "hiit_continuo_largo"
  | "hiit_continuo_corto"
  | "rsa";

export type SavedTrainingSessionSummary = TrainingSessionHistoryItem;

export async function saveTrainingSession(
  athleteId: number,
  source: SavedTrainingSessionSource,
  date: string,
  payload: Record<string, unknown>,
): Promise<SavedTrainingSessionSummary> {
  return post("/saved-training-sessions", {
    athlete_id: athleteId,
    source,
    date,
    payload,
  });
}

export type SavedTrainingSessionDetailResponse = {
  id: number;
  athlete_id: number;
  date: string;
  reference_kmh: number;
  source: string;
  snapshot: {
    source: string;
    request: Record<string, unknown>;
    result: Record<string, unknown>;
  };
};

export async function getSavedTrainingSessionDetail(
  sessionId: number,
): Promise<SavedTrainingSessionDetailResponse> {
  return get(`/saved-training-sessions/${sessionId}`, { cache: "no-store" });
}

export async function deleteSavedTrainingSession(sessionId: number): Promise<void> {
  await del(`/saved-training-sessions/${sessionId}`);
}

export async function deleteTrainingSession(item: TrainingSessionHistoryItem): Promise<void> {
  if (item.source === "tempo_run") {
    await deleteTempoRunSession(item.id);
    return;
  }
  await deleteSavedTrainingSession(item.id);
}

export type RsaCalculateRequest = {
  reference_kmh: number;
  intensidad_pct_min: number;
  intensidad_pct_max: number;
  distancia_m: number;
  reps: number;
  series: number;
  ratio: string;
  entrenamiento: string;
};

export type RsaCalculateResponse = {
  entrenamiento: string;
  min: { velocidad_kmh: number; ritmo_str: string; trabajo_s: number; pausa_s: number };
  max: { velocidad_kmh: number; ritmo_str: string; trabajo_s: number; pausa_s: number };
  volumen_serie_m: number;
  volumen_trabajo_m: number;
};

export async function calculateRsa(
  payload: RsaCalculateRequest,
): Promise<RsaCalculateResponse> {
  return post("/training-sessions/rsa/calculate", payload);
}
