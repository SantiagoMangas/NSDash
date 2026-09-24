import {
  getAllLogs,
  getProgress,
  getSummary,
} from "@/lib/api/strength";

export type RawLog = {
  id: number;
  athlete_id: number;
  exercise_id: number;
  date: string;
  weight: number;
  reps: number;
  estimated_rm: number;
};

export type PercentageRow = { reps: number; weight: number };

export type LogSummary = {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  estimated_rm: number;
  percentages: PercentageRow[];
};

export type ProgressResponse = {
  exercise: string;
  history: Array<{
    date: string;
    estimated_rm: number;
    weight: number;
    reps: number;
  }>;
};

export type ProgressListItem = {
  id: number;
  date: string;
  weight: number;
  reps: number;
  estimated_rm: number;
};

export async function loadAllLogs(): Promise<RawLog[]> {
  try {
    const data = await getAllLogs();
    return Array.isArray(data)
      ? data.filter(
          (item): item is RawLog =>
            item !== null &&
            typeof item === "object" &&
            typeof item.id === "number" &&
            typeof item.athlete_id === "number" &&
            typeof item.exercise_id === "number" &&
            typeof item.date === "string" &&
            typeof item.weight === "number" &&
            typeof item.reps === "number" &&
            typeof item.estimated_rm === "number",
        )
      : [];
  } catch {
    return [];
  }
}

export async function loadProgress(
  athleteId: number,
  exerciseId: number,
): Promise<ProgressResponse | null> {
  try {
    const data = await getProgress(athleteId, exerciseId);
    if (!data || typeof data !== "object" || !Array.isArray(data.history)) return null;
    return {
      exercise: typeof data.exercise === "string" ? data.exercise : "",
      history: data.history
        .filter(
          (item: unknown): item is { date: string; estimated_rm: number; weight: number; reps: number } =>
            item !== null &&
            typeof item === "object" &&
            typeof (item as { date?: unknown }).date === "string" &&
            typeof (item as { estimated_rm?: unknown }).estimated_rm === "number" &&
            typeof (item as { weight?: unknown }).weight === "number" &&
            typeof (item as { reps?: unknown }).reps === "number",
        )
        .map((item: { date: string; estimated_rm: number; weight: number; reps: number }) => ({
          date: item.date,
          estimated_rm: item.estimated_rm,
          weight: item.weight,
          reps: item.reps,
        })),
    };
  } catch {
    return null;
  }
}

export async function loadSummary(logId: number): Promise<LogSummary | null> {
  try {
    const data = await getSummary(logId);
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.exercise !== "string" ||
      typeof data.weight !== "number" ||
      typeof data.reps !== "number" ||
      typeof data.estimated_rm !== "number" ||
      !Array.isArray(data.percentages)
    ) {
      return null;
    }
    return {
      exercise: data.exercise,
      date: typeof data.date === "string" ? data.date : "",
      weight: data.weight,
      reps: data.reps,
      estimated_rm: data.estimated_rm,
      percentages: data.percentages.filter(
        (item: unknown): item is PercentageRow =>
          item !== null &&
          typeof item === "object" &&
          typeof (item as PercentageRow).reps === "number" &&
          typeof (item as PercentageRow).weight === "number",
      ),
    };
  } catch {
    return null;
  }
}
