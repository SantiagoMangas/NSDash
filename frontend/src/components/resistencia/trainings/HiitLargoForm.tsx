"use client";

import { useMemo, useState } from "react";
import {
  calculateHiitLargo,
  saveTrainingSession,
  type HiitLargoCalculateRequest,
  type HiitLargoCalculateResponse,
} from "@/lib/api/sessions";
import { useToast } from "@/contexts/ToastContext";
import { DateInputWithDisplay } from "@/components/ui/DateInputWithDisplay";
import { getTodayDate } from "@/lib/date";
import type { IntervalTable } from "@/lib/types";
import { parseApiError } from "@/lib/utils";
import {
  CompactField,
  EmptyReference,
  FormError,
  InfoBanner,
  InlineMinMaxTrabajoPausa,
  InlineMinMaxVelocityRitmo,
  SessionFormActions,
  SOURCE_LABELS,
  compactDateInputCls,
  compactInputCls,
  parseNumber,
  preventDefaultSubmit,
} from "./sessionFormUi";
import { SavedSessionSummaryCard } from "./SavedSessionSummaryCard";

type Props = {
  athleteId: number;
  hiitReferenceTable: IntervalTable | null;
  onSessionSaved?: () => void;
};

export function HiitLargoForm({ athleteId, hiitReferenceTable, onSessionSaved }: Props) {
  const [date, setDate] = useState(getTodayDate);
  const [intensidadMin, setIntensidadMin] = useState("90");
  const [intensidadMax, setIntensidadMax] = useState("110");
  const [distanciaM, setDistanciaM] = useState("400");
  const [reps, setReps] = useState("3");
  const [series, setSeries] = useState("2");
  const [macroPausaMin, setMacroPausaMin] = useState("3");
  const [ratio, setRatio] = useState("1:2");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<HiitLargoCalculateResponse | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<{
    source: string;
    request: Record<string, unknown>;
    result: Record<string, unknown>;
  } | null>(null);
  const { pushToast } = useToast();

  const sourceLabel = useMemo(() => {
    if (!hiitReferenceTable) return null;
    return SOURCE_LABELS[hiitReferenceTable.source] ?? hiitReferenceTable.source.toUpperCase();
  }, [hiitReferenceTable]);

  const buildPayload = (): HiitLargoCalculateRequest => ({
    reference_kmh: hiitReferenceTable!.reference_kmh,
    intensidad_pct_min: parseNumber(intensidadMin),
    intensidad_pct_max: parseNumber(intensidadMax),
    distancia_m: parseNumber(distanciaM),
    reps: parseNumber(reps),
    series: parseNumber(series),
    macro_pausa_min: parseNumber(macroPausaMin),
    ratio: ratio.trim(),
  });

  if (!hiitReferenceTable) {
    return <EmptyReference>Registrá un test VAM, 30-15 IFT o Yo-Yo para calcular HIIT Largo.</EmptyReference>;
  }

  const submit = preventDefaultSubmit(async () => {
    setError(null);
    setSaveError(null);
    const parsed = {
      min: parseNumber(intensidadMin),
      max: parseNumber(intensidadMax),
      distancia: parseNumber(distanciaM),
      reps: parseNumber(reps),
      series: parseNumber(series),
      macro: parseNumber(macroPausaMin),
    };
    if (!Number.isFinite(parsed.min) || !Number.isFinite(parsed.max) || parsed.min <= 0 || parsed.max <= 0) {
      setError("Ingresá un rango de intensidad % válido.");
      return;
    }
    if (!ratio.includes(":")) {
      setError('El ratio debe tener formato "N:M".');
      return;
    }
    if (!Number.isFinite(parsed.distancia) || parsed.distancia <= 0) {
      setError("Ingresá una distancia válida.");
      return;
    }
    if (
      !Number.isInteger(parsed.reps) ||
      parsed.reps <= 0 ||
      !Number.isInteger(parsed.series) ||
      parsed.series <= 0
    ) {
      setError("Reps y series deben ser enteros mayores a 0.");
      return;
    }
    if (!Number.isFinite(parsed.macro) || parsed.macro < 0) {
      setError("Ingresá una macro pausa válida.");
      return;
    }

    setLoading(true);
    try {
      setResult(await calculateHiitLargo(buildPayload()));
    } catch (err: unknown) {
      setResult(null);
      setError(parseApiError(err, "No se pudo calcular HIIT Largo."));
    } finally {
      setLoading(false);
    }
  });

  const saveSession = async () => {
    setSaveError(null);
    if (!result) {
      setSaveError("Calculá la sesión antes de guardarla en el atleta.");
      return;
    }
    if (!date?.trim()) {
      setSaveError("Ingresá la fecha de la sesión.");
      return;
    }
    const payload = buildPayload();
    setSaving(true);
    try {
      await saveTrainingSession(athleteId, "hiit_largo", date, payload as unknown as Record<string, unknown>);
      setLastSavedSnapshot({
        source: "hiit_largo",
        request: payload as unknown as Record<string, unknown>,
        result: { ...result } as unknown as Record<string, unknown>,
      });
      pushToast("success", "Sesión HIIT Largo guardada en el atleta.");
      onSessionSaved?.();
    } catch (err: unknown) {
      setSaveError(parseApiError(err, "No se pudo guardar la sesión."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-4xl">
      <InfoBanner title="HIIT Largo">
        Distancia fija → tiempo. Métrica: {sourceLabel} · {hiitReferenceTable.reference_kmh.toFixed(2)} km/h (prioridad VAM →
        30-15 → Yo-Yo).
      </InfoBanner>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <DateInputWithDisplay
          id="hiit-largo-fecha"
          label="Fecha"
          value={date}
          onChange={setDate}
          required
          showFormatHint={false}
          className={compactDateInputCls}
        />
        <CompactField id="hiit-largo-int-min" label="Intensidad mín (%)">
          <input
            id="hiit-largo-int-min"
            type="number"
            min="0"
            step="any"
            value={intensidadMin}
            onChange={(e) => setIntensidadMin(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="hiit-largo-int-max" label="Intensidad máx (%)">
          <input
            id="hiit-largo-int-max"
            type="number"
            min="0"
            step="any"
            value={intensidadMax}
            onChange={(e) => setIntensidadMax(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="hiit-largo-distancia" label="Distancia (m)">
          <input
            id="hiit-largo-distancia"
            type="number"
            min="0"
            step="any"
            value={distanciaM}
            onChange={(e) => setDistanciaM(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>

        {result ? <InlineMinMaxVelocityRitmo min={result.min} max={result.max} /> : null}

        <CompactField id="hiit-largo-ratio" label="Ratio">
          <input
            id="hiit-largo-ratio"
            type="text"
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="hiit-largo-reps" label="Reps">
          <input
            id="hiit-largo-reps"
            type="number"
            min="1"
            step="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="hiit-largo-series" label="Series">
          <input
            id="hiit-largo-series"
            type="number"
            min="1"
            step="1"
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="hiit-largo-macro" label="Macro pausa (min)">
          <input
            id="hiit-largo-macro"
            type="number"
            min="0"
            step="any"
            value={macroPausaMin}
            onChange={(e) => setMacroPausaMin(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>

        {result ? <InlineMinMaxTrabajoPausa min={result.min} max={result.max} /> : null}
      </div>

      {result ? (
        <p className="text-xs text-slate-600">
          Volumen trabajo {result.volumen_m} m
        </p>
      ) : null}

      <SessionFormActions loading={loading} saving={saving} canSave={result !== null} onSave={() => void saveSession()} />
      <FormError message={error} />
      <FormError message={saveError} />

      {lastSavedSnapshot ? <SavedSessionSummaryCard snapshot={lastSavedSnapshot} /> : null}
    </form>
  );
}