/** Formatea un ritmo M:SS con su unidad estándar (minutos por kilómetro). */
export function formatPaceWithUnit(ritmo: string): string {
  return `${ritmo} m/km`;
}

/** Ritmo en segundos por km a partir de velocidad en km/h. */
export function paceSecondsFromKmh(kmh: number): number | null {
  if (!Number.isFinite(kmh) || kmh <= 0) return null;
  return 3600 / kmh;
}
