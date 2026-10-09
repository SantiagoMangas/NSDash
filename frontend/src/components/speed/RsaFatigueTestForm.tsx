"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRsaFatigueTest } from "@/lib/api/speed";
import { getTodayDate, isFutureDate } from "@/lib/date";
import { calculateRsaFatigueMetrics } from "@/lib/rsaFatigue";
import { parseApiError } from "@/lib/utils";
import { RsaFatiguePreviewCard } from "@/components/speed/RsaFatiguePreviewCard";

interface Props {
  athleteId: number | null;
  authToken: string | null;
  embedded?: boolean;
  onSuccess?: () => void;
}

interface RsaFatigueTestResponse {
  id: number;
  athlete_id: number;
  date: string;
  tiempos: number[];
  distancia_sprint_m: number | null;
  pausa_s: number | null;
  notes: string | null;
  cantidad_sprints: number;
  mejor_tiempo: number;
  peor_tiempo: number;
  tiempo_total: number;
  tiempo_ideal: number;
  tiempo_medio: number;
  indice_fatiga_pct: number;
  categoria: string;
}

const DESCRIPTION = {
  title: "Test de Índice de Fatiga (RSA-IFF)",
  description:
    "Completá fecha, distancia del sprint y pausa entre repeticiones. Luego ingresá los tiempos de cada sprint en segundos (mínimo 2). La app calcula el índice de fatiga y la categoría.",
};

const MIN_SPRINTS = 2;

function parseRequiredPositive(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseSprintInputs(values: string[]): number[] | null {
  if (values.length < MIN_SPRINTS) return null;

  const parsed: number[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const numeric = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    parsed.push(numeric);
  }

  return parsed;
}

export function RsaFatigueTestForm({ athleteId, authToken, embedded = false, onSuccess }: Props) {
  const [sprintTimes, setSprintTimes] = useState<string[]>(["", ""]);
  const [distancia_sprint_m, setDistancia_sprint_m] = useState<string>("");
  const [pausa_s, setPausa_s] = useState<string>("");
  const [date, setDate] = useState(getTodayDate);
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<RsaFatigueTestResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);

  const isAuthenticated = Boolean(authToken);
  const maxDate = getTodayDate();

  const parsedTiempos = useMemo(() => parseSprintInputs(sprintTimes), [sprintTimes]);
  const parsedDistancia = useMemo(() => parseRequiredPositive(distancia_sprint_m), [distancia_sprint_m]);
  const parsedPausa = useMemo(() => parseRequiredPositive(pausa_s), [pausa_s]);

  const previewMetrics = useMemo(
    () => (parsedTiempos ? calculateRsaFatigueMetrics(parsedTiempos) : null),
    [parsedTiempos],
  );

  const canSubmit =
    parsedTiempos !== null &&
    parsedTiempos.length >= MIN_SPRINTS &&
    parsedDistancia !== null &&
    parsedPausa !== null;

  const previewCardData = useMemo(() => {
    if (!previewMetrics || parsedDistancia === null || parsedPausa === null) return null;
    return {
      date,
      cantidad_sprints: previewMetrics.cantidad_sprints,
      tiempos: parsedTiempos ?? [],
      distancia_sprint_m: parsedDistancia,
      pausa_s: parsedPausa,
      mejor_tiempo: previewMetrics.mejor_tiempo,
      peor_tiempo: previewMetrics.peor_tiempo,
      tiempo_total: previewMetrics.tiempo_total,
      tiempo_ideal: previewMetrics.tiempo_ideal,
      indice_fatiga_pct: previewMetrics.indice_fatiga_pct,
      categoria: previewMetrics.categoria,
    };
  }, [previewMetrics, parsedDistancia, parsedPausa, parsedTiempos, date]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccess(null);
    }, 4000);
  }, [success]);

  const updateSprintTime = (index: number, value: string) => {
    setSprintTimes((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addSprint = () => {
    setSprintTimes((prev) => [...prev, ""]);
  };

  const removeSprint = (index: number) => {
    setSprintTimes((prev) => {
      if (prev.length <= MIN_SPRINTS) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatedTest(null);

    if (!athleteId) {
      setError("Seleccioná un atleta antes de registrar un test RSA.");
      return;
    }

    if (!isAuthenticated) {
      setError("Iniciá sesión para guardar el test RSA.");
      return;
    }

    if (!parsedTiempos || parsedTiempos.length < MIN_SPRINTS) {
      setError("Ingresá al menos 2 tiempos de sprint válidos.");
      return;
    }

    if (parsedDistancia === null) {
      setError("Ingresá la distancia del sprint en metros.");
      return;
    }

    if (parsedPausa === null) {
      setError("Ingresá la pausa entre sprints en segundos.");
      return;
    }

    if (!date.trim()) {
      setError("Seleccioná una fecha válida.");
      return;
    }

    if (isFutureDate(date)) {
      setError("La fecha no puede ser futura.");
      return;
    }

    setIsSaving(true);

    try {
      const data: RsaFatigueTestResponse = await createRsaFatigueTest(
        athleteId,
        date,
        parsedTiempos,
        parsedDistancia,
        parsedPausa,
        notes.trim() || null,
      );
      setCreatedTest(data);
      setSuccess(
        `✅ Test guardado. Índice de fatiga: ${data.indice_fatiga_pct.toFixed(2)}% · Categoría: ${data.categoria}`,
      );
      setSprintTimes(["", ""]);
      setDistancia_sprint_m("");
      setPausa_s("");
      setNotes("");
      setDate(getTodayDate());
      if (onSuccess) onSuccess();
    } catch (submitError: unknown) {
      setError(parseApiError(submitError, "Error al guardar el test. Intentá de nuevo."));
    } finally {
      setIsSaving(false);
    }
  };

  const formContent = !isAuthenticated ? (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Iniciá sesión para registrar un test RSA.
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
        <span className="font-medium">ℹ️ {DESCRIPTION.title}</span>
        <p className="mt-1 text-blue-700">{DESCRIPTION.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="rsa-test-date" className="block text-xs text-slate-500 mb-1">
            Fecha
          </label>
          <input
            id="rsa-test-date"
            type="date"
            value={date}
            max={maxDate}
            onChange={(event) => setDate(event.target.value)}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Distancia del sprint (m)</label>
          <input
            type="number"
            min="0"
            step="any"
            required
            value={distancia_sprint_m}
            onChange={(event) => setDistancia_sprint_m(event.target.value)}
            placeholder="Ej: 20"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Pausa entre sprints (s)</label>
          <input
            type="number"
            min="0"
            step="any"
            required
            value={pausa_s}
            onChange={(event) => setPausa_s(event.target.value)}
            placeholder="Ej: 20"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500">Tiempos de sprint (s)</label>
          <span className="text-xs text-slate-400">Mínimo {MIN_SPRINTS} sprints</span>
        </div>

        {sprintTimes.map((value, index) => (
          <div key={`sprint-${index}`} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-slate-500">Sprint {index + 1}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onChange={(event) => updateSprintTime(index, event.target.value)}
              placeholder="Ej: 7.05"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={() => removeSprint(index)}
              disabled={sprintTimes.length <= MIN_SPRINTS}
              className="shrink-0 rounded-xl border border-slate-200 px-3 py-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Quitar sprint ${index + 1}`}
            >
              Quitar
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addSprint}
          className="inline-flex items-center rounded-2xl border border-dashed border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
        >
          + Agregar sprint
        </button>
      </div>

      {previewCardData && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Vista previa del resultado</p>
          <RsaFatiguePreviewCard test={previewCardData} />
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-500 mb-2">Notas (opcional)</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <button
        type="submit"
        disabled={isSaving || !canSubmit}
        className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Guardando..." : "Registrar test RSA"}
      </button>

      {!canSubmit && (
        <p className="text-xs text-slate-500">
          Completá fecha, distancia, pausa y al menos 2 tiempos de sprint válidos para habilitar el envío.
        </p>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {createdTest && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Resultado registrado</p>
          <RsaFatiguePreviewCard
            test={{
              date: createdTest.date,
              cantidad_sprints: createdTest.cantidad_sprints,
              tiempos: createdTest.tiempos,
              distancia_sprint_m: createdTest.distancia_sprint_m,
              pausa_s: createdTest.pausa_s,
              mejor_tiempo: createdTest.mejor_tiempo,
              peor_tiempo: createdTest.peor_tiempo,
              tiempo_total: createdTest.tiempo_total,
              tiempo_ideal: createdTest.tiempo_ideal,
              indice_fatiga_pct: createdTest.indice_fatiga_pct,
              categoria: createdTest.categoria,
            }}
          />
        </div>
      )}
    </form>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Formulario de Test RSA</h3>
          <p className="mt-1 text-sm text-slate-500">
            Registrá los tiempos de sprints repetidos y obtené el índice de fatiga oficial.
          </p>
        </div>
      </div>

      {formContent}
    </div>
  );
}
