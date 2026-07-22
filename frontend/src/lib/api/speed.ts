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
