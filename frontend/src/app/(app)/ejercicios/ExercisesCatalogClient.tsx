"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddExerciseForm } from "@/components/exercises/AddExerciseForm";
import { ExercisesPanel } from "@/components/exercises/ExercisesPanel";
import { useToast } from "@/contexts/ToastContext";
import { getExercises, type Exercise } from "@/lib/api/strength";
import {
  CURVE_SECTIONS,
  isPercentageCurveKey,
  type PercentageCurveKey,
} from "@/lib/strength/exerciseCatalog";
import { filterExercisesByName } from "@/lib/strength/exerciseSearch";
import { readSessionAtletaId } from "@/lib/storage";

function parseCurveFromSearch(raw: string | null): PercentageCurveKey | null {
  if (!raw) return null;
  return isPercentageCurveKey(raw) ? raw : null;
}

export function ExercisesCatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const curveFromUrl = parseCurveFromSearch(searchParams.get("curva"));
  const [selectedCurve, setSelectedCurve] = useState<PercentageCurveKey | null>(curveFromUrl);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionAtletaId, setSessionAtletaId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogMetaIncomplete, setCatalogMetaIncomplete] = useState(false);

  useEffect(() => {
    setSelectedCurve(curveFromUrl);
  }, [curveFromUrl]);

  const loadExercises = useCallback(() => {
    setLoading(true);
    return getExercises()
      .then(({ exercises, catalogMetaComplete }) => {
        setExercises(exercises);
        setCatalogMetaIncomplete(!catalogMetaComplete);
      })
      .catch(() => {
        setExercises([]);
        setCatalogMetaIncomplete(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSessionAtletaId(readSessionAtletaId());
    void loadExercises();
  }, [loadExercises]);

  const setCurveFilter = (curve: PercentageCurveKey | null) => {
    setSelectedCurve(curve);
    const params = new URLSearchParams(searchParams.toString());
    if (curve === null) {
      params.delete("curva");
    } else {
      params.set("curva", curve);
    }
    const query = params.toString();
    router.replace(query ? `/ejercicios?${query}` : "/ejercicios");
  };

  const filteredExercises = useMemo(() => {
    let list = filterExercisesByName(exercises, searchQuery);
    if (selectedCurve !== null) {
      list = list.filter((exercise) => {
        const key = isPercentageCurveKey(exercise.percentage_curve)
          ? exercise.percentage_curve
          : "sentadilla";
        return key === selectedCurve;
      });
    }
    return list;
  }, [exercises, searchQuery, selectedCurve]);

  const handleCreated = (exercise: Exercise) => {
    setExercises((prev) => {
      if (prev.some((item) => item.id === exercise.id)) return prev;
      return [...prev, exercise];
    });
    router.push(`/ejercicios/${exercise.id}`);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Ejercicios</h1>
        <p className="text-sm text-slate-500 mt-1">
          Catálogo de fuerza. Entrá a la ficha de cada ejercicio o abrí Fuerza con 💪.
        </p>
        {sessionAtletaId !== null && (
          <p className="text-xs text-indigo-600 mt-2">
            Atleta de sesión activo — Fuerza incluye{" "}
            <code className="text-indigo-800">atleta={sessionAtletaId}</code>.
          </p>
        )}
      </header>

      {catalogMetaIncomplete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El servidor no está enviando fórmula ni coeficiente por ejercicio (respuesta vieja: solo
          nombre). Reiniciá el backend de NSDash: si no, todos se muestran como Epley con coef.{" "}
          <strong>0,033</strong> y curva <strong>sentadilla</strong> por defecto.
        </div>
      )}

      <AddExerciseForm
        onCreated={handleCreated}
        onToast={(type, message) => pushToast(type, message)}
      />

      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
        <div>
          <label htmlFor="exercise-search" className="block text-xs text-slate-500 mb-1.5">
            Buscar ejercicio
          </label>
          <input
            id="exercise-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nombre (ej. sentadilla, oly, press…)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="curve-filter" className="block text-xs text-slate-500 mb-1.5">
            Curva de %RM
          </label>
          <select
            id="curve-filter"
            value={selectedCurve ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              setCurveFilter(raw ? (raw as PercentageCurveKey) : null);
            }}
            className="w-full sm:max-w-md border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las curvas</option>
            {CURVE_SECTIONS.map((section) => (
              <option key={section.key} value={section.key}>{section.title}</option>
            ))}
          </select>
        </div>
      </section>

      {filteredExercises.length === 0 && !loading && exercises.length > 0 ? (
        <p className="text-sm text-slate-500">Ningún ejercicio coincide con la búsqueda o el filtro.</p>
      ) : null}

      <ExercisesPanel
        exercises={filteredExercises}
        isLoading={loading}
        sessionAtletaId={sessionAtletaId}
        onOpenFicha={(id) => router.push(`/ejercicios/${id}`)}
      />
    </main>
  );
}
