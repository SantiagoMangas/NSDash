"use client";

import { useMemo, useState } from "react";
import {
  calculateMasTraining,
  saveTrainingSession,
  type MasTrainingCalculateRequest,
  type MasTrainingCalculateResponse,
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
  compactInputClassName,
  compactInputCls,
  parseNumber,
  preventDefaultSubmit,
} from "./sessionFormUi";
import {
  MasTrainingSessionSummaryCard,
  type MasTrainingSavedSnapshot,
} from "./MasTrainingSessionSummaryCard";

type Props = {
  athleteId: number;
  masReferenceTable: IntervalTable | null;
  onSessionSaved?: () => void;
};

export function MasTrainingForm({ athleteId, masReferenceTable, onSessionSaved }: Props) {
  const [entrenamiento, setEntrenamiento] = useState("Intervalo Corto");
  const [date, setDate] = useState(getTodayDate);
  const [intensidadMin, setIntensidadMin] = useState("110");
  const [intensidadMax, setIntensidadMax] = useState("120");
  const [ratio, setRatio] = useState("1:1");
  const [trabajoS, setTrabajoS] = useState("15");
  const [cod, setCod] = useState(false);
  const [shuttles, setShuttles] = useState("1");
  const [serieMin, setSerieMin] = useState("4");
  const [bloques, setBloques] = useState("3");
  const [macroPausaMin, setMacroPausaMin] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<MasTrainingCalculateResponse | null>(null);
  const [lastSaved, setLastSaved] = useState<MasTrainingSavedSnapshot | null>(null);
  const { pushToast } = useToast();

  const sourceLabel = useMemo(() => {
    if (!masReferenceTable) return null;
    return SOURCE_LABELS[masReferenceTable.source] ?? masReferenceTable.source.toUpperCase();
  }, [masReferenceTable]);

  const buildPayload = (): MasTrainingCalculateRequest => {
    return {
      reference_kmh: masReferenceTable!.reference_kmh,
      intensidad_pct_min: parseNumber(intensidadMin),
      intensidad_pct_max: parseNumber(intensidadMax),
      trabajo_s: parseNumber(trabajoS),
      serie_min: parseNumber(serieMin),
      bloques: parseNumber(bloques),
      macro_pausa_min: parseNumber(macroPausaMin),
      ratio: ratio.trim(),
      entrenamiento,
      cod: cod ? "SI" : "NO",
      shuttles: cod ? parseNumber(shuttles) : 0,
      fecha: date || null,
    };
  };

  const validate = (): string | null => {
    if (!masReferenceTable) return "Registrá un test 30-15, Yo-Yo o VAM para calcular MAS Training.";
    const parsedMin = parseNumber(intensidadMin);
    const parsedMax = parseNumber(intensidadMax);
    const parsedTrabajo = parseNumber(trabajoS);
    const parsedSerie = parseNumber(serieMin);
    const parsedBloques = parseNumber(bloques);
    const parsedMacro = parseNumber(macroPausaMin);
    const parsedShuttles = parseNumber(shuttles);

    if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax) || parsedMin <= 0 || parsedMax <= 0) {
      return "Ingresá un rango de intensidad % válido.";
    }
    if (parsedMin > parsedMax) return "La intensidad mínima no puede ser mayor que la máxima.";
    if (!ratio.includes(":")) return 'El ratio debe tener formato "N:M" (ej. 1:1).';
    if (!Number.isFinite(parsedTrabajo) || parsedTrabajo <= 0) return "Ingresá un tiempo de trabajo válido en segundos.";
    if (!Number.isFinite(parsedSerie) || parsedSerie <= 0) return "Ingresá una serie válida en minutos.";
    if (!Number.isInteger(parsedBloques) || parsedBloques <= 0) return "Los bloques deben ser un entero mayor a 0.";
    if (!Number.isFinite(parsedMacro) || parsedMacro < 0) return "Ingresá una macro pausa válida en minutos.";
    if (cod && (!Number.isFinite(parsedShuttles) || parsedShuttles < 0)) return "Ingresá un valor de shuttles válido.";
    return null;
  };

  if (!masReferenceTable) {
    return <EmptyReference>Registrá un test 30-15 IFT, Yo-Yo o VAM para calcular MAS Training.</EmptyReference>;
  }

  const submit = preventDefaultSubmit(async () => {
    setError(null);
    setSaveError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    try {
      setResult(await calculateMasTraining(buildPayload()));
    } catch (submitError: unknown) {
      setResult(null);
      setError(parseApiError(submitError, "No se pudo calcular la sesión. Intentá de nuevo."));
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
    setSaving(true);
    try {
      await saveTrainingSession(athleteId, "mas_training", date, buildPayload() as unknown as Record<string, unknown>);
      setLastSaved({
        result: { ...result },
        ratio: ratio.trim(),
        request: buildPayload() as unknown as Record<string, unknown>,
      });
      pushToast("success", "Sesión MAS Training guardada en el atleta.");
      onSessionSaved?.();
    } catch (err: unknown) {
      setSaveError(parseApiError(err, "No se pudo guardar la sesión."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-4xl">
      <InfoBanner title="MAS Training">
        Pausa pasiva. Métrica MAS: {sourceLabel} · {masReferenceTable.reference_kmh.toFixed(2)} km/h (prioridad 30-15 → Yo-Yo → VAM).
      </InfoBanner>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <CompactField id="mas-entrenamiento" label="Entrenamiento">
          <select
            id="mas-entrenamiento"
            value={entrenamiento}
            onChange={(e) => setEntrenamiento(e.target.value)}
            className={compactInputCls}
          >
            <option value="Intervalo Corto">Intervalo Corto</option>
            <option value="Intervalo Largo">Intervalo Largo</option>
          </select>
        </CompactField>

        <DateInputWithDisplay
          id="mas-fecha"
          label="Fecha"
          value={date}
          onChange={setDate}
          required
          showFormatHint={false}
          className={compactDateInputCls}
        />

        <CompactField id="mas-int-min" label="Intensidad mín (%)">
          <input
            id="mas-int-min"
            type="number"
            min="0"
            step="any"
            value={intensidadMin}
            onChange={(e) => setIntensidadMin(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="mas-int-max" label="Intensidad máx (%)">
          <input
            id="mas-int-max"
            type="number"
            min="0"
            step="any"
            value={intensidadMax}
            onChange={(e) => setIntensidadMax(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>

        {result ? <InlineMinMaxVelocityRitmo min={result.min} max={result.max} /> : null}

        <CompactField id="mas-ratio" label="Ratio">
          <input
            id="mas-ratio"
            type="text"
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
            placeholder="1:1"
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="mas-trabajo" label="Trabajo (s)">
          <input
            id="mas-trabajo"
            type="number"
            min="0"
            step="any"
            value={trabajoS}
            onChange={(e) => setTrabajoS(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="mas-serie" label="Serie (min)">
          <input
            id="mas-serie"
            type="number"
            min="0"
            step="any"
            value={serieMin}
            onChange={(e) => setSerieMin(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>
        <CompactField id="mas-macro" label="Macro pausa (min)">
          <input
            id="mas-macro"
            type="number"
            min="0"
            step="any"
            value={macroPausaMin}
            onChange={(e) => setMacroPausaMin(e.target.value)}
            className={compactInputCls}
          />
        </CompactField>

        {result ? <InlineMinMaxTrabajoPausa min={result.min} max={result.max} /> : null}

        <div className="col-span-full grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <p className="mb-0.5 block text-[11px] font-medium text-slate-500 invisible" aria-hidden="true">
              COD
            </p>
            <label htmlFor="mas-cod" className={`${compactInputCls} flex w-full cursor-pointer items-center gap-2`}>
              <input
                id="mas-cod"
                type="checkbox"
                checked={cod}
                onChange={(e) => setCod(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-800">
                COD <span className="text-slate-500">({cod ? "SI" : "NO"})</span>
              </span>
            </label>
          </div>
          <CompactField id="mas-shuttles" label="Shuttles">
            <input
              id="mas-shuttles"
              type="number"
              min="0"
              step="any"
              value={cod ? shuttles : "0"}
              onChange={(e) => setShuttles(e.target.value)}
              disabled={!cod}
              className={compactInputClassName(!cod)}
            />
          </CompactField>
          <CompactField id="mas-bloques" label="Bloques">
            <input
              id="mas-bloques"
              type="number"
              min="1"
              step="1"
              value={bloques}
              onChange={(e) => setBloques(e.target.value)}
              className={compactInputCls}
            />
          </CompactField>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        COD: cambio de dirección. En MAS Training, cada shuttle resta tiempo de trabajo (menos metros cubiertos).
      </p>

      <SessionFormActions loading={loading} saving={saving} canSave={result !== null} onSave={() => void saveSession()} />
      <FormError message={error} />
      <FormError message={saveError} />

      {lastSaved ? <MasTrainingSessionSummaryCard snapshot={lastSaved} /> : null}
    </form>
  );
}