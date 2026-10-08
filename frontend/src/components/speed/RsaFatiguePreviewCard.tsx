"use client";

import { formatDisplayDate } from "@/lib/date";
import { formatRsaDistanceM, formatRsaPauseS } from "@/lib/rsaFatigue";

export type RsaFatiguePreviewData = {
  date: string;
  cantidad_sprints: number;
  tiempos?: number[];
  distancia_sprint_m: number | null;
  pausa_s: number | null;
  mejor_tiempo: number;
  peor_tiempo: number;
  tiempo_total: number;
  tiempo_ideal: number;
  indice_fatiga_pct: number;
  categoria: string;
};

type Tone = "blue" | "green" | "yellow" | "red";

function toneFromIndex(indice_fatiga_pct: number): Tone {
  if (!Number.isFinite(indice_fatiga_pct)) return "blue";
  if (indice_fatiga_pct >= 20) return "red";
  if (indice_fatiga_pct >= 15) return "yellow";
  if (indice_fatiga_pct >= 10) return "green";
  return "blue";
}

const TONE_CLASSES: Record<Tone, { card: string; badge: string; label: string; muted: string }> = {
  blue: {
    card: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    label: "text-blue-900",
    muted: "text-blue-800/80",
  },
  green: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    label: "text-emerald-900",
    muted: "text-emerald-800/80",
  },
  yellow: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-900",
    label: "text-amber-900",
    muted: "text-amber-800/80",
  },
  red: {
    card: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-800",
    label: "text-red-900",
    muted: "text-red-800/80",
  },
};

function formatSeconds(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} s`;
}

type Props = {
  test: RsaFatiguePreviewData;
  showDate?: boolean;
};

export function RsaFatiguePreviewCard({ test, showDate = true }: Props) {
  const tone = toneFromIndex(test.indice_fatiga_pct);
  const classes = TONE_CLASSES[tone];
  const distLabel = formatRsaDistanceM(test.distancia_sprint_m);
  const distDisplay = distLabel === "—" ? "—" : `${distLabel} m`;
  const pauseNum = formatRsaPauseS(test.pausa_s);
  const pauseLabel = pauseNum === "—" ? "—" : `${pauseNum} s pausa`;
  const tiemposLine =
    test.tiempos && test.tiempos.length > 0
      ? test.tiempos.map((t) => t.toFixed(2)).join(" · ")
      : null;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${classes.card}`}>
      <div className="grid grid-cols-3 gap-3 border-b border-white/50 pb-3 text-center sm:text-left">
        <div className="rounded-lg border border-white/50 bg-white/40 px-3 py-2">
          <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Sprints</p>
          <p className={`text-lg font-semibold ${classes.label}`}>{test.cantidad_sprints}</p>
        </div>
        <div className="rounded-lg border border-white/50 bg-white/40 px-3 py-2">
          <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Distancia</p>
          <p className={`text-lg font-semibold ${classes.label}`}>{distDisplay}</p>
        </div>
        <div className="rounded-lg border border-white/50 bg-white/40 px-3 py-2">
          <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Pausa</p>
          <p className={`text-lg font-semibold ${classes.label}`}>{pauseLabel}</p>
        </div>
      </div>

      {showDate && (
        <p className={`mt-2 text-xs ${classes.muted}`}>
          Fecha: <strong className={classes.label}>{formatDisplayDate(test.date)}</strong>
        </p>
      )}
      {tiemposLine && (
        <p className={`mt-1 text-xs ${classes.muted}`}>
          Tiempos: <strong className={classes.label}>{tiemposLine}</strong>
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5">
          <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Mejor tiempo</p>
          <p className={`mt-0.5 font-semibold ${classes.label}`}>{formatSeconds(test.mejor_tiempo)}</p>
        </div>
        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5">
          <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Peor tiempo</p>
          <p className={`mt-0.5 font-semibold ${classes.label}`}>{formatSeconds(test.peor_tiempo)}</p>
        </div>
        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5">
          <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Tiempo total</p>
          <p className={`mt-0.5 font-semibold ${classes.label}`}>{formatSeconds(test.tiempo_total)}</p>
        </div>
        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5">
          <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Tiempo ideal</p>
          <p className={`mt-0.5 font-semibold ${classes.label}`}>{formatSeconds(test.tiempo_ideal)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5">
          <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Índice de fatiga</p>
          <p className={`mt-0.5 text-xl font-semibold ${classes.label}`}>
            {Number.isFinite(test.indice_fatiga_pct) ? `${test.indice_fatiga_pct.toFixed(2)}%` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 flex items-center justify-between gap-2">
          <div>
            <p className={`text-xs uppercase tracking-wide ${classes.muted}`}>Categoría</p>
            <p className={`mt-0.5 font-semibold ${classes.label}`}>{test.categoria}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${classes.badge}`}>
            {test.categoria}
          </span>
        </div>
      </div>
    </div>
  );
}
