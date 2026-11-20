import type { TrainingSessionHistoryItem } from "@/lib/api/sessions";

/** Columna «Entrenamiento»: calculadora una vez + subtipo si aplica (sin duplicar). */
export function trainingHistoryTitle(session: TrainingSessionHistoryItem): string {
  const { calculator, entrenamiento: raw } = session;
  let ent = raw.trim();
  // Quitar prefijos repetidos del nombre de calculadora (datos legacy).
  while (ent.startsWith(`${calculator} · `)) {
    ent = ent.slice(calculator.length + 3).trim();
  }
  if (!ent || ent === calculator) {
    return calculator;
  }
  return `${calculator} · ${ent}`;
}

/** Orden estable: saved_at descendente, luego id descendente. */
export function sortTrainingSessionsBySavedAt(
  sessions: TrainingSessionHistoryItem[],
): TrainingSessionHistoryItem[] {
  return [...sessions].sort((a, b) => {
    const ta = a.saved_at ? Date.parse(a.saved_at) : Date.parse(a.date);
    const tb = b.saved_at ? Date.parse(b.saved_at) : Date.parse(b.date);
    if (tb !== ta) return tb - ta;
    return b.id - a.id;
  });
}