"use client";

import { useParams } from "next/navigation";
import { StrengthModule } from "@/components/strength/StrengthModule";
import { useAthleteDetail } from "@/contexts/AthleteDetailContext";
import { getToken } from "@/lib/storage";

function parseAthleteId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export default function AthleteFuerzaPage() {
  const params = useParams();
  const athleteId = parseAthleteId(params.id);
  const token = getToken();
  const athlete = useAthleteDetail();

  if (athleteId === null) {
    return null;
  }

  return (
    <StrengthModule
      athleteId={athleteId}
      athleteName={athlete?.name ?? null}
      authToken={token}
    />
  );
}
