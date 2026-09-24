"use client";

import { FormEvent, useMemo, useState } from "react";
import { createAthlete } from "@/lib/api/athletes";
import { createTeam } from "@/lib/api/teams";
import type { Team } from "@/lib/api/teams";
import type { Athlete } from "@/lib/types";
import { athleteInitials, splitAthleteName } from "@/lib/athleteName";
import { parseApiError } from "@/lib/utils";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { AthleteEditModal } from "./AthleteEditModal";
import { AthleteFormFields } from "./AthleteFormFields";
import {
  emptyAthleteForm,
  formToCreatePayload,
  validateAthleteForm,
  type AthleteFormState,
} from "./athleteFormUtils";

type Props = {
  athletes: Athlete[];
  teams: Team[];
  isLoadingAthletes: boolean;
  selectedAthleteId: number | null;
  selectedTeamId: number | null;
  defaultTeamIdForCreate: number | null;
  onSelectAthlete: (id: number) => void;
  onRefreshAthletes: () => Promise<void>;
  onRefreshTeams: () => Promise<void>;
  onAthleteDeleted: (id: number) => void;
  onToast: (type: "success" | "error", message: string) => void;
  /** Si está definido, la lupa navega a la ficha en ruta dedicada (sin accordion). */
  onOpenProfile?: (athleteId: number) => void;
  /** Crear equipos desde /equipos; oculto en /atletas. */
  enableTeamCreate?: boolean;
};

function hoverHint(athlete: Athlete): string {
  const parts: string[] = [];
  if (athlete.goal?.trim()) parts.push(`Objetivo: ${athlete.goal.trim()}`);
  if (athlete.notes?.trim()) parts.push(`Observaciones: ${athlete.notes.trim()}`);
  return parts.join(" · ") || "Sin objetivo ni observaciones cargadas.";
}

export function AthletesPanel({
  athletes,
  teams,
  isLoadingAthletes,
  selectedAthleteId,
  selectedTeamId,
  defaultTeamIdForCreate,
  onSelectAthlete,
  onRefreshAthletes,
  onRefreshTeams,
  onAthleteDeleted,
  onToast,
  onOpenProfile,
  enableTeamCreate = true,
}: Props) {
  const [editAthlete, setEditAthlete] = useState<Athlete | null>(null);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamImageUrl, setTeamImageUrl] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [addAthleteForm, setAddAthleteForm] = useState<AthleteFormState>(() =>
    emptyAthleteForm(defaultTeamIdForCreate),
  );
  const [isCreatingAthlete, setIsCreatingAthlete] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const sortedAthletes = useMemo(
    () => [...athletes].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [athletes],
  );

  const handleCreateTeam = async (event: FormEvent) => {
    event.preventDefault();
    if (!teamName.trim()) return;
    setIsCreatingTeam(true);
    try {
      await createTeam({
        name: teamName.trim(),
        image_url: teamImageUrl.trim() || null,
      });
      setTeamName("");
      setTeamImageUrl("");
      setShowAddTeamForm(false);
      await onRefreshTeams();
      onToast("success", "Equipo creado");
    } catch (error) {
      onToast("error", parseApiError(error, "No se pudo crear el equipo."));
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleCreateAthlete = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateAthleteForm(addAthleteForm, true);
    if (validationError) {
      setCreateError(validationError);
      return;
    }
    setIsCreatingAthlete(true);
    setCreateError(null);
    try {
      const created = await createAthlete(formToCreatePayload(addAthleteForm));
      setAddAthleteForm(emptyAthleteForm(defaultTeamIdForCreate));
      setShowAddAthlete(false);
      await onRefreshAthletes();
      if (created && typeof created === "object" && typeof (created as Athlete).id === "number") {
        const id = (created as Athlete).id;
        if (onOpenProfile) {
          onOpenProfile(id);
        } else {
          onSelectAthlete(id);
        }
      }
      onToast("success", "Atleta creado");
    } catch (error) {
      const msg = parseApiError(error, "No se pudo crear el atleta.");
      setCreateError(msg);
      onToast("error", msg);
    } finally {
      setIsCreatingAthlete(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-slate-700">Atletas</h2>
        <div className="flex flex-wrap gap-2">
          {enableTeamCreate ? (
            <button
              type="button"
              onClick={() => setShowAddTeamForm((v) => !v)}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              {showAddTeamForm ? "Cancelar equipo" : "+ Agregar equipo"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setShowAddAthlete((v) => !v);
              setAddAthleteForm(emptyAthleteForm(defaultTeamIdForCreate));
              setCreateError(null);
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            {showAddAthlete ? "Cancelar atleta" : "+ Agregar atleta"}
          </button>
        </div>
      </div>

      {enableTeamCreate && showAddTeamForm && (
        <form onSubmit={handleCreateTeam} className="mb-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
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
            disabled={isCreatingTeam}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreatingTeam ? "Creando..." : "Crear equipo"}
          </button>
        </form>
      )}

      {showAddAthlete && (
        <form
          onSubmit={handleCreateAthlete}
          className="mb-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4"
        >
          <p className="text-sm font-medium text-slate-700">Nuevo atleta</p>
          <AthleteFormFields
            form={addAthleteForm}
            onChange={setAddAthleteForm}
            teams={teams}
            requireEmail
            idPrefix="create-athlete"
          />
          {createError && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{createError}</p>
          )}
          <button
            type="submit"
            disabled={isCreatingAthlete}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreatingAthlete ? "Creando..." : "Crear atleta"}
          </button>
        </form>
      )}

      {isLoadingAthletes ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center shadow-sm">
          <p className="text-sm text-slate-500 animate-pulse">Cargando atletas...</p>
        </div>
      ) : sortedAthletes.length === 0 ? (
        <EmptyStateCard
          icon={
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
              <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
            </svg>
          }
          title="Todavía no tenés atletas cargados"
          description="Agregá tu primer atleta o cambiá el filtro de equipo."
        />
      ) : (
        <ul className="space-y-1">
          {sortedAthletes.map((athlete) => {
            const { firstName, lastName } = splitAthleteName(athlete.name);
            const isSelected = selectedAthleteId === athlete.id;
            const rowClickable = onOpenProfile === undefined;

            return (
              <li key={athlete.id}>
                <div
                  className={`group flex items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                    rowClickable ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50 shadow-sm"
                      : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}
                  title={hoverHint(athlete)}
                  onClick={rowClickable ? () => onSelectAthlete(athlete.id) : undefined}
                  onKeyDown={
                    rowClickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectAthlete(athlete.id);
                          }
                        }
                      : undefined
                  }
                  role={rowClickable ? "button" : undefined}
                  tabIndex={rowClickable ? 0 : undefined}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-600">
                    {athlete.photo_url ? (
                      <img
                        src={athlete.photo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      athleteInitials(firstName, lastName)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      <span>{firstName}</span>
                      {lastName ? <span className="text-slate-600"> {lastName}</span> : null}
                    </p>
                    <p className="text-xs text-slate-400 truncate hidden group-hover:block">
                      {hoverHint(athlete)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      aria-label="Ver ficha completa"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenProfile) {
                          onOpenProfile(athlete.id);
                        } else {
                          onSelectAthlete(athlete.id);
                        }
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-4-4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Editar atleta"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditAthlete(athlete);
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AthleteEditModal
        open={editAthlete !== null}
        athlete={editAthlete}
        teams={teams}
        onClose={() => setEditAthlete(null)}
        onSaved={async () => {
          await onRefreshAthletes();
          onToast("success", "Ficha del atleta actualizada");
          setEditAthlete(null);
        }}
      />
    </section>
  );
}
