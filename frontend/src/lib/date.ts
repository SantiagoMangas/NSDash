export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getTodayDate(): string {
  const d = startOfToday();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isFutureDate(dateStr: string): boolean {
  if (!dateStr.trim()) return false;
  return parseLocalDate(dateStr) > startOfToday();
}

/** Formato fijo argentino DD/MM/AAAA (sin depender del locale del navegador). */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr.trim()) return "";
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatChartDate(dateStr: string): string {
  return formatDisplayDate(dateStr);
}
