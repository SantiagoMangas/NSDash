import {
  getAllLogs,
  getExercisePercentageTable,
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
  estimated_rm: number | null;
  pull_up_modality?: string | null;
};

export type PercentageRow = {
  percentage: number;
  reps: number;
  weight: number;
  rir_plus_1: number;
  rir_plus_2: number;
  rir_plus_3: number;
};

export type LogSummary = {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  estimated_rm: number;
  percentages: PercentageRow[];
};

export type BestRmPercentageTable = {
  exercise: string;
  reference_rm: number;
  reference_rm_source: string;
  percentages: PercentageRow[];
};

export type ProgressResponse = {
  exercise: string;
  log_kind?: string;
  history: Array<{
    date: string;
    estimated_rm: number | null;
    weight: number;
    reps: number;
    pull_up_modality?: string | null;
  }>;
};

export type ProgressListItem = {
  id: number;
  date: string;
  weight: number;
  reps: number;
  estimated_rm: number | null;
  pull_up_modality?: string | null;
};

export async function loadAllLogs(): Promise<RawLog[]> {
  try {
    const data = await getAllLogs();
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object",
      )
      .filter(
        (item) =>
          typeof item.id === "number" &&
          typeof item.athlete_id === "number" &&
          typeof item.exercise_id === "number" &&
          typeof item.date === "string" &&
          typeof item.weight === "number" &&
          typeof item.reps === "number" &&
          (typeof item.estimated_rm === "number" || item.estimated_rm === null),
      )
      .map((item) => ({
        id: item.id as number,
        athlete_id: item.athlete_id as number,
        exercise_id: item.exercise_id as number,
        date: item.date as string,
        weight: item.weight as number,
        reps: item.reps as number,
        estimated_rm: item.estimated_rm as number | null,
        pull_up_modality:
          typeof item.pull_up_modality === "string" ? item.pull_up_modality : null,
      }));
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
      log_kind: typeof data.log_kind === "string" ? data.log_kind : undefined,
      history: data.history
        .filter(
          (
            item: unknown,
          ): item is {
            date: string;
            estimated_rm: number | null;
            weight: number;
            reps: number;
            pull_up_modality?: string | null;
          } =>
            item !== null &&
            typeof item === "object" &&
            typeof (item as { date?: unknown }).date === "string" &&
            typeof (item as { weight?: unknown }).weight === "number" &&
            typeof (item as { reps?: unknown }).reps === "number" &&
            ((item as { estimated_rm?: unknown }).estimated_rm === null ||
              typeof (item as { estimated_rm?: unknown }).estimated_rm === "number"),
        )
        .map(
          (item: {
            date: string;
            estimated_rm: number | null;
            weight: number;
            reps: number;
            pull_up_modality?: string | null;
          }) => ({
            date: item.date,
            estimated_rm: item.estimated_rm,
            weight: item.weight,
            reps: item.reps,
            pull_up_modality: item.pull_up_modality ?? null,
          }),
        ),
    };
  } catch {
    return null;
  }
}

function parsePercentageRows(raw: unknown): PercentageRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item: unknown): item is PercentageRow =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as PercentageRow).percentage === "number" &&
      typeof (item as PercentageRow).reps === "number" &&
      typeof (item as PercentageRow).weight === "number" &&
      typeof (item as PercentageRow).rir_plus_1 === "number" &&
      typeof (item as PercentageRow).rir_plus_2 === "number" &&
      typeof (item as PercentageRow).rir_plus_3 === "number",
  );
}

export async function loadBestRmPercentageTable(
  athleteId: number,
  exerciseId: number,
): Promise<BestRmPercentageTable | null> {
  try {
    const data = await getExercisePercentageTable(athleteId, exerciseId);
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.exercise !== "string" ||
      typeof data.reference_rm !== "number"
    ) {
      return null;
    }
    return {
      exercise: data.exercise,
      reference_rm: data.reference_rm,
      reference_rm_source:
        typeof data.reference_rm_source === "string" ? data.reference_rm_source : "best_historical",
      percentages: parsePercentageRows(data.percentages),
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
      percentages: parsePercentageRows(data.percentages),
    };
  } catch {
    return null;
  }
}
