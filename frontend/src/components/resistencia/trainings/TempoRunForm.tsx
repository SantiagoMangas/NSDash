"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  calculateTempoRun,
  saveTempoRunSession,
  type TempoRunCalculateResponse,
} from "@/lib/api/sessions";
import { useToast } from "@/contexts/ToastContext";
import { DateInputWithDisplay } from "@/components/ui/DateInputWithDisplay";
import { getTodayDate } from "@/lib/date";
import type { IntervalTable } from "@/lib/types";
import { parseApiError } from "@/lib/utils";
import {
  EmptyReference,
  FormError,
  InfoBanner,
  SessionFormActions,
  SOURCE_LABELS,
  parseNumber,
  preventDefaultSubmit,
} from "./sessionFormUi";
import {
  TempoRunSessionSummaryCard,
  type TempoRunSavedSnapshot,
} from "./TempoRunSessionSummaryCard";

type Props = {
  athleteId: number;
  speedTestTable: IntervalTable | null;
  onSessionSaved?: () => void;
};

function TempoField({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[11px] font-medium text-slate-500 mb-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60";

/** Altura fija bajo inputs de la fila COD para que no se desplace al activar COD. */
const codRowHintCls = "mt-1 min-h-[2rem] text-[11px] leading-4";

/** Metros de trabajo por cada unidad del primer término del ratio (trabajo:pausa). */
const METERS_PER_RATIO_PART = 100;

function formatMeters(meters: number): string {
  const rounded = Math.round(meters * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function parseRatioParts(ratio: string): { a: number; b: number } | null {
  const parts = ratio.split(":");
  if (parts.length !== 2) return null;

  const normalized = parts.map((part) => {
    const token = part.trim().replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(token)) return null;
    const value = Number(token);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  });

  if (normalized[0] === null || normalized[1] === null) return null;
  return { a: normalized[0], b: normalized[1] };
}

function trabajoMetersFromRatioNumerador(a: number): number {
  if (a <= 2) return METERS_PER_RATIO_PART;
  return a * METERS_PER_RATIO_PART;
}

function pausaMetersFromTrabajoAndRatio(trabajoM: number, ratio: string): number | null {
  const parts = parseRatioParts(ratio);
  if (!parts) return null;
  return trabajoM * (parts.b / parts.a);
}

function distanciaAjustadaMeters(distanciaM: number, cod: boolean, shuttles: number): number | null {
  if (!Number.isFinite(distanciaM) || distanciaM <= 0) return null;
  if (!cod) return distanciaM;
  if (!Number.isFinite(shuttles) || shuttles < 0) return null;
  return distanciaM / (shuttles + 1);
}

function InlineResultsAfterIntensity({ r }: { r: TempoRunCalculateResponse }) {
  return (
    <div className="col-span-full grid gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="hidden min-w-0 lg:block" aria-hidden="true" />
      <div className="hidden min-w-0 lg:block" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Velocidad</p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Mín</span> {r.min.velocidad_kmh.toFixed(2)} km/h
        </p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Máx</span> {r.max.velocidad_kmh.toFixed(2)} km/h
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Ritmo</p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Mín</span> {r.min.ritmo_str}
        </p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Máx</span> {r.max.ritmo_str}
        </p>
      </div>
    </div>
  );
}

function InlineResultsTimes({ r }: { r: TempoRunCalculateResponse }) {
  return (
    <div className="col-span-full grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Trabajo</p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Mín</span> {r.min.trabajo_str} ({r.min.trabajo_s.toFixed(2)} s)
        </p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Máx</span> {r.max.trabajo_str} ({r.max.trabajo_s.toFixed(2)} s)
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Pausa</p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Mín</span> {r.min.pausa_str} ({r.min.pausa_s.toFixed(2)} s)
        </p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Máx</span> {r.max.pausa_str} ({r.max.pausa_s.toFixed(2)} s)
        </p>
      </div>
      <div className="hidden min-w-0 lg:block" aria-hidden="true" />
      <div className="hidden min-w-0 lg:block" aria-hidden="true" />
    </div>
  );
}

export function TempoRunForm({ athleteId, speedTestTable, onSessionSaved }: Props) {
  const [entrenamiento, setEntrenamiento] = useState("Extensivo");
  const [date, setDate] = useState(getTodayDate);
  const [intensidadMin, setIntensidadMin] = useState("70");
  const [intensidadMax, setIntensidadMax] = useState("80");
  const [ratio, setRatio] = useState("1:2");
  const [distanciaM, setDistanciaM] = useState("100");
  const [pausaM, setPausaM] = useState("200");
  const [cod, setCod] = useState(false);
  const [shuttles, setShuttles] = useState("1");
  const [series, setSeries] = useState("8");
  const [bloques, setBloques] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<TempoRunCalculateResponse | null>(null);
  const [lastSaved, setLastSaved] = useState<TempoRunSavedSnapshot | null>(null);
  const { pushToast } = useToast();

  const sourceLabel = useMemo(() => {
    if (!speedTestTable) return null;
    return SOURCE_LABELS[speedTestTable.source] ?? speedTestTable.source.toUpperCase();
  }, [speedTestTable]);

  const distanciaAjustadaPreview = useMemo(() => {
    const dist = parseNumber(distanciaM);
    const shuttlesNum = cod ? parseNumber(shuttles) : 0;
    const meters = distanciaAjustadaMeters(dist, cod, shuttlesNum);
    if (meters === null) return null;
    return formatMeters(meters);
  }, [distanciaM, cod, shuttles]);

  const buildCalculatePayload = () => {
    const parsed = {
      min: parseNumber(intensidadMin),
      max: parseNumber(intensidadMax),
      distancia: parseNumber(distanciaM),
      pausa: parseNumber(pausaM),
      series: parseNumber(series),
      bloques: parseNumber(bloques),
      shuttles: parseNumber(shuttles),
    };
    return {
      reference_kmh: speedTestTable!.reference_kmh,
      intensidad_pct_min: parsed.min,
      intensidad_pct_max: parsed.max,
      distancia_m: parsed.distancia,
      pausa_m: parsed.pausa,
      series: parsed.series,
      bloques: parsed.bloques,
      ratio: ratio.trim(),
      entrenamiento,
      cod: cod ? ("SI" as const) : ("NO" as const),
      shuttles: cod ? parsed.shuttles : 0,
      fecha: date || null,
    };
  };

  const updateRatio = (nextRatio: string) => {
    const prevParts = parseRatioParts(ratio);
    const nextParts = parseRatioParts(nextRatio);
    setRatio(nextRatio);
    if (!nextParts) return;

    const primerValorCambio = !prevParts || prevParts.a !== nextParts.a;
    let trabajoM: number;
    if (primerValorCambio) {
      trabajoM = trabajoMetersFromRatioNumerador(nextParts.a);
    } else {
      const actual = parseNumber(distanciaM);
      trabajoM =
        Number.isFinite(actual) && actual > 0 ? actual : trabajoMetersFromRatioNumerador(nextParts.a);
    }

    const pausaMeters = pausaMetersFromTrabajoAndRatio(trabajoM, nextRatio);
    if (pausaMeters === null) return;

    setDistanciaM(formatMeters(trabajoM));
    setPausaM(formatMeters(pausaMeters));
  };

  const updateDistanciaTrabajo = (nextDistancia: string) => {
    setDistanciaM(nextDistancia);
    const trabajoM = parseNumber(nextDistancia);
    if (!Number.isFinite(trabajoM) || trabajoM <= 0) return;
    const pausaMeters = pausaMetersFromTrabajoAndRatio(trabajoM, ratio);
    if (pausaMeters === null) return;
    setPausaM(formatMeters(pausaMeters));
  };

  if (!speedTestTable) {
    return <EmptyReference>Registrá un Test de Velocidad (MSS) para calcular Tempo Run.</EmptyReference>;
  }

  const submit = preventDefaultSubmit(async () => {
    setError(null);
    setSaveError(null);
    const parsed = {
      min: parseNumber(intensidadMin),
      max: parseNumber(intensidadMax),
      distancia: parseNumber(distanciaM),
      pausa: parseNumber(pausaM),
      series: parseNumber(series),
      bloques: parseNumber(bloques),
      shuttles: parseNumber(shuttles),
    };
    if (!Number.isFinite(parsed.min) || !Number.isFinite(parsed.max) || parsed.min <= 0 || parsed.max <= 0) {
      setError("Ingresá un rango de intensidad % válido.");
      return;
    }
    if (!ratio.includes(":")) {
      setError('El ratio debe incluir dos puntos (ej. 1:1 o 1:2 = trabajo : pausa).');
      return;
    }
    if (!Number.isFinite(parsed.distancia) || parsed.distancia <= 0) {
      setError("Ingresá una distancia de trabajo válida.");
      return;
    }
    if (!Number.isFinite(parsed.pausa) || parsed.pausa < 0) {
      setError("Ingresá una pausa (m) válida.");
      return;
    }
    if (
      !Number.isInteger(parsed.series) ||
      parsed.series <= 0 ||
      !Number.isInteger(parsed.bloques) ||
      parsed.bloques <= 0
    ) {
      setError("Series y bloques deben ser enteros mayores a 0.");
      return;
    }
    if (cod && (!Number.isFinite(parsed.shuttles) || parsed.shuttles < 0)) {
      setError("Ingresá un valor de shuttles válido.");
      return;
    }

    setLoading(true);
    try {
      setResult(await calculateTempoRun(buildCalculatePayload()));
    } catch (err: unknown) {
      setResult(null);
      setError(parseApiError(err, "No se pudo calcular Tempo Run."));
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
      await saveTempoRunSession(athleteId, buildCalculatePayload());
      setLastSaved({ result: { ...result }, ratio: ratio.trim() });
      pushToast("success", "Sesión Tempo Run guardada en el atleta.");
      onSessionSaved?.();
    } catch (err: unknown) {
      setSaveError(parseApiError(err, "No se pudo guardar la sesión."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-4xl">
      <InfoBanner title="Tempo Run">
        Pausa activa. El primer término del ratio fija la distancia de trabajo (100 m por unidad); el segundo ajusta la
        pausa en forma proporcional (ej. 1:2 → 100 m y 200 m; 2:1 con 100 m de trabajo → 50 m de pausa). Métrica MMSS:{" "}
        {sourceLabel} ·{" "}
        {speedTestTable.reference_kmh.toFixed(2)} km/h (Speed Test de referencia).
      </InfoBanner>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <TempoField id="tempo-entrenamiento" label="Entrenamiento">
          <select
            id="tempo-entrenamiento"
            value={entrenamiento}
            onChange={(e) => setEntrenamiento(e.target.value)}
            className={inputCls}
          >
            <option value="Extensivo">Extensivo</option>
            <option value="I. Recovery">I. Recovery</option>
          </select>
        </TempoField>

        <DateInputWithDisplay
          id="tempo-fecha"
          label="Fecha"
          value={date}
          onChange={setDate}
          required
          showFormatHint={false}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200"
        />

        <TempoField id="tempo-int-min" label="Intensidad mín (%)">
          <input
            id="tempo-int-min"
            type="number"
            min="0"
            step="any"
            value={intensidadMin}
            onChange={(e) => setIntensidadMin(e.target.value)}
            className={inputCls}
          />
        </TempoField>
        <TempoField id="tempo-int-max" label="Intensidad máx (%)">
          <input
            id="tempo-int-max"
            type="number"
            min="0"
            step="any"
            value={intensidadMax}
            onChange={(e) => setIntensidadMax(e.target.value)}
            className={inputCls}
          />
        </TempoField>

        {result ? <InlineResultsAfterIntensity r={result} /> : null}

        <TempoField id="tempo-ratio" label="Ratio">
          <input
            id="tempo-ratio"
            type="text"
            value={ratio}
            onChange={(e) => updateRatio(e.target.value)}
            placeholder="ej. 1:2"
            className={inputCls}
          />
        </TempoField>
        <TempoField id="tempo-distancia" label="Distancia trabajo (m)">
          <input
            id="tempo-distancia"
            type="number"
            min="0"
            step="any"
            value={distanciaM}
            onChange={(e) => updateDistanciaTrabajo(e.target.value)}
            className={inputCls}
          />
        </TempoField>
        <TempoField id="tempo-pausa-m" label="Distancia pausa (m)">
          <input
            id="tempo-pausa-m"
            type="number"
            min="0"
            step="any"
            value={pausaM}
            onChange={(e) => setPausaM(e.target.value)}
            className={inputCls}
          />
        </TempoField>

        {result ? <InlineResultsTimes r={result} /> : null}

        <div className="col-span-full grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <p className="mb-0.5 block text-[11px] font-medium text-slate-500 invisible" aria-hidden="true">
              COD
            </p>
            <label
              htmlFor="tempo-cod"
              className={`${inputCls} flex w-full cursor-pointer items-center gap-2`}
            >
              <input
                id="tempo-cod"
                type="checkbox"
                checked={cod}
                onChange={(e) => setCod(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-800">
                COD <span className="text-slate-500">({cod ? "SI" : "NO"})</span>
              </span>
            </label>
            <p className={`${codRowHintCls} invisible`} aria-hidden="true">
              —
            </p>
          </div>
          <TempoField id="tempo-shuttles" label="Shuttles">
            <input
              id="tempo-shuttles"
              type="number"
              min="0"
              step="any"
              value={cod ? shuttles : "0"}
              onChange={(e) => setShuttles(e.target.value)}
              disabled={!cod}
              className={inputCls}
            />
            <p
              className={`${codRowHintCls} ${cod && distanciaAjustadaPreview ? "text-slate-600" : "invisible"}`}
              aria-hidden={!cod || !distanciaAjustadaPreview}
            >
              Dist. ajustada:{" "}
              <span className="font-semibold text-slate-900">
                {distanciaAjustadaPreview ?? "0"} m
              </span>
            </p>
          </TempoField>
          <TempoField id="tempo-series" label="Series">
            <input
              id="tempo-series"
              type="number"
              min="1"
              step="1"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              className={inputCls}
            />
            <p className={`${codRowHintCls} invisible`} aria-hidden="true">
              —
            </p>
          </TempoField>
          <TempoField id="tempo-bloques" label="Bloques">
            <input
              id="tempo-bloques"
              type="number"
              min="1"
              step="1"
              value={bloques}
              onChange={(e) => setBloques(e.target.value)}
              className={inputCls}
            />
            <p className={`${codRowHintCls} invisible`} aria-hidden="true">
              —
            </p>
          </TempoField>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        COD: cambio de dirección. Cada shuttle suma tiempo de trabajo (gira sobre la misma distancia).
      </p>

      <SessionFormActions
        loading={loading}
        saving={saving}
        canSave={result !== null}
        onSave={() => void saveSession()}
      />
      <FormError message={error} />
      <FormError message={saveError} />

      {lastSaved ? <TempoRunSessionSummaryCard snapshot={lastSaved} /> : null}
    </form>
  );
}