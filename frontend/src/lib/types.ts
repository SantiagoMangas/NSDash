export type Athlete = {
  id: number;
  name: string;
  sport?: string | null;
  height_cm?: number | null;
  body_weight_kg?: number | null;
  goal?: string | null;
  notes?: string | null;
};

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

export type VelocityZone = {
  zona: string;
  intensidad: string;
  pct_min: number;
  pct_max: number;
  velocidad_ms: number;
  velocidad_kmh: number;
  vel_min_kmh: number;
  vel_max_kmh: number;
  ritmo_min: string;
  ritmo_max: string;
};

export type IntervalRow = {
  porcentaje: number;
  velocidad_kmh: number;
  ritmo_str: string;
  tipo: "fit_corto" | "fit_largo" | "mas_training";
};

export type IntervalTable = {
  source: string;
  reference_kmh: number;
  rows: IntervalRow[];
};

export type SprintReference = {
  distancia: number;
  tiempo_segundos: number;
};

export type VelocityDashboard = {
  athlete_id: number;
  best_test: {
    test_type: string;
    date: string;
    vam_kmh: number;
    vam_mpm: number;
    vam_ms: number;
    vam_mpm_formatted: string;
  };
  all_tests_summary: Array<{
    test_type: string;
    date: string;
    vam_kmh: number;
  }>;
  training_zones: VelocityZone[];
  zones_source: {
    available: boolean;
    test_type: string | null;
    vam_kmh: number | null;
  };
  interval_tables: {
    from_vam: IntervalTable | null;
    from_30_15: IntervalTable | null;
    from_yoyo: IntervalTable | null;
  };
  sprint_reference: SprintReference[];
  unit_conversions: {
    vam_kmh: number;
    vam_mpm: number;
    vam_ms: number;
    vam_mpm_formatted: string;
  };
};

export type UnitConverterValues = {
  kmh: string;
  mpm: string;
  ms: string;
  mpm_str: string;
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
