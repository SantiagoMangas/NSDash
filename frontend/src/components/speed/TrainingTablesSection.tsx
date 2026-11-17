"use client";

import { useMemo, useState } from "react";
import { IntervalRowsTable } from "@/components/speed/IntervalRowsTable";
import {
  IntervalBandReferenceSelector,
  type IntervalReferenceSourceKey,
} from "@/components/resistencia/trainings/IntervalBandReferenceSelector";
import { PrescriptionCard } from "@/components/resistencia/trainings/PrescriptionCard";
import type { PrescriptionExpandControl } from "@/components/resistencia/trainings/prescriptionExpand";
import type { IntervalRow, IntervalTable } from "@/lib/types";

type Props = {
  intervalTables: {
    from_vam: IntervalTable | null;
    from_30_15: IntervalTable | null;
    from_yoyo: IntervalTable | null;
  };
  prescriptionExpand: PrescriptionExpandControl;
};

const HIIT_REFERENCE_PRIORITY: IntervalReferenceSourceKey[] = ["vam", "30_15", "yoyo"];

function getReferenceTable(
  intervalTables: Props["intervalTables"],
  key: IntervalReferenceSourceKey,
): IntervalTable | null {
  if (key === "vam") return intervalTables.from_vam;
  if (key === "30_15") return intervalTables.from_30_15;
  return intervalTables.from_yoyo;
}

function pickDefaultReference(intervalTables: Props["intervalTables"]): IntervalReferenceSourceKey | null {
  for (const key of HIIT_REFERENCE_PRIORITY) {
    if (getReferenceTable(intervalTables, key)) return key;
  }
  return null;
}

function rowsByTipoAndPercentages(
  rows: IntervalRow[],
  tipo: IntervalRow["tipo"],
  percentages: number[],
): IntervalRow[] {
  const set = new Set(percentages);
  return rows
    .filter((row) => row.tipo === tipo && set.has(row.porcentaje))
    .sort((a, b) => a.porcentaje - b.porcentaje);
}

function rowsByTipoAndRange(
  rows: IntervalRow[],
  tipo: IntervalRow["tipo"],
  min: number,
  max: number,
): IntervalRow[] {
  return rows
    .filter((row) => row.tipo === tipo && row.porcentaje >= min && row.porcentaje <= max)
    .sort((a, b) => a.porcentaje - b.porcentaje);
}

function formatRowsSummary(rows: IntervalRow[]): string {
  if (rows.length === 0) return "Sin filas para esta referencia";
  const speeds = rows.map((r) => r.velocidad_kmh);
  const minKmh = Math.min(...speeds);
  const maxKmh = Math.max(...speeds);
  const pcts = rows.map((r) => `${r.porcentaje}%`).join(" · ");
  return `${pcts} · ${minKmh.toFixed(2)}–${maxKmh.toFixed(2)} km/h`;
}

function CardRowsDetail({ rows }: { rows: IntervalRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-slate-500">No hay datos para este test en los porcentajes indicados.</p>;
  }

  return <IntervalRowsTable rows={rows} compact />;
}

const PRESCRIPTION_CARDS = [
  {
    id: "hiit-largo",
    title: "HIIT Largo",
    badge: { text: "80 – 95% VAM", className: "bg-green-50 text-green-800" },
    kind: "percentages" as const,
    tipo: "fit_largo" as const,
    percentages: [80, 95] as const,
  },
  {
    id: "hiit-corto",
    title: "HIIT Corto",
    badge: { text: "90 – 110% VAM", className: "bg-amber-50 text-amber-800" },
    kind: "percentages" as const,
    tipo: "fit_corto" as const,
    percentages: [90, 110] as const,
  },
  {
    id: "mas-105-110",
    title: "MAS Training",
    badge: { text: "105 – 110%", className: "bg-green-50 text-green-900" },
    kind: "range" as const,
    tipo: "mas_training" as const,
    range: [105, 110] as const,
  },
  {
    id: "mas-115-120",
    title: "MAS Training",
    badge: { text: "115 – 120%", className: "bg-orange-50 text-orange-900" },
    kind: "range" as const,
    tipo: "mas_training" as const,
    range: [115, 120] as const,
  },
] as const;

export function TrainingTablesSection({ intervalTables, prescriptionExpand }: Props) {
  const defaultReference = useMemo(() => pickDefaultReference(intervalTables), [intervalTables]);
  const [referenceOverride, setReferenceOverride] = useState<IntervalReferenceSourceKey | null>(null);
  const { isDesktop, isExpanded, onActivate } = prescriptionExpand;

  const available: Record<IntervalReferenceSourceKey, boolean> = {
    vam: Boolean(intervalTables.from_vam),
    "30_15": Boolean(intervalTables.from_30_15),
    yoyo: Boolean(intervalTables.from_yoyo),
  };

  const selectedReference =
    referenceOverride && getReferenceTable(intervalTables, referenceOverride)
      ? referenceOverride
      : defaultReference;

  const table = selectedReference ? getReferenceTable(intervalTables, selectedReference) : null;

  if (!defaultReference) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Registrá un test <span className="font-medium">VAM</span>,{" "}
          <span className="font-medium">30-15 IFT</span> o{" "}
          <span className="font-medium">Yo-Yo RI1</span> para ver los cuadros de HIIT y MAS Training.
        </p>
      </div>
    );
  }

  const gridClass = isDesktop
    ? "grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4"
    : "grid grid-cols-1 gap-4";

  return (
    <div className="space-y-4">
      <IntervalBandReferenceSelector
        selected={selectedReference}
        onSelect={setReferenceOverride}
        available={available}
        referenceKmh={table?.reference_kmh ?? null}
      />

      <div className={gridClass}>
        {PRESCRIPTION_CARDS.map((card) => {
          const rows =
            table && card.kind === "percentages"
              ? rowsByTipoAndPercentages(table.rows, card.tipo, [...card.percentages])
              : table && card.kind === "range"
                ? rowsByTipoAndRange(table.rows, card.tipo, card.range[0], card.range[1])
                : [];

          const summary = formatRowsSummary(rows);

          return (
            <PrescriptionCard
              key={card.id}
              cardId={card.id}
              title={card.title}
              badge={card.badge}
              summary={summary}
              expanded={isExpanded(card.id)}
              stretchInGrid={isDesktop}
              onCardActivate={() => onActivate(card.id)}
            >
              <CardRowsDetail rows={rows} />
            </PrescriptionCard>
          );
        })}
      </div>
    </div>
  );
}