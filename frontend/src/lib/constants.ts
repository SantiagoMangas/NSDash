import type { DateRange } from "./types";

export const SPRINT_DISTANCES = [10, 20, 30, 40, 60] as const;

/** Atajos opcionales en el formulario de Test de Velocidad (MSS); no restringen el input libre. */
export const SPEED_TEST_DISTANCE_PRESETS = [10, 20, 30, 40, 50, 60] as const;

export const DATE_RANGE_OPTIONS: {
  value: DateRange;
  label: string;
  shortLabel: string;
}[] = [
  { value: "7d", label: "Últimos 7 días", shortLabel: "7D" },
  { value: "30d", label: "Últimos 30 días", shortLabel: "30D" },
  { value: "90d", label: "Últimos 90 días", shortLabel: "90D" },
  { value: "all", label: "Todo el período", shortLabel: "TODO" },
];
