"use client";

import type { IntervalTable as IntervalTableType } from "@/lib/types";

const CONTINUOUS_CARDS = [
  {
    title: "HIIT Corto",
    subtitle: "10-30 seg",
    description: "90-110% VAM",
    ratio: "Ratio 1:2 / 1:3",
    color: "bg-yellow-50",
    header: "bg-yellow-100 text-slate-900",
  },
  {
    title: "HIIT Largo",
    subtitle: "1-4 min",
    description: "80-95% VAM",
    ratio: "Ratio 1:1 / 1:2",
    color: "bg-emerald-50",
    header: "bg-emerald-100 text-slate-900",
  },
  {
    title: "HIIT Mixto",
    subtitle: "30 seg / 3-5'",
    description: "85-100% VAM",
    ratio: "Ratio 1:2 / 1:3",
    color: "bg-amber-50",
    header: "bg-amber-100 text-slate-900",
  },
];

const MAS_GROUPS = [
  {
    title: "105-110% MAS",
    label: "Grupo 1",
    range: [105, 110] as const,
    ratio: "2:1 / 1:1",
    options: ["1'x30\"/8-10'", "30\"x30\"/8-10'", "2'x1'/12-15'"],
    bg: "bg-emerald-50",
    header: "bg-emerald-100 text-slate-900",
  },
  {
    title: "115-120% MAS",
    label: "Grupo 2",
    range: [115, 120] as const,
    ratio: "2:1 / 1:1 / 1:2",
    options: ["20\"x10\"/5'", "15\"x15\"/5'", "20\"x40\"/5'"],
    bg: "bg-orange-50",
    header: "bg-orange-100 text-slate-900",
  },
  {
    title: "125-140% MAS",
    label: "Grupo 3",
    range: [125, 140] as const,
    ratio: "1:1 / 1:2 / 1:4",
    options: ["15\"x15\"/3'", "15\"x30\"/5'", "7\"x30\"/3-5'"],
    bg: "bg-red-50",
    header: "bg-red-100 text-slate-900",
  },
];

function parsePace(pace: string): number {
  const parts = pace.split(":");
  if (parts.length !== 2) return Infinity;
  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return Infinity;
  return minutes * 60 + seconds;
}

function computeRange(rows: IntervalTableType["rows"]): {
  minKmh: number | null;
  maxKmh: number | null;
  minPace: string | null;
  maxPace: string | null;
} {
  if (rows.length === 0) {
    return { minKmh: null, maxKmh: null, minPace: null, maxPace: null };
  }

  const speeds = rows.map((row) => row.velocidad_kmh);
  const paces = rows.map((row) => ({ value: parsePace(row.ritmo_str), label: row.ritmo_str }));

  const minKmh = Math.min(...speeds);
  const maxKmh = Math.max(...speeds);
  const bestPace = paces.reduce((prev, curr) => (curr.value < prev.value ? curr : prev), paces[0]);
  const worstPace = paces.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), paces[0]);

  return {
    minKmh,
    maxKmh,
    minPace: bestPace.label,
    maxPace: worstPace.label,
  };
}

type Props = {
  table: IntervalTableType | null;
};

export default function VelocityIntervalDashboard({ table }: Props) {
  if (!table) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900">Cuadro Intervalado</h2>
        <p className="mt-2 text-sm text-slate-600">Seleccioná una referencia disponible para ver los cuadros de entrenamiento.</p>
      </div>
    );
  }

  const fitCorto = table.rows.filter((row) => row.tipo === "fit_corto");
  const fitLargo = table.rows.filter((row) => row.tipo === "fit_largo");
  const masTraining = table.rows.filter((row) => row.tipo === "mas_training");
  const fitMixto = [...fitCorto, ...fitLargo];

  const cortoStats = computeRange(fitCorto);
  const largoStats = computeRange(fitLargo);
  const mixtoStats = computeRange(fitMixto);

  const getMasGroupRows = (minPct: number, maxPct: number) =>
    masTraining.filter((row) => row.porcentaje >= minPct && row.porcentaje <= maxPct);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Entrenamiento Intervalado Continuo</h2>
          <p className="mt-1 text-sm text-slate-600">Tres cuadros con rangos de intensidades según el test seleccionado.</p>
        </div>
        <div className="grid gap-4 p-6 lg:grid-cols-3">
          {[
            { ...CONTINUOUS_CARDS[0], stats: cortoStats },
            { ...CONTINUOUS_CARDS[1], stats: largoStats },
            { ...CONTINUOUS_CARDS[2], stats: mixtoStats },
          ].map((card) => (
            <div key={card.title} className={`${card.color} rounded-3xl border border-slate-200 p-5`}>
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${card.header}`}>
                {card.title}
              </div>
              <p className="mt-3 text-sm text-slate-600">{card.subtitle}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{card.description}</p>
              <div className="mt-5 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">Velocidad km/h</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {card.stats.minKmh !== null ? `${card.stats.minKmh.toFixed(2)} - ${card.stats.maxKmh?.toFixed(2)}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">Ritmo min/km</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {card.stats.minPace && card.stats.maxPace ? `${card.stats.minPace} - ${card.stats.maxPace}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">Ratio</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{card.ratio}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-500">*Esfuerzos que pueden durar más de 24&apos;.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">MAS Training</h2>
          <p className="mt-1 text-sm text-slate-600">Tres zonas de MAS según porcentaje de VAM y opciones de series.</p>
        </div>
        <div className="grid gap-4 p-6 lg:grid-cols-3">
          {MAS_GROUPS.map((group) => {
            const rows = getMasGroupRows(group.range[0], group.range[1]);
            const stats = computeRange(rows);
            return (
              <div key={group.title} className={`${group.bg} rounded-3xl border border-slate-200 p-5`}>
                <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${group.header}`}>
                  {group.title}
                </div>
                <p className="mt-3 text-sm text-slate-600">Velocidad km/h</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {stats.minKmh !== null ? `${stats.minKmh.toFixed(2)} - ${stats.maxKmh?.toFixed(2)}` : "-"}
                </p>
                <p className="mt-4 text-sm text-slate-600">Ritmo m/km</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {stats.minPace && stats.maxPace ? `${stats.minPace} - ${stats.maxPace}` : "-"}
                </p>
                <div className="mt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">Ratio</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{group.ratio}</p>
                </div>
                <div className="mt-4 space-y-1 text-xs text-slate-700">
                  <p className="font-semibold">Opciones:</p>
                  {group.options.map((option) => (
                    <p key={option}>• {option}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
