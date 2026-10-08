"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import {
  StrengthLogEditModal,
  type StrengthLogEditData,
} from "@/components/strength/StrengthLogEditModal";
import { DateFormatHintLine, DateInputWithDisplay } from "@/components/ui/DateInputWithDisplay";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useToast } from "@/contexts/ToastContext";
import { DATE_RANGE_OPTIONS } from "@/lib/constants";
import {
  formatChartDate,
  formatDisplayDate,
  getTodayDate,
  parseLocalDate,
  startOfToday,
} from "@/lib/date";
import {
  createTrainingLog,
  deleteTrainingLog,
  getExercises,
  type Exercise,
} from "@/lib/api/strength";
import {
  loadAllLogs,
  loadProgress,
  loadSummary,
  type LogSummary,
  type ProgressListItem,
} from "@/lib/strength/loadStrengthData";
import {
  persistDateRange,
  persistExerciseId,
  readStoredDateRange,
  STORAGE_KEYS,
} from "@/lib/storage";
import type { DateRange } from "@/lib/types";
import { ExercisePicker } from "@/components/strength/ExercisePicker";
import {
  formatRelativeStrength,
  hasBodyWeightForRelative,
  relativeStrength,
} from "@/lib/strength/relativeStrength";
import {
  formatPullUpLogLine,
  isPullUpLogKind,
  PULL_UP_MODALITY_OPTIONS,
  type PullUpModality,
  pullUpLoadFieldLabel,
  pullUpModalityRequiresLoad,
} from "@/lib/strength/pullUpLog";
import { parseApiError } from "@/lib/utils";

type Props = {
  athleteId: number | null;
  athleteName: string | null;
  athleteBodyWeightKg: number | null;
  authToken: string | null;
};

function parseEjercicioParam(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const LIST_INITIAL_VISIBLE = 3;
const LIST_VISIBLE_STEP = 10;

export function StrengthModule({
  athleteId,
  athleteName,
  athleteBodyWeightKg,
  authToken,
}: Props) {
  const { pushToast } = useToast();
  const searchParams = useSearchParams();
  const ejercicioFromUrl = parseEjercicioParam(searchParams.get("ejercicio"));
  const prefsReadyRef = useRef(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [logs, setLogs] = useState<ProgressListItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsReloadToken, setLogsReloadToken] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [expandedLogSummary, setExpandedLogSummary] = useState<LogSummary | null>(null);
  const [isLoadingExpandedSummary, setIsLoadingExpandedSummary] = useState(false);
  const [date, setDate] = useState(getTodayDate());
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [pullUpModality, setPullUpModality] = useState<PullUpModality>("bodyweight");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveLogError, setSaveLogError] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<StrengthLogEditData | null>(null);
  const [isLogEditModalOpen, setIsLogEditModalOpen] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    readStoredDateRange(STORAGE_KEYS.dateRange),
  );
  const [listVisibleCount, setListVisibleCount] = useState(LIST_INITIAL_VISIBLE);

  const weightInputRef = useRef<HTMLInputElement | null>(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) ?? null;
  const isPullUpExercise = isPullUpLogKind(selectedExercise?.log_kind);

  useEffect(() => {
    setPullUpModality("bodyweight");
    setWeight("");
    setReps("");
  }, [selectedExerciseId, isPullUpExercise]);
  useEffect(() => {
    prefsReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!authToken) return;
    setIsLoadingExercises(true);
    getExercises()
      .then(({ exercises }) => setExercises(exercises))
      .catch(() => setExercises([]))
      .finally(() => setIsLoadingExercises(false));
  }, [authToken]);

  useEffect(() => {
    if (exercises.length === 0) return;
    if (
      selectedExerciseId !== null &&
      !exercises.some((exercise) => exercise.id === selectedExerciseId)
    ) {
      setSelectedExerciseId(null);
    }
  }, [exercises, selectedExerciseId]);

  useEffect(() => {
    if (ejercicioFromUrl === null || exercises.length === 0) return;
    if (exercises.some((exercise) => exercise.id === ejercicioFromUrl)) {
      setSelectedExerciseId(ejercicioFromUrl);
    }
  }, [ejercicioFromUrl, exercises]);

  useEffect(() => {
    setExpandedLogId(null);
    setExpandedLogSummary(null);
  }, [athleteId, selectedExerciseId]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    persistDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    persistExerciseId(null);
  }, []);

  useEffect(() => {
    if (ejercicioFromUrl !== null) return;
    setSelectedExerciseId(null);
  }, [athleteId, ejercicioFromUrl]);

  useEffect(() => {
    const loadLogs = async () => {
      if (athleteId === null || selectedExerciseId === null) {
        setLogs([]);
        return;
      }
      setIsLoadingLogs(true);
      const [progress, allLogs] = await Promise.all([
        loadProgress(athleteId, selectedExerciseId),
        loadAllLogs(),
      ]);
      setIsLoadingLogs(false);

      const candidateLogs = allLogs
        .filter(
          (l) => l.athlete_id === athleteId && l.exercise_id === selectedExerciseId,
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      const logsFromCandidates = (): ProgressListItem[] =>
        candidateLogs.map((l) => ({
          id: l.id,
          date: l.date,
          weight: l.weight,
          reps: l.reps,
          estimated_rm: l.estimated_rm,
          pull_up_modality: l.pull_up_modality ?? null,
        }));

      if (!progress) {
        setLogs(logsFromCandidates().sort((a, b) => b.date.localeCompare(a.date)));
        return;
      }

      const usedIds = new Set<number>();
      const mergedLogs: ProgressListItem[] = progress.history
        .map((item) => {
          const match = candidateLogs.find(
            (l) =>
              !usedIds.has(l.id) &&
              l.date === item.date &&
              l.weight === item.weight &&
              l.reps === item.reps &&
              (item.pull_up_modality == null ||
                l.pull_up_modality == null ||
                l.pull_up_modality === item.pull_up_modality),
          );
          if (!match) return null;
          usedIds.add(match.id);
          return {
            id: match.id,
            date: item.date,
            weight: item.weight,
            reps: item.reps,
            estimated_rm: item.estimated_rm,
            pull_up_modality: item.pull_up_modality ?? match.pull_up_modality,
          };
        })
        .filter((l): l is ProgressListItem => l !== null);

      const resolved =
        mergedLogs.length > 0 ? mergedLogs : logsFromCandidates();

      setLogs(resolved.sort((a, b) => b.date.localeCompare(a.date)));
    };
    void loadLogs();
  }, [athleteId, selectedExerciseId, logsReloadToken]);

  const filteredLogs = useMemo(() => {
    if (dateRange === "all") return logs;
    const today = startOfToday();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - days);
    return logs.filter((l) => {
      const d = parseLocalDate(l.date);
      return !Number.isNaN(d.getTime()) && d >= cutoff;
    });
  }, [logs, dateRange]);

  useEffect(() => {
    setListVisibleCount(LIST_INITIAL_VISIBLE);
  }, [athleteId, selectedExerciseId, dateRange, filteredLogs.length]);

  const visibleListLogs = useMemo(
    () => filteredLogs.slice(0, listVisibleCount),
    [filteredLogs, listVisibleCount],
  );
  const hiddenListCount = Math.max(0, filteredLogs.length - listVisibleCount);

  const chartData = useMemo(
    () =>
      [...filteredLogs]
        .sort(
          (a, b) =>
            parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
        )
        .filter((l) => l.estimated_rm != null)
        .map((l) => ({ date: l.date, estimated_rm: l.estimated_rm as number })),
    [filteredLogs],
  );

  const evaluationStats = useMemo(() => {
    const sourceLogs =
      filteredLogs.length > 0 ? filteredLogs : logs;
    const totalEvaluations = sourceLogs.length;
    const rmLogs = sourceLogs.filter((item) => item.estimated_rm != null);
    const totalRm = rmLogs.reduce((sum, item) => sum + (item.estimated_rm ?? 0), 0);
    const bestEstimatedRM =
      rmLogs.length > 0
        ? Math.max(...rmLogs.map((item) => item.estimated_rm as number))
        : 0;
    const averageEstimatedRM =
      rmLogs.length > 0 ? Math.round((totalRm / rmLogs.length) * 10) / 10 : 0;
    const bestRmRelative = relativeStrength(bestEstimatedRM, athleteBodyWeightKg);
    const avgRmRelative = relativeStrength(averageEstimatedRM, athleteBodyWeightKg);

    return {
      totalEvaluations,
      averageEstimatedRM,
      bestEstimatedRM,
      bestRmRelative,
      avgRmRelative,
    };
  }, [filteredLogs, logs, athleteBodyWeightKg]);

  const missingBodyWeight =
    athleteId !== null && !hasBodyWeightForRelative(athleteBodyWeightKg);

  useEffect(() => {
    if (expandedLogId === null) {
      setExpandedLogSummary(null);
      setIsLoadingExpandedSummary(false);
      return;
    }
    if (!logs.some((log) => log.id === expandedLogId)) {
      setExpandedLogId(null);
      return;
    }
    let cancelled = false;
    setIsLoadingExpandedSummary(true);
    setExpandedLogSummary(null);
    void loadSummary(expandedLogId).then((data) => {
      if (!cancelled) {
        setExpandedLogSummary(data);
        setIsLoadingExpandedSummary(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [expandedLogId, logs, logsReloadToken]);

  const handleSelectExercise = (id: number) => {
    setSelectedExerciseId(id);
    setExpandedLogId(null);
    setExpandedLogSummary(null);
  };

  const handleToggleLogTable = (logId: number) => {
    setExpandedLogId((current) => (current === logId ? null : logId));
  };

  const handleCollapseLogTable = () => {
    setExpandedLogId(null);
    setExpandedLogSummary(null);
  };

  const handleCreateLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (athleteId === null || selectedExerciseId === null) return;

    const repsVal = Number(reps);
    const needsLoad =
      isPullUpExercise && pullUpModalityRequiresLoad(pullUpModality);
    const weightVal = needsLoad ? Number(weight) : isPullUpExercise ? 0 : Number(weight);

    if (needsLoad || !isPullUpExercise) {
      if (!Number.isFinite(weightVal)) {
        setSaveLogError("Ingresá una carga válida (número mayor a 0).");
        return;
      }
      if (weightVal <= 0) {
        setSaveLogError("La carga debe ser mayor a 0 kg.");
        return;
      }
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
        athleteId,
        selectedExerciseId,
        date,
        weightVal,
        repsVal,
        isPullUpExercise ? pullUpModality : undefined,
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

  const handleOpenEditLog = (log: ProgressListItem) => {
    setEditingLog({
      id: log.id,
      date: log.date,
      weight: log.weight,
      reps: log.reps,
      pull_up_modality: log.pull_up_modality,
      isPullUp: isPullUpExercise,
    });
    setIsLogEditModalOpen(true);
  };

  const handleLogSaved = () => {
    setLogsReloadToken((p) => p + 1);
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

  const displayAthleteName = athleteName ?? "Atleta";
  const displayExerciseName = selectedExercise?.name ?? "Ejercicio";

  return (
    <div className="space-y-6">
      {missingBodyWeight && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          Para ver fuerza relativa, completá el{" "}
          <span className="font-medium">peso corporal</span> en la ficha del atleta
          {athleteId !== null ? (
            <>
              {" "}
              (
              <Link
                href={`/atletas/${athleteId}`}
                className="font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-800"
              >
                ir al perfil
              </Link>
              )
            </>
          ) : null}
          . Los valores relativos se muestran como — hasta entonces.
        </div>
      )}

      <StrengthLogEditModal
        open={isLogEditModalOpen}
        log={editingLog}
        onClose={() => {
          setIsLogEditModalOpen(false);
          setEditingLog(null);
        }}
        onSaved={handleLogSaved}
      />

      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-3">Ejercicios</h2>
        {isLoadingExercises ? (
          <p className="text-sm text-slate-400 animate-pulse">Cargando ejercicios...</p>
        ) : exercises.length === 0 ? (
          <p className="text-sm text-slate-400">No hay ejercicios disponibles.</p>
        ) : (
          <ExercisePicker
            exercises={exercises}
            selectedExerciseId={selectedExerciseId}
            onSelect={handleSelectExercise}
            disabled={athleteId === null}
          />
        )}
        {athleteId === null && (
          <p className="text-xs text-slate-400 mt-3">← Seleccioná un atleta primero.</p>
        )}
      </section>

      {athleteId === null ? (
        <section className="bg-white rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto mb-4">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
              <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Seleccioná un atleta</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Elegí un atleta arriba para comenzar a registrar evaluaciones de fuerza.
          </p>
        </section>
      ) : selectedExerciseId === null ? (
        <section className="bg-white rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto mb-4">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16" />
              <path d="M4 12h16" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">
            Seleccioná un ejercicio para ver el progreso
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Elegí un ejercicio arriba para ver progresión de RM y el historial de evaluaciones.
          </p>
        </section>
      ) : (
        <>
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              Nueva evaluación —{" "}
              <span className="text-indigo-600">{displayAthleteName}</span>
              {" / "}
              <span className="text-indigo-600">{displayExerciseName}</span>
            </h2>
            <form onSubmit={handleCreateLog} className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <DateInputWithDisplay
                id="log-date"
                label="Fecha"
                value={date}
                onChange={setDate}
                required
                wrapperClassName="w-36 shrink-0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              {isPullUpExercise ? (
                <div className="shrink-0 min-w-[12rem]">
                  <label htmlFor="pull-up-modality" className="block text-xs text-slate-500 mb-1">
                    Modalidad
                  </label>
                  <select
                    id="pull-up-modality"
                    value={pullUpModality}
                    onChange={(e) => setPullUpModality(e.target.value as PullUpModality)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
                  >
                    {PULL_UP_MODALITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <DateFormatHintLine visible={false} />
                </div>
              ) : null}
              {(!isPullUpExercise || pullUpModalityRequiresLoad(pullUpModality)) && (
                <div className="shrink-0">
                  <label htmlFor="log-weight" className="block text-xs text-slate-500 mb-1">
                    {isPullUpExercise ? pullUpLoadFieldLabel(pullUpModality) : "Peso (kg)"}
                  </label>
                  <input
                    id="log-weight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                    ref={weightInputRef}
                    className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <DateFormatHintLine visible={false} />
                </div>
              )}
              <div className="shrink-0">
                <label htmlFor="log-reps" className="block text-xs text-slate-500 mb-1">Repeticiones</label>
                <input
                  id="log-reps"
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  required
                  className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <DateFormatHintLine visible={false} />
              </div>
              <div className="shrink-0">
                <span className="block text-xs text-slate-500 mb-1 invisible" aria-hidden>
                  Acción
                </span>
                <button
                  type="submit"
                  disabled={isSavingLog}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSavingLog ? "Guardando..." : "Guardar Registro"}
                </button>
                <DateFormatHintLine visible={false} />
              </div>
            </form>
            {saveLogError && <p className="text-red-500 text-sm mt-3">{saveLogError}</p>}
          </section>

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
              <h3 className="text-base font-semibold text-slate-800 mb-2">
                Este atleta todavía no tiene registros
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Registrá tu primera evaluación para ver el resumen, la progresión de RM y la tabla de %RM.
              </p>
            </section>
          ) : (
            <>
              {!isPullUpExercise ? (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-base font-semibold text-slate-700 mb-1">Resumen de rendimiento</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Fuerza relativa según peso corporal actual en la ficha del atleta.
                </p>
                {(() => {
                  const lastLog = logs[0];
                  const previousLog = logs[1];
                  const changePct = previousLog
                    ? ((lastLog.estimated_rm - previousLog.estimated_rm) /
                        previousLog.estimated_rm) *
                      100
                    : null;
                  const lastLoadRelative = relativeStrength(lastLog.weight, athleteBodyWeightKg);
                  const lastRmRelative = relativeStrength(lastLog.estimated_rm, athleteBodyWeightKg);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-1">Est. 1RM (última evaluación)</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {lastLog.estimated_rm}
                          <span className="text-sm font-normal text-slate-400 ml-1">kg</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Rel. RM: {formatRelativeStrength(lastRmRelative)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-1">vs evaluación anterior</p>
                        {changePct !== null ? (
                          <p
                            className={`text-2xl font-bold ${changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}
                          >
                            {changePct >= 0 ? "+" : ""}
                            {changePct.toFixed(1)}
                            <span className="text-sm font-normal ml-0.5">%</span>
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 mt-1">Sin evaluación anterior</p>
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-1">Última carga</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {lastLog.weight} kg × {lastLog.reps} rep
                          {lastLog.reps !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDisplayDate(lastLog.date)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-1">Fuerza relativa (última carga)</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {formatRelativeStrength(lastLoadRelative)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-1">Peso corporal (ficha)</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {athleteBodyWeightKg != null && athleteBodyWeightKg > 0
                            ? athleteBodyWeightKg
                            : "—"}
                          {athleteBodyWeightKg != null && athleteBodyWeightKg > 0 && (
                            <span className="text-sm font-normal text-slate-400 ml-1">kg</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </section>
              ) : null}

              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-700">Historial de evaluaciones</h2>
                    <p className="text-sm text-slate-500 max-w-xl">
                      {isPullUpExercise
                        ? "Registros del rango seleccionado (sin estimación de RM)."
                        : "Agregados del rango del gráfico. Tocá una evaluación para ver la tabla %RM calculada sobre el RM de esa sesión."}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    {DATE_RANGE_OPTIONS.find((opt) => opt.value === dateRange)?.label}
                  </span>
                </div>
                <div
                  className={`grid gap-4 mb-6 ${
                    isPullUpExercise
                      ? "sm:grid-cols-1 max-w-xs"
                      : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
                  }`}
                >
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Cantidad de evaluaciones
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {evaluationStats.totalEvaluations}
                    </p>
                  </div>
                  {!isPullUpExercise ? (
                    <>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">RM promedio</p>
                    <p className="mt-3 text-3xl font-semibold text-indigo-600">
                      {evaluationStats.averageEstimatedRM} kg
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Fuerza relativa promedio
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {formatRelativeStrength(evaluationStats.avgRmRelative)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">RM promedio ÷ peso corporal</p>
                  </div>
                  <div
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                    title="Máximo RM estimado entre las evaluaciones del rango"
                  >
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Mejor RM (estimado)
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {evaluationStats.bestEstimatedRM} kg
                    </p>
                  </div>
                  <div
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                    title="Fuerza relativa del mejor RM estimado del rango"
                  >
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Fuerza relativa mejor RM (estimado)
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {formatRelativeStrength(evaluationStats.bestRmRelative)}
                    </p>
                  </div>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-600">Listado</h3>
                  <span className="text-xs text-slate-400">
                    {filteredLogs.length} de {logs.length} en el rango
                  </span>
                </div>
                {!isPullUpExercise ? (
                  <p className="text-xs text-slate-400 mb-3">
                    Tocá una evaluación para ver la tabla de %RM.
                  </p>
                ) : null}
                {filteredLogs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Sin evaluaciones en este rango</p>
                ) : (
                  <ul className="space-y-2">
                    {visibleListLogs.map((log) => {
                      const loadRel = relativeStrength(log.weight, athleteBodyWeightKg);
                      const rmRel = relativeStrength(log.estimated_rm, athleteBodyWeightKg);
                      const isExpanded = expandedLogId === log.id;
                      const showSummary = isExpanded && expandedLogSummary;
                      const logLine = isPullUpExercise
                        ? formatPullUpLogLine(log.pull_up_modality, log.weight, log.reps)
                        : `${log.weight} kg × ${log.reps} rep${log.reps !== 1 ? "s" : ""}`;
                      const rowMainClass = `flex-1 flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-left min-w-0 ${
                        isPullUpExercise ? "bg-white" : isExpanded ? "bg-indigo-50" : "bg-white hover:bg-indigo-50/60"
                      }`;
                      return (
                        <li
                          key={log.id}
                          className={`rounded-xl border overflow-hidden transition-shadow ${
                            isExpanded
                              ? "border-indigo-200 shadow-sm shadow-indigo-100"
                              : "border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-stretch gap-0">
                            {isPullUpExercise ? (
                              <div className={rowMainClass}>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                                  <span className="text-xs text-slate-400 w-20 shrink-0">
                                    {formatDisplayDate(log.date)}
                                  </span>
                                  <span className="text-sm text-slate-700 font-medium">{logLine}</span>
                                </div>
                              </div>
                            ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleLogTable(log.id)}
                              aria-expanded={isExpanded}
                              title={isExpanded ? "Ocultar tabla de %RM" : "Ver tabla de %RM"}
                              className={`${rowMainClass} cursor-pointer transition-colors`}
                            >
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                                <span className="text-xs text-slate-400 w-20 shrink-0">
                                  {formatDisplayDate(log.date)}
                                </span>
                                <span className="text-sm text-slate-700 font-medium">{logLine}</span>
                                <span className="text-xs text-slate-500">
                                  Rel. carga {formatRelativeStrength(loadRel)}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-semibold text-indigo-600 block">
                                  {log.estimated_rm} kg RM
                                </span>
                                <span className="text-xs text-slate-500">
                                  Rel. RM {formatRelativeStrength(rmRel)}
                                </span>
                              </div>
                            </button>
                            )}
                            <div className="flex shrink-0 gap-1 px-2 py-2 border-l border-slate-100 bg-slate-50/80 items-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditLog(log);
                                }}
                                className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteLog(log.id);
                                }}
                                disabled={deletingLogId === log.id}
                                className="px-2.5 py-1.5 text-xs font-medium text-red-700 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                              >
                                {deletingLogId === log.id ? "..." : "Eliminar"}
                              </button>
                            </div>
                          </div>
                          {isExpanded && !isPullUpExercise && (
                            <div className="px-3 pb-4 pt-2 border-t border-indigo-100 bg-white">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold text-slate-600">Tabla de %RM</h4>
                                  {showSummary && (
                                    <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                                      RM de esta evaluación: {expandedLogSummary.estimated_rm} kg
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={handleCollapseLogTable}
                                  className="text-xs font-medium text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-1.5 hover:bg-slate-50 transition"
                                >
                                  Ocultar tabla
                                </button>
                              </div>
                              {isLoadingExpandedSummary && (
                                <p className="text-sm text-slate-400">Cargando tabla...</p>
                              )}
                              {!isLoadingExpandedSummary && showSummary && (
                                <div
                                  className="overflow-x-auto rounded-xl border border-slate-200 bg-white text-slate-700"
                                  style={{ colorScheme: "light" }}
                                  data-testid="percentage-rm-table"
                                >
                                  <table className="w-full text-sm min-w-[36rem] bg-white">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-200">
                                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">
                                          %RM
                                        </th>
                                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">
                                          Reps
                                        </th>
                                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">
                                          RIR+1
                                        </th>
                                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">
                                          RIR+2
                                        </th>
                                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">
                                          RIR+3
                                        </th>
                                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">
                                          Carga (kg)
                                        </th>
                                        <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500">
                                          Fuerza rel.
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {expandedLogSummary.percentages.map((row, rowIndex) => (
                                        <tr
                                          key={`${row.percentage}-${row.reps}`}
                                          className={
                                            rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"
                                          }
                                        >
                                          <td className="px-3 py-2.5">{row.percentage}%</td>
                                          <td className="px-3 py-2.5">{row.reps}</td>
                                          <td className="px-3 py-2.5">{row.rir_plus_1}</td>
                                          <td className="px-3 py-2.5">{row.rir_plus_2}</td>
                                          <td className="px-3 py-2.5">{row.rir_plus_3}</td>
                                          <td className="px-3 py-2.5 font-medium text-slate-800">
                                            {row.weight}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            {formatRelativeStrength(
                                              relativeStrength(row.weight, athleteBodyWeightKg),
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {!isLoadingExpandedSummary && !showSummary && (
                                <p className="text-sm text-red-500">
                                  No se pudo cargar la tabla para esta evaluación.
                                </p>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {hiddenListCount > 0 || listVisibleCount > LIST_INITIAL_VISIBLE ? (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-2 border-t border-slate-100">
                    {hiddenListCount > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setListVisibleCount((count) =>
                              Math.min(count + LIST_VISIBLE_STEP, filteredLogs.length),
                            )
                          }
                          className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                        >
                          Ver {Math.min(LIST_VISIBLE_STEP, hiddenListCount)} evaluaciones más
                        </button>
                        {hiddenListCount > LIST_VISIBLE_STEP ? (
                          <button
                            type="button"
                            onClick={() => setListVisibleCount(filteredLogs.length)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                          >
                            Ver listado completo ({filteredLogs.length})
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {listVisibleCount > LIST_INITIAL_VISIBLE ? (
                      <button
                        type="button"
                        onClick={() => {
                          setListVisibleCount(LIST_INITIAL_VISIBLE);
                          handleCollapseLogTable();
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                      >
                        Ocultar listado ({LIST_INITIAL_VISIBLE} más recientes)
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>

              {!isPullUpExercise ? (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="text-base font-semibold text-slate-700">Progresión RM</h2>
                </div>
                <div className="flex gap-2 mb-6">
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
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
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                    Sin datos para este rango
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
                      <Tooltip content={<ChartTooltip />} />
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
              ) : null}

            </>
          )}
        </>
      )}
    </div>
  );
}
