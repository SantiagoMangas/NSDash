"use client";

import { useEffect, useMemo, useState } from "react";
import { getAthletes, updateAthlete } from "@/lib/api/athletes";
import { parseAthlete } from "@/lib/athletes/parseAthlete";
import type { Athlete } from "@/lib/types";
import { parseApiError } from "@/lib/utils";

type Props = {
  teamId: number;
  teamName: string;
  onAssigned: () => void;
  onToast: (type: "success" | "error", message: string) => void;
};

export function AssignAthletesToTeam({ teamId, teamName, onAssigned, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAthletes
      .filter((a) => a.team_id !== teamId)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [allAthletes, teamId, query]);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    getAthletes()
      .then((data) =>
        Array.isArray(data)
          ? data.map(parseAthlete).filter((a): a is Athlete => a !== null)
          : [],
      )
      .then(setAllAthletes)
      .catch(() => setAllAthletes([]))
      .finally(() => setIsLoading(false));
  }, [open]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selected.size === 0) return;
    setIsSaving(true);
    try {
      for (const id of selected) {
        await updateAthlete(id, { team_id: teamId });
      }
      onToast("success", `${selected.size} atleta(s) agregados a ${teamName}`);
      setSelected(new Set());
      setOpen(false);
      onAssigned();
    } catch (err) {
      onToast("error", parseApiError(err, "No se pudieron asignar los atletas."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Plantel</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Agregá atletas que ya existen en el sistema o creá uno nuevo abajo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
        >
          {open ? "Cerrar" : "+ Agregar atletas al equipo"}
        </button>
      </div>

      {open && (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atleta..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          {isLoading ? (
            <p className="text-sm text-slate-500 animate-pulse">Cargando atletas...</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-slate-500">No hay atletas fuera de este equipo para asignar.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-slate-100 bg-white p-2">
              {candidates.map((a) => (
                <li key={a.id}>
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggle(a.id)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-slate-800">{a.name}</span>
                    {a.team_id != null && (
                      <span className="text-xs text-slate-400">(otro equipo)</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={selected.size === 0 || isSaving}
            onClick={handleAssign}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? "Asignando..." : `Asignar ${selected.size > 0 ? selected.size : ""} al plantel`}
          </button>
        </div>
      )}
    </section>
  );
}
