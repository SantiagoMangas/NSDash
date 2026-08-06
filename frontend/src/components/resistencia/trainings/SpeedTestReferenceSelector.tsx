"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSpeedTests,
  setPreferredSpeedTest,
  type SpeedTestSummary,
} from "@/lib/api/speed";

const AUTO_VALUE = "auto";

type Props = {
  athleteId: number;
  preferredSpeedTestId: number | null;
  speedTestReferenceId: number | null;
  refreshKey?: number;
  onUpdated: () => Promise<void>;
};

function formatTestLabel(test: SpeedTestSummary) {
  return `${test.date} · ${test.vel_kmh.toFixed(2)} km/h`;
}

function extractErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "No se pudo guardar la preferencia. Intentá de nuevo.";
  }

  const err = error as { detail?: unknown; message?: string };
  if (typeof err.detail === "string") {
    return err.detail;
  }
  if (typeof err.message === "string") {
    return err.message;
  }

  return "No se pudo guardar la preferencia. Intentá de nuevo.";
}

export function SpeedTestReferenceSelector({
  athleteId,
  preferredSpeedTestId,
  speedTestReferenceId,
  refreshKey = 0,
  onUpdated,
}: Props) {
  const [speedTests, setSpeedTests] = useState<SpeedTestSummary[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>(
    preferredSpeedTestId === null ? AUTO_VALUE : String(preferredSpeedTestId),
  );

  useEffect(() => {
    setSelectedValue(preferredSpeedTestId === null ? AUTO_VALUE : String(preferredSpeedTestId));
  }, [preferredSpeedTestId, athleteId]);

  useEffect(() => {
    let cancelled = false;

    async function loadTests() {
      setLoadingTests(true);
      setError(null);

      try {
        const tests = await getSpeedTests(athleteId);
        if (!cancelled) {
          setSpeedTests(
            [...tests].sort((a, b) => {
              if (b.vel_kmh !== a.vel_kmh) return b.vel_kmh - a.vel_kmh;
              return b.date.localeCompare(a.date);
            }),
          );
        }
      } catch {
        if (!cancelled) {
          setSpeedTests([]);
          setError("No se pudieron cargar los tests de velocidad.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTests(false);
        }
      }
    }

    loadTests();

    return () => {
      cancelled = true;
    };
  }, [athleteId, refreshKey]);

  const activeTest = useMemo(
    () => speedTests.find((test) => test.id === speedTestReferenceId) ?? null,
    [speedTests, speedTestReferenceId],
  );

  const preferredMismatch =
    preferredSpeedTestId !== null &&
    speedTestReferenceId !== null &&
    preferredSpeedTestId !== speedTestReferenceId;

  async function handleChange(nextValue: string) {
    const previousValue = selectedValue;
    setSelectedValue(nextValue);
    setSaving(true);
    setError(null);

    const speedTestId = nextValue === AUTO_VALUE ? null : Number(nextValue);

    try {
      await setPreferredSpeedTest(athleteId, speedTestId);
      await onUpdated();
    } catch (err) {
      setSelectedValue(previousValue);
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loadingTests) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Cargando tests de velocidad…
      </div>
    );
  }

  if (speedTests.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label htmlFor="speed-test-reference" className="block text-sm font-medium text-slate-800">
            Referencia Tempo / RST / SIT
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Elegí qué test de velocidad usar para calcular Tempo Run, RST y SIT.
          </p>
          <select
            id="speed-test-reference"
            value={selectedValue}
            disabled={saving}
            onChange={(event) => handleChange(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60"
          >
            <option value={AUTO_VALUE}>Mejor (automático)</option>
            {speedTests.map((test) => (
              <option key={test.id} value={String(test.id)}>
                {formatTestLabel(test)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTest ? (
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
              En uso: {formatTestLabel(activeTest)}
            </span>
          ) : null}
          {saving ? (
            <span className="text-xs text-slate-500">Guardando…</span>
          ) : null}
        </div>
      </div>

      {preferredMismatch ? (
        <p className="mt-2 text-xs text-amber-700">
          La preferencia guardada ya no está disponible; se está usando el test automático.
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
