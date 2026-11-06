"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { IntervalRowsTable } from "@/components/speed/IntervalRowsTable";
import type { IntervalRow, IntervalTable } from "@/lib/types";

type SourceKey = "vam" | "30_15" | "yoyo";

type Props = {
  intervalTables: {
    from_vam: IntervalTable | null;
    from_30_15: IntervalTable | null;
    from_yoyo: IntervalTable | null;
  };
};

const SOURCE_LABELS: Record<SourceKey, string> = {
  vam: "VAM",
  "30_15": "30-15 IFT",
  yoyo: "Yo-Yo RI1",
};

const HIIT_PRIORITY: SourceKey[] = ["vam", "30_15", "yoyo"];
const MAS_PRIORITY: SourceKey[] = ["30_15", "yoyo", "vam"];

const HIIT_CARDS = [
  {
    id: "fit_corto" as const,
    title: "HIIT Corto",
    subtitle: "10-30 seg",
    badge: "90 – 110% VAM",
    badgeColor: "bg-amber-50 text-amber-800",
  },
  {
    id: "fit_largo" as const,
    title: "HIIT Largo",
    subtitle: "1-4 min",
    badge: "80 – 95% VAM",
    badgeColor: "bg-green-50 text-green-800",
  },
];

const MAS_GROUPS = [
  {
    range: [105, 110] as const,
    title: "105 – 110% MAS",
    headerBg: "bg-green-50",
    headerText: "text-green-900",
    borderColor: "border-green-100",
  },
  {
    range: [115, 120] as const,
    title: "115 – 120% MAS",
    headerBg: "bg-orange-50",
    headerText: "text-orange-900",
    borderColor: "border-orange-100",
  },
  {
    range: [125, 140] as const,
    title: "125 – 140% MAS",
    headerBg: "bg-red-50",
    headerText: "text-red-900",
    borderColor: "border-red-100",
  },
];

function getTable(intervalTables: Props["intervalTables"], key: SourceKey): IntervalTable | null {
  if (key === "vam") return intervalTables.from_vam;
  if (key === "30_15") return intervalTables.from_30_15;
  return intervalTables.from_yoyo;
}

function pickDefaultSource(
  intervalTables: Props["intervalTables"],
  priority: SourceKey[],
): SourceKey | null {
  for (const key of priority) {
    if (getTable(intervalTables, key)) return key;
  }
  return null;
}

function filterRowsByTipo(rows: IntervalRow[], tipo: IntervalRow["tipo"]) {
  return rows.filter((row) => row.tipo === tipo);
}

function SourceSelector({
  selected,
  onSelect,
  intervalTables,
}: {
  selected: SourceKey | null;
  onSelect: (key: SourceKey) => void;
  intervalTables: Props["intervalTables"];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(["vam", "30_15", "yoyo"] as const).map((ref) => {
        const enabled = Boolean(getTable(intervalTables, ref));
        return (
          <button
            key={ref}
            type="button"
            onClick={() => enabled && onSelect(ref)}
            disabled={!enabled}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              enabled
                ? selected === ref
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                : "bg-slate-50 text-slate-400 ring-1 ring-slate-100 cursor-not-allowed"
            }`}
          >
            {SOURCE_LABELS[ref]}
          </button>
        );
      })}
    </div>
  );
}

function ChevronToggle({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CollapsibleSection({
  title,
  summary,
  sourceToolbar,
  children,
  expanded,
  onToggle,
  showChevron,
}: {
  title: string;
  summary: string;
  sourceToolbar?: ReactNode;
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  /** En vista ancha (HIIT y MAS lado a lado) el encabezado no muestra el ícono; sigue siendo clicable entero. */
  showChevron: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 text-left transition hover:from-slate-100/80 hover:to-slate-50"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-slate-900">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{summary}</p>
        </div>
        {showChevron ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
            <ChevronToggle expanded={expanded} />
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {sourceToolbar ? (
            <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2.5">{sourceToolbar}</div>
          ) : null}
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

function MasGroupCard({
  title,
  headerBg,
  headerText,
  borderColor,
  rows,
}: {
  title: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  rows: IntervalRow[];
}) {
  return (
    <div className={`overflow-hidden rounded-xl border ${borderColor} bg-white shadow-sm`}>
      <div className={`border-b border-slate-100 px-3 py-2 ${headerBg}`}>
        <h4 className={`text-sm font-semibold ${headerText}`}>{title}</h4>
      </div>
      <div className="p-3">
        <IntervalRowsTable rows={rows} compact />
      </div>
    </div>
  );
}

const XL_PAIR_MIN_WIDTH = 1280;

function useXlSideBySideLayout() {
  const [isXl, setIsXl] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(min-width: ${XL_PAIR_MIN_WIDTH}px)`).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${XL_PAIR_MIN_WIDTH}px)`);
    const update = () => setIsXl(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isXl;
}

export function TrainingTablesSection({ intervalTables }: Props) {
  const hiitDefault = useMemo(
    () => pickDefaultSource(intervalTables, HIIT_PRIORITY),
    [intervalTables],
  );
  const masDefault = useMemo(
    () => pickDefaultSource(intervalTables, MAS_PRIORITY),
    [intervalTables],
  );

  const [hiitOverride, setHiitOverride] = useState<SourceKey | null>(null);
  const [masOverride, setMasOverride] = useState<SourceKey | null>(null);
  const isXlSideBySide = useXlSideBySideLayout();
  const [pairExpanded, setPairExpanded] = useState(true);
  const [hiitExpandedMobile, setHiitExpandedMobile] = useState(true);
  const [masExpandedMobile, setMasExpandedMobile] = useState(true);

  const hiitExpanded = isXlSideBySide ? pairExpanded : hiitExpandedMobile;
  const masExpanded = isXlSideBySide ? pairExpanded : masExpandedMobile;

  const toggleHiitPanel = () => {
    if (isXlSideBySide) {
      setPairExpanded((prev) => !prev);
    } else {
      setHiitExpandedMobile((prev) => !prev);
    }
  };

  const toggleMasPanel = () => {
    if (isXlSideBySide) {
      setPairExpanded((prev) => !prev);
    } else {
      setMasExpandedMobile((prev) => !prev);
    }
  };

  const hiitSelected =
    hiitOverride && getTable(intervalTables, hiitOverride) ? hiitOverride : hiitDefault;
  const masSelected =
    masOverride && getTable(intervalTables, masOverride) ? masOverride : masDefault;

  const hiitTable = hiitSelected ? getTable(intervalTables, hiitSelected) : null;
  const masTable = masSelected ? getTable(intervalTables, masSelected) : null;

  const isEmpty = !hiitDefault && !masDefault;

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Registrá al menos un test para ver los cuadros de entrenamiento.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] xl:items-start">
      {hiitTable && hiitSelected ? (
        <CollapsibleSection
          title="Entrenamiento Intervalado HIIT"
          summary={`Ref: ${hiitTable.reference_kmh.toFixed(2)} km/h · ${SOURCE_LABELS[hiitSelected]}`}
          expanded={hiitExpanded}
          onToggle={toggleHiitPanel}
          showChevron={!isXlSideBySide}
          sourceToolbar={
            <SourceSelector
              selected={hiitSelected}
              onSelect={setHiitOverride}
              intervalTables={intervalTables}
            />
          }
        >
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-3">
            {HIIT_CARDS.map((card) => {
              const cortoRows = filterRowsByTipo(hiitTable.rows, "fit_corto");
              const largoRows = filterRowsByTipo(hiitTable.rows, "fit_largo");
              const rows = card.id === "fit_corto" ? cortoRows : largoRows;

              return (
                <div
                  key={card.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900">{card.title}</h4>
                      <p className="mt-0.5 text-xs text-slate-500">{card.subtitle}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${card.badgeColor}`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-2">
                    <IntervalRowsTable rows={rows} compact />
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      ) : null}

      {masTable && masSelected ? (
        <CollapsibleSection
          title="MAS Training"
          summary={`Ref: ${masTable.reference_kmh.toFixed(2)} km/h · ${SOURCE_LABELS[masSelected]}`}
          expanded={masExpanded}
          onToggle={toggleMasPanel}
          showChevron={!isXlSideBySide}
          sourceToolbar={
            <SourceSelector
              selected={masSelected}
              onSelect={setMasOverride}
              intervalTables={intervalTables}
            />
          }
        >
          <div className="flex flex-col gap-3 border-t border-slate-100 p-3">
            {MAS_GROUPS.map((group) => {
              const rows = masTable.rows.filter(
                (r) =>
                  r.tipo === "mas_training" &&
                  r.porcentaje >= group.range[0] &&
                  r.porcentaje <= group.range[1],
              );

              if (rows.length === 0) return null;

              return (
                <MasGroupCard
                  key={`mas-${group.range[0]}`}
                  title={group.title}
                  headerBg={group.headerBg}
                  headerText={group.headerText}
                  borderColor={group.borderColor}
                  rows={rows}
                />
              );
            })}
          </div>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
