"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { getExercise, type Exercise } from "@/lib/api/strength";
import {
  buildFuerzaHref,
  curveTitleForExercise,
  formatExerciseFormula,
} from "@/lib/strength/exerciseCatalog";
import { readSessionAtletaId } from "@/lib/storage";

export default function ExerciseFichaPage() {
  const params = useParams();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const exerciseId = raw ? Number.parseInt(raw, 10) : NaN;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionAtletaId, setSessionAtletaId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(exerciseId)) return;
    setLoading(true);
    try {
      setExercise(await getExercise(exerciseId));
    } catch {
      setExercise(null);
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    setSessionAtletaId(readSessionAtletaId());
    void load();
  }, [load]);

  if (!Number.isFinite(exerciseId)) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-red-600">Ejercicio no válido</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <LoadingCard message="Cargando ficha..." />
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-2">
        <p className="text-sm text-red-600">Ejercicio no encontrado</p>
        <Link href="/ejercicios" className="text-sm text-indigo-600 inline-block">
          ← Volver a ejercicios
        </Link>
      </main>
    );
  }

  const curveTitle = curveTitleForExercise(exercise);
  const formulaLabel = formatExerciseFormula(exercise);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link href="/ejercicios" className="text-sm text-slate-600 hover:text-indigo-600">
        ← Volver a ejercicios
      </Link>

      <div className="flex flex-wrap gap-2">
        <Link
          href={buildFuerzaHref(exercise.id, sessionAtletaId)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700"
        >
          💪 Ir a Fuerza
        </Link>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800">{exercise.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Ficha de ejercicio · ID {exercise.id}</p>
        </div>
        <dl className="divide-y divide-slate-100">
          <div className="px-5 py-4 grid gap-1 sm:grid-cols-3">
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Fórmula de RM
            </dt>
            <dd className="text-sm text-slate-800 sm:col-span-2">{formulaLabel}</dd>
          </div>
          <div className="px-5 py-4 grid gap-1 sm:grid-cols-3">
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Curva de %RM
            </dt>
            <dd className="text-sm text-slate-800 sm:col-span-2">{curveTitle}</dd>
          </div>
        </dl>
      </section>

      <p className="text-xs text-slate-400">
        Los 21 ejercicios del catálogo original no se editan desde la app. Cuando exista edición
        vía API, solo aplicará a ejercicios creados con &quot;Agregar ejercicio&quot; (POST), no al
        seed.
      </p>
    </main>
  );
}
