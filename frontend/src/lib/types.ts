export type Athlete = { id: number; name: string };

export type Module = "strength" | "speed";

export type DateRange = "7d" | "30d" | "90d" | "all";

export type SprintLog = {
  id: number;
  athlete_id: number;
  distance: number;
  time_seconds: number;
  date: string;
  notes: string | null;
  average_speed: number;
  pr_time: number | null;
  is_pr: boolean;
  improvement_percent: number | null;
  previous_pr_time: number | null;
  fatigue_percent: number;
  fatigue_level: "Excelente" | "Normal" | "Fatiga alta";
  fatigue_color: "emerald" | "blue" | "orange";
};

export type SprintInsight = {
  id: string;
  tone: "emerald" | "blue" | "amber" | "orange" | "indigo";
  icon: string;
  message: string;
};

export type SessionScore = {
  score: number;
  rating: string;
  consistency: number;
  avg_fatigue: number;
  has_pr: boolean;
  sprint_count: number;
};

export type DistanceComparison = {
  distance: number;
  lastTime: number;
  bestTime: number;
  diffPercent: number;
  lastDate: string;
  isLastPr: boolean;
  fatigueLevel: SprintLog["fatigue_level"];
  fatigueColor: SprintLog["fatigue_color"];
  fatiguePercent: number;
};

export type SessionSuggestion = {
  title: string;
  description: string;
  hint?: string;
  suggestedDistance?: number;
};

export type ToastType = "success" | "error" | "pr";

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

export type CreateSprintResult = { log: SprintLog | null; error: string | null };
