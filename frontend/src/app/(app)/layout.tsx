"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordChangeGate } from "@/components/auth/PasswordChangeGate";
import { AppHeader } from "@/components/layout/AppHeader";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { validateStoredSession } from "@/lib/auth/session";
import { setUnauthorizedListener } from "@/lib/auth/unauthorized";
import { clearLegacyDashboardSelectionPrefs, clearToken, getToken } from "@/lib/storage";

const LOGIN_SESSION_INVALID = "/login?sesion=invalida";

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { clearMe, refreshMe } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setUnauthorizedListener(() => {
      setAuthChecked(false);
      clearMe();
      router.replace(LOGIN_SESSION_INVALID);
    });
    return () => setUnauthorizedListener(null);
  }, [router, clearMe]);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      if (!getToken()) {
        router.replace("/login");
        return;
      }
      const valid = await validateStoredSession();
      if (cancelled) return;
      if (!valid) {
        clearToken();
        clearMe();
        router.replace(LOGIN_SESSION_INVALID);
        return;
      }
      clearLegacyDashboardSelectionPrefs();
      try {
        await refreshMe();
      } catch {
        if (cancelled) return;
        clearToken();
        clearMe();
        router.replace(LOGIN_SESSION_INVALID);
        return;
      }
      if (cancelled) return;
      setAuthChecked(true);
    }

    void ensureSession();
    return () => {
      cancelled = true;
    };
  }, [router, refreshMe, clearMe]);

  const handleLogout = () => {
    clearToken();
    clearMe();
    setAuthChecked(false);
    router.replace("/login");
  };

  if (!authChecked) {
    return <main className="min-h-screen bg-slate-50" />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader onLogout={handleLogout} />
        <PasswordChangeGate>
          <div className="flex-1">{children}</div>
        </PasswordChangeGate>
      </div>
    </ToastProvider>
  );
}

export default function AuthenticatedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </AuthProvider>
  );
}
