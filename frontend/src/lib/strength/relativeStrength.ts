/** Carga (kg) ÷ peso corporal de la ficha del atleta. */
export function relativeStrength(loadKg: number, bodyWeightKg: number | null | undefined): number | null {
  if (bodyWeightKg == null || bodyWeightKg <= 0 || !Number.isFinite(loadKg)) {
    return null;
  }
  return loadKg / bodyWeightKg;
}

export function hasBodyWeightForRelative(
  bodyWeightKg: number | null | undefined,
): boolean {
  return bodyWeightKg != null && bodyWeightKg > 0;
}

export function formatRelativeStrength(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(digits);
}
