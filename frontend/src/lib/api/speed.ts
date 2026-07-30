import { get, post } from "@/lib/api/client";

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

export async function getSpeedTests(athleteId: number): Promise<any> {
  return get(`/athletes/${athleteId}/speed-tests`, { cache: "no-store" });
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
