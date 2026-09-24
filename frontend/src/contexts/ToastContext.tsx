"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { useToasts } from "@/hooks/useToasts";
import type { ToastType } from "@/lib/types";

type ToastContextValue = {
  pushToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, push, dismiss } = useToasts();

  return (
    <ToastContext.Provider value={{ pushToast: push }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}
