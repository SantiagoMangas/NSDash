"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import ZonesTable from "@/components/speed/ZonesTable";
import type { VelocityZone } from "@/lib/types";

const TEST_LABELS: Record<string, string> = {
  vam_2000m: "Test VAM 2000m",
  vam_5min: "Test VAM 5 min",
  test_30_15_ift: "Test 30-15 IFT",
  yoyo_ri1: "Yo-Yo RI1",
};

type VamTestHistoryItem = {
  id: number;
  athlete_id: number;
  date: string;
  test_type: string;
  vam_kmh: number;
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

const BASE_URL = "http://127.0.0.1:8000";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function formatSecondsToPace(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds - minutes * 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatPaceFromKmh(vamKmh: number) {
  if (!vamKmh || vamKmh <= 0) return '--'
  const ritmoDecimal = 60 / vamKmh
  const minutos = Math.floor(ritmoDecimal)
  const segundos = Math.round((ritmoDecimal - minutos) * 60)
  return `${minutos}:${segundos.toString().padStart(2, '0')}`
}

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

export function VamTestHistory({ athleteId, refreshKey }: { athleteId: number | null; refreshKey?: number }) {
  const [tests, setTests] = useState<VamTestHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<VamTestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (athleteId === null) {
      setTests([]);
      setError(null);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      setSelectedTest(null);
      try {
        const res = await fetch(`${BASE_URL}/athletes/${athleteId}/vam-tests`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("No se pudo cargar el historial de tests VAM.");
        }
        const data = (await res.json()) as VamTestHistoryItem[];
        setTests(data.sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        setError("No se pudo cargar el historial de tests VAM.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [athleteId, refreshKey]);

  const bestTestId = useMemo(() => {
    if (tests.length === 0) return null;
    return tests.reduce((best, test) => (test.vam_kmh > best.vam_kmh ? test : best), tests[0]).id;
  }, [tests]);

  const handleShowZones = async (testId: number) => {
    setSelectedTest(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/vam-tests/${testId}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("No se pudieron cargar las zonas del test.");
      }
      const data = (await res.json()) as VamTestDetail;
      setSelectedTest(data);
    } catch {
      setError("No se pudieron cargar las zonas del test.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">Historial de Tests VAM</h2>
        <p className="mt-1 text-sm text-slate-600">Listado de todos los tests registrados para este atleta.</p>
      </div>

      {loading ? (
        <div className="p-6">
          <LoadingCard />
        </div>
      ) : error ? (
        <div className="p-6">
          <EmptyStateCard icon={<span className="text-2xl">⚠️</span>} title="Error" description={error} />
        </div>
      ) : tests.length === 0 ? (
        <div className="p-6">
          <EmptyStateCard
            icon={<span className="text-2xl">📋</span>}
            title="Aún no hay tests registrados"
            description="Cargá el primero desde el formulario de Test VAM."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-900">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo de Test</th>
                <th className="px-4 py-3">VAM (km/h)</th>
                <th className="px-4 py-3">Ritmo /km</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => {
                const isBest = test.id === bestTestId;
                return (
                  <tr key={test.id} className={isBest ? "bg-emerald-50" : "bg-white"}>
                    <td className="px-4 py-3">{new Date(test.date).toLocaleDateString("es-AR")}</td>
                    <td className="px-4 py-3">{TEST_LABELS[test.test_type] ?? test.test_type}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{test.vam_kmh.toFixed(2)}</td>
                    <td className="px-4 py-3">{formatPaceFromKmh(test.vam_kmh)}</td>
                    <td className="px-4 py-3">
                      {test.test_type === "vam_2000m" || test.test_type === "vam_5min" ? (
                        <button
                          type="button"
                          onClick={() => handleShowZones(test.id)}
                          disabled={detailLoading}
                          className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {detailLoading ? "Cargando..." : "Ver zonas"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedTest && (
        <div className="border-t border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Zonas del test</h3>
              <p className="text-sm text-slate-600">
                {TEST_LABELS[selectedTest.test_type] ?? selectedTest.test_type} · {new Date(selectedTest.date).toLocaleDateString("es-AR")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTest(null)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar panel
            </button>
          </div>
          {selectedTest.test_type === "vam_2000m" || selectedTest.test_type === "vam_5min" ? (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <ZonesTable zones={mapZones(selectedTest.zonas)} />
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
              <p className="text-sm text-slate-600">Las zonas no están disponibles para este tipo de test.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
