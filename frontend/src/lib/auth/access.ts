import type { UserMe } from "@/lib/api/users";

export function isPlatformAdmin(me: UserMe | null | undefined): boolean {
  return me?.role === "admin";
}
