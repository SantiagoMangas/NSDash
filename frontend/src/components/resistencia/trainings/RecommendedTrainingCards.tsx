"use client";

import { useState, type ReactNode } from "react";
import type { IntervalRow, IntervalTable } from "@/lib/types";

type Props = {
  hiitIntervalTable: IntervalTable | null;
  masIntervalTable: IntervalTable | null;
  speedReferenceKmh: number | null;
  speedTestTable?: IntervalTable | null;
  beforeSpeedCards?: ReactNode;
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

const HIIT_PRESCRIPTIONS = [
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
    id: "hiit-largo",
    title: "HIIT Largo",
    subtitle: "6 × 2 minutos",
    tipo: "fit_largo",
    porcentaje: 95,
    intensityLabel: "95% VAM",
    ratio: "Recuperación 1:1",
  },
] as const;

const MAS_PRESCRIPTION = {
  id: "mas-training",
  title: "MAS Training",
  subtitle: "5 × 4 minutos",
  tipo: "mas_training",
  porcentaje: 105,
  intensityLabel: "105% VAM",
  ratio: "Recuperación 1:1",
} as const;

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

function CollapseToggle({ expanded, onToggle, label }: { expanded: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? `Colapsar ${label}` : `Expandir ${label}`}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-600 transition hover:bg-slate-50"
    >
      {expanded ? "−" : "+"}
    </button>
  );
}

function CollapsibleCard({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {summary ? <p className="mt-1 text-xs text-slate-500 truncate">{summary}</p> : null}
        </div>
        <CollapseToggle
          expanded={expanded}
          onToggle={() => setExpanded((prev) => !prev)}
          label={title}
        />
      </div>
      {expanded ? <div className="border-t border-slate-100 px-4 pb-4 pt-3">{children}</div> : null}
    </div>
  );
}

function PrescriptionCard({
  title,
  subtitle,
  intensityLabel,
  ratio,
  row,
}: {
  title: string;
  subtitle: string;
  intensityLabel: string;
  ratio: string;
  row: IntervalRow | null;
}) {
  const summary = row
    ? `${row.velocidad_kmh.toFixed(2)} km/h · ${intensityLabel}`
    : `${subtitle} · ${intensityLabel}`;

  return (
    <CollapsibleCard title={title} summary={summary}>
      <div className="space-y-2 text-sm">
        <p className="text-xs text-slate-500">{subtitle}</p>
        <p className="text-slate-600">
          Intensidad: <span className="font-medium text-slate-900">{intensityLabel}</span>
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
        <p className="text-xs text-slate-400">{ratio}</p>
      </div>
    </CollapsibleCard>
  );
}

export function RecommendedTrainingCards({
  hiitIntervalTable,
  masIntervalTable,
  speedReferenceKmh,
  speedTestTable = null,
  beforeSpeedCards = null,
}: Props) {
  const hiitReferenceKmh = hiitIntervalTable?.reference_kmh ?? null;
  const masReferenceKmh = masIntervalTable?.reference_kmh ?? null;
  const masRow = findRow(masIntervalTable, MAS_PRESCRIPTION.tipo, MAS_PRESCRIPTION.porcentaje);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Entrenamiento recomendado</p>
        {hiitReferenceKmh !== null ? (
          <p className="mt-1 text-sm text-slate-700">
            Ref. HIIT: <strong className="text-slate-900">{hiitReferenceKmh.toFixed(2)} km/h</strong>
            <span className="text-slate-500"> (VAM → 30-15 → Yo-Yo)</span>
          </p>
        ) : null}
        {masReferenceKmh !== null ? (
          <p className="mt-1 text-sm text-slate-700">
            Ref. MAS: <strong className="text-slate-900">{masReferenceKmh.toFixed(2)} km/h</strong>
            <span className="text-slate-500"> (30-15 → Yo-Yo → VAM)</span>
          </p>
        ) : null}
        {speedReferenceKmh !== null ? (
          <p className="mt-1 text-sm text-slate-700">
            Velocidad máxima (Speed Test):{" "}
            <strong className="text-slate-900">{speedReferenceKmh.toFixed(2)} km/h</strong>
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <PrescriptionCard
          title={HIIT_PRESCRIPTIONS[0].title}
          subtitle={HIIT_PRESCRIPTIONS[0].subtitle}
          intensityLabel={HIIT_PRESCRIPTIONS[0].intensityLabel}
          ratio={HIIT_PRESCRIPTIONS[0].ratio}
          row={findRow(hiitIntervalTable, HIIT_PRESCRIPTIONS[0].tipo, HIIT_PRESCRIPTIONS[0].porcentaje)}
        />
        <PrescriptionCard
          title={MAS_PRESCRIPTION.title}
          subtitle={MAS_PRESCRIPTION.subtitle}
          intensityLabel={MAS_PRESCRIPTION.intensityLabel}
          ratio={MAS_PRESCRIPTION.ratio}
          row={masRow}
        />
        <PrescriptionCard
          title={HIIT_PRESCRIPTIONS[1].title}
          subtitle={HIIT_PRESCRIPTIONS[1].subtitle}
          intensityLabel={HIIT_PRESCRIPTIONS[1].intensityLabel}
          ratio={HIIT_PRESCRIPTIONS[1].ratio}
          row={findRow(hiitIntervalTable, HIIT_PRESCRIPTIONS[1].tipo, HIIT_PRESCRIPTIONS[1].porcentaje)}
        />
      </div>

      {beforeSpeedCards}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SPEED_TEST_PRESCRIPTIONS.map((item) => {
          // TODO: confirmar con preparador si se debe usar un % único en vez de rango
          const range = findRangeRows(speedTestTable, item.tipo);
          const paceRange = formatPaceRange(range);
          const summary = `${formatPercentRange(range)}${speedTestTable ? " MSS" : ""} · ${formatSpeedRange(range)}`;

          return (
            <CollapsibleCard key={item.id} title={item.title} summary={summary}>
              <div className="space-y-2 text-sm">
                <p className="text-xs text-slate-500">{item.subtitle}</p>
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
            </CollapsibleCard>
          );
        })}
      </div>
    </div>
  );
}
