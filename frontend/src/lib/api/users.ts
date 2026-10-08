import { del, get, patch, post } from "@/lib/api/client";

export type UserMe = {
  id: number;
  email: string;
  role: "admin" | "coach";
  name: string | null;
  photo_url: string | null;
  bio: string | null;
  phone: string | null;
  must_change_password: boolean;
};

export type CoachSummary = {
  id: number;
  email: string;
  name: string | null;
  bio: string | null;
  phone: string | null;
  photo_url: string | null;
  is_active: boolean;
  must_change_password: boolean;
  athlete_count: number;
};

export async function fetchMe(): Promise<UserMe> {
  return get<UserMe>("/auth/me");
}

export async function updateMe(payload: Partial<Pick<UserMe, "name" | "photo_url" | "bio" | "phone">>) {
  return patch<UserMe>("/users/me", payload);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return post<{ detail: string }>("/users/me/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function listCoaches(): Promise<CoachSummary[]> {
  return get<CoachSummary[]>("/admin/coaches");
}

export type CoachCreateResponse = CoachSummary & { temporary_password: string };

export async function createCoach(payload: {
  name: string;
  email: string;
  password: string;
  bio?: string;
}) {
  return post<CoachCreateResponse>("/admin/coaches", payload);
}

export type CoachAdminUpdate = Partial<
  Pick<CoachSummary, "name" | "email" | "photo_url" | "bio" | "phone" | "is_active">
>;

export async function updateCoach(coachId: number, payload: CoachAdminUpdate) {
  return patch<CoachSummary>(`/admin/coaches/${coachId}`, payload);
}

export async function setCoachActive(coachId: number, isActive: boolean) {
  return updateCoach(coachId, { is_active: isActive });
}

export async function resetCoachPassword(coachId: number) {
  return post<{ temporary_password: string }>(`/admin/coaches/${coachId}/reset-password`, {});
}
