"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/** Redirige a /perfil si el usuario debe cambiar la contraseña temporal. */
export function PasswordChangeGate({ children }: { children: React.ReactNode }) {
  const { me, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !me?.must_change_password) return;
    if (pathname !== "/perfil") {
      router.replace("/perfil?obligatorio=1");
    }
  }, [isLoading, me, pathname, router]);

  if (!isLoading && me?.must_change_password && pathname !== "/perfil") {
    return <main className="min-h-screen bg-slate-50" />;
  }

  return <>{children}</>;
}
