"use client";

import { FormEvent, useEffect, useState } from "react";
import { updateAthlete } from "@/lib/api/athletes";
import type { Athlete } from "@/lib/types";
import type { Team } from "@/lib/api/teams";
import { parseApiError } from "@/lib/utils";
import { AthleteFormFields } from "./AthleteFormFields";
import {
  athleteToFormState,
  formToUpdatePayload,
  validateAthleteForm,
  type AthleteFormState,
} from "./athleteFormUtils";

type Props = {
  open: boolean;
  athlete: Athlete | null;
  teams: Team[];
  onClose: () => void;
  onSaved: () => void;
};

export function AthleteEditModal({ open, athlete, teams, onClose, onSaved }: Props) {
  const [form, setForm] = useState<AthleteFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !athlete) return;
    setForm(athleteToFormState(athlete));
    setError(null);
    setIsSaving(false);
  }, [open, athlete]);

  if (!open || !athlete || !form) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateAthleteForm(form, false);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateAthlete(athlete.id, formToUpdatePayload(form));
      onSaved();
      onClose();
    } catch (err) {
      setError(parseApiError(err, "No se pudo guardar la ficha. Intentá de nuevo."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Editar atleta</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <AthleteFormFields form={form} onChange={setForm} teams={teams} idPrefix="edit-athlete" />
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
