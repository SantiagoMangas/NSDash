"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createSpeedTest } from "@/lib/api/speed";

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
    "El atleta corre una distancia libre cronometrada a máxima velocidad sostenida. Ingresá la distancia en metros y el tiempo en segundos. La app calcula la velocidad en km/h y el ritmo equivalente.",
};

function calculatePreview(distancia_m: number, tiempo_s: number) {
  if (!Number.isFinite(distancia_m) || distancia_m <= 0) {
    return null;
  }
  if (!Number.isFinite(tiempo_s) || tiempo_s <= 0) {
    return null;
  }

  const velKmh = (distancia_m / tiempo_s) * 3.6;
  if (!Number.isFinite(velKmh) || velKmh <= 0) {
    return null;
  }

  return { velPreview: velKmh.toFixed(2) };
}

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
  const [distancia_m, setDistancia_m] = useState<string>("100");
  const [tiempo_s, setTiempo_s] = useState<string>("10");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<SpeedTestResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);

  const isAuthenticated = Boolean(authToken);
  const today = new Date().toISOString().slice(0, 10);

  const parsedDistancia = useMemo(() => Number(distancia_m.replace(",", ".")), [distancia_m]);
  const parsedTiempo = useMemo(() => Number(tiempo_s.replace(",", ".")), [tiempo_s]);

  const preview = useMemo(
    () => calculatePreview(parsedDistancia, parsedTiempo),
    [parsedDistancia, parsedTiempo],
  );

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

    setIsSaving(true);

    try {
      const data: SpeedTestResponse = await createSpeedTest(
        athleteId,
        today,
        parsedDistancia,
        parsedTiempo,
        notes.trim() || null,
      );
      setCreatedTest(data);
      setSuccess(
        `✅ Test guardado. Velocidad: ${data.vel_kmh.toFixed(2)} km/h · Ritmo: ${data.ritmo_str} /km`,
      );
      setDistancia_m("100");
      setTiempo_s("10");
      setNotes("");
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-slate-500 mb-2">Distancia (m)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={distancia_m}
            onChange={(event) => setDistancia_m(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-2">Tiempo (s)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={tiempo_s}
            onChange={(event) => setTiempo_s(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {preview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
          <p className="text-sm font-medium text-green-800">Vista previa del resultado</p>
          <div className="flex gap-6 mt-1">
            <span className="text-green-700 text-sm">
              Velocidad: <strong>{preview.velPreview} km/h</strong>
            </span>
          </div>
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
        disabled={isSaving}
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
          <p>Velocidad: {createdTest.vel_kmh.toFixed(2)} km/h</p>
          <p>Ritmo: {createdTest.ritmo_str} /km</p>
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
