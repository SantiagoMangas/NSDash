"use client";

import { useMemo, useState } from "react";
import {
  calculateRsa,
  saveTrainingSession,
  type RsaCalculateRequest,
  type RsaCalculateResponse,
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
  speedTestTable: IntervalTable | null;
  onSessionSaved?: () => void;
};

export function RsaSessionForm({ athleteId, speedTestTable, onSessionSaved }: Props) {
  const [entrenamiento, setEntrenamiento] = useState("RST");
  const [date, setDate] = useState(getTodayDate);
  const [intensidadMin, setIntensidadMin] = useState("80");
  const [intensidadMax, setIntensidadMax] = useState("90");
  const [distanciaM, setDistanciaM] = useState("30");
  const [reps, setReps] = useState("6");
  const [series, setSeries] = useState("2");
  const [ratio, setRatio] = useState("1:5");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<RsaCalculateResponse | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<{
    source: string;
    request: Record<string, unknown>;
    result: Record<string, unknown>;
  } | null>(null);
  const { pushToast } = useToast();

  const sourceLabel = useMemo(() => {
    if (!speedTestTable) return null;
    return SOURCE_LABELS[speedTestTable.source] ?? speedTestTable.source.toUpperCase();
  }, [speedTestTable]);

  const buildPayload = (): RsaCalculateRequest => ({
    reference_kmh: speedTestTable!.reference_kmh,
    intensidad_pct_min: parseNumber(intensidadMin),
    intensidad_pct_max: parseNumber(intensidadMax),
    distancia_m: parseNumber(distanciaM),
    reps: parseNumber(reps),
    series: parseNumber(series),
    ratio: ratio.trim(),
    entrenamiento,
  });

  if (!speedTestTable) {
    return <EmptyReference>Registrá un Test de Velocidad (MSS) para calcular RST / SIT.</EmptyReference>;
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

    setLoading(true);
    try {
      setResult(await calculateRsa(buildPayload()));
    } catch (err: unknown) {
      setResult(null);
      setError(parseApiError(err, "No se pudo calcular RST / SIT."));
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
      await saveTrainingSession(athleteId, "rsa", date, payload as unknown as Record<string, unknown>);
      setLastSavedSnapshot({
        source: "rsa",
        request: payload as unknown as Record<string, unknown>,
        result: { ...result } as unknown as Record<string, unknown>,
      });
      pushToast("success", "Sesión RSA guardada en el atleta.");
      onSessionSaved?.();
    } catch (err: unknown) {
      setSaveError(parseApiError(err, "No se pudo guardar la sesión."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-4xl">
      <InfoBanner title="RSA">
        Distancia fija → tiempo. Métrica MMSS: {sourceLabel} · {speedTestTable.reference_kmh.toFixed(2)} km/h (Speed Test de
        referencia).
      </InfoBanner>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <CompactField id="rsa-entrenamiento" label="Entrenamiento">
          <select
            id="rsa-entrenamiento"
            value={entrenamiento}
            onChange={(e) => setEntrenamiento(e.target.value)}
            className={compactInputCls}
          >
            <option value="RST">RST</option>
            <option value="SIT">SIT</option>
          </select>
        </CompactField>

        <DateInputWithDisplay
          id="rsa-fecha"
          label="Fecha"
          value={date}
          onChange={setDate}
          required
          showFormatHint={false}
          className={compactDateInputCls}
        />

        <CompactField id="rsa-int-min" label="Intensidad mín (%)">
          <input
            id="rsa-int-min"
            type="number"
            min="0"
            step="any"
            value={intensidadMin}
            onChange={(e) => setIntensidadMin(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="rsa-int-max" label="Intensidad máx (%)">
          <input
            id="rsa-int-max"
            type="number"
            min="0"
            step="any"
            value={intensidadMax}
            onChange={(e) => setIntensidadMax(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>

        {result ? <InlineMinMaxVelocityRitmo min={result.min} max={result.max} /> : null}

        <CompactField id="rsa-ratio" label="Ratio">
          <input
            id="rsa-ratio"
            type="text"
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="rsa-distancia" label="Distancia (m)">
          <input
            id="rsa-distancia"
            type="number"
            min="0"
            step="any"
            value={distanciaM}
            onChange={(e) => setDistanciaM(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="rsa-reps" label="Reps">
          <input
            id="rsa-reps"
            type="number"
            min="1"
            step="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="rsa-series" label="Series">
          <input
            id="rsa-series"
            type="number"
            min="1"
            step="1"
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>

        {result ? <InlineMinMaxTrabajoPausa min={result.min} max={result.max} /> : null}
      </div>

      {result ? (
        <p className="text-xs text-slate-600">
          Volumen trabajo {result.volumen_trabajo_m} m
        </p>
      ) : null}

      <SessionFormActions loading={loading} saving={saving} canSave={result !== null} onSave={() => void saveSession()} />
      <FormError message={error} />
      <FormError message={saveError} />

      {lastSavedSnapshot ? <SavedSessionSummaryCard snapshot={lastSavedSnapshot} /> : null}
    </form>
  );
}