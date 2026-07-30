"use client";



import { VamTestHistory } from "@/components/speed/VamTestHistory";

import { EmptyStateCard } from "@/components/ui/EmptyStateCard";

import { useResistenciaData } from "@/hooks/useResistenciaData";

import { AvailableMetricsSection } from "./metrics/AvailableMetricsSection";

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

  const { dashboard, progress, loading, error } = useResistenciaData(athleteId, historyRefreshKey);



  if (athleteId === null) {

    return (

      <EmptyStateCard

        icon={

          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />

            <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />

          </svg>

        }

        title="Seleccioná un atleta"

        description="Elegí un atleta arriba para registrar evaluaciones de resistencia y ver el historial."

      />

    );

  }



  return (

    <div className="space-y-6">

      <EvaluationsSection

        athleteId={athleteId}

        authToken={authToken}

        onSuccess={onEvaluationSuccess}

      />



      <AvailableMetricsSection

        dashboard={dashboard}

        progress={progress}

        loading={loading}

        error={error}

      />



      <TrainingsSection dashboard={dashboard} loading={loading} />



      <section>

        <h2 className="text-base font-semibold text-slate-700 mb-4">Historial</h2>

        <VamTestHistory athleteId={athleteId} refreshKey={historyRefreshKey} />

      </section>

    </div>

  );

}


