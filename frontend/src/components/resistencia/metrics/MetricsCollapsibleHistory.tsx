"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  countLabel?: string | null;
  children: ReactNode;
};

/** Encabezado colapsable para historiales dentro de «Métricas disponibles». */
export function MetricsCollapsibleHistory({
  title,
  subtitle,
  open,
  onToggle,
  countLabel,
  children,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 text-left flex items-start justify-between gap-3 hover:bg-slate-100/80 transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-700">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          {countLabel && !open ? (
            <p className="text-xs text-slate-400 mt-1">{countLabel}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-medium text-indigo-600 pt-0.5">
          {open ? "Ocultar historial" : "Mostrar historial"}
        </span>
      </button>
      {open ? children : null}
    </div>
  );
}
