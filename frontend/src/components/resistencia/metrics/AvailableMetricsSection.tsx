"use client";

import { useMemo } from "react";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { formatTestTypeLabel, getBestTestMetricLabel, getLatestTestMetricLabel } from "@/lib/resistencia/constants";
import type { VelocityDashboard, VamProgress } from "@/lib/types";
import { VamProgressChart } from "./VamProgressChart";

type Props = {
  dashboard: VelocityDashboard | null;
  progress: VamProgress | null;
  loading: boolean;
  error: string | null;
};

function computeProgressStatus(history: VamProgress["history"]) {
  if (history.length < 2) {
    return { label: "Datos insuficientes", detail: "Se necesitan al menos 2 tests para estimar tendencia.", tone: "slate" as const };
  }

  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0].vam_kmh;
  const last = sorted[sorted.length - 1].vam_kmh;
  const delta = ((last - first) / first) * 100;

  if (delta >= 2) {
    return {
      label: "Progresión positiva",
      detail: `+${delta.toFixed(1)}% desde el primer registro`,
      tone: "emerald" as const,
    };
  }
  if (delta <= -2) {
    return {
      label: "Descenso",
      detail: `${delta.toFixed(1)}% desde el primer registro`,
      tone: "orange" as const,
    };
  }
  return {
    label: "Estable",
    detail: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% desde el primer registro`,
    tone: "blue" as const,
  };
}

const TONE_CLASSES = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  orange: "bg-orange-50 border-orange-200 text-orange-800",
  blue: "bg-blue-50 border-blue-200 text-blue-800",
  slate: "bg-slate-50 border-slate-200 text-slate-600",
};

export function AvailableMetricsSection({ dashboard, progress, loading, error }: Props) {
  const latestTest = useMemo(() => {
    if (!dashboard?.all_tests_summary?.length) return null;
    return [...dashboard.all_tests_summary].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
  }, [dashboard]);

  const latestMetricTestType = latestTest?.test_type ?? dashboard?.best_test.test_type ?? "";

  const progressStatus = useMemo(
    () => computeProgressStatus(progress?.history ?? []),
    [progress],
  );

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-1">Métricas disponibles</h2>
      <p className="text-xs text-slate-400 mb-4">
        Resumen calculado a partir de las evaluaciones registradas del atleta.
      </p>

      {loading ? (
        <LoadingCard />
      ) : !dashboard ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">
            {error ?? "No hay métricas disponibles todavía. Registrá una evaluación para comenzar."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {getBestTestMetricLabel(dashboard.best_test.test_type)}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {dashboard.best_test.vam_kmh.toFixed(2)} <span className="text-sm font-normal">km/h</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatTestTypeLabel(dashboard.best_test.test_type)} · {dashboard.best_test.date}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {getLatestTestMetricLabel(latestMetricTestType)}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {(latestTest?.vam_kmh ?? dashboard.best_test.vam_kmh).toFixed(2)}{" "}
                <span className="text-sm font-normal">km/h</span>
              </p>
              {latestTest && (
                <p className="mt-1 text-xs text-slate-500">
                  {formatTestTypeLabel(latestTest.test_type)} · {latestTest.date}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Zonas de entrenamiento</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {dashboard.zones_source.available ? "Disponibles" : "No disponibles"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {dashboard.zones_source.available
                  ? `${dashboard.training_zones.length} zonas · ${formatTestTypeLabel(dashboard.zones_source.test_type ?? "")}`
                  : "Requiere VAM 2000 m o VAM 5 minutos"}
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${TONE_CLASSES[progressStatus.tone]}`}>
              <p className="text-xs uppercase tracking-wide opacity-80">Estado de progreso</p>
              <p className="mt-1 text-lg font-semibold">{progressStatus.label}</p>
              <p className="mt-1 text-xs opacity-80">{progressStatus.detail}</p>
            </div>
          </div>

          {dashboard.zones_source.available && dashboard.training_zones.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-medium text-slate-700">Capacidades por zona</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2">Zona</th>
                      <th className="px-3 py-2">Intensidad</th>
                      <th className="px-3 py-2">vel. (km/h)</th>
                      <th className="px-3 py-2">Ritmo (min/km)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.training_zones.map((zone) => (
                      <tr key={zone.zona} className="odd:bg-white even:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{zone.zona}</td>
                        <td className="px-3 py-2">{zone.intensidad}</td>
                        <td className="px-3 py-2">
                          {zone.vel_min_kmh.toFixed(1)} – {zone.vel_max_kmh.toFixed(1)}
                        </td>
                        <td className="px-3 py-2">
                          {zone.ritmo_min} – {zone.ritmo_max}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <VamProgressChart history={progress?.history ?? []} />
        </div>
      )}
    </section>
  );
}
