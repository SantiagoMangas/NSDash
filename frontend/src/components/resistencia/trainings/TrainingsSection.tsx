"use client";

import { TrainingTablesSection } from "@/components/speed/TrainingTablesSection";
import { LoadingCard } from "@/components/ui/LoadingCard";
import type { VelocityDashboard } from "@/lib/types";
import { RecommendedTrainingCards } from "./RecommendedTrainingCards";

type Props = {
  dashboard: VelocityDashboard | null;
  loading: boolean;
};

export function TrainingsSection({ dashboard, loading }: Props) {
  const referenceTable =
    dashboard?.interval_tables.from_vam ??
    dashboard?.interval_tables.from_30_15 ??
    dashboard?.interval_tables.from_yoyo ??
    null;

  const speedTestTable = dashboard?.interval_tables.from_speed_test ?? null;

  const referenceVam =
    referenceTable?.reference_kmh ??
    dashboard?.best_test.vam_kmh ??
    speedTestTable?.reference_kmh ??
    null;

  const hasAnyTest = referenceTable !== null || speedTestTable !== null;

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
            vamKmh={referenceVam ?? 0}
            intervalTable={referenceTable}
            speedTestTable={speedTestTable}
          />
          <TrainingTablesSection intervalTables={dashboard.interval_tables} />
        </div>
      )}
    </section>
  );
}
