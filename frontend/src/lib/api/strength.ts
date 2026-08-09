import { del, get, patch, post } from "@/lib/api/client";

export type Exercise = {
  id: number;
  name: string;
};

export async function getExercises(): Promise<Exercise[]> {
  const data = await get("/exercises");
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is Exercise =>
      item !== null &&
      typeof item === "object" &&
      typeof item.id === "number" &&
      typeof item.name === "string",
  );
}

export async function getAllLogs(): Promise<any> {
  return get("/logs");
}

export async function getProgress(athleteId: number, exerciseId: number): Promise<any> {
  return get(`/athletes/${athleteId}/progress/${exerciseId}`);
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
