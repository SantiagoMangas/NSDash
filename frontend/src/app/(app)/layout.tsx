"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider } from "@/contexts/ToastContext";
import { clearLegacyDashboardSelectionPrefs, clearToken, getToken } from "@/lib/storage";

export default function AuthenticatedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    clearLegacyDashboardSelectionPrefs();
    setAuthChecked(true);
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  if (!authChecked) {
    return <main className="min-h-screen bg-slate-50" />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader onLogout={handleLogout} />
        <div className="flex-1">{children}</div>
      </div>
    </ToastProvider>
  );
}
