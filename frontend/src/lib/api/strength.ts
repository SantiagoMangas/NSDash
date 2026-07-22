import { get, post } from "@/lib/api/client";

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
