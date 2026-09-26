"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Exercise } from "@/lib/api/strength";
import {
  buildFuerzaHref,
  curveTitleForKey,
  formatExerciseFormula,
  type PercentageCurveKey,
} from "@/lib/strength/exerciseCatalog";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";

type Props = {
  exercises: Exercise[];
  isLoading: boolean;
  sessionAtletaId: number | null;
  onOpenFicha: (exerciseId: number) => void;
};

export function ExercisesPanel({
  exercises,
  isLoading,
  sessionAtletaId,
  onOpenFicha,
}: Props) {
  const sorted = useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [exercises],
  );

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center shadow-sm">
        <p className="text-sm text-slate-500 animate-pulse">Cargando ejercicios...</p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyStateCard
        icon={
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 4h12v4H6zM4 8h16v12H4z" />
            <path d="M9 12h6M9 16h4" />
          </svg>
        }
        title="No hay ejercicios en el catálogo"
        description="Agregá uno con el botón de arriba o reiniciá el backend si el listado no carga."
      />
    );
  }

  return (
    <ul className="space-y-1">
      {sorted.map((exercise) => (
        <li key={exercise.id}>
          <div
            className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 transition-all cursor-pointer hover:bg-slate-50"
            onClick={() => onOpenFicha(exercise.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenFicha(exercise.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex-shrink-0 flex items-center justify-center text-indigo-700 text-xs font-bold">
              RM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{exercise.name}</p>
              <p className="text-xs text-slate-500 truncate">{formatExerciseFormula(exercise)}</p>
            </div>
            <CurveChip curveKey={exercise.percentage_curve} />
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link
                href={buildFuerzaHref(exercise.id, sessionAtletaId)}
                title="Abrir en Fuerza"
                aria-label="Abrir en Fuerza"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg text-base hover:bg-indigo-50 transition"
              >
                💪
              </Link>
              <button
                type="button"
                title="Ver ficha del ejercicio"
                aria-label="Ver ficha del ejercicio"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFicha(exercise.id);
                }}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition text-sm font-medium"
              >
                Ficha
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CurveChip({ curveKey }: { curveKey: string }) {
  const title = curveTitleForKey(curveKey);
  const color = chipColor(curveKey);
  return (
    <span
      className={`hidden sm:inline-flex shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}
    >
      {title}
    </span>
  );
}

function chipColor(curveKey: string): string {
  const map: Record<PercentageCurveKey, string> = {
    sentadilla: "bg-violet-100 text-violet-800",
    peso_muerto: "bg-slate-200 text-slate-700",
    banco_plano: "bg-sky-100 text-sky-800",
  };
  if (curveKey in map) {
    return map[curveKey as PercentageCurveKey];
  }
  return "bg-slate-100 text-slate-600";
}
