"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateStoredSession } from "@/lib/auth/session";
import { clearToken } from "@/lib/storage";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function redirect() {
      const valid = await validateStoredSession();
      if (cancelled) return;
      if (valid) {
        router.replace("/inicio");
      } else {
        clearToken();
        router.replace("/login");
      }
    }
    void redirect();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400 animate-pulse">Redirigiendo...</p>
    </main>
  );
}
