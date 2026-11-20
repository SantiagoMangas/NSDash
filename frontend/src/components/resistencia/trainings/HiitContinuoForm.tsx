"use client";

import { useMemo, useState } from "react";
import {
  calculateHiitContinuoCorto,
  calculateHiitContinuoLargo,
  saveTrainingSession,
  type HiitContinuoCortoCalculateRequest,
  type HiitContinuoCalculateResponse,
  type HiitContinuoLargoCalculateRequest,
  type SavedTrainingSessionSource,
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

export function HiitContinuoForm({ athleteId, hiitReferenceTable, onSessionSaved }: Props) {
  const [entrenamiento, setEntrenamiento] = useState<"Intervalo Largo" | "Intervalo Corto">("Intervalo Largo");
  const [date, setDate] = useState(getTodayDate);
  const [intensidadMin, setIntensidadMin] = useState("90");
  const [intensidadMax, setIntensidadMax] = useState("110");
  const [trabajoMin, setTrabajoMin] = useState("2");
  const [trabajoS, setTrabajoS] = useState("30");
  const [serieMin, setSerieMin] = useState("12");
  const [bloques, setBloques] = useState("2");
  const [macroPausaMin, setMacroPausaMin] = useState("3");
  const [ratio, setRatio] = useState("2:1");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<HiitContinuoCalculateResponse | null>(null);
  const [lastSaveSource, setLastSaveSource] = useState<SavedTrainingSessionSource | null>(null);
  const [lastCalcPayload, setLastCalcPayload] = useState<
    HiitContinuoLargoCalculateRequest | HiitContinuoCortoCalculateRequest | null
  >(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<{
    source: string;
    request: Record<string, unknown>;
    result: Record<string, unknown>;
  } | null>(null);
  const { pushToast } = useToast();

  const isLargo = entrenamiento === "Intervalo Largo";

  const sourceLabel = useMemo(() => {
    if (!hiitReferenceTable) return null;
    return SOURCE_LABELS[hiitReferenceTable.source] ?? hiitReferenceTable.source.toUpperCase();
  }, [hiitReferenceTable]);

  const buildPayload = (): HiitContinuoLargoCalculateRequest | HiitContinuoCortoCalculateRequest => {
    const base = {
      reference_kmh: hiitReferenceTable!.reference_kmh,
      intensidad_pct_min: parseNumber(intensidadMin),
      intensidad_pct_max: parseNumber(intensidadMax),
      serie_min: parseNumber(serieMin),
      bloques: parseNumber(bloques),
      macro_pausa_min: parseNumber(macroPausaMin),
      ratio: ratio.trim(),
    };
    if (isLargo) {
      return { ...base, trabajo_min: parseNumber(trabajoMin) };
    }
    return { ...base, trabajo_s: parseNumber(trabajoS) };
  };

  const saveSource: SavedTrainingSessionSource = isLargo ? "hiit_continuo_largo" : "hiit_continuo_corto";

  if (!hiitReferenceTable) {
    return <EmptyReference>Registrá un test VAM, 30-15 IFT o Yo-Yo para calcular HIIT Continuo.</EmptyReference>;
  }

  const submit = preventDefaultSubmit(async () => {
    setError(null);
    setSaveError(null);
    const parsed = {
      min: parseNumber(intensidadMin),
      max: parseNumber(intensidadMax),
      trabajoMin: parseNumber(trabajoMin),
      trabajoS: parseNumber(trabajoS),
      serie: parseNumber(serieMin),
      bloques: parseNumber(bloques),
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
    if (isLargo && (!Number.isFinite(parsed.trabajoMin) || parsed.trabajoMin <= 0)) {
      setError("Ingresá un trabajo válido en minutos.");
      return;
    }
    if (!isLargo && (!Number.isFinite(parsed.trabajoS) || parsed.trabajoS <= 0)) {
      setError("Ingresá un trabajo válido en segundos.");
      return;
    }
    if (!Number.isFinite(parsed.serie) || parsed.serie <= 0) {
      setError("Ingresá una serie válida en minutos.");
      return;
    }
    if (!Number.isInteger(parsed.bloques) || parsed.bloques <= 0) {
      setError("Los bloques deben ser un entero mayor a 0.");
      return;
    }
    if (!Number.isFinite(parsed.macro) || parsed.macro < 0) {
      setError("Ingresá una macro pausa válida.");
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload();
      const data = isLargo
        ? await calculateHiitContinuoLargo(payload as HiitContinuoLargoCalculateRequest)
        : await calculateHiitContinuoCorto(payload as HiitContinuoCortoCalculateRequest);
      setResult(data);
      setLastSaveSource(saveSource);
      setLastCalcPayload(payload);
    } catch (err: unknown) {
      setResult(null);
      setError(parseApiError(err, "No se pudo calcular HIIT Continuo."));
    } finally {
      setLoading(false);
    }
  });

  const saveSession = async () => {
    setSaveError(null);
    if (!result || !lastSaveSource || !lastCalcPayload) {
      setSaveError("Calculá la sesión antes de guardarla en el atleta.");
      return;
    }
    if (!date?.trim()) {
      setSaveError("Ingresá la fecha de la sesión.");
      return;
    }
    setSaving(true);
    try {
      await saveTrainingSession(
        athleteId,
        lastSaveSource,
        date,
        lastCalcPayload as unknown as Record<string, unknown>,
      );
      setLastSavedSnapshot({
        source: lastSaveSource,
        request: lastCalcPayload as unknown as Record<string, unknown>,
        result: { ...result } as unknown as Record<string, unknown>,
      });
      pushToast("success", "Sesión HIIT Continuo guardada en el atleta.");
      onSessionSaved?.();
    } catch (err: unknown) {
      setSaveError(parseApiError(err, "No se pudo guardar la sesión."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-4xl">
      <InfoBanner title="HIIT Continuo">
        Tiempo fijo → distancia. Pausa activa en Z2. Métrica: {sourceLabel} · {hiitReferenceTable.reference_kmh.toFixed(2)} km/h
        (prioridad VAM → 30-15 → Yo-Yo).
      </InfoBanner>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <CompactField id="hiit-cont-entrenamiento" label="Entrenamiento">
          <select
            id="hiit-cont-entrenamiento"
            value={entrenamiento}
            onChange={(e) => {
              setEntrenamiento(e.target.value as "Intervalo Largo" | "Intervalo Corto");
              setSerieMin(e.target.value === "Intervalo Largo" ? "12" : "6");
              setResult(null);
              setLastCalcPayload(null);
              setLastSaveSource(null);
            }}
            className={compactInputCls}
          >
            <option value="Intervalo Largo">Intervalo Largo</option>
            <option value="Intervalo Corto">Intervalo Corto</option>
          </select>
        </CompactField>

        <DateInputWithDisplay
          id="hiit-cont-fecha"
          label="Fecha"
          value={date}
          onChange={setDate}
          required
          showFormatHint={false}
          className={compactDateInputCls}
        />

        <CompactField id="hiit-cont-int-min" label="Intensidad mín (%)">
          <input
            id="hiit-cont-int-min"
            type="number"
            min="0"
            step="any"
            value={intensidadMin}
            onChange={(e) => setIntensidadMin(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="hiit-cont-int-max" label="Intensidad máx (%)">
          <input
            id="hiit-cont-int-max"
            type="number"
            min="0"
            step="any"
            value={intensidadMax}
            onChange={(e) => setIntensidadMax(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>

        {result ? <InlineMinMaxVelocityRitmo min={result.min} max={result.max} /> : null}

        <CompactField id="hiit-cont-ratio" label="Ratio">
          <input
            id="hiit-cont-ratio"
            type="text"
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        {isLargo ? (
          <CompactField id="hiit-cont-trabajo-min" label="Trabajo (min)">
            <input
              id="hiit-cont-trabajo-min"
              type="number"
              min="0"
              step="any"
              value={trabajoMin}
              onChange={(e) => setTrabajoMin(e.target.value)}
              className={compactInputCls}
            />
          </CompactField>
        ) : (
          <CompactField id="hiit-cont-trabajo-s" label="Trabajo (s)">
            <input
              id="hiit-cont-trabajo-s"
              type="number"
              min="0"
              step="any"
              value={trabajoS}
              onChange={(e) => setTrabajoS(e.target.value)}
              className={compactInputCls}
            />
          </CompactField>
        )}
        <CompactField id="hiit-cont-serie" label="Serie (min)">
          <input
            id="hiit-cont-serie"
            type="number"
            min="0"
            step="any"
            value={serieMin}
            onChange={(e) => setSerieMin(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="hiit-cont-bloques" label="Bloques">
          <input
            id="hiit-cont-bloques"
            type="number"
            min="1"
            step="1"
            value={bloques}
            onChange={(e) => setBloques(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="hiit-cont-macro" label="Macro pausa (min)">
          <input
            id="hiit-cont-macro"
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
          Volumen trabajo {result.volumen_trabajo_m.toFixed(2)} m
        </p>
      ) : null}

      <SessionFormActions loading={loading} saving={saving} canSave={result !== null} onSave={() => void saveSession()} />
      <FormError message={error} />
      <FormError message={saveError} />

      {lastSavedSnapshot ? <SavedSessionSummaryCard snapshot={lastSavedSnapshot} /> : null}
    </form>
  );
}