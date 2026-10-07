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

/** Máscara DD/MM/AAAA mientras el usuario escribe (solo dígitos). */
export function maskDateDisplayInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Convierte DD/MM/AAAA a ISO yyyy-mm-dd. null si el texto no es una fecha válida. */
export function parseDisplayDateToIso(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return "";
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function isoToDisplayDate(iso: string): string {
  if (!iso.trim()) return "";
  return formatDisplayDate(iso);
}

export function formatChartDate(dateStr: string): string {
  return formatDisplayDate(dateStr);
}
