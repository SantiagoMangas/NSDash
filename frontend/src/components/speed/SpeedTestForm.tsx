"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createSpeedTest } from "@/lib/api/speed";
import { SPEED_TEST_DISTANCE_PRESETS } from "@/lib/constants";
import { getTodayDate, isFutureDate } from "@/lib/date";
import { formatPaceWithUnit } from "@/lib/units";
import { calculateVelKmh } from "@/lib/speedCalc";

interface Props {
  athleteId: number | null;
  authToken: string | null;
  embedded?: boolean;
  onSuccess?: () => void;
}

interface SpeedTestResponse {
  id: number;
  athlete_id: number;
  date: string;
  distancia_m: number;
  tiempo_s: number;
  vel_kmh: number;
  ritmo_str: string;
  notes: string | null;
}

const DESCRIPTION = {
  title: "Test de Velocidad (MSS)",
  description:
    "Ingresá la distancia en metros y el tiempo en segundos (cualquier valor válido). Podés usar los atajos o escribir una distancia personalizada. La app calcula la velocidad máxima en km/h y el ritmo equivalente.",
};

function extractErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Error al guardar el test. Intentá de nuevo.";
  }

  const err = error as { detail?: unknown; message?: string };
  if (typeof err.detail === "string") {
    return err.detail;
  }
  if (typeof err.message === "string") {
    return err.message;
  }

  return "Error al guardar el test. Intentá de nuevo.";
}

export function SpeedTestForm({ athleteId, authToken, embedded = false, onSuccess }: Props) {
  const [distancia_m, setDistancia_m] = useState<string>("30");
  const [tiempo_s, setTiempo_s] = useState<string>("4");
  const [date, setDate] = useState(getTodayDate);
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<SpeedTestResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);

  const isAuthenticated = Boolean(authToken);
  const maxDate = getTodayDate();

  const parsedDistancia = useMemo(() => Number(distancia_m.replace(",", ".")), [distancia_m]);
  const parsedTiempo = useMemo(() => Number(tiempo_s.replace(",", ".")), [tiempo_s]);

  const velKmhPreview = useMemo(
    () => calculateVelKmh(parsedDistancia, parsedTiempo),
    [parsedDistancia, parsedTiempo],
  );

  const selectedPreset =
    Number.isFinite(parsedDistancia) &&
    SPEED_TEST_DISTANCE_PRESETS.includes(parsedDistancia as (typeof SPEED_TEST_DISTANCE_PRESETS)[number])
      ? parsedDistancia
      : null;

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatedTest(null);

    if (!athleteId) {
      setError("Seleccioná un atleta antes de registrar un test de velocidad.");
      return;
    }

    if (!isAuthenticated) {
      setError("Iniciá sesión para guardar el test de velocidad.");
      return;
    }

    if (!Number.isFinite(parsedDistancia) || parsedDistancia <= 0) {
      setError("Ingresá una distancia válida en metros.");
      return;
    }

    if (!Number.isFinite(parsedTiempo) || parsedTiempo <= 0) {
      setError("Ingresá un tiempo válido en segundos.");
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
      const data: SpeedTestResponse = await createSpeedTest(
        athleteId,
        date,
        parsedDistancia,
        parsedTiempo,
        notes.trim() || null,
      );
      setCreatedTest(data);
      setSuccess(
        `✅ Test guardado. Velocidad máxima: ${data.vel_kmh.toFixed(2)} km/h · Ritmo: ${formatPaceWithUnit(data.ritmo_str)}`,
      );
      setDistancia_m("30");
      setTiempo_s("4");
      setNotes("");
      setDate(getTodayDate());
      if (onSuccess) onSuccess();
    } catch (submitError: unknown) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  };

  const formContent = !isAuthenticated ? (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Iniciá sesión para registrar un test de velocidad.
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
        <span className="font-medium">ℹ️ {DESCRIPTION.title}</span>
        <p className="mt-1 text-blue-700">{DESCRIPTION.description}</p>
      </div>

      <div>
        <label htmlFor="speed-test-date" className="block text-xs text-slate-500 mb-1">
          Fecha
        </label>
        <input
          id="speed-test-date"
          type="date"
          value={date}
          max={maxDate}
          onChange={(event) => setDate(event.target.value)}
          required
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="speed-test-distancia" className="block text-xs text-slate-500 mb-2">
            Distancia (m)
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {SPEED_TEST_DISTANCE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDistancia_m(String(preset))}
                className={`min-w-[3.5rem] px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                  selectedPreset === preset
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-300 ring-offset-1"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:border-slate-300"
                }`}
              >
                {preset} m
              </button>
            ))}
          </div>
          <input
            id="speed-test-distancia"
            type="number"
            min="0"
            step="any"
            value={distancia_m}
            onChange={(event) => setDistancia_m(event.target.value)}
            placeholder="Ej: 35 (distancia personalizada)"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <p className="mt-1 text-xs text-slate-500">
            Podés elegir un atajo o escribir cualquier distancia en metros.
          </p>
        </div>

        <div>
          <label htmlFor="speed-test-tiempo" className="block text-xs text-slate-500 mb-2">
            Tiempo (s)
          </label>
          <input
            id="speed-test-tiempo"
            type="number"
            min="0"
            step="any"
            value={tiempo_s}
            onChange={(event) => setTiempo_s(event.target.value)}
            placeholder="Ej: 4.25"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {velKmhPreview !== null ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
            Velocidad máxima calculada
          </p>
          <p className="mt-1 text-2xl font-semibold text-indigo-900">
            {velKmhPreview.toFixed(2)} <span className="text-base font-medium">km/h</span>
          </p>
          <p className="mt-1 text-xs text-indigo-700">
            {parsedDistancia} m ÷ {parsedTiempo} s × 3,6
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Completá distancia y tiempo válidos para ver la velocidad máxima en km/h.
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
        disabled={isSaving || velKmhPreview === null}
        className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Guardando..." : "Registrar test de velocidad"}
      </button>

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
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Resultado del test registrado</p>
          <p>Distancia: {createdTest.distancia_m} m</p>
          <p>Tiempo: {createdTest.tiempo_s} s</p>
          <p>Fecha: {createdTest.date}</p>
          <p>Velocidad máxima: {createdTest.vel_kmh.toFixed(2)} km/h</p>
          <p>Ritmo: {formatPaceWithUnit(createdTest.ritmo_str)}</p>
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
          <h3 className="text-base font-semibold text-slate-900">Formulario de Test de Velocidad</h3>
          <p className="mt-1 text-sm text-slate-500">
            Registrá una prueba de velocidad máxima sostenida y obtené los resultados oficiales.
          </p>
        </div>
      </div>

      {formContent}
    </div>
  );
}
