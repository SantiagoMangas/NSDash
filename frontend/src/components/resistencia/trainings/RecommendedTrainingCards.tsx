"use client";

import { useState, type ReactNode } from "react";
import { formatPaceWithUnit } from "@/lib/units";
import type { IntervalRow, IntervalTable } from "@/lib/types";

type Props = {
  speedReferenceKmh: number | null;
  speedTestTable?: IntervalTable | null;
  beforeSpeedCards?: ReactNode;
};

function findRangeRows(table: IntervalTable | null, tipo: string): { min: IntervalRow; max: IntervalRow } | null {
  const rows = table?.rows.filter((row) => row.tipo === tipo) ?? [];
  if (rows.length < 2) {
    return null;
  }
  const sorted = [...rows].sort((a, b) => a.porcentaje - b.porcentaje);
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

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
  return `${formatPaceWithUnit(range.min.ritmo_str)} - ${formatPaceWithUnit(range.max.ritmo_str)}`;
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

export function RecommendedTrainingCards({
  speedReferenceKmh,
  speedTestTable = null,
  beforeSpeedCards = null,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Entrenamiento recomendado</p>
        {speedReferenceKmh !== null ? (
          <p className="mt-1 text-sm text-slate-700">
            Velocidad máxima (Speed Test):{" "}
            <strong className="text-slate-900">{speedReferenceKmh.toFixed(2)} km/h</strong>
          </p>
        ) : null}
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
                    Ritmo: <span className="font-medium text-slate-900">{paceRange}</span>
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
