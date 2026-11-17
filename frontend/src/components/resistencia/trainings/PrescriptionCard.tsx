"use client";

import type { KeyboardEvent, ReactNode } from "react";

export function PrescriptionCard({
  cardId,
  title,
  summary,
  badge,
  expanded,
  stretchInGrid = true,
  onCardActivate,
  children,
}: {
  cardId: string;
  title: string;
  summary?: string;
  badge?: { text: string; className: string };
  expanded: boolean;
  /** En desktop: igualar alturas en la grilla. En móvil: altura según contenido. */
  stretchInGrid?: boolean;
  onCardActivate: () => void;
  children: ReactNode;
}) {
  const detailId = `prescription-detail-${cardId}`;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardActivate();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={detailId}
      onClick={onCardActivate}
      onKeyDown={handleKeyDown}
      className={`flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm outline-none transition hover:border-slate-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
        stretchInGrid ? "h-full min-h-[8.5rem]" : ""
      }`}
    >
      {/* Altura fija del encabezado: título + badge y subtítulo alineados entre las 4 tarjetas */}
      <div className="flex h-[5.75rem] shrink-0 flex-col px-5 pt-4 pb-3">
        <div className="flex h-9 items-center justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{title}</h3>
          {badge ? (
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${badge.className}`}
            >
              {badge.text}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 line-clamp-2 h-10 text-xs leading-5 text-slate-500">
          {summary ?? "\u00a0"}
        </p>
      </div>
      {expanded ? (
        <div
          id={detailId}
          className={`flex flex-col border-t border-slate-100 px-5 pb-5 pt-3.5 ${
            stretchInGrid ? "min-h-[7.25rem] flex-1" : ""
          }`}
        >
          {children}
        </div>
      ) : stretchInGrid ? (
        <div className="min-h-0 flex-1" aria-hidden />
      ) : null}
    </div>
  );
}