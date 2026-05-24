import { parseLocalDate, startOfToday } from "./date";
import type { DateRange } from "./types";

export function filterLogsByDateRange<T extends { date: string }>(
  logs: T[],
  range: DateRange,
): T[] {
  if (range === "all") return logs;
  const today = startOfToday();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  return logs.filter((log) => {
    const d = parseLocalDate(log.date);
    return !isNaN(d.getTime()) && d >= cutoff;
  });
}

export function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "object" && first !== null && "msg" in first) {
      return String((first as { msg: string }).msg);
    }
  }
  return fallback;
}
