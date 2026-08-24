"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/strength/ChartTooltip";
import { StrengthLogEditModal, type StrengthLogEditData } from "@/components/strength/StrengthLogEditModal";
import { AthleteProfileModal } from "@/components/athletes/AthleteProfileModal";
import { ResistenciaModule } from "@/components/resistencia/ResistenciaModule";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { ToastContainer } from "@/components/ui/Toast";
import { useToasts } from "@/hooks/useToasts";
import { DATE_RANGE_OPTIONS } from "@/lib/constants";
import { parseApiError } from "@/lib/utils";
import {
  formatChartDate,
  getTodayDate,
  parseLocalDate,
  startOfToday,
} from "@/lib/date";
import {
  persistAthleteId,
  persistDateRange,
  persistExerciseId,
  persistModule,
  readStoredAthleteId,
  readStoredDateRange,
  readStoredExerciseId,
  readStoredModule,
  STORAGE_KEYS,
  getToken,
  setToken as setTokenStorage,
  clearToken,
} from "@/lib/storage";
import type {
  Athlete,
  DateRange,
  Module,
} from "@/lib/types";
import { login } from "@/lib/api/auth";
import { getAthletes, createAthlete, deleteAthlete } from "@/lib/api/athletes";
import {
  getAllLogs,
  getExercises,
  getProgress,
  getSummary,
  createTrainingLog,
  deleteTrainingLog,
  type Exercise,
} from "@/lib/api/strength";
import { BASE_URL } from "@/lib/api/client";

type RawLog = {
  id: number;
  athlete_id: number;
  exercise_id: number;
  date: string;
  weight: number;
  reps: number;
  estimated_rm: number;
};

type PercentageRow = { reps: number; weight: number };

type LogSummary = {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  estimated_rm: number;
  percentages: PercentageRow[];
};

type ProgressResponse = {
  exercise: string;
  history: Array<{
    date: string;
    estimated_rm: number;
    weight: number;
    reps: number;
  }>;
};

type ProgressListItem = {
  id: number;
  date: string;
  weight: number;
  reps: number;
  estimated_rm: number;
};

// ─── API ──────────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function parseAthlete(item: unknown): Athlete | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  if (typeof record.id !== "number" || typeof record.name !== "string") return null;

  return {
    id: record.id,
    name: record.name,
    sport: typeof record.sport === "string" ? record.sport : record.sport === null ? null : undefined,
    height_cm:
      typeof record.height_cm === "number"
        ? record.height_cm
        : record.height_cm === null
          ? null
          : undefined,
    body_weight_kg:
      typeof record.body_weight_kg === "number"
        ? record.body_weight_kg
        : record.body_weight_kg === null
          ? null
          : undefined,
    goal: typeof record.goal === "string" ? record.goal : record.goal === null ? null : undefined,
    notes: typeof record.notes === "string" ? record.notes : record.notes === null ? null : undefined,
  };
}

function formatProfileText(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "—";
}

function formatProfileNumber(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value} ${unit}`;
}

async function loadAthletes(): Promise<Athlete[]> {
  try {
    const data = await getAthletes();
    return Array.isArray(data)
      ? data.map(parseAthlete).filter((item): item is Athlete => item !== null)
      : [];
  } catch {
    return [];
  }
}

async function loadAllLogs(): Promise<RawLog[]> {
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

async function loadProgress(
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
            typeof (item as any).date === "string" &&
            typeof (item as any).estimated_rm === "number" &&
            typeof (item as any).weight === "number" &&
            typeof (item as any).reps === "number",
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

async function loadSummary(logId: number): Promise<LogSummary | null> {
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
          item !== null && typeof item === "object" && typeof (item as any).reps === "number" && typeof (item as any).weight === "number",
      ),
    };
  } catch {
    return null;
  }
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  const prefsReadyRef = useRef(false);
  const athleteHydratedRef = useRef(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    () => readStoredExerciseId(),
  );
  const [logs, setLogs] = useState<ProgressListItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false); // [NEW]
  const [logsReloadToken, setLogsReloadToken] = useState(0);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [date, setDate] = useState(getTodayDate());
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveLogError, setSaveLogError] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState("");
  const [isCreatingAthlete, setIsCreatingAthlete] = useState(false);
  const [createAthleteError, setCreateAthleteError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDeletingAthlete, setIsDeletingAthlete] = useState(false);
  const [editingLog, setEditingLog] = useState<StrengthLogEditData | null>(null);
  const [isLogEditModalOpen, setIsLogEditModalOpen] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);

  const [dateRange, setDateRange] = useState<DateRange>(() =>
    readStoredDateRange(STORAGE_KEYS.dateRange),
  );
  const [module, setModule] = useState<Module>(() => readStoredModule());

  const [vamHistoryRefreshKey, setVamHistoryRefreshKey] = useState(0);

  const weightInputRef = useRef<HTMLInputElement | null>(null);
  const safeAthletes = Array.isArray(athletes) ? athletes : [];
  const selectedAthlete = safeAthletes.find((a) => a.id === selectedAthleteId) ?? null;
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) ?? null;

  // ─── Token init ────────────────────────────────────────────────────────────
  useEffect(() => {
    setToken(getToken());
    prefsReadyRef.current = true;
  }, []);

  // ─── Load athletes ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setIsLoadingAthletes(true);
    loadAthletes()
      .then(setAthletes)
      .finally(() => setIsLoadingAthletes(false));
  }, [token]);

  // ─── Load exercises ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setIsLoadingExercises(true);
    getExercises()
      .then(setExercises)
      .catch(() => setExercises([]))
      .finally(() => setIsLoadingExercises(false));
  }, [token]);

  useEffect(() => {
    if (exercises.length === 0) return;
    if (
      selectedExerciseId !== null &&
      !exercises.some((exercise) => exercise.id === selectedExerciseId)
    ) {
      setSelectedExerciseId(null);
    }
  }, [exercises, selectedExerciseId]);

  // ─── Restaurar atleta persistido (con fallback seguro) ─────────────────────
  useEffect(() => {
    if (!token || isLoadingAthletes || athleteHydratedRef.current) return;
    if (athletes.length === 0) {
      if (!isLoadingAthletes) athleteHydratedRef.current = true;
      return;
    }
    const storedId = readStoredAthleteId();
    if (storedId !== null && athletes.some((a) => a.id === storedId)) {
      setSelectedAthleteId(storedId);
    }
    athleteHydratedRef.current = true;
  }, [token, athletes, isLoadingAthletes]);

  useEffect(() => {
    if (!athleteHydratedRef.current || athletes.length === 0) return;
    if (
      selectedAthleteId !== null &&
      !athletes.some((a) => a.id === selectedAthleteId)
    ) {
      setSelectedAthleteId(null);
    }
  }, [athletes, selectedAthleteId]);

  // ─── Persistencia UI (localStorage) ────────────────────────────────────────
  useEffect(() => {
    if (!prefsReadyRef.current) return;
    persistModule(module);
  }, [module]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    persistDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    if (!prefsReadyRef.current || !athleteHydratedRef.current) return;
    persistAthleteId(selectedAthleteId);
  }, [selectedAthleteId]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    persistExerciseId(selectedExerciseId);
  }, [selectedExerciseId]);

  // ─── Load logs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadLogs = async () => {
      if (selectedAthleteId === null || selectedExerciseId === null) {
        setLogs([]);
        return;
      }
      setIsLoadingLogs(true);
      const [progress, allLogs] = await Promise.all([
        loadProgress(selectedAthleteId, selectedExerciseId),
        loadAllLogs(),
      ]);
      setIsLoadingLogs(false);

      if (!progress) { setLogs([]); return; }

      const candidateLogs = allLogs
        .filter(
          (l) =>
            l.athlete_id === selectedAthleteId &&
            l.exercise_id === selectedExerciseId,
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      const usedIds = new Set<number>();
      const mergedLogs: ProgressListItem[] = progress.history
        .map((item) => {
          const match = candidateLogs.find(
            (l) =>
              !usedIds.has(l.id) &&
              l.date === item.date &&
              l.weight === item.weight &&
              l.reps === item.reps,
          );
          if (!match) return null;
          usedIds.add(match.id);
          return {
            id: match.id,
            date: item.date,
            weight: item.weight,
            reps: item.reps,
            estimated_rm: item.estimated_rm,
          };
        })
        .filter((l): l is ProgressListItem => l !== null);

      setLogs(mergedLogs.sort((a, b) => b.date.localeCompare(a.date)));
    };
    loadLogs();
  }, [selectedAthleteId, selectedExerciseId, logsReloadToken]);

  // ─── [NEW] Filtered logs based on dateRange ────────────────────────────────
  const filteredLogs = useMemo(() => {
    if (dateRange === "all") return logs;
    const today = startOfToday();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - days);
    return logs.filter((l) => {
      const d = parseLocalDate(l.date);
      return !isNaN(d.getTime()) && d >= cutoff;
    });
  }, [logs, dateRange]);

  // ─── [NEW] Chart data — sorted ascending (chronological) for Recharts ──────
  const chartData = useMemo(
    () =>
      [...filteredLogs]
        .sort(
          (a, b) =>
            parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
        )
        .map((l) => ({ date: l.date, estimated_rm: l.estimated_rm })),
    [filteredLogs],
  );

  const analytics = useMemo(() => {
    const sourceLogs = Array.isArray(filteredLogs) && filteredLogs.length > 0 ? filteredLogs : Array.isArray(logs) ? logs : [];
    const sortedLogs = [...sourceLogs].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );
    const totalSessions = sourceLogs.length;
    const totalRm = sourceLogs.reduce((sum, item) => sum + item.estimated_rm, 0);
    const bestEstimatedRM = totalSessions > 0 ? Math.max(...sourceLogs.map((item) => item.estimated_rm)) : 0;
    const averageEstimatedRM = totalSessions > 0 ? Math.round(totalRm / totalSessions) : 0;
    const volumeLoad = Math.round(
      sourceLogs.reduce((sum, item) => sum + item.weight * item.reps, 0),
    );

    const today = startOfToday();
    const cutOff30 = new Date(today);
    cutOff30.setDate(cutOff30.getDate() - 30);
    const consistencyStreak = sourceLogs.filter((item) => parseLocalDate(item.date) >= cutOff30).length;

    const firstLog = sortedLogs[0] ?? null;
    const lastLog = sortedLogs[sortedLogs.length - 1] ?? null;
    const peakRm = totalSessions > 0 ? Math.max(...sourceLogs.map((item) => item.estimated_rm)) : 0;

    let insight = "Analizando datos de entrenamiento.";
    if (totalSessions === 0) {
      insight = "Sin registros todavía. Agregá una sesión para ver los análisis.";
    } else if (totalSessions >= 2 && firstLog && lastLog) {
      const trendPercent = ((lastLog.estimated_rm - firstLog.estimated_rm) / Math.max(firstLog.estimated_rm, 1)) * 100;
      if (trendPercent >= 4) {
        insight = "Tendencia positiva: el RM estimado viene en ascenso.";
      } else if (trendPercent <= -4) {
        insight = "El RM estimado bajó respecto a las sesiones anteriores.";
      } else {
        insight = "Rendimiento estable con entrenamiento consistente.";
      }
    }

    let peakInsight = "";
    if (lastLog && peakRm > 0) {
      const deltaFromPeak = ((lastLog.estimated_rm - peakRm) / peakRm) * 100;
      if (deltaFromPeak <= -3) {
        peakInsight = `El RM estimado bajó un ${Math.abs(deltaFromPeak).toFixed(0)}% desde el pico máximo.`;
      } else if (deltaFromPeak >= 0) {
        peakInsight = "El RM estimado está en su máximo histórico.";
      } else {
        peakInsight = "El RM estimado se mantiene cerca del pico máximo del atleta.";
      }
    }

    let frequencyInsight = "";
    if (consistencyStreak >= 6) {
      frequencyInsight = "Alta consistencia en los últimos 30 días.";
    } else if (consistencyStreak <= 2 && totalSessions > 0) {
      frequencyInsight = "Frecuencia de entrenamiento baja — recomendá más sesiones.";
    } else if (totalSessions > 0) {
      frequencyInsight = "Frecuencia de entrenamiento moderada y estable.";
    }

    return {
      totalSessions,
      averageEstimatedRM,
      bestEstimatedRM,
      consistencyStreak,
      volumeLoad,
      insight,
      peakInsight,
      frequencyInsight,
    };
  }, [filteredLogs, logs]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const data = await login(loginEmail, loginPassword);
      setTokenStorage(data.access_token);
      setToken(data.access_token);
      setLoginEmail("");
      setLoginPassword("");
    } catch {
      setLoginError("Email o contraseña incorrectos");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
    setAthletes([]);
    setSelectedAthleteId(null);
    setSelectedExerciseId(null);
    setLogs([]);
    setSelectedLogId(null);
    setSummary(null);
    athleteHydratedRef.current = false;
  };

  const handleSelectAthlete = (id: number) => {
    setSelectedAthleteId(id);
    setSelectedLogId(null);
    setSummary(null);
  };

  const handleSelectExercise = (id: number) => {
    setSelectedExerciseId(id);
    setSelectedLogId(null);
    setSummary(null);
  };

  const handleSelectLog = async (logId: number) => {
    setSelectedLogId(logId);
    setSummary(await loadSummary(logId));
  };

  const handleCreateLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedAthleteId === null || selectedExerciseId === null) return;

    const weightVal = Number(weight);
    const repsVal = Number(reps);

    if (!Number.isFinite(weightVal)) {
      setSaveLogError("Ingresá un peso válido (número mayor a 0).");
      return;
    }
    if (weightVal <= 0) {
      setSaveLogError("El peso debe ser mayor a 0 kg.");
      return;
    }
    if (!Number.isFinite(repsVal)) {
      setSaveLogError("Ingresá repeticiones válidas (número entero mayor a 0).");
      return;
    }
    if (!Number.isInteger(repsVal) || repsVal <= 0) {
      setSaveLogError("Las repeticiones deben ser un número entero mayor a 0.");
      return;
    }

    setIsSavingLog(true);
    setSaveLogError(null);
    try {
      await createTrainingLog(
        selectedAthleteId,
        selectedExerciseId,
        date,
        weightVal,
        repsVal,
      );
      setLogsReloadToken((p) => p + 1);
      setDate(getTodayDate());
      setWeight("");
      setReps("");
      weightInputRef.current?.focus();
      pushToast("success", "Registro de fuerza guardado");
    } catch (error) {
      const msg = parseApiError(
        error,
        "No se pudo guardar el registro. Intentá de nuevo.",
      );
      setSaveLogError(msg);
      pushToast("error", msg);
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleProfileSaved = async () => {
    setAthletes(await loadAthletes());
    pushToast("success", "Ficha del atleta actualizada");
  };

  const handleDeleteAthlete = async () => {
    if (selectedAthleteId === null || isDeletingAthlete) return;

    const athleteName = selectedAthlete?.name ?? "este atleta";
    if (
      !window.confirm(
        `¿Eliminar a ${athleteName}? Se borrarán también sus registros de fuerza, velocidad y VAM.`,
      )
    ) {
      return;
    }

    setIsDeletingAthlete(true);
    try {
      await deleteAthlete(selectedAthleteId);
      setAthletes(await loadAthletes());
      setSelectedAthleteId(null);
      setSelectedLogId(null);
      setSummary(null);
      setIsProfileModalOpen(false);
      setIsLogEditModalOpen(false);
      setEditingLog(null);
      pushToast("success", "Atleta eliminado");
    } catch (error) {
      const msg = parseApiError(
        error,
        "No se pudo eliminar el atleta. Intentá de nuevo.",
      );
      pushToast("error", msg);
    } finally {
      setIsDeletingAthlete(false);
    }
  };

  const handleOpenEditLog = (log: ProgressListItem) => {
    setEditingLog({
      id: log.id,
      date: log.date,
      weight: log.weight,
      reps: log.reps,
    });
    setIsLogEditModalOpen(true);
  };

  const handleLogSaved = async () => {
    const editedLogId = editingLog?.id ?? null;
    setLogsReloadToken((p) => p + 1);
    if (editedLogId !== null && selectedLogId === editedLogId) {
      setSummary(await loadSummary(editedLogId));
    }
    pushToast("success", "Registro de fuerza actualizado");
  };

  const handleDeleteLog = async (logId: number) => {
    if (deletingLogId !== null) return;
    if (
      !window.confirm(
        "¿Eliminar este registro de fuerza? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }

    setDeletingLogId(logId);
    try {
      await deleteTrainingLog(logId);
      if (selectedLogId === logId) {
        setSelectedLogId(null);
        setSummary(null);
      }
      setLogsReloadToken((p) => p + 1);
      pushToast("success", "Registro de fuerza eliminado");
    } catch (error) {
      const msg = parseApiError(
        error,
        "No se pudo eliminar el registro. Intentá de nuevo.",
      );
      pushToast("error", msg);
    } finally {
      setDeletingLogId(null);
    }
  };

  const handleCreateAthlete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingAthlete(true);
    setCreateAthleteError(null);
    try {
      const created = await createAthlete(athleteName);
      setAthleteName("");
      setAthletes(await loadAthletes());
      if (
        created &&
        typeof created === "object" &&
        typeof created.id === "number"
      ) {
        setSelectedAthleteId(created.id);
        setSelectedLogId(null);
        setSummary(null);
      }
      pushToast("success", "Atleta creado");
    } catch (error) {
      const msg = parseApiError(
        error,
        "No se pudo crear el atleta. Intentá de nuevo.",
      );
      setCreateAthleteError(msg);
      pushToast("error", msg);
    } finally {
      setIsCreatingAthlete(false);
    }
  };

  // ─── Login screen ──────────────────────────────────────────────────────────

  if (!token) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">NSDash</h1>
            <p className="text-slate-400 text-sm mt-1">Seguimiento de rendimiento deportivo</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="preparador@ejemplo.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ─── Main dashboard ────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">NSDash</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 transition-all"
          >
            Cerrar sesión
          </button>
        </div>

        {/* [NEW] Module selector ────────────────────────────────────────────── */}
        <div className="flex gap-2">
          <button
            onClick={() => setModule("strength")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              module === "strength"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            💪 Fuerza
          </button>
          <button
            onClick={() => setModule("resistencia")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              module === "resistencia"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ⚡ Velocidad y Resistencia
          </button>
        </div>

        {/* ── Atletas (compartido) ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Atletas</h2>

          <form onSubmit={handleCreateAthlete} className="flex gap-2 mb-4">
            <input
              type="text"
              value={athleteName}
              onChange={(e) => setAthleteName(e.target.value)}
              placeholder="Nombre del atleta..."
              required
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={isCreatingAthlete}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isCreatingAthlete ? "Agregando..." : "+ Agregar"}
            </button>
          </form>
          {createAthleteError && (
            <p className="text-red-500 text-sm mb-3">{createAthleteError}</p>
          )}

          {selectedAthleteId !== null && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
              >
                Editar ficha
              </button>
              <button
                type="button"
                onClick={handleDeleteAthlete}
                disabled={isDeletingAthlete}
                className="px-4 py-2 text-sm font-medium text-red-700 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
              >
                {isDeletingAthlete ? "Eliminando..." : "Eliminar atleta"}
              </button>
            </div>
          )}

          {/* [NEW] Loading state */}
          {isLoadingAthletes ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center shadow-sm">
              <p className="text-sm text-slate-500 animate-pulse">Cargando atletas...</p>
            </div>
          ) : safeAthletes.length === 0 ? (
            <EmptyStateCard
              icon={
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                  <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
                </svg>
              }
              title="Todavía no tenés atletas cargados"
              description="Agregá tu primer atleta para empezar a registrar fuerza y velocidad."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {safeAthletes.map((athlete) => (
                <button
                  key={athlete.id}
                  type="button"
                  onClick={() => handleSelectAthlete(athlete.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                    selectedAthleteId === athlete.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:opacity-90"
                  }`}
                >
                  {athlete.name}
                </button>
              ))}
            </div>
          )}

          {selectedAthlete && !isLoadingAthletes && safeAthletes.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Ficha del atleta</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-400 mb-0.5">Nombre</dt>
                  <dd className="text-sm font-medium text-slate-800">{selectedAthlete.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400 mb-0.5">Deporte</dt>
                  <dd className="text-sm text-slate-700">{formatProfileText(selectedAthlete.sport)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400 mb-0.5">Altura</dt>
                  <dd className="text-sm text-slate-700">
                    {formatProfileNumber(selectedAthlete.height_cm, "cm")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400 mb-0.5">Peso corporal</dt>
                  <dd className="text-sm text-slate-700">
                    {formatProfileNumber(selectedAthlete.body_weight_kg, "kg")}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-400 mb-0.5">Objetivo</dt>
                  <dd className="text-sm text-slate-700 whitespace-pre-wrap">
                    {formatProfileText(selectedAthlete.goal)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-400 mb-0.5">Observaciones</dt>
                  <dd className="text-sm text-slate-700 whitespace-pre-wrap">
                    {formatProfileText(selectedAthlete.notes)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        <AthleteProfileModal
          open={isProfileModalOpen}
          athlete={selectedAthlete}
          onClose={() => setIsProfileModalOpen(false)}
          onSaved={handleProfileSaved}
        />

        <StrengthLogEditModal
          open={isLogEditModalOpen}
          log={editingLog}
          onClose={() => {
            setIsLogEditModalOpen(false);
            setEditingLog(null);
          }}
          onSaved={handleLogSaved}
        />


        {/* Strength module wrapper */}
        {module === "strength" && (
          <>
        {/* ── Exercises ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Ejercicios</h2>
          {isLoadingExercises ? (
            <p className="text-sm text-slate-400 animate-pulse">Cargando ejercicios...</p>
          ) : exercises.length === 0 ? (
            <p className="text-sm text-slate-400">No hay ejercicios disponibles.</p>
          ) : (
          <div className="flex flex-wrap gap-2">
            {exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => handleSelectExercise(exercise.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                  selectedExerciseId === exercise.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:opacity-90"
                }`}
              >
                {exercise.name}
              </button>
            ))}
          </div>
          )}
          {selectedAthleteId === null && (
            <p className="text-xs text-slate-400 mt-3">← Seleccioná un atleta primero.</p>
          )}
        </section>

        {/* ── Create log + data (only shown when both selected) ─────────────── */}
        {selectedAthleteId === null ? (
          <section className="bg-white rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8 text-center shadow-sm mt-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">Seleccioná un atleta</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">Elegí un atleta arriba para comenzar a registrar sesiones de entrenamiento.</p>
          </section>
        ) : selectedExerciseId === null ? (
          <section className="bg-white rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8 text-center shadow-sm mt-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16" />
                <path d="M4 12h16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">Seleccioná un ejercicio para ver el progreso</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">Elegí un ejercicio arriba para ver el gráfico de progreso y registros de entrenamiento.</p>
          </section>
        ) : (
          <>
            {/* Create log form */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                Nuevo Registro de Entrenamiento —{" "}
                <span className="text-indigo-600">{selectedAthlete?.name}</span>
                {" / "}
                <span className="text-indigo-600">{selectedExercise?.name}</span>
              </h2>
              <form onSubmit={handleCreateLog} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label htmlFor="log-date" className="block text-xs text-slate-500 mb-1">Fecha</label>
                  <input
                    id="log-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
                <div>
                  <label htmlFor="log-weight" className="block text-xs text-slate-500 mb-1">Peso (kg)</label>
                  <input
                    id="log-weight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                    ref={weightInputRef}
                    className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
                <div>
                  <label htmlFor="log-reps" className="block text-xs text-slate-500 mb-1">Repeticiones</label>
                  <input
                    id="log-reps"
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    required
                    className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingLog}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSavingLog ? "Guardando..." : "Guardar Registro"}
                </button>
              </form>
              {saveLogError && (
                <p className="text-red-500 text-sm mt-3">{saveLogError}</p>
              )}
            </section>

            {/* [NEW] Loading state for logs */}
            {isLoadingLogs ? (
              <LoadingCard message="Cargando registros..." />
            ) : logs.length === 0 ? (
              <section className="bg-white rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto mb-4">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4v16" />
                    <path d="M4 12h16" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-2">Este atleta todavía no tiene registros</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">Registrá tu primera sesión para desbloquear información de entrenamiento, progresión de RM y seguimiento de consistencia.</p>
              </section>
            ) : (
              <>
                {/* Performance summary — uses unfiltered logs (always shows latest) */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
                  <h2 className="text-base font-semibold text-slate-700 mb-4">Resumen de Rendimiento</h2>
                  {(() => {
                    const lastLog = logs[0];
                    const previousLog = logs[1];
                    const changePct = previousLog
                      ? ((lastLog.estimated_rm - previousLog.estimated_rm) /
                          previousLog.estimated_rm) *
                        100
                      : null;
                    return (
                      // [NEW] 3-column stat grid instead of plain text
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-xs text-slate-400 mb-1">Est. 1RM</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {lastLog.estimated_rm}
                            <span className="text-sm font-normal text-slate-400 ml-1">kg</span>
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-xs text-slate-400 mb-1">vs Anterior</p>
                          {changePct !== null ? (
                            <p className={`text-2xl font-bold ${changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}
                              <span className="text-sm font-normal ml-0.5">%</span>
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400 mt-1">Sin datos anteriores</p>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-xs text-slate-400 mb-1">Última sesión</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {lastLog.weight} kg × {lastLog.reps} rep{lastLog.reps !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{lastLog.date}</p>
                        </div>
                      </div>
                    );
                  })()}
                </section>

                {/* Chart */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="text-base font-semibold text-slate-700">Progresión de RM</h2>
                  </div>

                  {/* [NEW] Date range filter buttons */}
                  <div className="flex gap-2 mb-6">
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDateRange(opt.value)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 ${
                          dateRange === opt.value
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:opacity-80"
                        }`}
                      >
                        {opt.shortLabel}
                      </button>
                    ))}
                  </div>

                  {/* [NEW] Empty state when filter returns no results */}
                  {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                      Sin datos para este rango
                    </div>
                  ) : (
                    // [NEW] ResponsiveContainer makes chart fill its parent width
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        {/* [NEW] Formatted date labels on XAxis */}
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatChartDate}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        {/* [NEW] Custom tooltip component */}
                        <Tooltip content={<ChartTooltip />} />
                        {/* [NEW] Thicker smooth line with styled dots */}
                        <Line
                          type="monotone"
                          dataKey="estimated_rm"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </section>

                {/* Training Insights — advanced analytics cards */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-700">Información de Entrenamiento</h2>
                      <p className="text-sm text-slate-500 max-w-xl">Un resumen rápido del volumen de sesiones, RM estimado y consistencia reciente del atleta.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                        {DATE_RANGE_OPTIONS.find((opt) => opt.value === dateRange)?.label}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        {analytics.consistencyStreak} sesiones en 30 días
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Total sesiones</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">{analytics.totalSessions}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">RM estimado promedio</p>
                      <p className="mt-3 text-3xl font-semibold text-indigo-600">{analytics.averageEstimatedRM} kg</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Mejor RM estimado</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">{analytics.bestEstimatedRM} kg</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Carga total</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">
                        {analytics.volumeLoad.toLocaleString("es-AR")}{" "}
                        <span className="text-lg font-medium text-slate-500">kg</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Análisis de tendencia</p>
                    <p className="mt-3 text-sm text-slate-700">{analytics.insight}</p>
                    <p className="mt-2 text-sm text-slate-500">{analytics.peakInsight} {analytics.frequencyInsight}</p>
                  </div>
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-slate-700">Registros de Entrenamiento</h2>
                    {/* [NEW] Count indicator */}
                    <span className="text-xs text-slate-400">
                      {filteredLogs.length} de {logs.length} registros
                    </span>
                  </div>

                  {filteredLogs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Sin datos para este rango</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {filteredLogs.map((log) => (
                        <li key={log.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectLog(log.id)}
                            className={`flex-1 flex items-center justify-between px-3 py-3 rounded-lg text-left transition-all hover:bg-slate-50 active:scale-[0.99] ${
                              selectedLogId === log.id ? "bg-indigo-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-slate-400 w-20">{log.date}</span>
                              <span className="text-sm text-slate-700 font-medium">
                                {log.weight} kg × {log.reps} rep{log.reps !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-indigo-600">
                              {log.estimated_rm} kg RM
                            </span>
                          </button>
                          <div className="flex shrink-0 gap-1 pr-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLog(log)}
                              className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log.id)}
                              disabled={deletingLogId === log.id}
                              className="px-2.5 py-1.5 text-xs font-medium text-red-700 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                            >
                              {deletingLogId === log.id ? "..." : "Eliminar"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}

        {/* ── Training summary ──────────────────────────────────────────────── */}
        {selectedLogId !== null && !summary && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <p className="text-sm text-slate-400">No se pudo cargar el resumen del registro.</p>
          </section>
        )}

        {summary && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              Resumen de Sesión — {summary.exercise}
            </h2>
            {/* [NEW] Same 3-column stat grid for summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Peso</p>
                <p className="text-xl font-bold text-slate-800">
                  {summary.weight}{" "}
                  <span className="text-sm font-normal text-slate-400">kg</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Repeticiones</p>
                <p className="text-xl font-bold text-slate-800">{summary.reps}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">RM Est.</p>
                <p className="text-xl font-bold text-indigo-600">
                  {summary.estimated_rm}{" "}
                  <span className="text-sm font-normal text-slate-400">kg</span>
                </p>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-600 mb-3">Tabla de Porcentajes</h3>
            {/* [NEW] Styled table with rounded container */}
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Reps</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Peso (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.percentages.map((row) => (
                    <tr
                      key={row.reps}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-slate-600">{row.reps}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{row.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
          </>
        )}

        {module === "resistencia" && (
          <ResistenciaModule
            athleteId={selectedAthleteId}
            authToken={token}
            historyRefreshKey={vamHistoryRefreshKey}
            onEvaluationSuccess={() => setVamHistoryRefreshKey((prev) => prev + 1)}
          />
        )}

      </div>
    </main>
  );
}