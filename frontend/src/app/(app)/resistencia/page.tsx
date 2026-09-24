"use client";

import { Suspense, useState } from "react";
import { ModuleAthleteShell } from "@/components/modules/ModuleAthleteShell";
import { ResistenciaModule } from "@/components/resistencia/ResistenciaModule";

function ResistenciaContent() {
  const [vamHistoryRefreshKey, setVamHistoryRefreshKey] = useState(0);

  return (
    <ModuleAthleteShell
      moduleTitle="Velocidad y resistencia"
      moduleEmoji="⚡"
      moduleDescription="Evaluaciones VAM, velocidad, entrenamientos e historial. El atleta es opcional hasta que registres datos."
    >
      {({ athleteId, authToken }) => (
        <ResistenciaModule
          athleteId={athleteId}
          authToken={authToken}
          historyRefreshKey={vamHistoryRefreshKey}
          onEvaluationSuccess={() => setVamHistoryRefreshKey((k) => k + 1)}
        />
      )}
    </ModuleAthleteShell>
  );
}

export default function ResistenciaPage() {
  return (
    <Suspense fallback={<main className="max-w-5xl mx-auto px-4 py-8 text-sm text-slate-500">Cargando...</main>}>
      <ResistenciaContent />
    </Suspense>
  );
}
