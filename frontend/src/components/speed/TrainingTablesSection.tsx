"use client";

import { useMemo, useState } from "react";
import type { IntervalTable } from "@/lib/types";

type Props = {
  intervalTables: {
    from_vam: IntervalTable | null;
    from_30_15: IntervalTable | null;
    from_yoyo: IntervalTable | null;
  };
};

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

export function TrainingTablesSection({ intervalTables }: Props) {
  const availableSources = useMemo(() => {
    const sources: Array<{ key: "vam" | "30_15" | "yoyo"; label: string }> = [];
    if (intervalTables.from_vam) sources.push({ key: "vam", label: "VAM" });
    if (intervalTables.from_30_15) sources.push({ key: "30_15", label: "30-15 IFT" });
    if (intervalTables.from_yoyo) sources.push({ key: "yoyo", label: "Yo-Yo RI1" });
    return sources;
  }, [intervalTables]);

  const [selectedRef, setSelectedRef] = useState<"vam" | "30_15" | "yoyo">(availableSources[0]?.key ?? "vam");

  const currentTable = useMemo(() => {
    if (selectedRef === "vam") return intervalTables.from_vam;
    if (selectedRef === "30_15") return intervalTables.from_30_15;
    return intervalTables.from_yoyo;
  }, [selectedRef, intervalTables]);

  const isEmpty = availableSources.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <p className="text-sm text-slate-600">Registrá al menos un test para ver los cuadros de entrenamiento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de referencia */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Cuadros de Entrenamiento</h2>
        <div className="flex gap-2 flex-wrap">
          {(["vam", "30_15", "yoyo"] as const).map((ref) => {
            const enabled =
              (ref === "vam" && intervalTables.from_vam) ||
              (ref === "30_15" && intervalTables.from_30_15) ||
              (ref === "yoyo" && intervalTables.from_yoyo);

            const label = ref === "vam" ? "VAM" : ref === "30_15" ? "30-15 IFT" : "Yo-Yo RI1";

            return (
              <button
                key={ref}
                onClick={() => enabled && setSelectedRef(ref)}
                disabled={!enabled}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  enabled
                    ? selectedRef === ref
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-slate-100 text-slate-400 opacity-40 cursor-not-allowed"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {currentTable && (
        <>
          {/* HIIT Section */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">Entrenamiento Intervalado HIIT</h3>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              {HIIT_CARDS.map((card) => {
                const rows =
                  card.id === "mixto"
                    ? currentTable.rows.filter((r) => r.tipo === "fit_corto" || r.tipo === "fit_largo")
                    : currentTable.rows.filter((r) => r.tipo === (card.id as "fit_corto" | "fit_largo"));

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
            <div className="px-6 pb-4 text-xs text-slate-500">* Esfuerzos que pueden durar más de 24'.</div>
          </div>

          {/* MAS Training Section */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">MAS Training</h3>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              {MAS_GROUPS.map((group) => {
                const rows = currentTable.rows.filter(
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
          </div>
        </>
      )}
    </div>
  );
}
