"use client";

import { useState, type ReactNode } from "react";
import { VamTestForm } from "@/components/speed/VamTestForm";
import { SpeedTestForm } from "@/components/speed/SpeedTestForm";
import { RsaFatigueTestForm } from "@/components/speed/RsaFatigueTestForm";

type EvaluationKey =
  | "vam_5min"
  | "vam_2000m"
  | "test_30_15_ift"
  | "yoyo_ri1"
  | "speed_test"
  | "rsa_fatigue";

const EVALUATION_OPTIONS: Array<{ key: EvaluationKey; label: string }> = [
  { key: "vam_5min", label: "VAM 5 minutos" },
  { key: "vam_2000m", label: "VAM 2000 m" },
  { key: "test_30_15_ift", label: "30-15 IFT" },
  { key: "yoyo_ri1", label: "Yo-Yo Test RI1" },
  { key: "speed_test", label: "Test de velocidad" },
  { key: "rsa_fatigue", label: "Test RSA (índice de fatiga)" },
];

interface Props {
  athleteId: number | null;
  authToken: string | null;
  onSuccess?: () => void;
}

function FormPanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Cerrar formulario"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function EvaluationFormSelector({ athleteId, authToken, onSuccess }: Props) {
  const [selected, setSelected] = useState<EvaluationKey | "">("");

  const active = EVALUATION_OPTIONS.find((o) => o.key === selected);

  return (
    <div>
      <label htmlFor="evaluation-picker" className="block text-xs font-medium text-slate-500 mb-2">
        Tipo de evaluación
      </label>
      <select
        id="evaluation-picker"
        value={selected}
        onChange={(event) => setSelected(event.target.value as EvaluationKey | "")}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">Elegí qué querés cargar…</option>
        {EVALUATION_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      {active && selected === "vam_5min" && (
        <FormPanel title={active.label} onClose={() => setSelected("")}>
          <VamTestForm
            athleteId={athleteId}
            authToken={authToken}
            fixedTestType="vam_5min"
            embedded
            onSuccess={onSuccess}
          />
        </FormPanel>
      )}
      {active && selected === "vam_2000m" && (
        <FormPanel title={active.label} onClose={() => setSelected("")}>
          <VamTestForm
            athleteId={athleteId}
            authToken={authToken}
            fixedTestType="vam_2000m"
            embedded
            onSuccess={onSuccess}
          />
        </FormPanel>
      )}
      {active && selected === "test_30_15_ift" && (
        <FormPanel title={active.label} onClose={() => setSelected("")}>
          <VamTestForm
            athleteId={athleteId}
            authToken={authToken}
            fixedTestType="test_30_15_ift"
            embedded
            onSuccess={onSuccess}
          />
        </FormPanel>
      )}
      {active && selected === "yoyo_ri1" && (
        <FormPanel title={active.label} onClose={() => setSelected("")}>
          <VamTestForm
            athleteId={athleteId}
            authToken={authToken}
            fixedTestType="yoyo_ri1"
            embedded
            onSuccess={onSuccess}
          />
        </FormPanel>
      )}
      {active && selected === "speed_test" && (
        <FormPanel title={active.label} onClose={() => setSelected("")}>
          <SpeedTestForm athleteId={athleteId} authToken={authToken} embedded onSuccess={onSuccess} />
        </FormPanel>
      )}
      {active && selected === "rsa_fatigue" && (
        <FormPanel title={active.label} onClose={() => setSelected("")}>
          <RsaFatigueTestForm athleteId={athleteId} authToken={authToken} embedded onSuccess={onSuccess} />
        </FormPanel>
      )}
    </div>
  );
}
