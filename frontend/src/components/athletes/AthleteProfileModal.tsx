"use client";

import { FormEvent, useEffect, useState } from "react";
import { updateAthlete } from "@/lib/api/athletes";
import type { Athlete } from "@/lib/types";
import { parseApiError } from "@/lib/utils";

type Props = {
  open: boolean;
  athlete: Athlete | null;
  onClose: () => void;
  onSaved: () => void;
};

function toInputValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function validateForm(
  name: string,
  heightCm: string,
  bodyWeightKg: string,
  sport: string,
  goal: string,
): string | null {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return "El nombre no puede estar vacío.";
  }
  if (sport.length > 100) {
    return "El deporte no puede superar los 100 caracteres.";
  }
  if (goal.length > 500) {
    return "El objetivo no puede superar los 500 caracteres.";
  }

  if (heightCm.trim() !== "") {
    const height = Number(heightCm.replace(",", "."));
    if (!Number.isFinite(height)) {
      return "Ingresá una altura válida en centímetros.";
    }
    if (height <= 0) {
      return "La altura debe ser un número mayor a 0.";
    }
    if (height < 100 || height > 250) {
      return "La altura debe estar entre 100 y 250 cm.";
    }
  }

  if (bodyWeightKg.trim() !== "") {
    const weight = Number(bodyWeightKg.replace(",", "."));
    if (!Number.isFinite(weight)) {
      return "Ingresá un peso corporal válido en kilogramos.";
    }
    if (weight <= 0) {
      return "El peso corporal debe ser un número mayor a 0.";
    }
    if (weight < 30 || weight > 300) {
      return "El peso corporal debe estar entre 30 y 300 kg.";
    }
  }

  return null;
}

export function AthleteProfileModal({ open, athlete, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [bodyWeightKg, setBodyWeightKg] = useState("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !athlete) return;
    setName(athlete.name);
    setSport(toInputValue(athlete.sport));
    setHeightCm(toInputValue(athlete.height_cm));
    setBodyWeightKg(toInputValue(athlete.body_weight_kg));
    setGoal(toInputValue(athlete.goal));
    setNotes(toInputValue(athlete.notes));
    setError(null);
    setIsSaving(false);
  }, [open, athlete]);

  if (!open || !athlete) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateForm(name, heightCm, bodyWeightKg, sport, goal);
    if (validationError) {
      setError(validationError);
      return;
    }

    const parsedHeight = heightCm.trim()
      ? Number(heightCm.replace(",", "."))
      : null;
    const parsedWeight = bodyWeightKg.trim()
      ? Number(bodyWeightKg.replace(",", "."))
      : null;

    setIsSaving(true);
    try {
      await updateAthlete(athlete.id, {
        name: name.trim(),
        sport: sport.trim() || null,
        height_cm: parsedHeight,
        body_weight_kg: parsedWeight,
        goal: goal.trim() || null,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        parseApiError(err, "No se pudo guardar la ficha. Intentá de nuevo."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="athlete-profile-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 id="athlete-profile-title" className="text-base font-semibold text-slate-800">
            Editar ficha del atleta
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Completá o actualizá la información del atleta seleccionado.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs text-slate-500 mb-1">
              Nombre
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label htmlFor="profile-sport" className="block text-xs text-slate-500 mb-1">
              Deporte
            </label>
            <input
              id="profile-sport"
              type="text"
              value={sport}
              onChange={(event) => setSport(event.target.value)}
              maxLength={100}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-height" className="block text-xs text-slate-500 mb-1">
                Altura (cm)
              </label>
              <input
                id="profile-height"
                type="number"
                min="0"
                step="any"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <div>
              <label htmlFor="profile-weight" className="block text-xs text-slate-500 mb-1">
                Peso corporal (kg)
              </label>
              <input
                id="profile-weight"
                type="number"
                min="0"
                step="any"
                value={bodyWeightKg}
                onChange={(event) => setBodyWeightKg(event.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-goal" className="block text-xs text-slate-500 mb-1">
              Objetivo
            </label>
            <textarea
              id="profile-goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              maxLength={500}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label htmlFor="profile-notes" className="block text-xs text-slate-500 mb-1">
              Observaciones
            </label>
            <textarea
              id="profile-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
