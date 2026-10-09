export type NormalizedRsaFatigueTest = {
  id: number;
  athlete_id: number;
  date: string;
  distancia_sprint_m: number | null;
  pausa_s: number | null;
  cantidad_sprints: number;
  tiempos: number[];
  mejor_tiempo: number;
  peor_tiempo: number;
  tiempo_total: number;
  tiempo_ideal: number;
  indice_fatiga_pct: number;
  categoria: string;
};

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTiempos(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((t) => Number(t)).filter((t) => Number.isFinite(t) && t > 0);
}

/** Normaliza respuestas viejas del API (campos faltantes o undefined). */
export function normalizeRsaFatigueSummary(raw: unknown): NormalizedRsaFatigueTest | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id =
    typeof o.id === "number"
      ? o.id
      : typeof o.id === "string" && o.id.trim() !== ""
        ? Number(o.id)
        : NaN;
  if (!Number.isFinite(id)) return null;

  const date =
    typeof o.date === "string"
      ? o.date
      : o.date != null
        ? String(o.date)
        : "";
  if (!date) return null;

  const tiempos = parseTiempos(o.tiempos);
  const metricsFromTiempos =
    tiempos.length >= 2 ? calculateRsaFatigueMetrics(tiempos) : null;

  const cantidad_sprints =
    finiteNumber(o.cantidad_sprints) ?? metricsFromTiempos?.cantidad_sprints ?? tiempos.length;

  const pickMetric = (key: string): number | null => {
    if (!(key in o)) return null;
    return finiteNumber(o[key]);
  };

  return {
    id,
    athlete_id: typeof o.athlete_id === "number" ? o.athlete_id : 0,
    date,
    distancia_sprint_m: finiteNumber(o.distancia_sprint_m),
    pausa_s: finiteNumber(o.pausa_s),
    cantidad_sprints,
    tiempos,
    mejor_tiempo:
      pickMetric("mejor_tiempo") ?? metricsFromTiempos?.mejor_tiempo ?? 0,
    peor_tiempo:
      pickMetric("peor_tiempo") ?? metricsFromTiempos?.peor_tiempo ?? 0,
    tiempo_total:
      pickMetric("tiempo_total") ?? metricsFromTiempos?.tiempo_total ?? 0,
    tiempo_ideal:
      pickMetric("tiempo_ideal") ?? metricsFromTiempos?.tiempo_ideal ?? 0,
    indice_fatiga_pct:
      pickMetric("indice_fatiga_pct") ?? metricsFromTiempos?.indice_fatiga_pct ?? 0,
    categoria:
      typeof o.categoria === "string"
        ? o.categoria
        : metricsFromTiempos?.categoria ?? "—",
  };
}

export function formatRsaDistanceM(value: number | null | undefined): string {
  const n = finiteNumber(value);
  return n !== null ? String(n) : "—";
}

export function formatRsaPauseS(value: number | null | undefined): string {
  const n = finiteNumber(value);
  return n !== null ? String(n) : "—";
}

/** Listado legacy del API (sin distancia/tiempos/métricas completas). */
export function rsaSummaryNeedsDetailFetch(test: NormalizedRsaFatigueTest): boolean {
  return (
    test.distancia_sprint_m == null ||
    test.pausa_s == null ||
    test.tiempos.length === 0 ||
    (test.mejor_tiempo <= 0 && test.indice_fatiga_pct > 0)
  );
}

export type RsaFatigueMetrics = {
  cantidad_sprints: number;
  mejor_tiempo: number;
  peor_tiempo: number;
  tiempo_total: number;
  tiempo_ideal: number;
  indice_fatiga_pct: number;
  categoria: string;
};

export function categorizeFatigueIndex(indice_fatiga_pct: number): string {
  if (indice_fatiga_pct < 10) return "Excelente";
  if (indice_fatiga_pct < 15) return "Bueno";
  if (indice_fatiga_pct < 20) return "Regular";
  return "Malo";
}

export function calculateRsaFatigueMetrics(tiempos: number[]): RsaFatigueMetrics | null {
  if (tiempos.length < 2) return null;

  for (const tiempo of tiempos) {
    if (!Number.isFinite(tiempo) || tiempo <= 0) return null;
  }

  const cantidad_sprints = tiempos.length;
  const mejor_tiempo = Math.min(...tiempos);
  const peor_tiempo = Math.max(...tiempos);
  const tiempo_total = tiempos.reduce((sum, tiempo) => sum + tiempo, 0);
  const tiempo_ideal = mejor_tiempo * cantidad_sprints;
  const indice_fatiga_pct = (tiempo_total / tiempo_ideal) * 100 - 100;

  return {
    cantidad_sprints,
    mejor_tiempo: Math.round(mejor_tiempo * 100) / 100,
    peor_tiempo: Math.round(peor_tiempo * 100) / 100,
    tiempo_total: Math.round(tiempo_total * 100) / 100,
    tiempo_ideal: Math.round(tiempo_ideal * 100) / 100,
    indice_fatiga_pct: Math.round(indice_fatiga_pct * 100) / 100,
    categoria: categorizeFatigueIndex(indice_fatiga_pct),
  };
}
