"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AthleteProfileHeader } from "@/components/athletes/AthleteProfileHeader";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useToast } from "@/contexts/ToastContext";
import { getAthlete, getAthletes } from "@/lib/api/athletes";
import { getTeams, type Team } from "@/lib/api/teams";
import { parseAthlete } from "@/lib/athletes/parseAthlete";
import { getToken } from "@/lib/storage";
import type { Athlete } from "@/lib/types";

type Props = {
  moduleTitle: string;
  moduleEmoji: string;
  moduleDescription: string;
  children: (ctx: {
    athleteId: number | null;
    athleteName: string | null;
    authToken: string | null;
  }) => React.ReactNode;
};

function parseAtletaParam(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function ModuleAthleteShell({
  moduleTitle,
  moduleEmoji,
  moduleDescription,
  children,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const athleteIdFromUrl = parseAtletaParam(searchParams.get("atleta"));
  const [athleteId, setAthleteId] = useState<number | null>(athleteIdFromUrl);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loadingAthlete, setLoadingAthlete] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    setAuthToken(getToken());
  }, []);

  useEffect(() => {
    setAthleteId(athleteIdFromUrl);
  }, [athleteIdFromUrl]);

  useEffect(() => {
    getAthletes()
      .then((data) =>
        Array.isArray(data)
          ? data.map(parseAthlete).filter((a): a is Athlete => a !== null)
          : [],
      )
      .then((list) => setAthletes([...list].sort((a, b) => a.name.localeCompare(b.name, "es"))))
      .catch(() => setAthletes([]));
    getTeams().then(setTeams).catch(() => setTeams([]));
  }, []);

  const setAtletaInUrl = useCallback(
    (id: number | null) => {
      setAthleteId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id === null) params.delete("atleta");
      else params.set("atleta", String(id));
      const q = params.toString();
      const path = window.location.pathname;
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (athleteId === null) {
      setAthlete(null);
      return;
    }
    setLoadingAthlete(true);
    getAthlete(athleteId)
      .then((data) => setAthlete(parseAthlete(data)))
      .catch(() => setAthlete(null))
      .finally(() => setLoadingAthlete(false));
  }, [athleteId]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shadow-indigo-200">
            {moduleEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{moduleTitle}</h1>
            <p className="text-sm text-slate-500 mt-1">{moduleDescription}</p>
          </div>
        </div>
        <div className="mt-5">
          <label htmlFor="module-athlete-select" className="block text-xs font-medium text-slate-500 mb-1.5">
            Atleta (opcional)
          </label>
          <select
            id="module-athlete-select"
            value={athleteId ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              setAtletaInUrl(raw ? Number.parseInt(raw, 10) : null);
            }}
            className="w-full sm:max-w-md border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="">Sin atleta — explorar módulo</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </header>

      {athleteId !== null && loadingAthlete && <LoadingCard message="Cargando ficha..." />}

      {athlete && (
        <AthleteProfileHeader
          athlete={athlete}
          teams={teams}
          defaultCollapsed
          onAthleteUpdated={() => {
            void getAthlete(athlete.id).then((data) => setAthlete(parseAthlete(data)));
          }}
          onAthleteDeleted={() => setAtletaInUrl(null)}
          onToast={(type, message) => pushToast(type, message)}
        />
      )}

      {children({
        athleteId,
        athleteName: athlete?.name ?? null,
        authToken,
      })}
    </main>
  );
}
