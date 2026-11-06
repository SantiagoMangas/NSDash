"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createSpeedTest } from "@/lib/api/speed";
import {
  compactFieldLabelClassName,
  compactFieldWrapClassName,
  compactFieldsRowClassName,
  compactInputClassName,
} from "@/lib/compactForm";
import { formatDisplayDate, getTodayDate, isFutureDate } from "@/lib/date";
import { formatPaceWithUnit, paceSecondsFromKmh } from "@/lib/units";
import { calculateVelKmh } from "@/lib/speedCalc";
import { formatSecondsToPace } from "@/lib/utils";

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
  velocidad_pico_kmh: number | null;
  mss_kmh: number;
  ritmo_str: string;
  notes: string | null;
}

const DESCRIPTION = {
  title: "Test de Velocidad (MSS)",
  description:
    "Ingresá la distancia en metros y el tiempo en segundos. La app calcula la velocidad promedio en km/h y el ritmo equivalente. Opcionalmente podés cargar la velocidad pico medida con radar, GPS u otra tecnología.",
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
  const [velocidadPico, setVelocidadPico] = useState<string>("");
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
  const parsedVelocidadPico = useMemo(() => {
    const trimmed = velocidadPico.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed.replace(",", "."));
    return Number.isFinite(value) && value > 0 ? value : Number.NaN;
  }, [velocidadPico]);

  const velKmhPreview = useMemo(
    () => calculateVelKmh(parsedDistancia, parsedTiempo),
    [parsedDistancia, parsedTiempo],
  );

  const pacePreview = useMemo(() => {
    if (velKmhPreview === null) return null;
    const sec = paceSecondsFromKmh(velKmhPreview);
    return sec !== null ? formatSecondsToPace(sec) : null;
  }, [velKmhPreview]);

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
      setError("Ingresá una distancia válida en metros (mayor a 0).");
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

    if (velocidadPico.trim() !== "" && !Number.isFinite(parsedVelocidadPico)) {
      setError("Ingresá una velocidad pico válida en km/h, o dejá el campo vacío.");
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
        parsedVelocidadPico,
      );
      setCreatedTest(data);
      const mssLabel = data.velocidad_pico_kmh
        ? `MSS usada: ${data.mss_kmh.toFixed(2)} km/h (pico)`
        : `MSS usada: ${data.mss_kmh.toFixed(2)} km/h (promedio)`;
      setSuccess(
        `✅ Test guardado. Promedio: ${data.vel_kmh.toFixed(2)} km/h · ${mssLabel} · Ritmo: ${formatPaceWithUnit(data.ritmo_str)}`,
      );
      setDistancia_m("30");
      setTiempo_s("4");
      setVelocidadPico("");
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

      <div className={compactFieldsRowClassName()}>
        <div className={compactFieldWrapClassName("date")}>
          <label htmlFor="speed-test-date" className={compactFieldLabelClassName()}>
            Fecha
          </label>
          <input
            id="speed-test-date"
            type="date"
            value={date}
            max={maxDate}
            onChange={(event) => setDate(event.target.value)}
            required
            className={compactInputClassName()}
          />
        </div>
        <div className={compactFieldWrapClassName("numeric")}>
          <label htmlFor="speed-test-distancia" className={compactFieldLabelClassName()}>
            Distancia (m)
          </label>
          <input
            id="speed-test-distancia"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={distancia_m}
            onChange={(event) => setDistancia_m(event.target.value)}
            placeholder="Ej. 30"
            className={compactInputClassName()}
          />
        </div>
        <div className={compactFieldWrapClassName("numeric")}>
          <label htmlFor="speed-test-tiempo" className={compactFieldLabelClassName()}>
            Tiempo (s)
          </label>
          <input
            id="speed-test-tiempo"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={tiempo_s}
            onChange={(event) => setTiempo_s(event.target.value)}
            placeholder="Ej. 4.25"
            className={compactInputClassName()}
          />
        </div>
      </div>

      {velKmhPreview !== null ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
            Velocidad promedio calculada
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-4">
            <p className="text-xl font-semibold text-indigo-900">
              {velKmhPreview.toFixed(2)} <span className="text-sm font-medium">km/h</span>
            </p>
            {pacePreview && (
              <p className="text-base font-semibold text-indigo-900">{formatPaceWithUnit(pacePreview)}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Completá distancia y tiempo válidos para ver la velocidad promedio en km/h.
        </div>
      )}

      <div>
        <label htmlFor="speed-test-pico" className={compactFieldLabelClassName()}>
          Velocidad Pico (km/h) — opcional
        </label>
        <input
          id="speed-test-pico"
          type="number"
          min="0"
          step="any"
          value={velocidadPico}
          onChange={(event) => setVelocidadPico(event.target.value)}
          placeholder="Ej: 32.5 (radar, GPS, etc.)"
          className={`${compactInputClassName()} max-w-md`}
        />
        <p className="mt-1 text-xs text-slate-500">
          Si la cargás, se usa como MSS en ASR, Tempo/RST/SIT y tabla nacional (en lugar del promedio calculado).
        </p>
      </div>

      <div>
        <label className={compactFieldLabelClassName()}>Notas (opcional)</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className={`${compactInputClassName()} max-w-xl`}
        />
      </div>

      <button
        type="submit"
        disabled={isSaving || velKmhPreview === null}
        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Guardando..." : "Registrar test de velocidad"}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {createdTest && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Resultado del test registrado</p>
          <p>Distancia: {createdTest.distancia_m} m</p>
          <p>Tiempo: {createdTest.tiempo_s} s</p>
          <p>Fecha: {formatDisplayDate(createdTest.date)}</p>
          <p>Velocidad promedio: {createdTest.vel_kmh.toFixed(2)} km/h</p>
          {createdTest.velocidad_pico_kmh ? (
            <p>Velocidad pico: {createdTest.velocidad_pico_kmh.toFixed(2)} km/h</p>
          ) : null}
          <p>MSS usada: {createdTest.mss_kmh.toFixed(2)} km/h</p>
          <p>Ritmo (promedio): {formatPaceWithUnit(createdTest.ritmo_str)}</p>
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
            Registrá una prueba de velocidad y obtené el promedio calculado, con MSS opcional por velocidad pico.
          </p>
        </div>
      </div>

      {formContent}
    </div>
  );
}
