"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AthletesPanel } from "@/components/athletes/AthletesPanel";
import { useToast } from "@/contexts/ToastContext";
import { getAthletes } from "@/lib/api/athletes";
import { getTeams, type Team } from "@/lib/api/teams";
import { parseAthlete } from "@/lib/athletes/parseAthlete";
import { readStoredModule } from "@/lib/storage";
import type { Athlete } from "@/lib/types";

async function loadAthletes(teamId: number | null): Promise<Athlete[]> {
  try {
    const data = await getAthletes(teamId);
    return Array.isArray(data)
      ? data.map(parseAthlete).filter((item): item is Athlete => item !== null)
      : [];
  } catch {
    return [];
  }
}

function parseTeamIdFromSearch(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function AtletasListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const teamIdFromUrl = parseTeamIdFromSearch(searchParams.get("team_id"));
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(teamIdFromUrl);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true);

  useEffect(() => {
    setSelectedTeamId(teamIdFromUrl);
  }, [teamIdFromUrl]);

  const refreshTeams = useCallback(async () => {
    try {
      setTeams(await getTeams());
    } catch {
      setTeams([]);
    }
  }, []);

  const refreshAthletes = useCallback(async () => {
    setAthletes(await loadAthletes(selectedTeamId));
  }, [selectedTeamId]);

  useEffect(() => {
    void refreshTeams();
  }, [refreshTeams]);

  useEffect(() => {
    setIsLoadingAthletes(true);
    loadAthletes(selectedTeamId)
      .then(setAthletes)
      .finally(() => setIsLoadingAthletes(false));
  }, [selectedTeamId]);

  const setTeamFilter = (teamId: number | null) => {
    setSelectedTeamId(teamId);
    const params = new URLSearchParams(searchParams.toString());
    if (teamId === null) {
      params.delete("team_id");
    } else {
      params.set("team_id", String(teamId));
    }
    const query = params.toString();
    router.replace(query ? `/atletas?${query}` : "/atletas");
  };

  const openProfile = (athleteId: number) => {
    const module = readStoredModule();
    const segment = module === "resistencia" ? "resistencia" : "fuerza";
    router.push(`/atletas/${athleteId}/${segment}`);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <label htmlFor="team-filter" className="block text-xs text-slate-500 mb-1.5">
          Equipo
        </label>
        <select
          id="team-filter"
          value={selectedTeamId ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            setTeamFilter(raw ? Number.parseInt(raw, 10) : null);
          }}
          className="w-full sm:max-w-md border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los equipos</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </section>

      <AthletesPanel
        athletes={athletes}
        teams={teams}
        isLoadingAthletes={isLoadingAthletes}
        selectedAthleteId={null}
        selectedTeamId={selectedTeamId}
        defaultTeamIdForCreate={selectedTeamId}
        onSelectAthlete={() => {}}
        onRefreshAthletes={refreshAthletes}
        onRefreshTeams={refreshTeams}
        onAthleteDeleted={() => void refreshAthletes()}
        onToast={(type, message) => pushToast(type, message)}
        onOpenProfile={(id) => {
          openProfile(id);
        }}
        enableTeamCreate={false}
      />
    </main>
  );
}
