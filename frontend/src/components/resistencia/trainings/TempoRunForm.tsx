"use client";

import { useMemo, useState } from "react";
import { calculateTempoRun, type TempoRunCalculateResponse } from "@/lib/api/sessions";
import { getTodayDate } from "@/lib/date";
import type { IntervalTable } from "@/lib/types";
import { parseApiError } from "@/lib/utils";
import {
  CalculateButton,
  EmptyReference,
  Field,
  FormError,
  InfoBanner,
  ResultTable,
  SOURCE_LABELS,
  inputClassName,
  parseNumber,
  preventDefaultSubmit,
} from "./sessionFormUi";

type Props = {
  speedTestTable: IntervalTable | null;
};

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
      setError('El ratio debe tener formato "N:M".');
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
    if (!Number.isInteger(parsed.series) || parsed.series <= 0 || !Number.isInteger(parsed.bloques) || parsed.bloques <= 0) {
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
    <form onSubmit={submit} className="space-y-4">
      <InfoBanner title="Tempo Run">
        Pausa activa, distancia de pausa manual. Métrica MMSS: {sourceLabel} · {speedTestTable.reference_kmh.toFixed(2)} km/h
        (Speed Test de referencia).
      </InfoBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tempo-entrenamiento" label="Entrenamiento">
          <select id="tempo-entrenamiento" value={entrenamiento} onChange={(e) => setEntrenamiento(e.target.value)} className={inputClassName()}>
            <option value="Extensivo">Extensivo</option>
            <option value="I. Recovery">I. Recovery</option>
          </select>
        </Field>
        <Field id="tempo-fecha" label="Fecha">
          <input
            id="tempo-fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-full"
          />
        </Field>
        <Field id="tempo-int-min" label="Intensidad mín (%)">
          <input id="tempo-int-min" type="number" min="0" step="any" value={intensidadMin} onChange={(e) => setIntensidadMin(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="tempo-int-max" label="Intensidad máx (%)">
          <input id="tempo-int-max" type="number" min="0" step="any" value={intensidadMax} onChange={(e) => setIntensidadMax(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="tempo-ratio" label="Ratio (N:M)">
          <input id="tempo-ratio" type="text" value={ratio} onChange={(e) => setRatio(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="tempo-distancia" label="Distancia de trabajo (m)">
          <input id="tempo-distancia" type="number" min="0" step="any" value={distanciaM} onChange={(e) => setDistanciaM(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="tempo-pausa-m" label="Distancia en pausa (m)">
          <input id="tempo-pausa-m" type="number" min="0" step="any" value={pausaM} onChange={(e) => setPausaM(e.target.value)} className={inputClassName()} />
        </Field>
        <label htmlFor="tempo-cod" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <input
            id="tempo-cod"
            type="checkbox"
            checked={cod}
            onChange={(e) => setCod(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            COD
            <span className="ml-2 text-xs text-slate-500">{cod ? "SI" : "NO"}</span>
          </span>
        </label>
        <Field id="tempo-shuttles" label="Shuttles">
          <input
            id="tempo-shuttles"
            type="number"
            min="0"
            step="any"
            value={cod ? shuttles : "0"}
            onChange={(e) => setShuttles(e.target.value)}
            disabled={!cod}
            className={inputClassName(!cod)}
          />
        </Field>
        <Field id="tempo-series" label="Cantidad de Series">
          <input id="tempo-series" type="number" min="1" step="1" value={series} onChange={(e) => setSeries(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="tempo-bloques" label="Bloques">
          <input id="tempo-bloques" type="number" min="1" step="1" value={bloques} onChange={(e) => setBloques(e.target.value)} className={inputClassName()} />
        </Field>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        COD: cambio de dirección. En Tempo Run, cada shuttle suma tiempo de trabajo (la distancia es fija y el giro agrega segundos).
      </p>

      <CalculateButton loading={loading} />
      <FormError message={error} />
      {result && (
        <ResultTable
          summary={`${result.entrenamiento} · COD ${result.cod}${result.cod === "SI" ? ` · Shuttles ${result.shuttles}` : ""} · Dist. ajustada ${result.distancia_ajustada_m} m`}
          columns={[
            { key: "vel", header: "Velocidad", min: `${result.min.velocidad_kmh.toFixed(2)} km/h`, max: `${result.max.velocidad_kmh.toFixed(2)} km/h` },
            { key: "ritmo", header: "Ritmo", min: result.min.ritmo_str, max: result.max.ritmo_str },
            { key: "trab", header: "Trabajo", min: `${result.min.trabajo_s.toFixed(2)} s`, max: `${result.max.trabajo_s.toFixed(2)} s` },
            { key: "pausa", header: "Pausa", min: `${result.min.pausa_s.toFixed(2)} s`, max: `${result.max.pausa_s.toFixed(2)} s` },
          ]}
          sessionStats={[
            { label: "Volumen Serie", value: `${result.volumen_serie_m.toFixed(2)} m` },
            { label: "Volumen Trabajo", value: `${result.volumen_trabajo_m.toFixed(2)} m` },
          ]}
        />
      )}
    </form>
  );
}
