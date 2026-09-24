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
import {
  StrengthLogEditModal,
  type StrengthLogEditData,
} from "@/components/strength/StrengthLogEditModal";
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
  type ProgressListItem,
} from "@/lib/strength/loadStrengthData";
import {
  persistDateRange,
  persistExerciseId,
  readStoredDateRange,
  readStoredExerciseId,
  STORAGE_KEYS,
} from "@/lib/storage";
import type { DateRange } from "@/lib/types";
import { parseApiError } from "@/lib/utils";

type Props = {
  athleteId: number | null;
  athleteName: string | null;
  authToken: string | null;
};

export function StrengthModule({ athleteId, athleteName, authToken }: Props) {
  const { pushToast } = useToast();
  const prefsReadyRef = useRef(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    () => readStoredExerciseId(),
  );
  const [logs, setLogs] = useState<ProgressListItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsReloadToken, setLogsReloadToken] = useState(0);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof loadSummary>>>(null);
  const [date, setDate] = useState(getTodayDate());
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveLogError, setSaveLogError] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<StrengthLogEditData | null>(null);
  const [isLogEditModalOpen, setIsLogEditModalOpen] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    readStoredDateRange(STORAGE_KEYS.dateRange),
  );

  const weightInputRef = useRef<HTMLInputElement | null>(null);
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId) ?? null;

  useEffect(() => {
    prefsReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!authToken) return;
    setIsLoadingExercises(true);
    getExercises()
      .then(setExercises)
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
    setSelectedLogId(null);
    setSummary(null);
  }, [athleteId]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    persistDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    persistExerciseId(selectedExerciseId);
  }, [selectedExerciseId]);

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

      if (!progress) {
        setLogs([]);
        return;
      }

      const candidateLogs = allLogs
        .filter(
          (l) => l.athlete_id === athleteId && l.exercise_id === selectedExerciseId,
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
    const sourceLogs =
      Array.isArray(filteredLogs) && filteredLogs.length > 0
        ? filteredLogs
        : Array.isArray(logs)
          ? logs
          : [];
    const sortedLogs = [...sourceLogs].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );
    const totalSessions = sourceLogs.length;
    const totalRm = sourceLogs.reduce((sum, item) => sum + item.estimated_rm, 0);
    const bestEstimatedRM =
      totalSessions > 0 ? Math.max(...sourceLogs.map((item) => item.estimated_rm)) : 0;
    const averageEstimatedRM =
      totalSessions > 0 ? Math.round(totalRm / totalSessions) : 0;
    const volumeLoad = Math.round(
      sourceLogs.reduce((sum, item) => sum + item.weight * item.reps, 0),
    );

    const today = startOfToday();
    const cutOff30 = new Date(today);
    cutOff30.setDate(cutOff30.getDate() - 30);
    const consistencyStreak = sourceLogs.filter(
      (item) => parseLocalDate(item.date) >= cutOff30,
    ).length;

    const firstLog = sortedLogs[0] ?? null;
    const lastLog = sortedLogs[sortedLogs.length - 1] ?? null;
    const peakRm =
      totalSessions > 0 ? Math.max(...sourceLogs.map((item) => item.estimated_rm)) : 0;

    let insight = "Analizando datos de entrenamiento.";
    if (totalSessions === 0) {
      insight = "Sin registros todavía. Agregá una sesión para ver los análisis.";
    } else if (totalSessions >= 2 && firstLog && lastLog) {
      const trendPercent =
        ((lastLog.estimated_rm - firstLog.estimated_rm) /
          Math.max(firstLog.estimated_rm, 1)) *
        100;
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
    if (athleteId === null || selectedExerciseId === null) return;

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
      await createTrainingLog(athleteId, selectedExerciseId, date, weightVal, repsVal);
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

  const displayAthleteName = athleteName ?? "Atleta";
  const displayExerciseName = selectedExercise?.name ?? "Ejercicio";

  return (
    <div className="space-y-6">
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
            Elegí un atleta arriba para comenzar a registrar sesiones de entrenamiento.
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
            Elegí un ejercicio arriba para ver el gráfico de progreso y registros de entrenamiento.
          </p>
        </section>
      ) : (
        <>
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              Nuevo Registro de Entrenamiento —{" "}
              <span className="text-indigo-600">{displayAthleteName}</span>
              {" / "}
              <span className="text-indigo-600">{displayExerciseName}</span>
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
                Registrá tu primera sesión para desbloquear información de entrenamiento, progresión de RM y seguimiento de consistencia.
              </p>
            </section>
          ) : (
            <>
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
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
                          <p
                            className={`text-2xl font-bold ${changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}
                          >
                            {changePct >= 0 ? "+" : ""}
                            {changePct.toFixed(1)}
                            <span className="text-sm font-normal ml-0.5">%</span>
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 mt-1">Sin datos anteriores</p>
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-1">Última sesión</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {lastLog.weight} kg × {lastLog.reps} rep
                          {lastLog.reps !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDisplayDate(lastLog.date)}</p>
                      </div>
                    </div>
                  );
                })()}
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="text-base font-semibold text-slate-700">Progresión de RM</h2>
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

              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-700">Información de Entrenamiento</h2>
                    <p className="text-sm text-slate-500 max-w-xl">
                      Un resumen rápido del volumen de sesiones, RM estimado y consistencia reciente del atleta.
                    </p>
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
                    <p className="mt-3 text-3xl font-semibold text-indigo-600">
                      {analytics.averageEstimatedRM} kg
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Mejor RM estimado</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {analytics.bestEstimatedRM} kg
                    </p>
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
                  <p className="mt-2 text-sm text-slate-500">
                    {analytics.peakInsight} {analytics.frequencyInsight}
                  </p>
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-700">Registros de Entrenamiento</h2>
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
                            <span className="text-xs text-slate-400 w-20">
                              {formatDisplayDate(log.date)}
                            </span>
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
    </div>
  );
}
