"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/storage";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/atletas" : "/login");
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400 animate-pulse">Redirigiendo...</p>
    </main>
  );
}
