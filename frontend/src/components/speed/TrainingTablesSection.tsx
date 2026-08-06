"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { IntervalTable } from "@/lib/types";

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

/** HIIT / HIIT Continuos: VAM → 30-15 → Yo-Yo */
const HIIT_PRIORITY: SourceKey[] = ["vam", "30_15", "yoyo"];
/** MAS Training: 30-15 → Yo-Yo → VAM */
const MAS_PRIORITY: SourceKey[] = ["30_15", "yoyo", "vam"];

const HIIT_CARDS = [
  {
    id: "fit_corto",
    title: "HIIT Corto",
    subtitle: "10-30 seg",
    badge: "90 – 110% VAM",
    badgeColor: "bg-amber-50 text-amber-800",
    ratio: "1:2 / 1:3 / 1:4",
  },
  {
    id: "fit_largo",
    title: "HIIT Largo",
    subtitle: "1-4 min",
    badge: "80 – 95% VAM",
    badgeColor: "bg-green-50 text-green-800",
    ratio: "1:1 / 1:2",
  },
  {
    id: "mixto",
    title: "HIIT Mixto",
    subtitle: "30 seg / 3-5 min",
    badge: "85 – 100% VAM",
    badgeColor: "bg-orange-50 text-orange-800",
    ratio: "1:2 / 1:3 / 1:4",
  },
];

const MAS_GROUPS = [
  {
    range: [105, 110] as const,
    title: "105 – 110% MAS",
    ratio: "2:1 / 1:1",
    options: ["1'×30\" / 8-10'", "30\"×30\" / 8-10'", "2'×1' / 12-15'"],
    headerBg: "bg-green-50",
    headerText: "text-green-900",
  },
  {
    range: [115, 120] as const,
    title: "115 – 120% MAS",
    ratio: "2:1 / 1:1 / 1:2",
    options: ["20\"×10\" / 5'", "15\"×15\" / 5'", "20\"×40\" / 5'"],
    headerBg: "bg-orange-50",
    headerText: "text-orange-900",
  },
  {
    range: [125, 140] as const,
    title: "125 – 140% MAS",
    ratio: "1:1 / 1:2 / 1:4",
    options: ["15\"×15\" / 3'", "15\"×30\" / 5'", "7\"×30\" / 3-5'"],
    headerBg: "bg-red-50",
    headerText: "text-red-900",
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

function getStats(rows: Array<{ porcentaje: number; velocidad_kmh: number; ritmo_str: string }>) {
  if (rows.length === 0) return null;

  const minVel = Math.min(...rows.map((r) => r.velocidad_kmh));
  const maxVel = Math.max(...rows.map((r) => r.velocidad_kmh));

  const rowWithMaxVel = rows.reduce((a, b) => (b.velocidad_kmh > a.velocidad_kmh ? b : a));
  const rowWithMinVel = rows.reduce((a, b) => (b.velocidad_kmh < a.velocidad_kmh ? b : a));

  return {
    vel_min: minVel.toFixed(2),
    vel_max: maxVel.toFixed(2),
    ritmo_min: rowWithMaxVel.ritmo_str,
    ritmo_max: rowWithMinVel.ritmo_str,
  };
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
    <div className="flex gap-2 flex-wrap">
      {(["vam", "30_15", "yoyo"] as const).map((ref) => {
        const enabled = Boolean(getTable(intervalTables, ref));
        return (
          <button
            key={ref}
            type="button"
            onClick={() => enabled && onSelect(ref)}
            disabled={!enabled}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              enabled
                ? selected === ref
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-slate-100 text-slate-400 opacity-40 cursor-not-allowed"
            }`}
          >
            {SOURCE_LABELS[ref]}
          </button>
        );
      })}
    </div>
  );
}

function CollapsibleSection({
  title,
  summary,
  headerExtra,
  children,
}: {
  title: string;
  summary: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-label={expanded ? `Colapsar ${title}` : `Expandir ${title}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            {expanded ? "−" : "+"}
          </button>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{summary}</p>
          </div>
        </div>
        {expanded && headerExtra ? <div className="sm:ml-auto">{headerExtra}</div> : null}
      </div>
      {expanded ? children : null}
    </div>
  );
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

  const hiitSelected =
    hiitOverride && getTable(intervalTables, hiitOverride) ? hiitOverride : hiitDefault;
  const masSelected =
    masOverride && getTable(intervalTables, masOverride) ? masOverride : masDefault;

  const hiitTable = hiitSelected ? getTable(intervalTables, hiitSelected) : null;
  const masTable = masSelected ? getTable(intervalTables, masSelected) : null;

  const isEmpty = !hiitDefault && !masDefault;

  if (isEmpty) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <p className="text-sm text-slate-600">Registrá al menos un test para ver los cuadros de entrenamiento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900">Cuadros de Entrenamiento</h2>
        <p className="mt-1 text-sm text-slate-500">
          HIIT prioriza VAM → 30-15 → Yo-Yo. MAS prioriza 30-15 → Yo-Yo → VAM. Podés cambiar cada
          sección por separado. Expandí cada bloque con +.
        </p>
      </div>

      {hiitTable && hiitSelected && (
        <CollapsibleSection
          title="Entrenamiento Intervalado HIIT"
          summary={`Ref: ${hiitTable.reference_kmh.toFixed(2)} km/h · ${SOURCE_LABELS[hiitSelected]}`}
          headerExtra={
            <SourceSelector
              selected={hiitSelected}
              onSelect={setHiitOverride}
              intervalTables={intervalTables}
            />
          }
        >
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200">
            {HIIT_CARDS.map((card) => {
              const rows =
                card.id === "mixto"
                  ? hiitTable.rows.filter((r) => r.tipo === "fit_corto" || r.tipo === "fit_largo")
                  : hiitTable.rows.filter((r) => r.tipo === (card.id as "fit_corto" | "fit_largo"));

              const stats = getStats(rows);

              return (
                <div key={card.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="p-4 border-b border-slate-200 flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{card.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{card.subtitle}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Velocidad km/h</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {stats ? `${stats.vel_min} – ${stats.vel_max}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Ritmo /km</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {stats ? `${stats.ritmo_min} – ${stats.ritmo_max}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Ratio</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{card.ratio}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-6 pb-4 text-xs text-slate-500">* Esfuerzos que pueden durar más de 24&apos;.</div>
        </CollapsibleSection>
      )}

      {masTable && masSelected && (
        <CollapsibleSection
          title="MAS Training"
          summary={`Ref: ${masTable.reference_kmh.toFixed(2)} km/h · ${SOURCE_LABELS[masSelected]}`}
          headerExtra={
            <SourceSelector
              selected={masSelected}
              onSelect={setMasOverride}
              intervalTables={intervalTables}
            />
          }
        >
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200">
            {MAS_GROUPS.map((group) => {
              const rows = masTable.rows.filter(
                (r) => r.tipo === "mas_training" && r.porcentaje >= group.range[0] && r.porcentaje <= group.range[1]
              );

              if (rows.length === 0) return null;

              const stats = getStats(rows);

              return (
                <div key={`mas-${group.range[0]}`} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className={`p-4 border-b border-slate-200 ${group.headerBg}`}>
                    <h4 className={`font-semibold ${group.headerText}`}>{group.title}</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Velocidad km/h</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {stats ? `${stats.vel_min} – ${stats.vel_max}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Ritmo /km</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {stats ? `${stats.ritmo_min} – ${stats.ritmo_max}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Ratio</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{group.ratio}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Opciones</p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-700">
                        {group.options.map((opt) => (
                          <li key={opt}>• {opt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
