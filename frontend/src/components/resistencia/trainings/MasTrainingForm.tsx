"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  calculateMasTraining,
  type MasTrainingCalculateResponse,
} from "@/lib/api/sessions";
import { DateInputWithDisplay } from "@/components/ui/DateInputWithDisplay";
import { getTodayDate } from "@/lib/date";
import type { IntervalTable } from "@/lib/types";
import { parseApiError } from "@/lib/utils";
import { ResultTable } from "./sessionFormUi";

const SOURCE_LABELS: Record<string, string> = {
  "30_15": "30-15 IFT",
  yoyo: "Yo-Yo RI1",
  vam: "VAM",
};

type Props = {
  masReferenceTable: IntervalTable | null;
};

function parseNumber(value: string): number {
  return Number(value.replace(",", "."));
}

function inputClassName(disabled = false): string {
  return `w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
    disabled ? "cursor-not-allowed opacity-60" : ""
  }`;
}

export function MasTrainingForm({ masReferenceTable }: Props) {
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
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<MasTrainingCalculateResponse | null>(null);

  const sourceLabel = useMemo(() => {
    if (!masReferenceTable) return null;
    return SOURCE_LABELS[masReferenceTable.source] ?? masReferenceTable.source.toUpperCase();
  }, [masReferenceTable]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!masReferenceTable) {
      setError("Registrá un test 30-15, Yo-Yo o VAM para calcular MAS Training.");
      return;
    }

    const parsedMin = parseNumber(intensidadMin);
    const parsedMax = parseNumber(intensidadMax);
    const parsedTrabajo = parseNumber(trabajoS);
    const parsedSerie = parseNumber(serieMin);
    const parsedBloques = parseNumber(bloques);
    const parsedMacro = parseNumber(macroPausaMin);
    const parsedShuttles = parseNumber(shuttles);

    if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax) || parsedMin <= 0 || parsedMax <= 0) {
      setError("Ingresá un rango de intensidad % válido.");
      return;
    }
    if (parsedMin > parsedMax) {
      setError("La intensidad mínima no puede ser mayor que la máxima.");
      return;
    }
    if (!ratio.includes(":")) {
      setError('El ratio debe tener formato "N:M" (ej. 1:1).');
      return;
    }
    if (!Number.isFinite(parsedTrabajo) || parsedTrabajo <= 0) {
      setError("Ingresá un tiempo de trabajo válido en segundos.");
      return;
    }
    if (!Number.isFinite(parsedSerie) || parsedSerie <= 0) {
      setError("Ingresá una serie válida en minutos.");
      return;
    }
    if (!Number.isInteger(parsedBloques) || parsedBloques <= 0) {
      setError("Los bloques deben ser un entero mayor a 0.");
      return;
    }
    if (!Number.isFinite(parsedMacro) || parsedMacro < 0) {
      setError("Ingresá una macro pausa válida en minutos.");
      return;
    }
    if (cod && (!Number.isFinite(parsedShuttles) || parsedShuttles < 0)) {
      setError("Ingresá un valor de shuttles válido.");
      return;
    }

    setIsCalculating(true);
    try {
      const data = await calculateMasTraining({
        reference_kmh: masReferenceTable.reference_kmh,
        intensidad_pct_min: parsedMin,
        intensidad_pct_max: parsedMax,
        trabajo_s: parsedTrabajo,
        serie_min: parsedSerie,
        bloques: parsedBloques,
        macro_pausa_min: parsedMacro,
        ratio: ratio.trim(),
        entrenamiento,
        cod: cod ? "SI" : "NO",
        shuttles: cod ? parsedShuttles : 0,
        fecha: date || null,
      });
      setResult(data);
    } catch (submitError: unknown) {
      setResult(null);
      setError(parseApiError(submitError, "No se pudo calcular la sesión. Intentá de nuevo."));
    } finally {
      setIsCalculating(false);
    }
  };

  if (!masReferenceTable) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
        <p className="text-sm text-slate-500">
          Registrá un test 30-15 IFT, Yo-Yo o VAM para calcular MAS Training.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
        <span className="font-medium">ℹ️ MAS Training</span>
        <p className="mt-1 text-blue-700">
          Pausa pasiva. Métrica MAS: {sourceLabel} · {masReferenceTable.reference_kmh.toFixed(2)} km/h
          (prioridad 30-15 → Yo-Yo → VAM).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mas-entrenamiento" className="block text-xs text-slate-500 mb-1">
            Entrenamiento
          </label>
          <select
            id="mas-entrenamiento"
            value={entrenamiento}
            onChange={(event) => setEntrenamiento(event.target.value)}
            className={inputClassName()}
          >
            <option value="Intervalo Corto">Intervalo Corto</option>
            <option value="Intervalo Largo">Intervalo Largo</option>
          </select>
        </div>

        <DateInputWithDisplay
          id="mas-fecha"
          label="Fecha"
          value={date}
          onChange={setDate}
          required
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-full"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mas-int-min" className="block text-xs text-slate-500 mb-1">
            Intensidad mín (%)
          </label>
          <input
            id="mas-int-min"
            type="number"
            min="0"
            step="any"
            value={intensidadMin}
            onChange={(event) => setIntensidadMin(event.target.value)}
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="mas-int-max" className="block text-xs text-slate-500 mb-1">
            Intensidad máx (%)
          </label>
          <input
            id="mas-int-max"
            type="number"
            min="0"
            step="any"
            value={intensidadMax}
            onChange={(event) => setIntensidadMax(event.target.value)}
            className={inputClassName()}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mas-ratio" className="block text-xs text-slate-500 mb-1">
            Ratio (N:M)
          </label>
          <input
            id="mas-ratio"
            type="text"
            value={ratio}
            onChange={(event) => setRatio(event.target.value)}
            placeholder="1:1"
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="mas-trabajo" className="block text-xs text-slate-500 mb-1">
            Trabajo (s)
          </label>
          <input
            id="mas-trabajo"
            type="number"
            min="0"
            step="any"
            value={trabajoS}
            onChange={(event) => setTrabajoS(event.target.value)}
            className={inputClassName()}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label
          htmlFor="mas-cod"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
        >
          <input
            id="mas-cod"
            type="checkbox"
            checked={cod}
            onChange={(event) => setCod(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            COD
            <span className="ml-2 text-xs text-slate-500">{cod ? "SI" : "NO"}</span>
          </span>
        </label>
        <div>
          <label htmlFor="mas-shuttles" className="block text-xs text-slate-500 mb-1">
            Shuttles
          </label>
          <input
            id="mas-shuttles"
            type="number"
            min="0"
            step="any"
            value={cod ? shuttles : "0"}
            onChange={(event) => setShuttles(event.target.value)}
            disabled={!cod}
            className={inputClassName(!cod)}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        COD: cambio de dirección. En MAS Training, cada shuttle resta tiempo de trabajo (menos metros cubiertos).
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="mas-serie" className="block text-xs text-slate-500 mb-1">
            Duración de la Serie (min)
          </label>
          <input
            id="mas-serie"
            type="number"
            min="0"
            step="any"
            value={serieMin}
            onChange={(event) => setSerieMin(event.target.value)}
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="mas-bloques" className="block text-xs text-slate-500 mb-1">
            Bloques
          </label>
          <input
            id="mas-bloques"
            type="number"
            min="1"
            step="1"
            value={bloques}
            onChange={(event) => setBloques(event.target.value)}
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="mas-macro" className="block text-xs text-slate-500 mb-1">
            Macro Pausa (min)
          </label>
          <input
            id="mas-macro"
            type="number"
            min="0"
            step="any"
            value={macroPausaMin}
            onChange={(event) => setMacroPausaMin(event.target.value)}
            className={inputClassName()}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isCalculating}
        className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCalculating ? "Calculando..." : "Calcular sesión"}
      </button>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <ResultTable
          summary={`${result.entrenamiento} · COD ${result.cod}${result.cod === "SI" ? ` · Shuttles ${result.shuttles}` : ""}`}
          columns={[
            { key: "vel", header: "Velocidad", min: `${result.min.velocidad_kmh.toFixed(2)} km/h`, max: `${result.max.velocidad_kmh.toFixed(2)} km/h` },
            { key: "ritmo", header: "Ritmo", min: result.min.ritmo_str, max: result.max.ritmo_str },
            { key: "trab", header: "Trabajo", min: result.min.trabajo_str, max: result.max.trabajo_str },
            { key: "pausa", header: "Pausa", min: result.min.pausa_str, max: result.max.pausa_str },
            { key: "dist", header: "Distancia", min: `${result.min.distancia_m.toFixed(2)} m`, max: `${result.max.distancia_m.toFixed(2)} m` },
          ]}
          sessionStats={[
            {
              label: "Volumen Serie",
              value: `${result.min.volumen_serie_m.toFixed(2)}–${result.max.volumen_serie_m.toFixed(2)} m`,
            },
            {
              label: "Volumen Trabajo",
              value: `${result.min.volumen_trabajo_m.toFixed(2)}–${result.max.volumen_trabajo_m.toFixed(2)} m`,
            },
            { label: "Densidad", value: result.densidad_str },
          ]}
        />
      )}
    </form>
  );
}
