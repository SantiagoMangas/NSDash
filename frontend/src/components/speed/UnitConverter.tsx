"use client";

import { useState } from "react";
import { formatMpmDecimal, parseMpmInput } from "@/lib/utils";
import type { UnitConverterValues } from "@/lib/types";

type Props = {
  initialKmh?: number;
};

export default function UnitConverter({ initialKmh = 12 }: Props) {
  const [values, setValues] = useState<UnitConverterValues>(() => {
    const mpm = 60 / initialKmh;
    return {
      kmh: initialKmh.toFixed(2),
      mpm: mpm.toFixed(2),
      ms: (initialKmh / 3.6).toFixed(2),
      mpm_str: formatMpmDecimal(mpm),
    };
  });

  function updateFromKmh(raw: string) {
    const numeric = Number(raw.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setValues({ kmh: raw, mpm: "", ms: "", mpm_str: "0:00" });
      return;
    }
    const mpm = 60 / numeric;
    setValues({ kmh: raw, mpm: mpm.toFixed(2), ms: (numeric / 3.6).toFixed(2), mpm_str: formatMpmDecimal(mpm) });
  }

  function updateFromMpm(raw: string) {
    const numeric = parseMpmInput(raw);
    if (numeric === null) {
      setValues({ kmh: "", mpm: raw, ms: "", mpm_str: raw });
      return;
    }
    const kmh = 60 / numeric;
    setValues({ kmh: kmh.toFixed(2), mpm: numeric.toFixed(2), ms: (kmh / 3.6).toFixed(2), mpm_str: formatMpmDecimal(numeric) });
  }

  function updateFromMs(raw: string) {
    const numeric = Number(raw.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setValues({ kmh: "", mpm: "", ms: raw, mpm_str: "0:00" });
      return;
    }
    const kmh = numeric * 3.6;
    const mpm = 60 / kmh;
    setValues({ kmh: kmh.toFixed(2), mpm: mpm.toFixed(2), ms: raw, mpm_str: formatMpmDecimal(mpm) });
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
        Ritmo: <span className="font-semibold text-slate-900">{values.mpm_str}</span>
      </div>
    </div>
  );
}
