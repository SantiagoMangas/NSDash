import { del, get, patch, post } from "@/lib/api/client";

export type AthletePayload = {
  name: string;
  team_id?: number | null;
  sport?: string | null;
  sport_id?: number | null;
  position_id?: number | null;
  height_cm?: number | null;
  body_weight_kg?: number | null;
  goal?: string | null;
  notes?: string | null;
  birth_date?: string | null;
  injuries?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
};

export type AthleteCreatePayload = AthletePayload & {
  email: string;
};

export async function getAthletes(teamId?: number | null): Promise<unknown> {
  const suffix = teamId != null ? `?team_id=${teamId}` : "";
  return get(`/athletes${suffix}`, { cache: "no-store" });
}

export async function getAthlete(athleteId: number): Promise<unknown> {
  return get(`/athletes/${athleteId}`, { cache: "no-store" });
}

export async function createAthlete(payload: AthleteCreatePayload): Promise<unknown> {
  return post("/athletes", payload);
}

export async function updateAthlete(athleteId: number, payload: Partial<AthletePayload>): Promise<unknown> {
  return patch(`/athletes/${athleteId}`, payload);
}

export async function deleteAthlete(athleteId: number): Promise<unknown> {
  return del(`/athletes/${athleteId}`);
}
