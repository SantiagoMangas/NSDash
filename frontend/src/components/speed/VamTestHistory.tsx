"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import ZonesTable from "@/components/speed/ZonesTable";
import { getVamTest, getVamTests, deleteVamTest } from "@/lib/api/vam";
import { formatDisplayDate } from "@/lib/date";
import { formatPaceWithUnit } from "@/lib/units";
import { formatSecondsToPace, parseApiError } from "@/lib/utils";
import type { VelocityZone } from "@/lib/types";
import { MetricsCollapsibleHistory } from "@/components/resistencia/metrics/MetricsCollapsibleHistory";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const TEST_LABELS: Record<string, string> = {
  vam_2000m: "Test VAM 2000m",
  vam_5min: "Test VAM 5 min",
  test_30_15_ift: "Test 30-15 IFT",
  yoyo_ri1: "Yo-Yo RI1",
};

const INITIAL_VISIBLE = 3;

type VamTestHistoryItem = {
  id: number;
  athlete_id: number;
  date: string;
  test_type: string;
  vam_kmh: number;
  ritmo_str: string;
};

type VamZoneDetail = {
  zona: string;
  intensidad: string;
  pct_min: number;
  pct_max: number;
  velocidad_ms: number;
  velocidad_kmh: number;
  vel_min_kmh: number;
  vel_max_kmh: number;
  ritmo_min_seg: number;
  ritmo_max_seg: number;
};

type VamTestDetail = VamTestHistoryItem & {
  notas?: string | null;
  zonas: VamZoneDetail[];
};

function mapZones(zones: VamZoneDetail[]): VelocityZone[] {
  return zones.map((zone) => ({
    zona: zone.zona,
    intensidad: zone.intensidad,
    pct_min: zone.pct_min,
    pct_max: zone.pct_max,
    velocidad_ms: zone.velocidad_ms,
    velocidad_kmh: zone.velocidad_kmh,
    vel_min_kmh: zone.vel_min_kmh,
    vel_max_kmh: zone.vel_max_kmh,
    ritmo_min: formatSecondsToPace(zone.ritmo_min_seg),
    ritmo_max: formatSecondsToPace(zone.ritmo_max_seg),
  }));
}

function isBandTest(testType: string) {
  return testType === "vam_2000m" || testType === "vam_5min";
}

type Props = {
  athleteId: number | null;
  refreshKey?: number;
  onDeleted?: () => void;
  /** Dentro de “Métricas disponibles”: sin card exterior, zonas de todos los tests de banda. */
  embeddedInMetrics?: boolean;
};

export function VamTestHistory({
  athleteId,
  refreshKey,
  onDeleted,
  embeddedInMetrics = false,
}: Props) {
  const [tests, setTests] = useState<VamTestHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<VamTestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingZonesTestId, setLoadingZonesTestId] = useState<number | null>(null);
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);
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
      setSelectedTest(null);
      setShowAll(false);
      try {
        const data = (await getVamTests(athleteId)) as VamTestHistoryItem[];
        setTests(data.sort((a, b) => b.date.localeCompare(a.date)));
      } catch {
        setError("No se pudo cargar el historial de tests VAM.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [athleteId, refreshKey, shouldLoad]);

  const bestTestId = useMemo(() => {
    if (tests.length === 0) return null;
    return tests.reduce((best, test) => (test.vam_kmh > best.vam_kmh ? test : best), tests[0]).id;
  }, [tests]);

  const visibleTests = showAll ? tests : tests.slice(0, INITIAL_VISIBLE);

  const handleShowZones = async (testId: number) => {
    if (selectedTest?.id === testId) {
      setSelectedTest(null);
      return;
    }
    setSelectedTest(null);
    setDetailLoading(true);
    setLoadingZonesTestId(testId);
    try {
      const data = (await getVamTest(testId)) as VamTestDetail;
      setSelectedTest(data);
    } catch {
      setError("No se pudieron cargar las zonas del test.");
    } finally {
      setDetailLoading(false);
      setLoadingZonesTestId(null);
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
      await deleteVamTest(testId);
      setTests((prev) => prev.filter((test) => test.id !== testId));
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
      }
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
      title="Eliminar test VAM"
      description="Se borrará este test y sus datos asociados. Esta acción no se puede deshacer."
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
      <h2 className="text-lg font-semibold text-slate-900">Historial de Tests VAM</h2>
      <p className="mt-1 text-sm text-slate-600">Listado de todos los tests registrados para este atleta.</p>
    </div>
  );

  const body = (
    <>
      {headerBlock}

      {loading ? (
        <div className="p-6">
          <LoadingCard />
        </div>
      ) : error && tests.length === 0 ? (
        <div className="p-6">
          <EmptyStateCard icon={<span className="text-2xl">⚠️</span>} title="Error" description={error} />
        </div>
      ) : tests.length === 0 ? (
        <div className="p-6">
          <EmptyStateCard
            icon={<span className="text-2xl">📋</span>}
            title="Aún no hay tests registrados"
            description="Cargá el primero desde Evaluaciones."
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
                  <th className="px-4 py-3">Tipo de test</th>
                  <th className="px-4 py-3">VAM (km/h)</th>
                  <th className="px-4 py-3">Ritmo (m/km)</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleTests.map((test) => {
                  const isBest = test.id === bestTestId;
                  const zonesOpen = selectedTest?.id === test.id;
                  return (
                    <Fragment key={test.id}>
                      <tr className={isBest ? "bg-emerald-50" : "bg-white"}>
                        <td className="px-4 py-3">{formatDisplayDate(test.date)}</td>
                        <td className="px-4 py-3">{TEST_LABELS[test.test_type] ?? test.test_type}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{test.vam_kmh.toFixed(2)}</td>
                        <td className="px-4 py-3">{formatPaceWithUnit(test.ritmo_str)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {isBandTest(test.test_type) ? (
                              <button
                                type="button"
                                onClick={() => handleShowZones(test.id)}
                                disabled={detailLoading && !zonesOpen}
                                className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {detailLoading && !zonesOpen
                                  ? "Cargando..."
                                  : zonesOpen
                                    ? "Ocultar zonas"
                                    : "Ver zonas"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(test.id)}
                              disabled={deletingTestId === test.id}
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingTestId === test.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {zonesOpen && selectedTest && (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 bg-slate-50">
                            <div className="mb-3">
                              <h3 className="text-sm font-semibold text-slate-900">Zonas del test</h3>
                              <p className="text-xs text-slate-600">
                                {TEST_LABELS[selectedTest.test_type] ?? selectedTest.test_type} ·{" "}
                                {formatDisplayDate(selectedTest.date)}
                              </p>
                            </div>
                            {isBandTest(selectedTest.test_type) ? (
                              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                <ZonesTable zones={mapZones(selectedTest.zonas)} compact />
                              </div>
                            ) : (
                              <p className="text-sm text-slate-600">
                                Las zonas no están disponibles para este tipo de test.
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                      {detailLoading && loadingZonesTestId === test.id && !zonesOpen && (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 bg-slate-50 text-xs text-slate-500">
                            Cargando zonas…
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {tests.length > INITIAL_VISIBLE && (
            <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                {showAll ? "Ver menos" : `Ver más (${tests.length - INITIAL_VISIBLE} restantes)`}
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
        title="Historial de tests VAM"
        subtitle={'Usá "Ver zonas" en tests de VAM 5\' o 2000 m.'}
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
