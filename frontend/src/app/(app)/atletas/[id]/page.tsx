"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AthleteProfileHeader } from "@/components/athletes/AthleteProfileHeader";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useToast } from "@/contexts/ToastContext";
import { getAthlete } from "@/lib/api/athletes";
import { getTeams, type Team } from "@/lib/api/teams";
import { parseAthlete } from "@/lib/athletes/parseAthlete";
import type { Athlete } from "@/lib/types";

export default function AthleteFichaPage() {
  const params = useParams();
  const router = useRouter();
  const { pushToast } = useToast();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const athleteId = raw ? Number.parseInt(raw, 10) : NaN;

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!Number.isFinite(athleteId)) return;
    setLoading(true);
    try {
      setAthlete(parseAthlete(await getAthlete(athleteId)));
    } catch {
      setAthlete(null);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    void load();
    getTeams().then(setTeams).catch(() => setTeams([]));
  }, [load]);

  if (!Number.isFinite(athleteId)) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-red-600">Atleta no válido</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <LoadingCard message="Cargando ficha..." />
      </main>
    );
  }

  if (!athlete) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-red-600">Atleta no encontrado</p>
        <Link href="/atletas" className="text-sm text-indigo-600 mt-2 inline-block">← Atletas</Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link href="/atletas" className="text-sm text-slate-600 hover:text-indigo-600">← Volver a atletas</Link>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/fuerza?atleta=${athleteId}`}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700"
        >
          💪 Ir a Fuerza
        </Link>
        <Link
          href={`/resistencia?atleta=${athleteId}`}
          className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          ⚡ Ir a Resistencia
        </Link>
      </div>

      <AthleteProfileHeader
        athlete={athlete}
        teams={teams}
        defaultCollapsed={false}
        onAthleteUpdated={() => void load()}
        onAthleteDeleted={() => router.push("/atletas")}
        onToast={(type, message) => pushToast(type, message)}
      />
    </main>
  );
}
