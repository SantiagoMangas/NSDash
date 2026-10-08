export type PullUpModality = "band" | "bodyweight" | "weighted";

export const PULL_UP_MODALITY_OPTIONS: {
  value: PullUpModality;
  label: string;
}[] = [
  { value: "band", label: "c/ Banda" },
  { value: "bodyweight", label: "PC (peso corporal)" },
  { value: "weighted", label: "c/ Lastre" },
];

export function isPullUpLogKind(logKind: string | undefined | null): boolean {
  return logKind === "pull_up";
}

export function formatPullUpModalityLabel(modality: string | null | undefined): string {
  const found = PULL_UP_MODALITY_OPTIONS.find((o) => o.value === modality);
  return found?.label ?? "—";
}

export function formatPullUpLogLine(
  modality: string | null | undefined,
  weight: number,
  reps: number,
): string {
  const repLabel = `rep${reps !== 1 ? "s" : ""}`;
  if (modality === "bodyweight") {
    return `PC (peso corporal) × ${reps} ${repLabel}`;
  }
  if (modality === "band") {
    return `c/ Banda × ${reps} ${repLabel}`;
  }
  if (modality === "weighted") {
    return `c/ Lastre ${weight} kg × ${reps} ${repLabel}`;
  }
  return `${weight} kg × ${reps} ${repLabel}`;
}

export function pullUpModalityRequiresLoad(modality: PullUpModality): boolean {
  return modality === "weighted";
}

export function pullUpLoadFieldLabel(modality: PullUpModality): string {
  if (modality === "weighted") return "Carga / lastre (kg)";
  return "Carga (kg)";
}
