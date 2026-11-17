"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVelocityDashboard } from "@/lib/api/speed";
import { getVamProgress } from "@/lib/api/vam";
import type { VelocityDashboard, VamProgress } from "@/lib/types";

type ResistenciaDataState = {
  dashboard: VelocityDashboard | null;
  progress: VamProgress | null;
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
};

export function useResistenciaData(
  athleteId: number | null,
  refreshKey: number,
): ResistenciaDataState {
  const [dashboard, setDashboard] = useState<VelocityDashboard | null>(null);
  const [progress, setProgress] = useState<VamProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Evita pantalla de carga completa al refrescar historiales (p. ej. tras guardar Tempo Run). */
  const loadedAthleteIdRef = useRef<number | null>(null);

  const refreshDashboard = useCallback(async () => {
    if (athleteId === null) return;

    try {
      const nextDashboard = (await getVelocityDashboard(athleteId)) as VelocityDashboard;
      setDashboard(nextDashboard);
    } catch {
      /* keep current dashboard on refresh failure */
    }
  }, [athleteId]);

  useEffect(() => {
    if (athleteId === null) {
      loadedAthleteIdRef.current = null;
      setDashboard(null);
      setProgress(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const blockingLoad = loadedAthleteIdRef.current !== athleteId;

    async function load() {
      if (athleteId === null) return;
      const id = athleteId;

      if (blockingLoad) {
        setLoading(true);
      }
      setError(null);

      const [dashboardResult, progressResult] = await Promise.allSettled([
        getVelocityDashboard(id),
        getVamProgress(id),
      ]);

      if (cancelled) return;

      if (dashboardResult.status === "fulfilled" && dashboardResult.value) {
        setDashboard(dashboardResult.value as VelocityDashboard);
      } else {
        setDashboard(null);
      }

      if (progressResult.status === "fulfilled" && progressResult.value) {
        setProgress(progressResult.value as VamProgress);
      } else {
        setProgress(null);
      }

      const dashboardFailed = dashboardResult.status === "rejected";
      const progressFailed = progressResult.status === "rejected";

      if (dashboardFailed && progressFailed) {
        setError("No hay evaluaciones de resistencia registradas para este atleta.");
      } else {
        setError(null);
      }

      loadedAthleteIdRef.current = id;
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [athleteId, refreshKey]);

  return { dashboard, progress, loading, error, refreshDashboard };
}
