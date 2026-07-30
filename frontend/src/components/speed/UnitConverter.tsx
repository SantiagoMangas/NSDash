"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { post } from "@/lib/api/client";
import { parseMpmInput } from "@/lib/utils";
import type { UnitConverterValues, VelocityDashboard } from "@/lib/types";

type Props = {
  initialKmh?: number;
  unitConversions?: VelocityDashboard["unit_conversions"];
};

type FromUnit = "kmh" | "mpm" | "ms";

type UnitConversionResponse = {
  kmh: number;
  mpm: number;
  mpm_str: string;
  ms: number;
};

const DEBOUNCE_MS = 350;

function buildValuesFromUnitConversions(
  unitConversions: VelocityDashboard["unit_conversions"],
): UnitConverterValues {
  const minKmPace = parseMpmInput(unitConversions.vam_mpm_formatted);
  return {
    kmh: unitConversions.vam_kmh.toFixed(2),
    mpm: minKmPace !== null ? minKmPace.toFixed(2) : "",
    ms: unitConversions.vam_ms.toFixed(2),
    mpm_str: unitConversions.vam_mpm_formatted,
  };
}

function emptyDerivedValues(): Pick<UnitConverterValues, "mpm" | "ms" | "mpm_str"> {
  return { mpm: "", ms: "", mpm_str: "0:00" };
}

function applyConversionResponse(
  response: UnitConversionResponse,
  fromUnit: FromUnit,
  rawInput: string,
): UnitConverterValues {
  return {
    kmh: fromUnit === "kmh" ? rawInput : response.kmh.toFixed(2),
    mpm: fromUnit === "mpm" ? rawInput : response.mpm.toFixed(2),
    ms: fromUnit === "ms" ? rawInput : response.ms.toFixed(2),
    mpm_str: response.mpm_str,
  };
}

export default function UnitConverter({ initialKmh = 12, unitConversions }: Props) {
  const [values, setValues] = useState<UnitConverterValues>(() => {
    if (unitConversions) {
      return buildValuesFromUnitConversions(unitConversions);
    }
    return {
      kmh: initialKmh.toFixed(2),
      mpm: "",
      ms: "",
      mpm_str: "…",
    };
  });
  const [loading, setLoading] = useState(!unitConversions);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const lastValidRef = useRef<UnitConverterValues | null>(
    unitConversions ? buildValuesFromUnitConversions(unitConversions) : null,
  );

  const convertUnits = useCallback(async (fromUnit: FromUnit, numeric: number, rawInput: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await post<UnitConversionResponse>("/convert-units", {
        value: numeric,
        from_unit: fromUnit,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextValues = applyConversionResponse(response, fromUnit, rawInput);
      setValues(nextValues);
      lastValidRef.current = nextValues;
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError("No se pudo convertir. Se mantiene el último valor válido.");
      if (lastValidRef.current) {
        setValues(lastValidRef.current);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const scheduleConvert = useCallback(
    (fromUnit: FromUnit, rawInput: string, numeric: number | null) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const fieldKey = fromUnit;
      setError(null);

      if (numeric === null) {
        requestIdRef.current += 1;
        setLoading(false);
        setValues((prev) => ({
          ...prev,
          [fieldKey]: rawInput,
          ...emptyDerivedValues(),
        }));
        return;
      }

      setValues((prev) => ({ ...prev, [fieldKey]: rawInput }));

      debounceRef.current = setTimeout(() => {
        void convertUnits(fromUnit, numeric, rawInput);
      }, DEBOUNCE_MS);
    },
    [convertUnits],
  );

  useEffect(() => {
    if (unitConversions) {
      return;
    }

    void convertUnits("kmh", initialKmh, initialKmh.toFixed(2));
  }, [convertUnits, initialKmh, unitConversions]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function updateFromKmh(raw: string) {
    const numeric = Number(raw.replace(",", "."));
    const parsed = Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    scheduleConvert("kmh", raw, parsed);
  }

  function updateFromMpm(raw: string) {
    scheduleConvert("mpm", raw, parseMpmInput(raw));
  }

  function updateFromMs(raw: string) {
    const numeric = Number(raw.replace(",", "."));
    const parsed = Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    scheduleConvert("ms", raw, parsed);
  }

  return (
    <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Conversor de Unidades</h2>
        <p className="mt-1 text-sm text-slate-600">Convierte entre km/h, min/km y m/s en tiempo real.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">km/h</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            value={values.kmh}
            onChange={(event) => updateFromKmh(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">min/km</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            value={values.mpm}
            onChange={(event) => updateFromMpm(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">m/s</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            value={values.ms}
            onChange={(event) => updateFromMs(event.target.value)}
            inputMode="decimal"
          />
        </label>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
        Ritmo:{" "}
        <span className="font-semibold text-slate-900">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              {values.mpm_str || "…"}
            </span>
          ) : (
            values.mpm_str
          )}
        </span>
      </div>
      {error ? <p className="mt-2 text-sm text-amber-700">{error}</p> : null}
    </div>
  );
}
