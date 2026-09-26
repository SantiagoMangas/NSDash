import { del, get, patch, post } from "@/lib/api/client";

export type Exercise = {
  id: number;
  name: string;
  formula_type: string;
  rm_coefficient: number;
  percentage_curve: string;
};

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** True si el JSON trae los campos de catálogo (backend actualizado). */
export function exercisePayloadHasCatalogMeta(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.formula_type === "string" &&
    parseOptionalNumber(record.rm_coefficient) !== null &&
    typeof record.percentage_curve === "string"
  );
}

function parseExercise(item: unknown): Exercise | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  if (typeof record.id !== "number" || typeof record.name !== "string") return null;
  const hasMeta = exercisePayloadHasCatalogMeta(item);
  return {
    id: record.id,
    name: record.name,
    formula_type: hasMeta ? String(record.formula_type) : "epley",
    rm_coefficient: hasMeta
      ? (parseOptionalNumber(record.rm_coefficient) as number)
      : 1 / 30,
    percentage_curve: hasMeta ? String(record.percentage_curve) : "sentadilla",
  };
}

export async function getExercises(): Promise<{
  exercises: Exercise[];
  catalogMetaComplete: boolean;
}> {
  const data = await get("/exercises");
  if (!Array.isArray(data)) {
    return { exercises: [], catalogMetaComplete: false };
  }
  const exercises = data
    .map(parseExercise)
    .filter((item): item is Exercise => item !== null);
  const catalogMetaComplete =
    data.length > 0 && data.every((item) => exercisePayloadHasCatalogMeta(item));
  return { exercises, catalogMetaComplete };
}

export type ExerciseCreatePayload = {
  name: string;
  formula_type: "epley" | "brzycki";
  rm_coefficient?: number;
  percentage_curve: string;
};

export async function createExercise(payload: ExerciseCreatePayload): Promise<Exercise> {
  const data = await post("/exercises", payload);
  const parsed = parseExercise(data);
  if (!parsed) {
    throw new Error("Respuesta de ejercicio inválida.");
  }
  return parsed;
}

export async function getExercise(exerciseId: number): Promise<Exercise | null> {
  try {
    const data = await get(`/exercises/${exerciseId}`);
    return parseExercise(data);
  } catch {
    return null;
  }
}

export async function getAllLogs(): Promise<any> {
  return get("/logs");
}

export async function getProgress(athleteId: number, exerciseId: number): Promise<any> {
  return get(`/athletes/${athleteId}/progress/${exerciseId}`);
}

export async function getExercisePercentageTable(
  athleteId: number,
  exerciseId: number,
): Promise<any> {
  return get(`/athletes/${athleteId}/exercises/${exerciseId}/percentage-table`);
}

export async function getSummary(logId: number): Promise<any> {
  return get(`/logs/${logId}/summary`);
}

export async function createTrainingLog(
  athleteId: number,
  exerciseId: number,
  date: string,
  weight: number,
  reps: number,
): Promise<any> {
  return post("/logs", {
    athlete_id: athleteId,
    exercise_id: exerciseId,
    date,
    weight,
    reps,
  });
}

export type TrainingLogUpdatePayload = {
  date?: string;
  weight?: number;
  reps?: number;
};

export async function updateTrainingLog(
  logId: number,
  payload: TrainingLogUpdatePayload,
): Promise<any> {
  return patch(`/logs/${logId}`, payload);
}

export async function deleteTrainingLog(logId: number): Promise<any> {
  return del(`/logs/${logId}`);
}
