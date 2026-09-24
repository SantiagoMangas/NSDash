import type { Athlete } from "@/lib/types";
import { joinAthleteName, splitAthleteName } from "@/lib/athleteName";
import type { AthletePayload } from "@/lib/api/athletes";

export type AthleteFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string;
  teamId: string;
  sportId: string;
  positionId: string;
  birthDate: string;
  heightCm: string;
  bodyWeightKg: string;
  goal: string;
  notes: string;
  injuries: string;
};

export const emptyAthleteForm = (teamId: number | null = null): AthleteFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  photoUrl: "",
  teamId: teamId != null ? String(teamId) : "",
  sportId: "",
  positionId: "",
  birthDate: "",
  heightCm: "",
  bodyWeightKg: "",
  goal: "",
  notes: "",
  injuries: "",
});

export function athleteToFormState(athlete: Athlete): AthleteFormState {
  const { firstName, lastName } = splitAthleteName(athlete.name);
  return {
    firstName,
    lastName,
    email: athlete.email ?? "",
    phone: athlete.phone ?? "",
    photoUrl: athlete.photo_url ?? "",
    teamId: athlete.team_id != null ? String(athlete.team_id) : "",
    sportId: athlete.sport_id != null ? String(athlete.sport_id) : "",
    positionId: athlete.position_id != null ? String(athlete.position_id) : "",
    birthDate: athlete.birth_date ?? "",
    heightCm: athlete.height_cm != null ? String(athlete.height_cm) : "",
    bodyWeightKg: athlete.body_weight_kg != null ? String(athlete.body_weight_kg) : "",
    goal: athlete.goal ?? "",
    notes: athlete.notes ?? "",
    injuries: athlete.injuries ?? "",
  };
}

function parseOptionalFloat(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed, 10);
  return Number.isFinite(value) ? value : null;
}

export function validateAthleteForm(
  form: AthleteFormState,
  requireEmail: boolean,
): string | null {
  if (!form.firstName.trim()) return "El nombre es obligatorio.";
  if (requireEmail && !form.email.trim()) return "El email es obligatorio.";
  if (form.email.trim() && !form.email.includes("@")) return "Ingresá un email válido.";
  if (form.goal.length > 500) return "El objetivo no puede superar los 500 caracteres.";
  if (form.heightCm.trim()) {
    const h = parseOptionalFloat(form.heightCm);
    if (h === null || h < 100 || h > 250) return "La altura debe estar entre 100 y 250 cm.";
  }
  if (form.bodyWeightKg.trim()) {
    const w = parseOptionalFloat(form.bodyWeightKg);
    if (w === null || w < 30 || w > 300) return "El peso debe estar entre 30 y 300 kg.";
  }
  return null;
}

export function formToCreatePayload(form: AthleteFormState): AthletePayload & { email: string } {
  return {
    name: joinAthleteName(form.firstName, form.lastName),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    photo_url: form.photoUrl.trim() || null,
    team_id: parseOptionalInt(form.teamId),
    sport_id: parseOptionalInt(form.sportId),
    position_id: parseOptionalInt(form.positionId),
    birth_date: form.birthDate.trim() || null,
    height_cm: parseOptionalFloat(form.heightCm),
    body_weight_kg: parseOptionalFloat(form.bodyWeightKg),
    goal: form.goal.trim() || null,
    notes: form.notes.trim() || null,
    injuries: form.injuries.trim() || null,
  };
}

export function formToUpdatePayload(form: AthleteFormState): AthletePayload {
  const payload = formToCreatePayload(form);
  return {
    ...payload,
    email: form.email.trim() || null,
  };
}
