"use client";

import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { useResistenciaData } from "@/hooks/useResistenciaData";
import { AsrSection } from "./asr/AsrSection";
import { AvailableMetricsSection } from "./metrics/AvailableMetricsSection";
import { VamProgressChart } from "./metrics/VamProgressChart";
import { EvaluationsSection } from "./EvaluationsSection";
import { TrainingsSection } from "./trainings/TrainingsSection";

interface Props {
  athleteId: number | null;
  authToken: string | null;
  historyRefreshKey: number;
  onEvaluationSuccess: () => void;
}

export function ResistenciaModule({
  athleteId,
  authToken,
  historyRefreshKey,
  onEvaluationSuccess,
}: Props) {
  const { dashboard, progress, loading, error, refreshDashboard } = useResistenciaData(athleteId, historyRefreshKey);

  return (
    <div className="space-y-6">
      {athleteId === null ? (
        <EmptyStateCard
          icon={
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
              <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
            </svg>
          }
          title="Seleccioná un atleta"
          description="Elegí un atleta en la lista para registrar evaluaciones y ver su ficha de rendimiento."
        />
      ) : (
        <>
          <EvaluationsSection
            athleteId={athleteId}
            authToken={authToken}
            onSuccess={onEvaluationSuccess}
          />

          <AvailableMetricsSection
            athleteId={athleteId}
            historyRefreshKey={historyRefreshKey}
            dashboard={dashboard}
            progress={progress}
            loading={loading}
            error={error}
            onHistoryDeleted={onEvaluationSuccess}
          />

          {dashboard && (progress?.history?.length ?? 0) > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <VamProgressChart history={progress?.history ?? []} />
            </section>
          )}

          <AsrSection athleteId={athleteId} refreshKey={historyRefreshKey} />

          <TrainingsSection
            athleteId={athleteId}
            dashboard={dashboard}
            loading={loading}
            refreshKey={historyRefreshKey}
            onDashboardRefresh={refreshDashboard}
          />

        </>
      )}
    </div>
  );
}
