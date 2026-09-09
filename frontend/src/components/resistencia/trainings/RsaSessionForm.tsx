"use client";

import { useMemo, useState } from "react";
import { calculateRsa, type RsaCalculateResponse } from "@/lib/api/sessions";
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

export function RsaSessionForm({ speedTestTable }: Props) {
  const [entrenamiento, setEntrenamiento] = useState("RST");
  const [intensidadMin, setIntensidadMin] = useState("80");
  const [intensidadMax, setIntensidadMax] = useState("90");
  const [distanciaM, setDistanciaM] = useState("30");
  const [reps, setReps] = useState("6");
  const [series, setSeries] = useState("2");
  const [ratio, setRatio] = useState("1:5");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RsaCalculateResponse | null>(null);

  const sourceLabel = useMemo(() => {
    if (!speedTestTable) return null;
    return SOURCE_LABELS[speedTestTable.source] ?? speedTestTable.source.toUpperCase();
  }, [speedTestTable]);

  if (!speedTestTable) {
    return <EmptyReference>Registrá un Test de Velocidad (MSS) para calcular RST / SIT.</EmptyReference>;
  }

  const submit = preventDefaultSubmit(async () => {
    setError(null);
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
    if (!Number.isInteger(parsed.reps) || parsed.reps <= 0 || !Number.isInteger(parsed.series) || parsed.series <= 0) {
      setError("Reps y series deben ser enteros mayores a 0.");
      return;
    }

    setLoading(true);
    try {
      setResult(
        await calculateRsa({
          reference_kmh: speedTestTable.reference_kmh,
          intensidad_pct_min: parsed.min,
          intensidad_pct_max: parsed.max,
          distancia_m: parsed.distancia,
          reps: parsed.reps,
          series: parsed.series,
          ratio: ratio.trim(),
          entrenamiento,
        }),
      );
    } catch (err: unknown) {
      setResult(null);
      setError(parseApiError(err, "No se pudo calcular RST / SIT."));
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <InfoBanner title="RSA">
        Distancia fija → tiempo. Métrica MMSS: {sourceLabel} · {speedTestTable.reference_kmh.toFixed(2)} km/h
        (Speed Test de referencia).
      </InfoBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="rsa-entrenamiento" label="Entrenamiento">
          <select id="rsa-entrenamiento" value={entrenamiento} onChange={(e) => setEntrenamiento(e.target.value)} className={inputClassName()}>
            <option value="RST">RST</option>
            <option value="SIT">SIT</option>
          </select>
        </Field>
        <Field id="rsa-ratio" label="Ratio (N:M)">
          <input id="rsa-ratio" type="text" value={ratio} onChange={(e) => setRatio(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="rsa-int-min" label="Intensidad mín (%)">
          <input id="rsa-int-min" type="number" min="0" step="any" value={intensidadMin} onChange={(e) => setIntensidadMin(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="rsa-int-max" label="Intensidad máx (%)">
          <input id="rsa-int-max" type="number" min="0" step="any" value={intensidadMax} onChange={(e) => setIntensidadMax(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="rsa-distancia" label="Distancia (m)">
          <input id="rsa-distancia" type="number" min="0" step="any" value={distanciaM} onChange={(e) => setDistanciaM(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="rsa-reps" label="Reps">
          <input id="rsa-reps" type="number" min="1" step="1" value={reps} onChange={(e) => setReps(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="rsa-series" label="Cantidad de Series">
          <input id="rsa-series" type="number" min="1" step="1" value={series} onChange={(e) => setSeries(e.target.value)} className={inputClassName()} />
        </Field>
      </div>

      <CalculateButton loading={loading} />
      <FormError message={error} />
      {result && (
        <ResultTable
          summary={result.entrenamiento}
          columns={[
            { key: "vel", header: "Velocidad", min: `${result.min.velocidad_kmh.toFixed(2)} km/h`, max: `${result.max.velocidad_kmh.toFixed(2)} km/h` },
            { key: "ritmo", header: "Ritmo", min: result.min.ritmo_str, max: result.max.ritmo_str },
            { key: "trab", header: "Trabajo", min: `${result.min.trabajo_s.toFixed(2)} s`, max: `${result.max.trabajo_s.toFixed(2)} s` },
            { key: "pausa", header: "Pausa", min: `${result.min.pausa_s.toFixed(2)} s`, max: `${result.max.pausa_s.toFixed(2)} s` },
          ]}
          sessionStats={[
            { label: "Volumen Serie", value: `${result.volumen_serie_m} m` },
            { label: "Volumen Trabajo", value: `${result.volumen_trabajo_m} m` },
          ]}
        />
      )}
    </form>
  );
}
