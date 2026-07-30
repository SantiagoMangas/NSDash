"use client";

import { useEffect, useState } from "react";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { VamTestHistory } from "@/components/speed/VamTestHistory";
import { TrainingTablesSection } from "@/components/speed/TrainingTablesSection";
import SprintReferenceTable from "@/components/speed/SprintReferenceTable";
import UnitConverter from "@/components/speed/UnitConverter";
import ZonesTable from "@/components/speed/ZonesTable";
import type { Athlete, VelocityDashboard } from "@/lib/types";
import { formatTestTypeLabel, getBestTestMetricLabel } from "@/lib/resistencia/constants";
import { getAthletes } from "@/lib/api/athletes";
import { getVelocityDashboard } from "@/lib/api/speed";
import { BASE_URL } from "@/lib/api/client";

const TEST_LABELS: Record<string, string> = {
  vam_2000m: "Test VAM 2000m",
  vam_5min: "Test VAM 5 min",
  test_30_15_ift: "Test 30-15 IFT",
  yoyo_ri1: "Yo-Yo RI1",
};

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export default function VelocityPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<VelocityDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAthletesData() {
      try {
        const data = await getAthletes();
        if (Array.isArray(data)) {
          const parsed = data.filter(
            (item): item is Athlete => item && typeof item === "object" && typeof item.id === "number" && typeof item.name === "string",
          );
          setAthletes(parsed);
          setSelectedAthleteId(parsed[0]?.id ?? null);
        }
      } catch {
        setAthletes([]);
      }
    }
    loadAthletesData();
  }, []);

  useEffect(() => {
    if (selectedAthleteId === null) {
      setDashboard(null);
      return;
    }

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      if (selectedAthleteId === null) {
        setLoading(false);
        return;
      }
      try {
        const data = await getVelocityDashboard(selectedAthleteId);
        if (!data) {
          setDashboard(null);
          setError("Este atleta aún no tiene tests de velocidad registrados.");
          setLoading(false);
          return;
        }
        setDashboard(data as VelocityDashboard);
      } catch {
        setError("No se pudo conectar con el servidor.");
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [selectedAthleteId]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Velocity Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                Vista exclusiva para el preparador físico con zonas, intervalos y tiempos de sprint.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm font-medium text-slate-700">Atleta</label>
              <select
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900"
                value={selectedAthleteId ?? ""}
                onChange={(event) => setSelectedAthleteId(Number(event.target.value))}
              >
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {dashboard ? (
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                        {getBestTestMetricLabel(dashboard.best_test.test_type)}
                      </p>
                      <h2 className="text-3xl font-semibold text-slate-900">{dashboard.best_test.vam_kmh.toFixed(2)} km/h</h2>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
                      {formatTestTypeLabel(dashboard.best_test.test_type)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-slate-700">
                    Fecha: {dashboard.best_test.date} · Ritmo: {dashboard.best_test.vam_mpm_formatted} /km · Velocidad {dashboard.best_test.vam_ms.toFixed(2)} m/s
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">Tests registrados</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {dashboard.all_tests_summary.map((item) => (
                      <span
                        key={`${item.test_type}-${item.date}`}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700"
                      >
                        {TEST_LABELS[item.test_type] ?? item.test_type} · {item.date}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <UnitConverter
                  key={dashboard.best_test.vam_kmh}
                  unitConversions={dashboard.unit_conversions}
                />
              </div>
            </div>
          ) : null}
        </section>

        {dashboard ? <VamTestHistory athleteId={selectedAthleteId} /> : null}

        {loading ? (
          <LoadingCard />
        ) : error ? (
          <EmptyStateCard
            icon={<span className="text-2xl">⚠️</span>}
            title="Sin datos de velocidad"
            description={error}
          />
        ) : dashboard ? (
          <div className="grid gap-6">
            {dashboard.zones_source.available ? (
              <ZonesTable zones={dashboard.training_zones} />
            ) : (
              <EmptyStateCard
                icon={<span className="text-2xl">ℹ️</span>}
                title="Zonas de entrenamiento no disponibles"
                description="Las zonas de entrenamiento se calculan a partir del Test VAM 2000m o el Test VAM 5 minutos. Registrá uno de estos tests para ver las zonas."
              />
            )}
            <TrainingTablesSection intervalTables={dashboard.interval_tables} />
            <SprintReferenceTable sprintReference={dashboard.sprint_reference} />
          </div>
        ) : (
          <EmptyStateCard
            icon={<span className="text-2xl">👟</span>}
            title="Seleccioná un atleta"
            description="Seleccioná un atleta para ver el dashboard de velocidad."
          />
        )}
      </div>
    </main>
  );
}
