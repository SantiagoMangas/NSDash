import type { DateRange } from "./types";

export const EXERCISES = [
  { id: 1, name: "Back Squat" },
  { id: 2, name: "Deadlift" },
  { id: 3, name: "Bench Press" },
  { id: 4, name: "Overhead Press" },
  { id: 5, name: "Hip Thrust" },
] as const;

export const SPRINT_DISTANCES = [10, 20, 30, 40, 60] as const;

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
