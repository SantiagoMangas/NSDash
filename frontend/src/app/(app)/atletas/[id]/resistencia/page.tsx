"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ResistenciaModule } from "@/components/resistencia/ResistenciaModule";
import { getToken } from "@/lib/storage";

function parseAthleteId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export default function AthleteResistenciaPage() {
  const params = useParams();
  const athleteId = parseAthleteId(params.id);
  const token = getToken();
  const [vamHistoryRefreshKey, setVamHistoryRefreshKey] = useState(0);

  if (athleteId === null) {
    return null;
  }

  return (
    <ResistenciaModule
      athleteId={athleteId}
      authToken={token}
      historyRefreshKey={vamHistoryRefreshKey}
      onEvaluationSuccess={() => setVamHistoryRefreshKey((prev) => prev + 1)}
    />
  );
}
