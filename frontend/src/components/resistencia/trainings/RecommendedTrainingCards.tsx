"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { formatPaceWithUnit } from "@/lib/units";
import type { IntervalRow, IntervalTable } from "@/lib/types";

type Props = {
  speedTestTable?: IntervalTable | null;
};

const DESKTOP_MIN_WIDTH = 1024;

function useIsDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function findRangeRows(table: IntervalTable | null, tipo: string): { min: IntervalRow; max: IntervalRow } | null {
  const rows = table?.rows.filter((row) => row.tipo === tipo) ?? [];
  if (rows.length < 2) {
    return null;
  }
  const sorted = [...rows].sort((a, b) => a.porcentaje - b.porcentaje);
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

const SPEED_TEST_PRESCRIPTIONS = [
  { id: "tr-extensivo", title: "Tempo Run Extensivo", tipo: "tr_extensivo" },
  { id: "tr-recovery", title: "Tempo Run Recovery", tipo: "tr_recovery" },
  { id: "rst", title: "RST", tipo: "rst" },
  { id: "sit", title: "SIT", tipo: "sit" },
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

function CardDetail({ range }: { range: { min: IntervalRow; max: IntervalRow } | null }) {
  const paceRange = formatPaceRange(range);

  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-600">
        Intensidad:{" "}
        <span className="font-medium text-slate-900">{formatPercentRange(range)} MSS</span>
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
  );
}

function PrescriptionCard({
  cardId,
  title,
  summary,
  expanded,
  onCardActivate,
  children,
}: {
  cardId: string;
  title: string;
  summary?: string;
  expanded: boolean;
  onCardActivate: () => void;
  children: ReactNode;
}) {
  const detailId = `prescription-detail-${cardId}`;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardActivate();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={detailId}
      onClick={onCardActivate}
      onKeyDown={handleKeyDown}
      className="flex min-h-[5.5rem] cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm outline-none transition hover:border-slate-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <div className="px-4 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {summary ? <p className="mt-1 text-xs text-slate-500 line-clamp-2">{summary}</p> : null}
      </div>
      {expanded ? (
        <div id={detailId} className="mt-3 border-t border-slate-100 px-4 pb-4 pt-3">
          {children}
        </div>
      ) : (
        <div className="flex-1" aria-hidden />
      )}
    </div>
  );
}

export function RecommendedTrainingCards({ speedTestTable = null }: Props) {
  const isDesktop = useIsDesktopLayout();
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [mobileOpenId, setMobileOpenId] = useState<string | null>(null);

  if (!speedTestTable) {
    return null;
  }

  function activateCard(id: string) {
    if (isDesktop) {
      setDesktopExpanded((prev) => !prev);
    } else {
      setMobileOpenId((prev) => (prev === id ? null : id));
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
      {SPEED_TEST_PRESCRIPTIONS.map((item) => {
        const range = findRangeRows(speedTestTable, item.tipo);
        const summary = `${formatPercentRange(range)} MSS · ${formatSpeedRange(range)}`;
        const expanded = isDesktop ? desktopExpanded : mobileOpenId === item.id;

        return (
          <PrescriptionCard
            key={item.id}
            cardId={item.id}
            title={item.title}
            summary={summary}
            expanded={expanded}
            onCardActivate={() => activateCard(item.id)}
          >
            <CardDetail range={range} />
          </PrescriptionCard>
        );
      })}
    </div>
  );
}
