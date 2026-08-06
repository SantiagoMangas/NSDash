"use client";

import { TrainingTablesSection } from "@/components/speed/TrainingTablesSection";
import { LoadingCard } from "@/components/ui/LoadingCard";
import type { VelocityDashboard } from "@/lib/types";
import { RecommendedTrainingCards } from "./RecommendedTrainingCards";
import { SpeedTestReferenceSelector } from "./SpeedTestReferenceSelector";

type Props = {
  athleteId: number;
  dashboard: VelocityDashboard | null;
  loading: boolean;
  refreshKey?: number;
  onDashboardRefresh: () => Promise<void>;
};

export function TrainingsSection({
  athleteId,
  dashboard,
  loading,
  refreshKey = 0,
  onDashboardRefresh,
}: Props) {
  // HIIT / HIIT Continuos: VAM → 30-15 → Yo-Yo
  const hiitReferenceTable =
    dashboard?.interval_tables.from_vam ??
    dashboard?.interval_tables.from_30_15 ??
    dashboard?.interval_tables.from_yoyo ??
    null;

  // MAS Training: 30-15 → Yo-Yo → VAM
  const masReferenceTable =
    dashboard?.interval_tables.from_30_15 ??
    dashboard?.interval_tables.from_yoyo ??
    dashboard?.interval_tables.from_vam ??
    null;

  const speedTestTable = dashboard?.interval_tables.from_speed_test ?? null;
  const speedReferenceKmh = speedTestTable?.reference_kmh ?? null;

  const hasAnyTest =
    hiitReferenceTable !== null || masReferenceTable !== null || speedTestTable !== null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-1">Entrenamientos</h2>
      <p className="text-xs text-slate-400 mb-4">
        Prescripciones basadas en la VAM del atleta y los cuadros de intervalos existentes.
      </p>

      {loading ? (
        <LoadingCard />
      ) : !dashboard || !hasAnyTest ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">
            Registrá al menos un test VAM, 30-15 IFT, Yo-Yo o Speed Test para ver entrenamientos sugeridos.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <RecommendedTrainingCards
            hiitIntervalTable={hiitReferenceTable}
            masIntervalTable={masReferenceTable}
            speedReferenceKmh={speedReferenceKmh}
            speedTestTable={speedTestTable}
            beforeSpeedCards={
              <SpeedTestReferenceSelector
                athleteId={athleteId}
                preferredSpeedTestId={dashboard.preferred_speed_test_id}
                speedTestReferenceId={dashboard.speed_test_reference_id}
                refreshKey={refreshKey}
                onUpdated={onDashboardRefresh}
              />
            }
          />
          <TrainingTablesSection intervalTables={dashboard.interval_tables} />
        </div>
      )}
    </section>
  );
}
