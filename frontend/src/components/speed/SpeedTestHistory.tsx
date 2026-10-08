"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { deleteSpeedTest, getSpeedTests, type SpeedTestSummary } from "@/lib/api/speed";
import { formatDisplayDate } from "@/lib/date";
import { formatPaceWithUnit } from "@/lib/units";
import { MetricsCollapsibleHistory } from "@/components/resistencia/metrics/MetricsCollapsibleHistory";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { parseApiError } from "@/lib/utils";

const INITIAL_VISIBLE = 3;

type Props = {
  athleteId: number | null;
  refreshKey?: number;
  onDeleted?: () => void;
  embeddedInMetrics?: boolean;
};

export function SpeedTestHistory({
  athleteId,
  refreshKey,
  onDeleted,
  embeddedInMetrics = false,
}: Props) {
  const [tests, setTests] = useState<SpeedTestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const shouldLoad = !embeddedInMetrics || sectionOpen;

  useEffect(() => {
    if (athleteId === null) {
      setTests([]);
      setError(null);
      return;
    }
    if (!shouldLoad) {
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSpeedTests(athleteId);
        setTests(
          [...data].sort((a, b) => {
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            return b.id - a.id;
          }),
        );
      } catch {
        setError("No se pudo cargar el historial de tests de velocidad.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [athleteId, refreshKey, shouldLoad]);

  useEffect(() => {
    setShowAll(false);
  }, [distanceFilter, athleteId, refreshKey]);

  const distanceOptions = useMemo(() => {
    const distances = [...new Set(tests.map((t) => t.distancia_m))].sort((a, b) => a - b);
    return distances;
  }, [tests]);

  const filteredTests = useMemo(() => {
    if (distanceFilter === "all") return tests;
    const meters = Number(distanceFilter);
    return tests.filter((t) => t.distancia_m === meters);
  }, [tests, distanceFilter]);

  const fastestTestId = useMemo(() => {
    if (filteredTests.length === 0) return null;
    return filteredTests.reduce((best, test) => (test.mss_kmh > best.mss_kmh ? test : best), filteredTests[0])
      .id;
  }, [filteredTests]);

  const visibleTests = showAll ? filteredTests : filteredTests.slice(0, INITIAL_VISIBLE);

  const handleDeleteClick = (testId: number) => {
    if (deletingTestId !== null) return;
    setDeleteTargetId(testId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null || deletingTestId !== null) return;
    const testId = deleteTargetId;

    setDeletingTestId(testId);
    setError(null);
    try {
      await deleteSpeedTest(testId);
      setTests((prev) => prev.filter((test) => test.id !== testId));
      onDeleted?.();
      setDeleteTargetId(null);
    } catch (err) {
      setError(parseApiError(err, "No se pudo eliminar el test. Intentá de nuevo."));
    } finally {
      setDeletingTestId(null);
    }
  };

  const deleteDialog = (
    <ConfirmDialog
      open={deleteTargetId !== null}
      title="Eliminar test de velocidad"
      description="Se borrará este test de sprint. Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar"
      isLoading={deletingTestId !== null}
      onCancel={() => {
        if (deletingTestId === null) setDeleteTargetId(null);
      }}
      onConfirm={() => void handleDeleteConfirm()}
    />
  );

  const wrapperClass = embeddedInMetrics
    ? ""
    : "rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden";

  const countLabel =
    tests.length > 0 ? `${tests.length} test${tests.length === 1 ? "" : "s"} registrado${tests.length === 1 ? "" : "s"}` : null;

  const headerBlock = embeddedInMetrics ? null : (
    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Historial de tests de velocidad</h2>
          <p className="mt-1 text-sm text-slate-600">
            Compará por distancia. La fila resaltada es el más rápido del filtro actual.
          </p>
        </div>
        {distanceOptions.length > 0 && (
          <div className="shrink-0">
            <label htmlFor="speed-distance-filter" className="block text-xs font-medium text-slate-500 mb-1">
              Distancia (m)
            </label>
            <select
              id="speed-distance-filter"
              value={distanceFilter}
              onChange={(event) => setDistanceFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">Todas</option>
              {distanceOptions.map((d) => (
                <option key={d} value={String(d)}>{d} m</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const embeddedFilter =
    embeddedInMetrics ? (
      <div className="px-4 py-2 border-b border-slate-100 bg-white flex justify-end">
        <select
          id="speed-distance-filter-embedded"
          value={distanceFilter}
          onChange={(event) => setDistanceFilter(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
          disabled={distanceOptions.length === 0}
        >
          <option value="all">
            {distanceOptions.length === 0 ? "Sin distancias en el historial" : "Todas las distancias"}
          </option>
          {distanceOptions.map((d) => (
            <option key={d} value={String(d)}>{d} m</option>
          ))}
        </select>
      </div>
    ) : null;

  const body = (
    <>
      {headerBlock}
      {embeddedFilter}

      {loading ? (
        <div className="p-6">
          <LoadingCard />
        </div>
      ) : error ? (
        <div className="p-6">
          <EmptyStateCard icon={<span className="text-2xl">⚠️</span>} title="Error" description={error} />
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="p-6">
          <EmptyStateCard
            icon={<span className="text-2xl">📋</span>}
            title="Aún no hay tests registrados"
            description={
              distanceFilter === "all"
                ? "Cargá el primero desde Evaluaciones → Test de velocidad."
                : "No hay tests con esa distancia. Probá otra o registrá uno nuevo."
            }
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Distancia (m)</th>
                  <th className="px-4 py-3">Tiempo (s)</th>
                  <th className="px-4 py-3">Promedio (km/h)</th>
                  <th className="px-4 py-3">Pico (km/h)</th>
                  <th className="px-4 py-3">Ritmo (m/km)</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleTests.map((test) => {
                  const isFastest = test.id === fastestTestId;
                  return (
                    <tr key={test.id} className={isFastest ? "bg-emerald-50" : "bg-white"}>
                      <td className="px-4 py-3">{formatDisplayDate(test.date)}</td>
                      <td className="px-4 py-3">{test.distancia_m}</td>
                      <td className="px-4 py-3">{test.tiempo_s}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{test.vel_kmh.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {test.velocidad_pico_kmh ? test.velocidad_pico_kmh.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3">{formatPaceWithUnit(test.ritmo_str)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(test.id)}
                          disabled={deletingTestId === test.id}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingTestId === test.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTests.length > INITIAL_VISIBLE && (
            <div className="border-t border-slate-200 px-6 py-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                {showAll
                  ? "Ver menos"
                  : `Ver más (${filteredTests.length - INITIAL_VISIBLE} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );

  if (embeddedInMetrics) {
    return (
      <>
      {deleteDialog}
      <MetricsCollapsibleHistory
        title="Historial de tests de velocidad"
        subtitle="Fila resaltada = más rápido del filtro."
        open={sectionOpen}
        onToggle={() => setSectionOpen((prev) => !prev)}
        countLabel={countLabel}
      >
        {body}
      </MetricsCollapsibleHistory>
      </>
    );
  }

  return (
    <>
      {deleteDialog}
      <div className={wrapperClass}>{body}</div>
    </>
  );
}
