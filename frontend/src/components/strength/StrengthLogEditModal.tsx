"use client";

import { FormEvent, useEffect, useState } from "react";
import { updateTrainingLog } from "@/lib/api/strength";
import { parseApiError } from "@/lib/utils";

export type StrengthLogEditData = {
  id: number;
  date: string;
  weight: number;
  reps: number;
};

type Props = {
  open: boolean;
  log: StrengthLogEditData | null;
  onClose: () => void;
  onSaved: () => void;
};

function validateForm(date: string, weight: string, reps: string): string | null {
  if (!date.trim()) {
    return "Ingresá una fecha válida.";
  }

  const weightVal = Number(weight.replace(",", "."));
  if (!Number.isFinite(weightVal)) {
    return "Ingresá un peso válido (número mayor a 0).";
  }
  if (weightVal <= 0) {
    return "El peso debe ser mayor a 0 kg.";
  }

  const repsVal = Number(reps);
  if (!Number.isFinite(repsVal)) {
    return "Ingresá repeticiones válidas (número entero mayor a 0).";
  }
  if (!Number.isInteger(repsVal) || repsVal <= 0) {
    return "Las repeticiones deben ser un número entero mayor a 0.";
  }

  return null;
}

export function StrengthLogEditModal({ open, log, onClose, onSaved }: Props) {
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !log) return;
    setDate(log.date);
    setWeight(String(log.weight));
    setReps(String(log.reps));
    setError(null);
    setIsSaving(false);
  }, [open, log]);

  if (!open || !log) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateForm(date, weight, reps);
    if (validationError) {
      setError(validationError);
      return;
    }

    const weightVal = Number(weight.replace(",", "."));
    const repsVal = Number(reps);

    setIsSaving(true);
    try {
      await updateTrainingLog(log.id, {
        date,
        weight: weightVal,
        reps: repsVal,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        parseApiError(err, "No se pudo guardar el registro. Intentá de nuevo."),
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
      aria-labelledby="strength-log-edit-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 id="strength-log-edit-title" className="text-base font-semibold text-slate-800">
            Editar registro de fuerza
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Modificá la fecha, el peso o las repeticiones del registro.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="edit-log-date" className="block text-xs text-slate-500 mb-1">
              Fecha
            </label>
            <input
              id="edit-log-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-log-weight" className="block text-xs text-slate-500 mb-1">
                Peso (kg)
              </label>
              <input
                id="edit-log-weight"
                type="number"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <div>
              <label htmlFor="edit-log-reps" className="block text-xs text-slate-500 mb-1">
                Repeticiones
              </label>
              <input
                id="edit-log-reps"
                type="number"
                value={reps}
                onChange={(event) => setReps(event.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
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
