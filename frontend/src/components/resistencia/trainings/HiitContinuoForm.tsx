"use client";

import { useMemo, useState } from "react";
import {
  calculateHiitContinuoCorto,
  calculateHiitContinuoLargo,
  type HiitContinuoCalculateResponse,
} from "@/lib/api/sessions";
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
  hiitReferenceTable: IntervalTable | null;
};

export function HiitContinuoForm({ hiitReferenceTable }: Props) {
  const [entrenamiento, setEntrenamiento] = useState<"Intervalo Largo" | "Intervalo Corto">("Intervalo Largo");
  const [intensidadMin, setIntensidadMin] = useState("90");
  const [intensidadMax, setIntensidadMax] = useState("110");
  const [trabajoMin, setTrabajoMin] = useState("2");
  const [trabajoS, setTrabajoS] = useState("30");
  const [serieMin, setSerieMin] = useState("12");
  const [bloques, setBloques] = useState("2");
  const [macroPausaMin, setMacroPausaMin] = useState("3");
  const [ratio, setRatio] = useState("2:1");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HiitContinuoCalculateResponse | null>(null);

  const isLargo = entrenamiento === "Intervalo Largo";

  const sourceLabel = useMemo(() => {
    if (!hiitReferenceTable) return null;
    return SOURCE_LABELS[hiitReferenceTable.source] ?? hiitReferenceTable.source.toUpperCase();
  }, [hiitReferenceTable]);

  if (!hiitReferenceTable) {
    return <EmptyReference>Registrá un test VAM, 30-15 IFT o Yo-Yo para calcular HIIT Continuo.</EmptyReference>;
  }

  const submit = preventDefaultSubmit(async () => {
    setError(null);
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
      const data = isLargo
        ? await calculateHiitContinuoLargo({
            reference_kmh: hiitReferenceTable.reference_kmh,
            intensidad_pct_min: parsed.min,
            intensidad_pct_max: parsed.max,
            trabajo_min: parsed.trabajoMin,
            serie_min: parsed.serie,
            bloques: parsed.bloques,
            macro_pausa_min: parsed.macro,
            ratio: ratio.trim(),
          })
        : await calculateHiitContinuoCorto({
            reference_kmh: hiitReferenceTable.reference_kmh,
            intensidad_pct_min: parsed.min,
            intensidad_pct_max: parsed.max,
            trabajo_s: parsed.trabajoS,
            serie_min: parsed.serie,
            bloques: parsed.bloques,
            macro_pausa_min: parsed.macro,
            ratio: ratio.trim(),
          });
      setResult(data);
    } catch (err: unknown) {
      setResult(null);
      setError(parseApiError(err, "No se pudo calcular HIIT Continuo."));
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <InfoBanner title="HIIT Continuo">
        Tiempo fijo → distancia. Pausa activa en Z2. Métrica: {sourceLabel} · {hiitReferenceTable.reference_kmh.toFixed(2)} km/h
        (prioridad VAM → 30-15 → Yo-Yo).
      </InfoBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="hiit-cont-entrenamiento" label="Entrenamiento">
          <select
            id="hiit-cont-entrenamiento"
            value={entrenamiento}
            onChange={(e) => {
              setEntrenamiento(e.target.value as "Intervalo Largo" | "Intervalo Corto");
              setSerieMin(e.target.value === "Intervalo Largo" ? "12" : "6");
            }}
            className={inputClassName()}
          >
            <option value="Intervalo Largo">Intervalo Largo</option>
            <option value="Intervalo Corto">Intervalo Corto</option>
          </select>
        </Field>
        <Field id="hiit-cont-ratio" label="Ratio (N:M)">
          <input id="hiit-cont-ratio" type="text" value={ratio} onChange={(e) => setRatio(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-cont-int-min" label="Intensidad mín (%)">
          <input id="hiit-cont-int-min" type="number" min="0" step="any" value={intensidadMin} onChange={(e) => setIntensidadMin(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-cont-int-max" label="Intensidad máx (%)">
          <input id="hiit-cont-int-max" type="number" min="0" step="any" value={intensidadMax} onChange={(e) => setIntensidadMax(e.target.value)} className={inputClassName()} />
        </Field>
        {isLargo ? (
          <Field id="hiit-cont-trabajo-min" label="Trabajo (min)">
            <input id="hiit-cont-trabajo-min" type="number" min="0" step="any" value={trabajoMin} onChange={(e) => setTrabajoMin(e.target.value)} className={inputClassName()} />
          </Field>
        ) : (
          <Field id="hiit-cont-trabajo-s" label="Trabajo (s)">
            <input id="hiit-cont-trabajo-s" type="number" min="0" step="any" value={trabajoS} onChange={(e) => setTrabajoS(e.target.value)} className={inputClassName()} />
          </Field>
        )}
        <Field id="hiit-cont-serie" label="Duración de la Serie (min)">
          <input id="hiit-cont-serie" type="number" min="0" step="any" value={serieMin} onChange={(e) => setSerieMin(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-cont-bloques" label="Bloques">
          <input id="hiit-cont-bloques" type="number" min="1" step="1" value={bloques} onChange={(e) => setBloques(e.target.value)} className={inputClassName()} />
        </Field>
        <Field id="hiit-cont-macro" label="Macro Pausa (min)">
          <input id="hiit-cont-macro" type="number" min="0" step="any" value={macroPausaMin} onChange={(e) => setMacroPausaMin(e.target.value)} className={inputClassName()} />
        </Field>
      </div>

      <CalculateButton loading={loading} />
      <FormError message={error} />
      {result && (
        <ResultTable
          summary={`${result.entrenamiento} · Z2 ${result.z2_kmh.toFixed(2)} km/h (${result.z2_ritmo_str})`}
          columns={[
            { key: "vel", header: "Velocidad", min: `${result.min.velocidad_kmh.toFixed(2)} km/h`, max: `${result.max.velocidad_kmh.toFixed(2)} km/h` },
            { key: "ritmo", header: "Ritmo", min: result.min.ritmo_str, max: result.max.ritmo_str },
            { key: "trab", header: "Trabajo", min: result.min.trabajo_str, max: result.max.trabajo_str },
            { key: "pausa", header: "Pausa", min: result.min.pausa_str, max: result.max.pausa_str },
            { key: "dist", header: "Distancia", min: `${result.min.distancia_m.toFixed(2)} m`, max: `${result.max.distancia_m.toFixed(2)} m` },
          ]}
          sessionStats={[
            { label: "Volumen Serie", value: `${result.volumen_serie_m.toFixed(2)} m` },
            { label: "Volumen Trabajo", value: `${result.volumen_trabajo_m.toFixed(2)} m` },
            { label: "Densidad", value: result.densidad_str },
          ]}
        />
      )}
    </form>
  );
}
