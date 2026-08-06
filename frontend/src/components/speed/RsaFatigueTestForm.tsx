"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRsaFatigueTest } from "@/lib/api/speed";
import { parseApiError } from "@/lib/utils";
import { RsaFatiguePreviewCard } from "@/components/speed/RsaFatiguePreviewCard";

interface Props {
  athleteId: number | null;
  authToken: string | null;
  embedded?: boolean;
  onSuccess?: () => void;
}

interface RsaFatiguePreview {
  cantidad_sprints: number;
  mejor_tiempo: number;
  peor_tiempo: number;
  tiempo_total: number;
  tiempo_ideal: number;
  indice_fatiga_pct: number;
  categoria: string;
}

interface RsaFatigueTestResponse extends RsaFatiguePreview {
  id: number;
  athlete_id: number;
  date: string;
  tiempos: number[];
  distancia_sprint_m: number | null;
  pausa_s: number | null;
  notes: string | null;
  tiempo_medio: number;
  velocidad_mejor_kmh: number | null;
  velocidad_peor_kmh: number | null;
  velocidad_media_kmh: number | null;
}

const DESCRIPTION = {
  title: "Test de Índice de Fatiga (RSA-IFF)",
  description:
    "Ingresá los tiempos de cada sprint en segundos, en orden de realización. Se necesitan al menos 2 sprints. La app calcula el índice de fatiga y la categoría (Excelente, Bueno, Regular o Malo).",
};

const MIN_SPRINTS = 2;

function categorizeFatigueIndex(indice_fatiga_pct: number): string {
  if (indice_fatiga_pct < 10) return "Excelente";
  if (indice_fatiga_pct < 15) return "Bueno";
  if (indice_fatiga_pct < 20) return "Regular";
  return "Malo";
}

function calculateRsaFatiguePreview(tiempos: number[]): RsaFatiguePreview | null {
  if (tiempos.length < MIN_SPRINTS) {
    return null;
  }

  for (const tiempo of tiempos) {
    if (!Number.isFinite(tiempo) || tiempo <= 0) {
      return null;
    }
  }

  const cantidad_sprints = tiempos.length;
  const mejor_tiempo = Math.min(...tiempos);
  const peor_tiempo = Math.max(...tiempos);
  const tiempo_total = tiempos.reduce((sum, tiempo) => sum + tiempo, 0);
  const tiempo_ideal = mejor_tiempo * cantidad_sprints;
  const indice_fatiga_pct = (tiempo_total / tiempo_ideal) * 100 - 100;

  return {
    cantidad_sprints,
    mejor_tiempo: Math.round(mejor_tiempo * 100) / 100,
    peor_tiempo: Math.round(peor_tiempo * 100) / 100,
    tiempo_total: Math.round(tiempo_total * 100) / 100,
    tiempo_ideal: Math.round(tiempo_ideal * 100) / 100,
    indice_fatiga_pct: Math.round(indice_fatiga_pct * 100) / 100,
    categoria: categorizeFatigueIndex(indice_fatiga_pct),
  };
}

function parseOptionalPositive(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseSprintInputs(values: string[]): number[] | null {
  if (values.length < MIN_SPRINTS) {
    return null;
  }

  const parsed: number[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    const numeric = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    parsed.push(numeric);
  }

  return parsed;
}

export function RsaFatigueTestForm({ athleteId, authToken, embedded = false, onSuccess }: Props) {
  const [sprintTimes, setSprintTimes] = useState<string[]>(["", ""]);
  const [distancia_sprint_m, setDistancia_sprint_m] = useState<string>("");
  const [pausa_s, setPausa_s] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<RsaFatigueTestResponse | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);

  const isAuthenticated = Boolean(authToken);
  const today = new Date().toISOString().slice(0, 10);

  const parsedTiempos = useMemo(() => parseSprintInputs(sprintTimes), [sprintTimes]);
  const preview = useMemo(
    () => (parsedTiempos ? calculateRsaFatiguePreview(parsedTiempos) : null),
    [parsedTiempos],
  );

  const canSubmit = parsedTiempos !== null && parsedTiempos.length >= MIN_SPRINTS;

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
    setShowResultCard(false);

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

    const parsedDistancia = parseOptionalPositive(distancia_sprint_m);
    const parsedPausa = parseOptionalPositive(pausa_s);

    if (distancia_sprint_m.trim() !== "" && parsedDistancia === null) {
      setError("Ingresá una distancia de sprint válida en metros.");
      return;
    }

    if (pausa_s.trim() !== "" && parsedPausa === null) {
      setError("Ingresá una pausa válida en segundos.");
      return;
    }

    setIsSaving(true);

    try {
      const data: RsaFatigueTestResponse = await createRsaFatigueTest(
        athleteId,
        today,
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

      {preview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4 space-y-2">
          <p className="text-sm font-medium text-green-800">Vista previa del resultado</p>
          <div className="grid gap-2 sm:grid-cols-2 text-sm text-green-700">
            <span>Sprints: <strong>{preview.cantidad_sprints}</strong></span>
            <span>Mejor tiempo: <strong>{preview.mejor_tiempo.toFixed(2)} s</strong></span>
            <span>Peor tiempo: <strong>{preview.peor_tiempo.toFixed(2)} s</strong></span>
            <span>Tiempo total: <strong>{preview.tiempo_total.toFixed(2)} s</strong></span>
            <span>Tiempo ideal: <strong>{preview.tiempo_ideal.toFixed(2)} s</strong></span>
            <span>
              Índice de fatiga: <strong>{preview.indice_fatiga_pct.toFixed(2)}%</strong>
            </span>
            <span className="sm:col-span-2">
              Categoría: <strong>{preview.categoria}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-slate-500 mb-2">Distancia del sprint (m, opcional)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={distancia_sprint_m}
            onChange={(event) => setDistancia_sprint_m(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-2">Pausa entre sprints (s, opcional)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={pausa_s}
            onChange={(event) => setPausa_s(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

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
          Completá al menos 2 tiempos de sprint válidos para habilitar el envío.
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
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
            <p className="font-medium text-slate-900">Resultado del test registrado</p>
            <p>Fecha: {createdTest.date}</p>
            <p>Sprints: {createdTest.cantidad_sprints}</p>
            <p>Mejor tiempo: {createdTest.mejor_tiempo.toFixed(2)} s</p>
            <p>Peor tiempo: {createdTest.peor_tiempo.toFixed(2)} s</p>
            <p>Tiempo medio: {createdTest.tiempo_medio.toFixed(2)} s</p>
            <p>Tiempo total: {createdTest.tiempo_total.toFixed(2)} s</p>
            <p>Tiempo ideal: {createdTest.tiempo_ideal.toFixed(2)} s</p>
            <p>Índice de fatiga: {createdTest.indice_fatiga_pct.toFixed(2)}%</p>
            <p>Categoría: {createdTest.categoria}</p>
          </div>

          <button
            type="button"
            onClick={() => setShowResultCard((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            {showResultCard ? "Ocultar vista previa" : "Vista previa"}
          </button>

          {showResultCard ? <RsaFatiguePreviewCard test={createdTest} /> : null}
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
