"use client";

import type { IntervalRow, IntervalTable } from "@/lib/types";

type Props = {
  vamKmh: number;
  intervalTable: IntervalTable | null;
  speedTestTable?: IntervalTable | null;
};

function findRow(table: IntervalTable | null, tipo: string, porcentaje: number) {
  return table?.rows.find((row) => row.tipo === tipo && row.porcentaje === porcentaje) ?? null;
}

function findRangeRows(table: IntervalTable | null, tipo: string): { min: IntervalRow; max: IntervalRow } | null {
  const rows = table?.rows.filter((row) => row.tipo === tipo) ?? [];
  if (rows.length < 2) {
    return null;
  }
  const sorted = [...rows].sort((a, b) => a.porcentaje - b.porcentaje);
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

const PRESCRIPTIONS = [
  {
    id: "hiit-corto",
    title: "HIIT Corto",
    subtitle: "15 × 30 segundos",
    tipo: "fit_corto",
    porcentaje: 110,
    intensityLabel: "110% VAM",
    ratio: "Recuperación 1:2",
  },
  {
    id: "mas-training",
    title: "MAS Training",
    subtitle: "5 × 4 minutos",
    tipo: "mas_training",
    porcentaje: 105,
    intensityLabel: "105% VAM",
    ratio: "Recuperación 1:1",
  },
  {
    id: "hiit-largo",
    title: "HIIT Largo",
    subtitle: "6 × 2 minutos",
    tipo: "fit_largo",
    porcentaje: 95,
    intensityLabel: "95% VAM",
    ratio: "Recuperación 1:1",
  },
] as const;

const SPEED_TEST_PRESCRIPTIONS = [
  {
    id: "tr-extensivo",
    title: "Tempo Run Extensivo",
    subtitle: "Tempo Run",
    tipo: "tr_extensivo",
  },
  {
    id: "tr-recovery",
    title: "Tempo Run Recovery",
    subtitle: "Tempo Run",
    tipo: "tr_recovery",
  },
  {
    id: "rst",
    title: "RST",
    subtitle: "Repeated Sprint Training",
    tipo: "rst",
  },
  {
    id: "sit",
    title: "SIT",
    subtitle: "Sprint Interval Training",
    tipo: "sit",
  },
] as const;

function formatSpeedRange(range: { min: IntervalRow; max: IntervalRow } | null) {
  if (!range) {
    return "—";
  }
  return `${range.min.velocidad_kmh.toFixed(2)} - ${range.max.velocidad_kmh.toFixed(2)} km/h`;
}

function formatPaceRange(range: { min: IntervalRow; max: IntervalRow } | null) {
  if (!range) {
    return null;
  }
  return `${range.min.ritmo_str} - ${range.max.ritmo_str}`;
}

function formatPercentRange(range: { min: IntervalRow; max: IntervalRow } | null) {
  if (!range) {
    return "—";
  }
  return `${range.min.porcentaje}-${range.max.porcentaje}%`;
}

export function RecommendedTrainingCards({ vamKmh, intervalTable, speedTestTable = null }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Entrenamiento recomendado</p>
        <p className="mt-1 text-sm text-slate-700">
          VAM de referencia: <strong className="text-slate-900">{vamKmh.toFixed(2)} km/h</strong>
        </p>
        {speedTestTable ? (
          <p className="mt-1 text-sm text-slate-700">
            Velocidad máxima (Speed Test):{" "}
            <strong className="text-slate-900">{speedTestTable.reference_kmh.toFixed(2)} km/h</strong>
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {PRESCRIPTIONS.map((item) => {
          const row = findRow(intervalTable, item.tipo, item.porcentaje);
          return (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-600">
                  Intensidad: <span className="font-medium text-slate-900">{item.intensityLabel}</span>
                </p>
                <p className="text-slate-600">
                  Velocidad objetivo:{" "}
                  <span className="font-medium text-indigo-700">
                    {row ? `${row.velocidad_kmh.toFixed(2)} km/h` : "—"}
                  </span>
                </p>
                {row && (
                  <p className="text-slate-600">
                    Ritmo: <span className="font-medium text-slate-900">{row.ritmo_str} /km</span>
                  </p>
                )}
                <p className="text-xs text-slate-400">{item.ratio}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SPEED_TEST_PRESCRIPTIONS.map((item) => {
          // TODO: confirmar con preparador si se debe usar un % único en vez de rango
          const range = findRangeRows(speedTestTable, item.tipo);
          const paceRange = formatPaceRange(range);

          return (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-600">
                  Intensidad:{" "}
                  <span className="font-medium text-slate-900">
                    {formatPercentRange(range)}
                    {speedTestTable ? " MSS" : ""}
                  </span>
                </p>
                <p className="text-slate-600">
                  Velocidad objetivo:{" "}
                  <span className="font-medium text-indigo-700">{formatSpeedRange(range)}</span>
                </p>
                {paceRange ? (
                  <p className="text-slate-600">
                    Ritmo: <span className="font-medium text-slate-900">{paceRange} /km</span>
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
