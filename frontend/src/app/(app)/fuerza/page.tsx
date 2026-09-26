"use client";

import { Suspense } from "react";
import { ModuleAthleteShell } from "@/components/modules/ModuleAthleteShell";
import { StrengthModule } from "@/components/strength/StrengthModule";

function FuerzaContent() {
  return (
    <ModuleAthleteShell
      moduleTitle="Fuerza"
      moduleEmoji="💪"
      moduleDescription="Registros, progresión de RM y tabla de porcentajes. Elegí un atleta cuando quieras cargar datos."
    >
      {({ athleteId, athleteName, athleteBodyWeightKg, authToken }) => (
        <StrengthModule
          athleteId={athleteId}
          athleteName={athleteName}
          athleteBodyWeightKg={athleteBodyWeightKg}
          authToken={authToken}
        />
      )}
    </ModuleAthleteShell>
  );
}

export default function FuerzaPage() {
  return (
    <Suspense fallback={<main className="max-w-5xl mx-auto px-4 py-8 text-sm text-slate-500">Cargando...</main>}>
      <FuerzaContent />
    </Suspense>
  );
}
