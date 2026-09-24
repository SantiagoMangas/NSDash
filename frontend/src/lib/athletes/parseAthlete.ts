import type { Athlete } from "@/lib/types";

export function parseAthlete(item: unknown): Athlete | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  if (typeof record.id !== "number" || typeof record.name !== "string") return null;

  const optionalString = (key: string): string | null | undefined => {
    const value = record[key];
    if (typeof value === "string") return value;
    if (value === null) return null;
    return undefined;
  };

  const optionalNumber = (key: string): number | null | undefined => {
    const value = record[key];
    if (typeof value === "number") return value;
    if (value === null) return null;
    return undefined;
  };

  return {
    id: record.id,
    name: record.name,
    coach_id: typeof record.coach_id === "number" ? record.coach_id : undefined,
    team_id: optionalNumber("team_id"),
    sport: optionalString("sport"),
    sport_id: optionalNumber("sport_id"),
    position_id: optionalNumber("position_id"),
    position_name: optionalString("position_name"),
    height_cm: optionalNumber("height_cm"),
    body_weight_kg: optionalNumber("body_weight_kg"),
    goal: optionalString("goal"),
    notes: optionalString("notes"),
    birth_date: optionalString("birth_date"),
    age: optionalNumber("age"),
    injuries: optionalString("injuries"),
    email: optionalString("email"),
    phone: optionalString("phone"),
    photo_url: optionalString("photo_url"),
  };
}
