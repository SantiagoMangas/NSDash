import { del, get, patch, post } from "@/lib/api/client";

export type Team = {
  id: number;
  coach_id: number;
  name: string;
  image_url: string | null;
};

export type TeamCreatePayload = {
  name: string;
  image_url?: string | null;
};

export async function getTeams(): Promise<Team[]> {
  const data = await get("/teams", { cache: "no-store" });
  return Array.isArray(data) ? data : [];
}

export async function createTeam(payload: TeamCreatePayload): Promise<Team> {
  return post("/teams", payload);
}

export async function updateTeam(teamId: number, payload: Partial<TeamCreatePayload>): Promise<Team> {
  return patch(`/teams/${teamId}`, payload);
}

export async function deleteTeam(teamId: number): Promise<void> {
  await del(`/teams/${teamId}`);
}
