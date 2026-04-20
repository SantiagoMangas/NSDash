"use client";

import { useEffect, useState } from "react";

type Athlete = {
  id: number;
  name: string;
};

const BASE_URL = "http://127.0.0.1:8000";

const EXERCISES = [
  { id: 1, name: "Back Squat" },
  { id: 2, name: "Deadlift" },
  { id: 3, name: "Bench Press" },
  { id: 4, name: "Overhead Press" },
  { id: 5, name: "Hip Thrust" },
];

type RawLog = {
  id: number;
  athlete_id: number;
  exercise_id: number;
  date: string;
  weight: number;
  reps: number;
  estimated_rm: number;
};

type PercentageRow = {
  reps: number;
  weight: number;
};

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
};

async function getAthletes(): Promise<Athlete[]> {
  try {
    const response = await fetch(`${BASE_URL}/athletes`, {
      cache: "no-store",
    });

    console.log("Status:", response.status);

    const text = await response.text();
    console.log("Raw response:", text);

    const data = JSON.parse(text);
    console.log("Parsed data:", data);

    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

async function getAllLogs(): Promise<RawLog[]> {
  try {
    const response = await fetch(`${BASE_URL}/logs`);
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}

async function getProgress(
  athleteId: number,
  exerciseId: number,
): Promise<ProgressResponse | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/athletes/${athleteId}/progress/${exerciseId}`,
    );
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

async function getSummary(logId: number): Promise<LogSummary | null> {
  try {
    const response = await fetch(`${BASE_URL}/logs/${logId}/summary`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

export default function Home() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [logs, setLogs] = useState<ProgressListItem[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const selectedAthlete = athletes.find((athlete) => athlete.id === selectedAthleteId);
  const selectedExercise = EXERCISES.find(
    (exercise) => exercise.id === selectedExerciseId,
  );

  useEffect(() => {
    const loadAthletes = async () => {
      const data = await getAthletes();
      console.log("Athletes:", data);
      setAthletes(data);
    };
    loadAthletes();
  }, []);

  useEffect(() => {
    const loadLogs = async () => {
      if (selectedAthleteId === null || selectedExerciseId === null) {
        setLogs([]);
        return;
      }

      const [progress, allLogs] = await Promise.all([
        getProgress(selectedAthleteId, selectedExerciseId),
        getAllLogs(),
      ]);

      if (!progress) {
        setLogs([]);
        return;
      }

      const candidateLogs = allLogs
        .filter(
          (log) =>
            log.athlete_id === selectedAthleteId &&
            log.exercise_id === selectedExerciseId,
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      const usedIds = new Set<number>();
      const mergedLogs: ProgressListItem[] = progress.history
        .map((item) => {
          const match = candidateLogs.find(
            (log) =>
              !usedIds.has(log.id) &&
              log.date === item.date &&
              log.weight === item.weight &&
              log.reps === item.reps,
          );
          if (!match) {
            return null;
          }
          usedIds.add(match.id);
          return {
            id: match.id,
            date: item.date,
            weight: item.weight,
            reps: item.reps,
          };
        })
        .filter((log): log is ProgressListItem => log !== null);

      setLogs(mergedLogs);
    };

    loadLogs();
  }, [selectedAthleteId, selectedExerciseId]);

  const handleSelectAthlete = (athleteId: number) => {
    console.log("Selected athlete:", athleteId);
    setSelectedAthleteId(athleteId);
    setSelectedLogId(null);
    setSummary(null);
  };

  const handleSelectExercise = (exerciseId: number) => {
    console.log("Selected exercise:", exerciseId);
    setSelectedExerciseId(exerciseId);
    setSelectedLogId(null);
    setSummary(null);
  };

  const handleSelectLog = async (logId: number) => {
    setSelectedLogId(logId);
    const data = await getSummary(logId);
    setSummary(data);
  };


  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Athletes</h1>

      {athletes.length === 0 && <p className="mt-4">No athletes found</p>}
      {athletes.map((athlete) => (
        <div
          key={athlete.id}
          onClick={() => handleSelectAthlete(athlete.id)}
          className="mt-2 cursor-pointer border px-3 py-2"
        >
          id: {athlete.id} | name: {athlete.name}
          {selectedAthleteId === athlete.id ? " (selected)" : ""}
        </div>
      ))}
      <p className="mt-3">
        Selected athlete: {selectedAthlete ? selectedAthlete.name : "None"}
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Exercises</h2>
      <ul className="mt-4 space-y-2">
        {EXERCISES.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => handleSelectExercise(exercise.id)}
              className="w-full border px-3 py-2 text-left"
            >
              id: {exercise.id} | name: {exercise.name}
              {selectedExerciseId === exercise.id ? " (selected)" : ""}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3">
        Selected exercise: {selectedExercise ? selectedExercise.name : "None"}
      </p>

      {selectedAthleteId !== null && selectedExerciseId !== null && (
        <h2 className="mt-8 text-2xl font-semibold">Logs</h2>
      )}

      {selectedAthleteId === null && (
        <p className="mt-6">Select an athlete to continue.</p>
      )}

      {selectedAthleteId !== null && selectedExerciseId === null && (
        <p className="mt-6">Select an exercise to view logs.</p>
      )}

      {selectedAthleteId !== null && selectedExerciseId !== null && logs.length === 0 && (
        <p className="mt-6">No logs yet.</p>
      )}

      {selectedAthleteId !== null && selectedExerciseId !== null && logs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {logs.map((log) => (
            <li key={log.id}>
              <button
                type="button"
                onClick={() => handleSelectLog(log.id)}
                className="w-full border px-3 py-2 text-left"
              >
                date: {log.date} | weight: {log.weight} | reps: {log.reps}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedLogId !== null && !summary && (
        <p className="mt-6">
          No se pudo cargar el resumen del log seleccionado.
        </p>
      )}

      {summary && (
        <>
          <h2 className="mt-8 text-2xl font-semibold">Training Summary</h2>
          <p className="mt-4">Exercise: {summary.exercise}</p>
          <p>Weight: {summary.weight}</p>
          <p>Reps: {summary.reps}</p>
          <p>Estimated RM: {summary.estimated_rm}</p>

          <h3 className="mt-6 text-xl font-semibold">Percentage Table</h3>
          <table className="mt-2 border-collapse">
            <thead>
              <tr>
                <th className="border px-3 py-1 text-left">Reps</th>
                <th className="border px-3 py-1 text-left">Weight</th>
              </tr>
            </thead>
            <tbody>
              {summary.percentages.map((row) => (
                <tr key={row.reps}>
                  <td className="border px-3 py-1">{row.reps}</td>
                  <td className="border px-3 py-1">{row.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
