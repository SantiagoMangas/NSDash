import { del, get, patch, post } from "@/lib/api/client";

export type Sport = { id: number; name: string };
export type Position = { id: number; sport_id: number; name: string };

export async function getSports(): Promise<Sport[]> {
  const data = await get("/sports", { cache: "no-store" });
  return Array.isArray(data) ? data : [];
}

export async function getPositions(sportId?: number): Promise<Position[]> {
  const suffix = sportId !== undefined ? `?sport_id=${sportId}` : "";
  const data = await get(`/positions${suffix}`, { cache: "no-store" });
  return Array.isArray(data) ? data : [];
}

export async function createSport(name: string): Promise<Sport> {
  return post("/sports", { name });
}

export async function createPosition(sportId: number, name: string): Promise<Position> {
  return post("/positions", { sport_id: sportId, name });
}

export async function updateSport(sportId: number, name: string): Promise<Sport> {
  return patch(`/sports/${sportId}`, { name });
}

export async function deleteSport(sportId: number): Promise<void> {
  await del(`/sports/${sportId}`);
}

export async function updatePosition(
  positionId: number,
  payload: { name?: string; sport_id?: number },
): Promise<Position> {
  return patch(`/positions/${positionId}`, payload);
}

export async function deletePosition(positionId: number): Promise<void> {
  await del(`/positions/${positionId}`);
}
