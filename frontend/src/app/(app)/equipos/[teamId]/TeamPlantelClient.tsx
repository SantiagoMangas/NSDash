"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AthletesPanel } from "@/components/athletes/AthletesPanel";
import { NationalTableSection } from "@/components/resistencia/national/NationalTableSection";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useToast } from "@/contexts/ToastContext";
import { getAthletes } from "@/lib/api/athletes";
import { getTeams, type Team } from "@/lib/api/teams";
import { parseAthlete } from "@/lib/athletes/parseAthlete";
import { readStoredModule } from "@/lib/storage";
import type { Athlete } from "@/lib/types";

async function loadAthletes(teamId: number): Promise<Athlete[]> {
  try {
    const data = await getAthletes(teamId);
    return Array.isArray(data)
      ? data.map(parseAthlete).filter((item): item is Athlete => item !== null)
      : [];
  } catch {
    return [];
  }
}

type Props = {
  teamId: number;
};

export function TeamPlantelClient({ teamId }: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const refreshAthletes = useCallback(async () => {
    setIsLoadingAthletes(true);
    try {
      setAthletes(await loadAthletes(teamId));
      setTableRefreshKey((k) => k + 1);
    } finally {
      setIsLoadingAthletes(false);
    }
  }, [teamId]);

  useEffect(() => {
    setIsLoadingTeam(true);
    getTeams()
      .then((list) => {
        setTeams(list);
        const found = list.find((t) => t.id === teamId) ?? null;
        setTeam(found);
      })
      .catch(() => {
        setTeams([]);
        setTeam(null);
      })
      .finally(() => setIsLoadingTeam(false));
  }, [teamId]);

  useEffect(() => {
    void refreshAthletes();
  }, [refreshAthletes]);

  const openProfile = (athleteId: number) => {
    const module = readStoredModule();
    const segment = module === "resistencia" ? "resistencia" : "fuerza";
    router.push(`/atletas/${athleteId}/${segment}`);
  };

  if (isLoadingTeam) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <LoadingCard message="Cargando equipo..." />
      </main>
    );
  }

  if (!team) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <p className="text-sm text-red-600">Equipo no encontrado.</p>
        <Link href="/equipos" className="text-sm text-indigo-600 hover:underline">
          ← Volver a equipos
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {team.image_url ? (
            <img src={team.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-indigo-600">
              {team.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 truncate">{team.name}</h1>
          <p className="text-sm text-slate-500">Plantel y Tabla Nacional</p>
        </div>
        <Link
          href="/equipos"
          className="text-sm font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          ← Equipos
        </Link>
      </div>

      <AthletesPanel
        athletes={athletes}
        teams={teams}
        isLoadingAthletes={isLoadingAthletes}
        selectedAthleteId={null}
        selectedTeamId={teamId}
        defaultTeamIdForCreate={teamId}
        onSelectAthlete={() => {}}
        onRefreshAthletes={refreshAthletes}
        onRefreshTeams={async () => {
          setTeams(await getTeams());
        }}
        onAthleteDeleted={() => void refreshAthletes()}
        onToast={(type, message) => pushToast(type, message)}
        onOpenProfile={openProfile}
        enableTeamCreate={false}
      />

      <NationalTableSection refreshKey={tableRefreshKey} teamId={teamId} />
    </main>
  );
}
