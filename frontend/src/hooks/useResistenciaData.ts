"use client";

import { useEffect, useState } from "react";
import { getVelocityDashboard } from "@/lib/api/speed";
import { getVamProgress } from "@/lib/api/vam";
import type { VelocityDashboard, VamProgress } from "@/lib/types";

type ResistenciaDataState = {
  dashboard: VelocityDashboard | null;
  progress: VamProgress | null;
  loading: boolean;
  error: string | null;
};

export function useResistenciaData(
  athleteId: number | null,
  refreshKey: number,
): ResistenciaDataState {
  const [dashboard, setDashboard] = useState<VelocityDashboard | null>(null);
  const [progress, setProgress] = useState<VamProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (athleteId === null) {
      setDashboard(null);
      setProgress(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      if (athleteId === null) return;
      const id = athleteId;

      setLoading(true);
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

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [athleteId, refreshKey]);

  return { dashboard, progress, loading, error };
}
