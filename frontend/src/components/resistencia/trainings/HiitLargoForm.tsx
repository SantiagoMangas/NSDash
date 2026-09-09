"use client";

import { useMemo, useState } from "react";
import { calculateHiitLargo, type HiitLargoCalculateResponse } from "@/lib/api/sessions";
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

export function HiitLargoForm({ hiitReferenceTable }: Props) {
  const [intensidadMin, setIntensidadMin] = useState("80");
  const [intensidadMax, setIntensidadMax] = useState("95");
  const [distanciaM, setDistanciaM] = useState("400");
  const [reps, setReps] = useState("4");
  const [series, setSeries] = useState("2");
  const [macroPausaMin, setMacroPausaMin] = useState("3");
  const [ratio, setRatio] = useState("1:1");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HiitLargoCalculateResponse | null>(null);

  const sourceLabel = useMemo(() => {
    if (!hiitReferenceTable) return null;
    return SOURCE_LABELS[hiitReferenceTable.source] ?? hiitReferenceTable.source.toUpperCase();
  }, [hiitReferenceTable]);

  if (!hiitReferenceTable) {
    return <EmptyReference>Registrá un test VAM, 30-15 IFT o Yo-Yo para calcular HIIT Largo.</EmptyReference>;
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
        await calculateHiitLargo({
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
      setError(parseApiError(err, "No se pudo calcular HIIT Largo."));
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <InfoBanner title="HIIT Largo">
        Distancia fija → tiempo. Métrica: {sourceLabel} · {hiitReferenceTable.reference_kmh.toFixed(2)} km/h
        (prioridad VAM → 30-15 → Yo-Yo).
      </InfoBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="hiit-largo-int-min" label="Intensidad mín (%)">
          <input id="hiit-largo-int-min" type="number" min="0" step="any" value={intensidadMin} onChange={(e) => setIntensidadMin(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-largo-int-max" label="Intensidad máx (%)">
          <input id="hiit-largo-int-max" type="number" min="0" step="any" value={intensidadMax} onChange={(e) => setIntensidadMax(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-largo-distancia" label="Distancia (m)">
          <input id="hiit-largo-distancia" type="number" min="0" step="any" value={distanciaM} onChange={(e) => setDistanciaM(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-largo-ratio" label="Ratio (N:M)">
          <input id="hiit-largo-ratio" type="text" value={ratio} onChange={(e) => setRatio(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-largo-reps" label="Reps">
          <input id="hiit-largo-reps" type="number" min="1" step="1" value={reps} onChange={(e) => setReps(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-largo-series" label="Cantidad de Series">
          <input id="hiit-largo-series" type="number" min="1" step="1" value={series} onChange={(e) => setSeries(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-largo-macro" label="Macro Pausa (min)">
          <input id="hiit-largo-macro" type="number" min="0" step="any" value={macroPausaMin} onChange={(e) => setMacroPausaMin(e.target.value)} className={inputClassName()} />
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
            { key: "trab", header: "Trabajo", min: result.min.trabajo_str, max: result.max.trabajo_str },
            { key: "pausa", header: "Pausa", min: result.min.pausa_str, max: result.max.pausa_str },
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
