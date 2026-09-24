"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createTeam, getTeams, type Team } from "@/lib/api/teams";
import { parseApiError } from "@/lib/utils";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";

type Props = {
  onToast: (type: "success" | "error", message: string) => void;
};

export function TeamsListPanel({ onToast }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamImageUrl, setTeamImageUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const data = await getTeams();
      setTeams([...data].sort((a, b) => a.name.localeCompare(b.name, "es")));
    } catch {
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!teamName.trim()) return;
    setIsCreating(true);
    try {
      await createTeam({
        name: teamName.trim(),
        image_url: teamImageUrl.trim() || null,
      });
      setTeamName("");
      setTeamImageUrl("");
      setShowAddForm(false);
      await loadTeams();
      onToast("success", "Equipo creado");
    } catch (error) {
      onToast("error", parseApiError(error, "No se pudo crear el equipo."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-base font-semibold text-slate-700">Equipos</h1>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          {showAddForm ? "Cancelar" : "+ Agregar equipo"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"
        >
          <p className="text-sm font-medium text-slate-700">Nuevo equipo</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Nombre del equipo"
              required
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="url"
              value={teamImageUrl}
              onChange={(e) => setTeamImageUrl(e.target.value)}
              placeholder="URL de imagen (opcional)"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreating ? "Creando..." : "Crear equipo"}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 animate-pulse py-8 text-center">Cargando equipos...</p>
      ) : teams.length === 0 ? (
        <EmptyStateCard
          icon={
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          title="Todavía no tenés equipos"
          description="Creá el primero con «+ Agregar equipo»."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => (
            <li key={team.id}>
              <Link
                href={`/equipos/${team.id}`}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 hover:border-indigo-200 hover:bg-indigo-50/40 transition shadow-sm"
              >
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {team.image_url ? (
                    <img
                      src={team.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-indigo-600">
                      {team.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{team.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Ver plantel y Tabla Nacional</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
