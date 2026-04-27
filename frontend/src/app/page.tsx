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

// ─── Types ────────────────────────────────────────────────────────────────────

type Athlete = { id: number; name: string };

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

// [NEW] Date range filter type
type DateRange = "7d" | "30d" | "90d" | "all";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "http://127.0.0.1:8000";

const EXERCISES = [
  { id: 1, name: "Back Squat" },
  { id: 2, name: "Deadlift" },
  { id: 3, name: "Bench Press" },
  { id: 4, name: "Overhead Press" },
  { id: 5, name: "Hip Thrust" },
];

// [NEW] Date range options for the select
const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7d",  label: "Last 7 days"  },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time"     },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

// [FIX] Parse "YYYY-MM-DD" as LOCAL date to avoid UTC timezone offset bugs
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// [NEW] Format "2024-01-15" → "Jan 15" for XAxis labels
function formatChartDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── API ──────────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function getAthletes(): Promise<Athlete[]> {
  try {
    const res = await fetch(`${BASE_URL}/athletes`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    return JSON.parse(await res.text());
  } catch {
    return [];
  }
}

async function getAllLogs(): Promise<RawLog[]> {
  try {
    const res = await fetch(`${BASE_URL}/logs`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getProgress(
  athleteId: number,
  exerciseId: number,
): Promise<ProgressResponse | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/athletes/${athleteId}/progress/${exerciseId}`,
      { headers: getAuthHeaders() },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getSummary(logId: number): Promise<LogSummary | null> {
  try {
    const res = await fetch(`${BASE_URL}/logs/${logId}/summary`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Custom Recharts tooltip ──────────────────────────────────────────────────

// [NEW] Styled tooltip component
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs text-slate-400 mb-1 font-medium">
        {label ? formatChartDate(label) : ""}
      </p>
      <p className="text-base font-bold text-indigo-600">
        {payload[0].value}{" "}
        <span className="text-xs font-normal text-slate-500">kg est. RM</span>
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(false); // [NEW]
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
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

  // [NEW] Date range filter state
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const weightInputRef = useRef<HTMLInputElement | null>(null);
  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
  const selectedExercise = EXERCISES.find((e) => e.id === selectedExerciseId);

  // ─── Token init ────────────────────────────────────────────────────────────
  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  // ─── Load athletes ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setIsLoadingAthletes(true);
    getAthletes()
      .then(setAthletes)
      .finally(() => setIsLoadingAthletes(false));
  }, [token]);

  // ─── Load logs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadLogs = async () => {
      if (selectedAthleteId === null || selectedExerciseId === null) {
        setLogs([]);
        return;
      }
      setIsLoadingLogs(true);
      const [progress, allLogs] = await Promise.all([
        getProgress(selectedAthleteId, selectedExerciseId),
        getAllLogs(),
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

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setLoginEmail("");
      setLoginPassword("");
    } catch {
      setLoginError("Invalid email or password");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setAthletes([]);
    setSelectedAthleteId(null);
    setSelectedExerciseId(null);
    setLogs([]);
    setSelectedLogId(null);
    setSummary(null);
    setDateRange("all"); // [NEW] reset filter on logout
  };

  const handleSelectAthlete = (id: number) => {
    setSelectedAthleteId(id);
    setSelectedLogId(null);
    setSummary(null);
    setDateRange("all"); // [NEW] reset filter on selection change
  };

  const handleSelectExercise = (id: number) => {
    setSelectedExerciseId(id);
    setSelectedLogId(null);
    setSummary(null);
    setDateRange("all"); // [NEW] reset filter on selection change
  };

  const handleSelectLog = async (logId: number) => {
    setSelectedLogId(logId);
    setSummary(await getSummary(logId));
  };

  const handleCreateLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedAthleteId === null || selectedExerciseId === null) return;
    setIsSavingLog(true);
    setSaveLogError(null);
    try {
      const res = await fetch(`${BASE_URL}/logs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          athlete_id: selectedAthleteId,
          exercise_id: selectedExerciseId,
          date,
          weight: Number(weight),
          reps: Number(reps),
        }),
      });
      if (!res.ok) throw new Error();
      setLogsReloadToken((p) => p + 1);
      setDate(getTodayDate());
      setWeight("");
      setReps("");
      weightInputRef.current?.focus();
    } catch {
      setSaveLogError("Could not save training log. Please try again.");
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleCreateAthlete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingAthlete(true);
    setCreateAthleteError(null);
    try {
      const res = await fetch(`${BASE_URL}/athletes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: athleteName }),
      });
      if (!res.ok) throw new Error();
      setAthleteName("");
      setAthletes(await getAthletes());
    } catch {
      setCreateAthleteError("Could not create athlete. Please try again.");
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
            <p className="text-slate-400 text-sm mt-1">Athlete performance tracker</p>
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
                placeholder="coach@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
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
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ─── Main dashboard ────────────────────────────────────────────────────────

  return (
    // [NEW] Centered max-w-5xl container, slate-50 background
    <main className="min-h-screen bg-slate-50">
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
            Logout
          </button>
        </div>

        {/* ── Athletes ──────────────────────────────────────────────────────── */}
        {/* [NEW] Card wrapper for each section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Athletes</h2>

          <form onSubmit={handleCreateAthlete} className="flex gap-2 mb-4">
            <input
              type="text"
              value={athleteName}
              onChange={(e) => setAthleteName(e.target.value)}
              placeholder="New athlete name..."
              required
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={isCreatingAthlete}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isCreatingAthlete ? "Adding..." : "+ Add"}
            </button>
          </form>
          {createAthleteError && (
            <p className="text-red-500 text-sm mb-3">{createAthleteError}</p>
          )}

          {/* [NEW] Loading state */}
          {isLoadingAthletes ? (
            <p className="text-sm text-slate-400 animate-pulse">Loading athletes...</p>
          ) : athletes.length === 0 ? (
            <p className="text-sm text-slate-400">No athletes yet. Add one above.</p>
          ) : (
            // [NEW] Pill-style athlete buttons with selection highlight
            <div className="flex flex-wrap gap-2">
              {athletes.map((athlete) => (
                <button
                  key={athlete.id}
                  type="button"
                  onClick={() => handleSelectAthlete(athlete.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                    selectedAthleteId === athlete.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {athlete.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Exercises ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Exercises</h2>
          {/* [NEW] Pill-style exercise buttons with selection highlight */}
          <div className="flex flex-wrap gap-2">
            {EXERCISES.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => handleSelectExercise(exercise.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                  selectedExerciseId === exercise.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {exercise.name}
              </button>
            ))}
          </div>
          {selectedAthleteId === null && (
            <p className="text-xs text-slate-400 mt-3">← Select an athlete first.</p>
          )}
        </section>

        {/* ── Create log + data (only shown when both selected) ─────────────── */}
        {selectedAthleteId !== null && selectedExerciseId !== null && (
          <>
            {/* Create log form */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                New Training Log —{" "}
                <span className="text-indigo-600">{selectedAthlete?.name}</span>
                {" / "}
                <span className="text-indigo-600">{selectedExercise?.name}</span>
              </h2>
              <form onSubmit={handleCreateLog} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label htmlFor="log-date" className="block text-xs text-slate-500 mb-1">Date</label>
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
                  <label htmlFor="log-weight" className="block text-xs text-slate-500 mb-1">Weight (kg)</label>
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
                  <label htmlFor="log-reps" className="block text-xs text-slate-500 mb-1">Reps</label>
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
                  {isSavingLog ? "Saving..." : "Save Log"}
                </button>
              </form>
              {saveLogError && (
                <p className="text-red-500 text-sm mt-3">{saveLogError}</p>
              )}
            </section>

            {/* [NEW] Loading state for logs */}
            {isLoadingLogs ? (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <p className="text-sm text-slate-400 animate-pulse">Loading logs...</p>
              </section>
            ) : logs.length === 0 ? (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center py-12">
                <p className="text-slate-400 text-sm">No training logs yet for this exercise.</p>
              </section>
            ) : (
              <>
                {/* Performance summary — uses unfiltered logs (always shows latest) */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h2 className="text-base font-semibold text-slate-700 mb-4">Performance Summary</h2>
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
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-xs text-slate-400 mb-1">Est. 1RM</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {lastLog.estimated_rm}
                            <span className="text-sm font-normal text-slate-400 ml-1">kg</span>
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-xs text-slate-400 mb-1">vs Previous</p>
                          {changePct !== null ? (
                            <p className={`text-2xl font-bold ${changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}
                              <span className="text-sm font-normal ml-0.5">%</span>
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400 mt-1">No previous data</p>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-xs text-slate-400 mb-1">Last session</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {lastLog.weight} kg × {lastLog.reps}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{lastLog.date}</p>
                        </div>
                      </div>
                    );
                  })()}
                </section>

                {/* Chart */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="text-base font-semibold text-slate-700">RM Progression</h2>

                    {/* [NEW] Date range select filter */}
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as DateRange)}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white text-slate-600"
                    >
                      {DATE_RANGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* [NEW] Empty state when filter returns no results */}
                  {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                      No data for this range
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

                {/* Log list — also filtered by dateRange */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-slate-700">Training Logs</h2>
                    {/* [NEW] Count indicator */}
                    <span className="text-xs text-slate-400">
                      {filteredLogs.length} of {logs.length} entries
                    </span>
                  </div>

                  {filteredLogs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No data for this range</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {filteredLogs.map((log) => (
                        <li key={log.id}>
                          {/* [NEW] Inline row layout with hover and selected state */}
                          <button
                            type="button"
                            onClick={() => handleSelectLog(log.id)}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-all hover:bg-slate-50 active:scale-[0.99] ${
                              selectedLogId === log.id ? "bg-indigo-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-slate-400 w-20">{log.date}</span>
                              <span className="text-sm text-slate-700 font-medium">
                                {log.weight} kg × {log.reps} reps
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-indigo-600">
                              {log.estimated_rm} kg RM
                            </span>
                          </button>
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
            <p className="text-sm text-slate-400">Could not load log summary.</p>
          </section>
        )}

        {summary && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              Training Summary — {summary.exercise}
            </h2>
            {/* [NEW] Same 3-column stat grid for summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Weight</p>
                <p className="text-xl font-bold text-slate-800">
                  {summary.weight}{" "}
                  <span className="text-sm font-normal text-slate-400">kg</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Reps</p>
                <p className="text-xl font-bold text-slate-800">{summary.reps}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Est. RM</p>
                <p className="text-xl font-bold text-indigo-600">
                  {summary.estimated_rm}{" "}
                  <span className="text-sm font-normal text-slate-400">kg</span>
                </p>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-600 mb-3">Percentage Table</h3>
            {/* [NEW] Styled table with rounded container */}
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Reps</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Weight (kg)</th>
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
    </main>
  );
}