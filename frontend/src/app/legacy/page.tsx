"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { AthletesPanel } from "@/components/athletes/AthletesPanel";
import { NationalTableSection } from "@/components/resistencia/national/NationalTableSection";
import { ResistenciaModule } from "@/components/resistencia/ResistenciaModule";
import { StrengthModule } from "@/components/strength/StrengthModule";
import { useToast } from "@/contexts/ToastContext";
import { getAthletes } from "@/lib/api/athletes";
import { login } from "@/lib/api/auth";
import { parseAthlete } from "@/lib/athletes/parseAthlete";
import { getTeams, type Team } from "@/lib/api/teams";
import {
  persistAthleteId,
  persistTeamId,
  readStoredAthleteId,
  readStoredTeamId,
} from "@/lib/legacyDashboardPrefs";
import {
  persistModule,
  readStoredModule,
  getToken,
  setToken as setTokenStorage,
  clearToken,
} from "@/lib/storage";
import type { Athlete, Module } from "@/lib/types";

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

export default function LegacyDashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { pushToast } = useToast();
  const prefsReadyRef = useRef(false);
  const athleteHydratedRef = useRef(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(() => readStoredTeamId());
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [module, setModule] = useState<Module>(() => readStoredModule());
  const [vamHistoryRefreshKey, setVamHistoryRefreshKey] = useState(0);

  const safeAthletes = Array.isArray(athletes) ? athletes : [];
  const selectedAthlete = safeAthletes.find((a) => a.id === selectedAthleteId) ?? null;
  const showNationalTable =
    module === "resistencia" && selectedTeamId !== null && selectedAthleteId === null;

  const refreshAthletes = async () => {
    setAthletes(await loadAthletes(selectedTeamId));
  };

  const refreshTeams = async () => {
    try {
      setTeams(await getTeams());
    } catch {
      setTeams([]);
    }
  };

  useEffect(() => {
    setToken(getToken());
    prefsReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!token) return;
    refreshTeams();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setIsLoadingAthletes(true);
    loadAthletes(selectedTeamId)
      .then(setAthletes)
      .finally(() => setIsLoadingAthletes(false));
  }, [token, selectedTeamId]);

  useEffect(() => {
    if (!token || isLoadingAthletes || athleteHydratedRef.current) return;
    if (athletes.length === 0) {
      if (!isLoadingAthletes) athleteHydratedRef.current = true;
      return;
    }
    const storedId = readStoredAthleteId();
    if (storedId !== null && athletes.some((a) => a.id === storedId)) {
      setSelectedAthleteId(storedId);
    }
    athleteHydratedRef.current = true;
  }, [token, athletes, isLoadingAthletes]);

  useEffect(() => {
    if (!athleteHydratedRef.current || athletes.length === 0) return;
    if (
      selectedAthleteId !== null &&
      !athletes.some((a) => a.id === selectedAthleteId)
    ) {
      setSelectedAthleteId(null);
    }
  }, [athletes, selectedAthleteId]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    persistModule(module);
  }, [module]);

  useEffect(() => {
    if (!prefsReadyRef.current || !athleteHydratedRef.current) return;
    persistAthleteId(selectedAthleteId);
  }, [selectedAthleteId]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    persistTeamId(selectedTeamId);
  }, [selectedTeamId]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const data = await login(loginEmail, loginPassword);
      setTokenStorage(data.access_token);
      setToken(data.access_token);
      setLoginEmail("");
      setLoginPassword("");
    } catch {
      setLoginError("Email o contraseña incorrectos");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
    setAthletes([]);
    setTeams([]);
    setSelectedTeamId(null);
    setSelectedAthleteId(null);
    athleteHydratedRef.current = false;
  };

  const handleSelectAthlete = (id: number) => {
    setSelectedAthleteId(id);
  };

  const handleAthleteDeleted = (athleteId: number) => {
    if (selectedAthleteId === athleteId) {
      setSelectedAthleteId(null);
    }
    void refreshAthletes();
  };

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
            <p className="text-slate-400 text-sm mt-1">Seguimiento de rendimiento deportivo</p>
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
                placeholder="preparador@ejemplo.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
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
              {isLoggingIn ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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
            Cerrar sesión
          </button>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <label htmlFor="team-filter" className="block text-xs text-slate-500 mb-1.5">
            Equipo
          </label>
          <select
            id="team-filter"
            value={selectedTeamId ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              setSelectedTeamId(raw ? Number.parseInt(raw, 10) : null);
              setSelectedAthleteId(null);
            }}
            className="w-full sm:max-w-md border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los equipos</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </section>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModule("strength")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              module === "strength"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            💪 Fuerza
          </button>
          <button
            type="button"
            onClick={() => setModule("resistencia")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              module === "resistencia"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ⚡ Velocidad y Resistencia
          </button>
        </div>

        <AthletesPanel
          athletes={safeAthletes}
          teams={teams}
          isLoadingAthletes={isLoadingAthletes}
          selectedAthleteId={selectedAthleteId}
          selectedTeamId={selectedTeamId}
          defaultTeamIdForCreate={selectedTeamId}
          onSelectAthlete={handleSelectAthlete}
          onRefreshAthletes={refreshAthletes}
          onRefreshTeams={refreshTeams}
          onAthleteDeleted={handleAthleteDeleted}
          onToast={(type, message) => pushToast(type, message)}
        />

        {module === "strength" && (
          <StrengthModule
            athleteId={selectedAthleteId}
            athleteName={selectedAthlete?.name ?? null}
            athleteBodyWeightKg={selectedAthlete?.body_weight_kg ?? null}
            authToken={token}
          />
        )}

        {module === "resistencia" && showNationalTable && selectedTeamId !== null && (
          <NationalTableSection
            refreshKey={vamHistoryRefreshKey}
            teamId={selectedTeamId}
          />
        )}

        {module === "resistencia" && (
          <ResistenciaModule
            athleteId={selectedAthleteId}
            authToken={token}
            historyRefreshKey={vamHistoryRefreshKey}
            onEvaluationSuccess={() => setVamHistoryRefreshKey((prev) => prev + 1)}
          />
        )}
      </div>
    </main>
  );
}
