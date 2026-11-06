"use client";

import { useMemo, useState, type ReactNode } from "react";
import { calculateTempoRun, type TempoRunCalculateResponse } from "@/lib/api/sessions";
import { DateInputWithDisplay } from "@/components/ui/DateInputWithDisplay";
import { getTodayDate } from "@/lib/date";
import type { IntervalTable } from "@/lib/types";
import { parseApiError } from "@/lib/utils";
import {
  CalculateButton,
  EmptyReference,
  FormError,
  InfoBanner,
  SOURCE_LABELS,
  parseNumber,
  preventDefaultSubmit,
} from "./sessionFormUi";

type Props = {
  speedTestTable: IntervalTable | null;
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

function InlineResultsAfterIntensity({ r }: { r: TempoRunCalculateResponse }) {
  return (
    <div className="col-span-full grid gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-2 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}

function SessionSummaryFooter({ r }: { r: TempoRunCalculateResponse }) {
  return (
    <div className="col-span-full space-y-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Resumen de sesión</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[10px] text-slate-500">Volumen serie</p>
          <p className="text-sm font-semibold text-slate-900">{r.volumen_serie_m.toFixed(2)} m</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Volumen trabajo</p>
          <p className="text-sm font-semibold text-slate-900">{r.volumen_trabajo_m.toFixed(2)} m</p>
        </div>
      </div>
      <p className="text-xs text-slate-600">
        {r.entrenamiento} · COD {r.cod}
        {r.cod === "SI" ? ` · Shuttles ${r.shuttles}` : ""} · Dist. trabajo {r.distancia_m} m · Dist. ajustada{" "}
        {r.distancia_ajustada_m} m · Pausa {r.pausa_m} m · {r.series} series × {r.bloques} bloques
      </p>
    </div>
  );
}

export function TempoRunForm({ speedTestTable }: Props) {
  const [entrenamiento, setEntrenamiento] = useState("Extensivo");
  const [date, setDate] = useState(getTodayDate);
  const [intensidadMin, setIntensidadMin] = useState("70");
  const [intensidadMax, setIntensidadMax] = useState("80");
  const [ratio, setRatio] = useState("1:2");
  const [distanciaM, setDistanciaM] = useState("100");
  const [pausaM, setPausaM] = useState("100");
  const [cod, setCod] = useState(false);
  const [shuttles, setShuttles] = useState("1");
  const [series, setSeries] = useState("8");
  const [bloques, setBloques] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TempoRunCalculateResponse | null>(null);

  const sourceLabel = useMemo(() => {
    if (!speedTestTable) return null;
    return SOURCE_LABELS[speedTestTable.source] ?? speedTestTable.source.toUpperCase();
  }, [speedTestTable]);

  if (!speedTestTable) {
    return <EmptyReference>Registrá un Test de Velocidad (MSS) para calcular Tempo Run.</EmptyReference>;
  }

  const submit = preventDefaultSubmit(async () => {
    setError(null);
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
      setResult(
        await calculateTempoRun({
          reference_kmh: speedTestTable.reference_kmh,
          intensidad_pct_min: parsed.min,
          intensidad_pct_max: parsed.max,
          distancia_m: parsed.distancia,
          pausa_m: parsed.pausa,
          series: parsed.series,
          bloques: parsed.bloques,
          ratio: ratio.trim(),
          entrenamiento,
          cod: cod ? "SI" : "NO",
          shuttles: cod ? parsed.shuttles : 0,
          fecha: date || null,
        }),
      );
    } catch (err: unknown) {
      setResult(null);
      setError(parseApiError(err, "No se pudo calcular Tempo Run."));
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3">
      <InfoBanner title="Tempo Run">
        Pausa activa, distancia de pausa manual. Métrica MMSS: {sourceLabel} ·{" "}
        {speedTestTable.reference_kmh.toFixed(2)} km/h (Speed Test de referencia).
      </InfoBanner>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            onChange={(e) => setRatio(e.target.value)}
            placeholder="ej. 1:1"
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
            onChange={(e) => setDistanciaM(e.target.value)}
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

        <label
          htmlFor="tempo-cod"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-800 sm:col-span-2 lg:col-span-1"
        >
          <input
            id="tempo-cod"
            type="checkbox"
            checked={cod}
            onChange={(e) => setCod(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-xs">
            COD <span className="text-slate-500">({cod ? "SI" : "NO"})</span>
          </span>
        </label>
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
        </TempoField>
      </div>

      <p className="text-[11px] text-slate-500">
        COD: cambio de dirección. Cada shuttle suma tiempo de trabajo (gira sobre la misma distancia).
      </p>

      <CalculateButton loading={loading} />
      <FormError message={error} />

      {result ? <SessionSummaryFooter r={result} /> : null}
    </form>
  );
}
