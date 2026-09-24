"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteAthlete } from "@/lib/api/athletes";
import type { Athlete } from "@/lib/types";
import type { Team } from "@/lib/api/teams";
import { athleteInitials, splitAthleteName } from "@/lib/athleteName";
import { parseApiError } from "@/lib/utils";
import { AthleteEditModal } from "./AthleteEditModal";

type Props = {
  athlete: Athlete;
  teams: Team[];
  onAthleteUpdated: () => void;
  onAthleteDeleted: () => void;
  onToast: (type: "success" | "error", message: string) => void;
};

function display(value: string | number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

export function AthleteProfileHeader({
  athlete,
  teams,
  onAthleteUpdated,
  onAthleteDeleted,
  onToast,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { firstName, lastName } = splitAthleteName(athlete.name);

  const handleDelete = async () => {
    if (isDeleting) return;
    if (
      !window.confirm(
        `¿Eliminar a ${athlete.name}? Se borrarán también sus registros de fuerza, velocidad y VAM.`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAthlete(athlete.id);
      onToast("success", "Atleta eliminado");
      onAthleteDeleted();
    } catch (err) {
      onToast("error", parseApiError(err, "No se pudo eliminar el atleta."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-600">
            {athlete.photo_url ? (
              <img src={athlete.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              athleteInitials(firstName, lastName)
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 truncate">
              {firstName}
              {lastName ? <span className="text-slate-600"> {lastName}</span> : null}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {display(athlete.sport)}
              {athlete.position_name ? ` · ${athlete.position_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/atletas"
            className="text-sm font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            ← Volver a la lista
          </Link>
          <button
            type="button"
            aria-label="Editar ficha del atleta"
            onClick={() => setEditOpen(true)}
            className="p-2.5 rounded-lg text-slate-500 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt className="text-xs text-slate-400 uppercase tracking-wide">Edad</dt>
          <dd className="mt-1 font-medium text-slate-800">{display(athlete.age, " años")}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400 uppercase tracking-wide">Altura</dt>
          <dd className="mt-1 font-medium text-slate-800">{display(athlete.height_cm, " cm")}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400 uppercase tracking-wide">Peso</dt>
          <dd className="mt-1 font-medium text-slate-800">{display(athlete.body_weight_kg, " kg")}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-xs text-slate-400 uppercase tracking-wide">Objetivo</dt>
          <dd className="mt-1 text-slate-700 whitespace-pre-wrap">{display(athlete.goal)}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-xs text-slate-400 uppercase tracking-wide">Observaciones</dt>
          <dd className="mt-1 text-slate-700 whitespace-pre-wrap">{display(athlete.notes)}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-xs text-slate-400 uppercase tracking-wide">Lesiones</dt>
          <dd className="mt-1 text-slate-700 whitespace-pre-wrap">{display(athlete.injuries)}</dd>
        </div>
      </dl>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Eliminando..." : "Eliminar atleta"}
        </button>
      </div>

      <AthleteEditModal
        open={editOpen}
        athlete={athlete}
        teams={teams}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          onAthleteUpdated();
          onToast("success", "Ficha del atleta actualizada");
          setEditOpen(false);
        }}
      />
    </section>
  );
}
