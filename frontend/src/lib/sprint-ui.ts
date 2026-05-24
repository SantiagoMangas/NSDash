import { getTodayDate } from "./date";
import type { DistanceComparison, SessionScore, SessionSuggestion, SprintInsight, SprintLog } from "./types";

export function fatigueStyle(color: SprintLog["fatigue_color"]) {
  if (color === "emerald") {
    return {
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      text: "text-emerald-600",
    };
  }
  if (color === "blue") {
    return {
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      text: "text-blue-600",
    };
  }
  return {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    text: "text-orange-600",
  };
}

export function sessionScoreStyle(rating: string) {
  if (rating === "Excelente sesión") {
    return {
      card: "bg-emerald-50 border-emerald-200",
      score: "text-emerald-600",
      label: "text-emerald-700",
    };
  }
  if (rating === "Buena") {
    return {
      card: "bg-blue-50 border-blue-200",
      score: "text-blue-600",
      label: "text-blue-700",
    };
  }
  if (rating === "Fatiga") {
    return {
      card: "bg-amber-50 border-amber-200",
      score: "text-amber-600",
      label: "text-amber-700",
    };
  }
  return {
    card: "bg-red-50 border-red-200",
    score: "text-red-600",
    label: "text-red-700",
  };
}

export function buildSprintInsights(
  logs: SprintLog[],
  filteredLogs: SprintLog[],
  sessionScore: SessionScore | null,
): SprintInsight[] {
  const insights: SprintInsight[] = [];
  const seen = new Set<string>();

  const add = (insight: SprintInsight) => {
    if (seen.has(insight.id)) return;
    seen.add(insight.id);
    insights.push(insight);
  };

  const today = getTodayDate();
  const todayPrs = logs.filter((l) => l.is_pr && l.date === today);
  const prsToShow = todayPrs.length > 0 ? todayPrs : logs.filter((l) => l.is_pr).slice(0, 3);

  for (const pr of prsToShow) {
    add({
      id: `pr-${pr.id}`,
      tone: "emerald",
      icon: "🏆",
      message: `Nuevo PR en ${pr.distance}m`,
    });
    if (pr.improvement_percent !== null && pr.improvement_percent > 0) {
      add({
        id: `pr-improve-${pr.id}`,
        tone: "emerald",
        icon: "📈",
        message: `Mejora de ${pr.improvement_percent}% respecto al anterior`,
      });
    }
  }

  if (logs.some((l) => l.fatigue_percent > 5)) {
    add({
      id: "fatigue-high",
      tone: "orange",
      icon: "⚠️",
      message: "Posible fatiga acumulada",
    });
  }

  if (filteredLogs.length >= 2) {
    const sorted = [...filteredLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const mid = Math.max(1, Math.floor(sorted.length / 2));
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);
    const olderAvg = older.reduce((sum, l) => sum + l.average_speed, 0) / older.length;
    const recentAvg = recent.reduce((sum, l) => sum + l.average_speed, 0) / recent.length;
    if (recentAvg > olderAvg * 1.01) {
      add({
        id: "speed-trend-up",
        tone: "indigo",
        icon: "⚡",
        message: "Tendencia positiva de aceleración",
      });
    }
  }

  const consistencyValue = sessionScore?.consistency ?? null;
  if (consistencyValue !== null && consistencyValue < 65) {
    add({
      id: "low-consistency",
      tone: "amber",
      icon: "📉",
      message: "Sesión irregular",
    });
  } else if (!sessionScore && filteredLogs.length >= 3) {
    const speeds = filteredLogs.map((l) => l.average_speed);
    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((sum, s) => sum + (s - avg) ** 2, 0) / speeds.length;
    if (Math.sqrt(variance) > avg * 0.08) {
      add({
        id: "low-consistency-calc",
        tone: "amber",
        icon: "📉",
        message: "Sesión irregular",
      });
    }
  }

  return insights;
}

export function insightToneClasses(tone: SprintInsight["tone"]) {
  const map = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
  };
  return map[tone];
}

export function buildSessionSuggestion(
  sprintLogs: SprintLog[],
  sprintComparison: DistanceComparison[],
  sessionScore: SessionScore | null,
): SessionSuggestion | null {
  if (sprintLogs.length === 0) return null;

  const today = getTodayDate();
  const todayDistances = new Set(
    sprintLogs.filter((l) => l.date === today).map((l) => l.distance),
  );

  if (sessionScore?.rating === "Mala recuperación" || (sessionScore?.avg_fatigue ?? 0) > 5) {
    return {
      title: "Priorizá recuperación",
      description: "La fatiga de hoy es elevada. Considerá sesión técnica liviana o descanso activo.",
      hint: "Fatiga promedio alta en la sesión",
    };
  }

  const missingToday = [10, 20, 30, 40, 60].find((d) => !todayDistances.has(d));
  if (missingToday) {
    return {
      title: "Completá la sesión de hoy",
      description: `Registrá un sprint de ${missingToday}m para cubrir el protocolo del día.`,
      suggestedDistance: missingToday,
      hint: "Distancia pendiente hoy",
    };
  }

  const focus = [...sprintComparison]
    .filter((c) => c.diffPercent > 3)
    .sort((a, b) => b.diffPercent - a.diffPercent)[0];

  if (focus) {
    return {
      title: `Enfocate en ${focus.distance}m`,
      description: `Tu última marca está +${focus.diffPercent.toFixed(1)}% vs el PR. Un sprint controlado puede cerrar la brecha.`,
      suggestedDistance: focus.distance,
      hint: "Mayor diferencia vs histórico",
    };
  }

  if (sessionScore && sessionScore.score >= 85) {
    return {
      title: "Excelente momentum",
      description: "Mantené la carga con 2–3 sprints de calidad en 20m o 30m en la próxima sesión.",
      hint: "Sesión de alto rendimiento",
    };
  }

  return {
    title: "Próxima sesión sugerida",
    description: "Alterná 20m y 30m con descanso completo entre intentos para sostener velocidad punta.",
    hint: "Protocolo estándar de velocidad",
  };
}
