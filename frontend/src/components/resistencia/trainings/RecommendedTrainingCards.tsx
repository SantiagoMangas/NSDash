"use client";

import { IntervalRowsTable } from "@/components/speed/IntervalRowsTable";
import type { IntervalRow, IntervalTable } from "@/lib/types";
import type { PrescriptionExpandControl } from "./prescriptionExpand";
import { PrescriptionCard } from "./PrescriptionCard";

type Props = {
  speedTestTable?: IntervalTable | null;
  prescriptionExpand: PrescriptionExpandControl;
};

function rowsForTipo(table: IntervalTable, tipo: string): IntervalRow[] {
  return [...table.rows.filter((row) => row.tipo === tipo)].sort(
    (a, b) => a.porcentaje - b.porcentaje,
  );
}

function formatRowsSummary(rows: IntervalRow[]): string {
  if (rows.length === 0) return "—";
  const speeds = rows.map((r) => r.velocidad_kmh);
  const minKmh = Math.min(...speeds);
  const maxKmh = Math.max(...speeds);
  const minPct = rows[0].porcentaje;
  const maxPct = rows[rows.length - 1].porcentaje;
  return `${minPct}-${maxPct}% MSS · ${minKmh.toFixed(2)} - ${maxKmh.toFixed(2)} km/h`;
}

const SPEED_TEST_PRESCRIPTIONS = [
  { id: "tr-extensivo", title: "Tempo Run Extensivo", tipo: "tr_extensivo" },
  { id: "tr-recovery", title: "Tempo Run Recovery", tipo: "tr_recovery" },
  { id: "rst", title: "RST", tipo: "rst" },
  { id: "sit", title: "SIT", tipo: "sit" },
] as const;

export function RecommendedTrainingCards({ speedTestTable = null, prescriptionExpand }: Props) {
  const { isDesktop, isExpanded, onActivate } = prescriptionExpand;

  if (!speedTestTable) {
    return null;
  }

  const gridClass = isDesktop
    ? "grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4"
    : "grid grid-cols-1 gap-4";

  return (
    <div className={gridClass}>
      {SPEED_TEST_PRESCRIPTIONS.map((item) => {
        const rows = rowsForTipo(speedTestTable, item.tipo);
        const summary = formatRowsSummary(rows);

        return (
          <PrescriptionCard
            key={item.id}
            cardId={item.id}
            title={item.title}
            summary={summary}
            expanded={isExpanded(item.id)}
            stretchInGrid={isDesktop}
            onCardActivate={() => onActivate(item.id)}
          >
            {rows.length === 0 ? (
              <p className="text-xs text-slate-500">Sin filas para este tipo.</p>
            ) : (
              <IntervalRowsTable rows={rows} compact />
            )}
          </PrescriptionCard>
        );
      })}
    </div>
  );
}