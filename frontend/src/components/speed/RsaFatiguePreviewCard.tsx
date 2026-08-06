"use client";

export type RsaFatiguePreviewData = {
  date: string;
  indice_fatiga_pct: number;
  categoria: string;
  mejor_tiempo: number;
  peor_tiempo: number;
  tiempo_medio: number;
  distancia_sprint_m: number | null;
  velocidad_mejor_kmh: number | null;
  velocidad_peor_kmh: number | null;
  velocidad_media_kmh: number | null;
};

type Tone = "blue" | "green" | "yellow" | "red";

function toneFromIndex(indice_fatiga_pct: number): Tone {
  if (indice_fatiga_pct >= 20) return "red";
  if (indice_fatiga_pct >= 15) return "yellow";
  if (indice_fatiga_pct >= 10) return "green";
  return "blue";
}

const TONE_CLASSES: Record<Tone, { card: string; badge: string; label: string }> = {
  blue: {
    card: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    label: "text-blue-900",
  },
  green: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    label: "text-emerald-900",
  },
  yellow: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-900",
    label: "text-amber-900",
  },
  red: {
    card: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-800",
    label: "text-red-900",
  },
};

function formatSeconds(value: number): string {
  return `${value.toFixed(2)} s`;
}

function formatKmh(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(2)} km/h`;
}

type Props = {
  test: RsaFatiguePreviewData;
};

export function RsaFatiguePreviewCard({ test }: Props) {
  const tone = toneFromIndex(test.indice_fatiga_pct);
  const classes = TONE_CLASSES[tone];
  const hasDistance = test.distancia_sprint_m !== null;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${classes.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wide ${classes.label}`}>
            Vista previa del test RSA
          </p>
          <p className={`mt-1 text-sm ${classes.label}`}>
            Fecha: <strong>{test.date}</strong>
          </p>
          {hasDistance ? (
            <p className={`mt-0.5 text-xs ${classes.label}`}>
              Distancia del sprint: <strong>{test.distancia_sprint_m!.toFixed(0)} m</strong>
            </p>
          ) : (
            <p className={`mt-0.5 text-xs ${classes.label}`}>Sin distancia cargada</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes.badge}`}>
          {test.categoria}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-white/60 bg-white/70 px-4 py-3">
        <p className={`text-xs uppercase tracking-wide ${classes.label}`}>IFF</p>
        <p className={`mt-1 text-2xl font-semibold ${classes.label}`}>
          {test.indice_fatiga_pct.toFixed(2)}%
          <span className="ml-2 text-sm font-medium">· {test.categoria}</span>
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-3">
          <p className={`text-xs uppercase tracking-wide ${classes.label}`}>Mejor tiempo</p>
          <p className={`mt-1 text-sm font-semibold ${classes.label}`}>
            {formatSeconds(test.mejor_tiempo)}
          </p>
          <p className={`mt-1 text-xs ${classes.label}`}>
            Velocidad:{" "}
            <strong>
              {hasDistance ? formatKmh(test.velocidad_mejor_kmh) : "— (sin distancia)"}
            </strong>
          </p>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-3">
          <p className={`text-xs uppercase tracking-wide ${classes.label}`}>Peor tiempo</p>
          <p className={`mt-1 text-sm font-semibold ${classes.label}`}>
            {formatSeconds(test.peor_tiempo)}
          </p>
          <p className={`mt-1 text-xs ${classes.label}`}>
            Velocidad:{" "}
            <strong>
              {hasDistance ? formatKmh(test.velocidad_peor_kmh) : "— (sin distancia)"}
            </strong>
          </p>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-3">
          <p className={`text-xs uppercase tracking-wide ${classes.label}`}>Tiempo medio</p>
          <p className={`mt-1 text-sm font-semibold ${classes.label}`}>
            {formatSeconds(test.tiempo_medio)}
          </p>
          <p className={`mt-1 text-xs ${classes.label}`}>
            Velocidad:{" "}
            <strong>
              {hasDistance ? formatKmh(test.velocidad_media_kmh) : "— (sin distancia)"}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}
