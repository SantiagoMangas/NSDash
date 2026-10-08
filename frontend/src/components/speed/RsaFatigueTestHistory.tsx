"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { RsaFatiguePreviewCard, type RsaFatiguePreviewData } from "@/components/speed/RsaFatiguePreviewCard";
import {
  deleteRsaFatigueTest,
  getRsaFatigueTest,
  getRsaFatigueTests,
  type RsaFatigueTestDetail,
  type RsaFatigueTestSummary,
} from "@/lib/api/speed";
import { formatDisplayDate } from "@/lib/date";
import {
  formatRsaDistanceM,
  formatRsaPauseS,
  normalizeRsaFatigueSummary,
  rsaSummaryNeedsDetailFetch,
} from "@/lib/rsaFatigue";
import { forgetRsaFatigueTestMeta } from "@/lib/rsaFatigueMetaCache";
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

function toPreviewData(
  test: RsaFatigueTestSummary,
  tiempos?: number[],
): RsaFatiguePreviewData {
  return {
    date: test.date,
    cantidad_sprints: test.cantidad_sprints,
    tiempos,
    distancia_sprint_m: test.distancia_sprint_m,
    pausa_s: test.pausa_s,
    mejor_tiempo: test.mejor_tiempo,
    peor_tiempo: test.peor_tiempo,
    tiempo_total: test.tiempo_total,
    tiempo_ideal: test.tiempo_ideal,
    indice_fatiga_pct: test.indice_fatiga_pct,
    categoria: test.categoria,
  };
}

export function RsaFatigueTestHistory({
  athleteId,
  refreshKey,
  onDeleted,
  embeddedInMetrics = false,
}: Props) {
  const [tests, setTests] = useState<RsaFatigueTestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<number | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<RsaFatigueTestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
      setExpandedTestId(null);
      try {
        const data = await getRsaFatigueTests(athleteId);
        let normalized = data
          .map((row) => normalizeRsaFatigueSummary(row))
          .filter((row): row is RsaFatigueTestSummary => row !== null);

        const enriched: RsaFatigueTestSummary[] = [];
        for (const row of normalized) {
          if (!rsaSummaryNeedsDetailFetch(row)) {
            enriched.push(row);
            continue;
          }
          try {
            const detail = await getRsaFatigueTest(row.id);
            const merged = normalizeRsaFatigueSummary(detail);
            enriched.push(merged ?? row);
          } catch {
            enriched.push(row);
          }
        }
        normalized = enriched;

        setTests(
          [...normalized].sort((a, b) => {
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            return b.id - a.id;
          }),
        );
      } catch {
        setError("No se pudo cargar el historial de tests RSA.");
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
    const distances = [
      ...new Set(
        tests
          .map((t) => t.distancia_sprint_m)
          .filter((d): d is number => d !== null && Number.isFinite(d)),
      ),
    ].sort((a, b) => a - b);
    return distances;
  }, [tests]);

  const filteredTests = useMemo(() => {
    if (distanceFilter === "all") return tests;
    const meters = Number(distanceFilter);
    return tests.filter((t) => t.distancia_sprint_m === meters);
  }, [tests, distanceFilter]);

  const visibleTests = showAll ? filteredTests : filteredTests.slice(0, INITIAL_VISIBLE);

  const toggleCuadro = async (test: RsaFatigueTestSummary) => {
    if (expandedTestId === test.id) {
      setExpandedTestId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedTestId(test.id);
    setExpandedDetail(null);
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await getRsaFatigueTest(test.id);
      setExpandedDetail(detail);
    } catch {
      setExpandedDetail({
        ...test,
        tiempos: test.tiempos ?? [],
        notes: null,
        tiempo_medio:
          test.cantidad_sprints > 0 ? test.tiempo_total / test.cantidad_sprints : 0,
      });
    } finally {
      setDetailLoading(false);
    }
  };

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
      await deleteRsaFatigueTest(testId);
      if (athleteId !== null) forgetRsaFatigueTestMeta(athleteId, testId);
      setTests((prev) => prev.filter((test) => test.id !== testId));
      if (expandedTestId === testId) setExpandedTestId(null);
      onDeleted?.();
      setDeleteTargetId(null);
    } catch (err) {
      setError(parseApiError(err, "No se pudo eliminar el test. Intentá de nuevo."));
    } finally {
      setDeletingTestId(null);
    }
  };

  const wrapperClass = embeddedInMetrics
    ? ""
    : "rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden";

  const countLabel =
    tests.length > 0 ? `${tests.length} test${tests.length === 1 ? "" : "s"} registrado${tests.length === 1 ? "" : "s"}` : null;

  const headerBlock = embeddedInMetrics ? null : (
    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Historial de tests RSA</h2>
          <p className="mt-1 text-sm text-slate-600">Tests de índice de fatiga registrados.</p>
        </div>
        {distanceOptions.length > 0 && (
          <div className="shrink-0">
            <label htmlFor="rsa-distance-filter" className="block text-xs font-medium text-slate-500 mb-1">
              Distancia (m)
            </label>
            <select
              id="rsa-distance-filter"
              value={distanceFilter}
              onChange={(event) => setDistanceFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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

  const body = (
    <>
      {headerBlock}

      {embeddedInMetrics && (
        <div className="px-4 py-2 border-b border-slate-100 bg-white flex justify-end">
          <div>
            <label htmlFor="rsa-distance-filter-embedded" className="sr-only">Distancia</label>
            <select
              id="rsa-distance-filter-embedded"
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
        </div>
      )}

      {loading ? (
        <div className="p-6">
          <LoadingCard />
        </div>
      ) : error && tests.length === 0 ? (
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
                ? "Cargá el primero desde Evaluaciones → Test RSA."
                : "No hay tests con esa distancia."
            }
          />
        </div>
      ) : (
        <>
          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Distancia (m)</th>
                  <th className="px-4 py-3">Pausa (s)</th>
                  <th className="px-4 py-3">Sprints</th>
                  <th className="px-4 py-3">Índice de fatiga</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleTests.map((test) => (
                  <Fragment key={test.id}>
                    <tr className="bg-white border-t border-slate-100">
                      <td className="px-4 py-3">{formatDisplayDate(test.date)}</td>
                      <td className="px-4 py-3">{formatRsaDistanceM(test.distancia_sprint_m)}</td>
                      <td className="px-4 py-3">{formatRsaPauseS(test.pausa_s)}</td>
                      <td className="px-4 py-3">{test.cantidad_sprints}</td>
                      <td className="px-4 py-3 font-semibold">{test.indice_fatiga_pct.toFixed(2)}%</td>
                      <td className="px-4 py-3">{test.categoria}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleCuadro(test)}
                            disabled={detailLoading && expandedTestId === test.id}
                            className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {expandedTestId === test.id
                              ? detailLoading
                                ? "Cargando..."
                                : "Ocultar cuadro"
                              : "Ver cuadro"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(test.id)}
                            disabled={deletingTestId === test.id}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingTestId === test.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTestId === test.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-slate-50">
                          {detailLoading && !expandedDetail ? (
                            <LoadingCard />
                          ) : expandedDetail ? (
                            <RsaFatiguePreviewCard
                              test={toPreviewData(expandedDetail, expandedDetail.tiempos)}
                            />
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTests.length > INITIAL_VISIBLE && (
            <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
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

  const deleteDialog = (
    <ConfirmDialog
      open={deleteTargetId !== null}
      title="Eliminar test RSA"
      description="Se borrará este test de índice de fatiga y sus tiempos de sprint. Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar"
      isLoading={deletingTestId !== null}
      onCancel={() => {
        if (deletingTestId === null) setDeleteTargetId(null);
      }}
      onConfirm={() => void handleDeleteConfirm()}
    />
  );

  if (embeddedInMetrics) {
    return (
      <>
      {deleteDialog}
      <MetricsCollapsibleHistory
        title="Historial de tests RSA"
        subtitle="Índice de fatiga · filtrá por distancia del sprint"
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
