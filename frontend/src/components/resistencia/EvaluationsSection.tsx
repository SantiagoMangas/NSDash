"use client";

import { VamTestForm } from "@/components/speed/VamTestForm";
import { SpeedTestForm } from "@/components/speed/SpeedTestForm";
import { RsaFatigueTestForm } from "@/components/speed/RsaFatigueTestForm";
import { EvaluationAccordion } from "./EvaluationAccordion";

const EVALUATIONS = [
  { key: "vam_5min" as const, label: "VAM 5 minutos" },
  { key: "vam_2000m" as const, label: "VAM 2000 m" },
  { key: "test_30_15_ift" as const, label: "30-15 IFT" },
  { key: "yoyo_ri1" as const, label: "Yo-Yo Test RI1" },
];

interface Props {
  athleteId: number | null;
  authToken: string | null;
  onSuccess?: () => void;
}

export function EvaluationsSection({ athleteId, authToken, onSuccess }: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-1">Evaluaciones</h2>
      <p className="text-xs text-slate-400 mb-4">
        Registrá las pruebas de resistencia del atleta. Cada evaluación tiene su propio formulario.
      </p>

      <div className="space-y-3">
        {EVALUATIONS.map((evaluation) => (
          <EvaluationAccordion key={evaluation.key} title={evaluation.label}>
            <VamTestForm
              athleteId={athleteId}
              authToken={authToken}
              fixedTestType={evaluation.key}
              embedded
              onSuccess={onSuccess}
            />
          </EvaluationAccordion>
        ))}

        <EvaluationAccordion title="Test de Velocidad">
          <SpeedTestForm
            athleteId={athleteId}
            authToken={authToken}
            embedded
            onSuccess={onSuccess}
          />
        </EvaluationAccordion>

        <EvaluationAccordion title="Test RSA (Índice de Fatiga)">
          <RsaFatigueTestForm
            athleteId={athleteId}
            authToken={authToken}
            embedded
            onSuccess={onSuccess}
          />
        </EvaluationAccordion>
      </div>
    </section>
  );
}
