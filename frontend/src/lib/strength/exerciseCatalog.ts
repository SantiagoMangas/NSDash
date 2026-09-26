import type { Exercise } from "@/lib/api/strength";

export type PercentageCurveKey =
  | "sentadilla"
  | "peso_muerto"
  | "banco_plano";

export const CURVE_SECTIONS: { key: PercentageCurveKey; title: string }[] = [
  { key: "sentadilla", title: "Sentadilla" },
  { key: "peso_muerto", title: "Peso muerto" },
  { key: "banco_plano", title: "Banco plano" },
];

export function isPercentageCurveKey(value: string): value is PercentageCurveKey {
  return CURVE_SECTIONS.some((section) => section.key === value);
}

export function curveTitleForKey(curveKey: string): string {
  const match = CURVE_SECTIONS.find((section) => section.key === curveKey);
  return match?.title ?? "Sentadilla";
}

export function curveTitleForExercise(exercise: Exercise): string {
  const key = isPercentageCurveKey(exercise.percentage_curve)
    ? exercise.percentage_curve
    : "sentadilla";
  return curveTitleForKey(key);
}

export function groupExercisesByCurve(exercises: Exercise[]): Map<PercentageCurveKey, Exercise[]> {
  const map = new Map<PercentageCurveKey, Exercise[]>();
  for (const section of CURVE_SECTIONS) {
    map.set(section.key, []);
  }
  for (const exercise of exercises) {
    const key = isPercentageCurveKey(exercise.percentage_curve)
      ? exercise.percentage_curve
      : "sentadilla";
    map.get(key)!.push(exercise);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  return map;
}

export function formatExerciseFormula(exercise: Exercise): string {
  const formula = exercise.formula_type?.toLowerCase() === "brzycki" ? "Brzycki" : "Epley";
  if (formula === "Brzycki") {
    return "Brzycki";
  }
  const coef = exercise.rm_coefficient;
  if (typeof coef === "number" && Number.isFinite(coef)) {
    const display = parseFloat(coef.toPrecision(4));
    return `Epley (coef. ${display})`;
  }
  return "Epley";
}

export function buildFuerzaHref(exerciseId: number, athleteId: number | null): string {
  const params = new URLSearchParams();
  params.set("ejercicio", String(exerciseId));
  if (athleteId !== null) {
    params.set("atleta", String(athleteId));
  }
  return `/fuerza?${params.toString()}`;
}
