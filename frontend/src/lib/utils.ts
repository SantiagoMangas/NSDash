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

export function formatSecondsToPace(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const minutes = Math.floor(seconds / 60);
  let remaining = Math.round(seconds - minutes * 60);
  if (remaining === 60) {
    return `${minutes + 1}:00`;
  }
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export function parseMpmInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.includes(":")) {
    const [minutesPart, secondsPart] = trimmed.split(":", 2);
    const minutes = Number(minutesPart);
    const seconds = Number(secondsPart);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      return null;
    }
    return minutes + seconds / 60;
  }
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatMpmDecimal(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }
  const minutes = Math.floor(value);
  let seconds = Math.round((value - minutes) * 60);
  if (seconds === 60) {
    return `${minutes + 1}:00`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
