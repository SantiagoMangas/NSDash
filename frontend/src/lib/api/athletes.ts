import { get, patch, post } from "@/lib/api/client";

export type AthleteUpdatePayload = {
  name?: string;
  sport?: string | null;
  height_cm?: number | null;
  body_weight_kg?: number | null;
  goal?: string | null;
  notes?: string | null;
};

export async function getAthletes(): Promise<any> {
  return get("/athletes", { cache: "no-store" });
}

export async function createAthlete(name: string): Promise<any> {
  return post("/athletes", { name });
}

export async function updateAthlete(
  athleteId: number,
  payload: AthleteUpdatePayload,
): Promise<any> {
  return patch(`/athletes/${athleteId}`, payload);
}
