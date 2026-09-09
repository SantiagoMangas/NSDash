"use client";

import { useMemo, useState } from "react";
import { calculateHiitCorto, type HiitCortoCalculateResponse } from "@/lib/api/sessions";
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
  formatDensidadMmSs,
  inputClassName,
  parseNumber,
  preventDefaultSubmit,
} from "./sessionFormUi";

type Props = {
  hiitReferenceTable: IntervalTable | null;
};

export function HiitCortoForm({ hiitReferenceTable }: Props) {
  const [intensidadMin, setIntensidadMin] = useState("90");
  const [intensidadMax, setIntensidadMax] = useState("110");
  const [distanciaM, setDistanciaM] = useState("200");
  const [reps, setReps] = useState("4");
  const [series, setSeries] = useState("2");
  const [macroPausaMin, setMacroPausaMin] = useState("3");
  const [ratio, setRatio] = useState("1:2");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HiitCortoCalculateResponse | null>(null);

  const sourceLabel = useMemo(() => {
    if (!hiitReferenceTable) return null;
    return SOURCE_LABELS[hiitReferenceTable.source] ?? hiitReferenceTable.source.toUpperCase();
  }, [hiitReferenceTable]);

  if (!hiitReferenceTable) {
    return <EmptyReference>Registrá un test VAM, 30-15 IFT o Yo-Yo para calcular HIIT Corto.</EmptyReference>;
  }

  const submit = preventDefaultSubmit(async () => {
    setError(null);
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
    if (!Number.isInteger(parsed.reps) || parsed.reps <= 0 || !Number.isInteger(parsed.series) || parsed.series <= 0) {
      setError("Reps y series deben ser enteros mayores a 0.");
      return;
    }
    if (!Number.isFinite(parsed.macro) || parsed.macro < 0) {
      setError("Ingresá una macro pausa válida.");
      return;
    }

    setLoading(true);
    try {
      setResult(
        await calculateHiitCorto({
          reference_kmh: hiitReferenceTable.reference_kmh,
          intensidad_pct_min: parsed.min,
          intensidad_pct_max: parsed.max,
          distancia_m: parsed.distancia,
          reps: parsed.reps,
          series: parsed.series,
          macro_pausa_min: parsed.macro,
          ratio: ratio.trim(),
        }),
      );
    } catch (err: unknown) {
      setResult(null);
      setError(parseApiError(err, "No se pudo calcular HIIT Corto."));
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <InfoBanner title="HIIT Corto">
        Distancia fija → tiempo. Métrica: {sourceLabel} · {hiitReferenceTable.reference_kmh.toFixed(2)} km/h
        (prioridad VAM → 30-15 → Yo-Yo).
      </InfoBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="hiit-corto-int-min" label="Intensidad mín (%)">
          <input id="hiit-corto-int-min" type="number" min="0" step="any" value={intensidadMin} onChange={(e) => setIntensidadMin(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-corto-int-max" label="Intensidad máx (%)">
          <input id="hiit-corto-int-max" type="number" min="0" step="any" value={intensidadMax} onChange={(e) => setIntensidadMax(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-corto-distancia" label="Distancia (m)">
          <input id="hiit-corto-distancia" type="number" min="0" step="any" value={distanciaM} onChange={(e) => setDistanciaM(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-corto-ratio" label="Ratio (N:M)">
          <input id="hiit-corto-ratio" type="text" value={ratio} onChange={(e) => setRatio(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-corto-reps" label="Reps">
          <input id="hiit-corto-reps" type="number" min="1" step="1" value={reps} onChange={(e) => setReps(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-corto-series" label="Cantidad de Series">
          <input id="hiit-corto-series" type="number" min="1" step="1" value={series} onChange={(e) => setSeries(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-corto-macro" label="Macro Pausa (min)">
          <input id="hiit-corto-macro" type="number" min="0" step="any" value={macroPausaMin} onChange={(e) => setMacroPausaMin(e.target.value)} className={inputClassName()} />
        </Field>
      </div>

      <CalculateButton loading={loading} />
      <FormError message={error} />
      {result && (
        <ResultTable
          summary=""
          columns={[
            { key: "vel", header: "Velocidad", min: `${result.min.velocidad_kmh.toFixed(2)} km/h`, max: `${result.max.velocidad_kmh.toFixed(2)} km/h` },
            { key: "ritmo", header: "Ritmo", min: result.min.ritmo_str, max: result.max.ritmo_str },
            { key: "trab", header: "Trabajo", min: `${result.min.trabajo_s.toFixed(2)} s`, max: `${result.max.trabajo_s.toFixed(2)} s` },
            { key: "pausa", header: "Pausa", min: `${result.min.pausa_s.toFixed(2)} s`, max: `${result.max.pausa_s.toFixed(2)} s` },
          ]}
          sessionStats={[
            { label: "Volumen", value: `${result.volumen_m} m` },
            { label: "Densidad", value: formatDensidadMmSs(result.densidad_min) },
          ]}
        />
      )}
    </form>
  );
}
