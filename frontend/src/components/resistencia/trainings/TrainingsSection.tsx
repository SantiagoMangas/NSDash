"use client";

import { TrainingTablesSection } from "@/components/speed/TrainingTablesSection";
import { LoadingCard } from "@/components/ui/LoadingCard";
import type { VelocityDashboard } from "@/lib/types";
import { EvaluationAccordion } from "../EvaluationAccordion";
import { HiitContinuoForm } from "./HiitContinuoForm";
import { HiitCortoForm } from "./HiitCortoForm";
import { HiitLargoForm } from "./HiitLargoForm";
import { MasTrainingForm } from "./MasTrainingForm";
import { RecommendedTrainingCards } from "./RecommendedTrainingCards";
import { RsaSessionForm } from "./RsaSessionForm";
import { SpeedTestReferenceSelector } from "./SpeedTestReferenceSelector";
import { TempoRunForm } from "./TempoRunForm";

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

  const hasAnyTest =
    hiitReferenceTable !== null || masReferenceTable !== null || speedTestTable !== null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Entrenamientos</h2>

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
          <TrainingTablesSection intervalTables={dashboard.interval_tables} />

          {speedTestTable ? (
            <div className="space-y-4">
              <SpeedTestReferenceSelector
                athleteId={athleteId}
                preferredSpeedTestId={dashboard.preferred_speed_test_id}
                speedTestReferenceId={dashboard.speed_test_reference_id}
                refreshKey={refreshKey}
                onUpdated={onDashboardRefresh}
              />
              <RecommendedTrainingCards speedTestTable={speedTestTable} />
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="mb-1">
              <h3 className="text-sm font-semibold text-slate-800">Calculadoras de sesión</h3>
              <p className="text-xs text-slate-400 mt-0.5">Armá el entrenamiento del día.</p>
            </div>
            <EvaluationAccordion title="HIIT Corto">
              <HiitCortoForm hiitReferenceTable={hiitReferenceTable} />
            </EvaluationAccordion>
            <EvaluationAccordion title="HIIT Largo">
              <HiitLargoForm hiitReferenceTable={hiitReferenceTable} />
            </EvaluationAccordion>
            <EvaluationAccordion title="HIIT Continuo">
              <HiitContinuoForm hiitReferenceTable={hiitReferenceTable} />
            </EvaluationAccordion>
            <EvaluationAccordion title="MAS Training" defaultOpen>
              <MasTrainingForm masReferenceTable={masReferenceTable} />
            </EvaluationAccordion>
            <EvaluationAccordion title="Tempo Run">
              <TempoRunForm speedTestTable={speedTestTable} />
            </EvaluationAccordion>
            <EvaluationAccordion title="RSA">
              <RsaSessionForm speedTestTable={speedTestTable} />
            </EvaluationAccordion>
          </div>
        </div>
      )}
    </section>
  );
}
