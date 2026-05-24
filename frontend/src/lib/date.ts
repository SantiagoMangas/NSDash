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
  return new Date().toISOString().split("T")[0];
}

export function formatChartDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("es-AR", { month: "short", day: "numeric" });
}
