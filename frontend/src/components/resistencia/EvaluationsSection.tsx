"use client";

import { EvaluationFormSelector } from "./EvaluationFormSelector";

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
        Elegí un test en el desplegable, completá el formulario y cerralo con la X cuando termines.
      </p>

      <EvaluationFormSelector athleteId={athleteId} authToken={authToken} onSuccess={onSuccess} />
    </section>
  );
}
