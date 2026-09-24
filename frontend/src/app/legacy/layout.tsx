"use client";

import { ToastProvider } from "@/contexts/ToastContext";

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
