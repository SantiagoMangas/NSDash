"use client";

import { FormEvent, useState } from "react";
import { createExercise, type Exercise } from "@/lib/api/strength";
import {
  CURVE_SECTIONS,
  type PercentageCurveKey,
} from "@/lib/strength/exerciseCatalog";
import { parseApiError } from "@/lib/utils";

type Props = {
  onCreated: (exercise: Exercise) => void;
  onToast: (type: "success" | "error", message: string) => void;
};

type FormulaChoice = "epley" | "brzycki";

export function AddExerciseForm({ onCreated, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [formulaType, setFormulaType] = useState<FormulaChoice>("epley");
  const [rmCoefficient, setRmCoefficient] = useState("0.033");
  const [percentageCurve, setPercentageCurve] = useState<PercentageCurveKey>("sentadilla");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setFormulaType("epley");
    setRmCoefficient("0.033");
    setPercentageCurve("sentadilla");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Ingresá un nombre.");
      return;
    }

    let coef: number | undefined;
    if (formulaType === "epley") {
      const parsed = Number(rmCoefficient.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Ingresá un coeficiente Epley válido (número positivo).");
        return;
      }
      coef = parsed;
    }

    setSaving(true);
    try {
      const created = await createExercise({
        name: trimmedName,
        formula_type: formulaType,
        rm_coefficient: coef,
        percentage_curve: percentageCurve,
      });
      onCreated(created);
      onToast("success", "Ejercicio creado");
      resetForm();
      setOpen(false);
    } catch (err) {
      const msg = parseApiError(err, "No se pudo crear el ejercicio.");
      setError(msg);
      onToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
      >
        + Agregar ejercicio
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Nuevo ejercicio</h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="exercise-name" className="block text-xs text-slate-500 mb-1">
            Nombre
          </label>
          <input
            id="exercise-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej. Peso muerto - Sumo"
          />
        </div>
        <div>
          <label htmlFor="exercise-formula" className="block text-xs text-slate-500 mb-1">
            Fórmula RM
          </label>
          <select
            id="exercise-formula"
            value={formulaType}
            onChange={(e) => setFormulaType(e.target.value as FormulaChoice)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="epley">Epley</option>
            <option value="brzycki">Brzycki</option>
          </select>
        </div>
        <div>
          <label htmlFor="exercise-coef" className="block text-xs text-slate-500 mb-1">
            Coeficiente Epley
          </label>
          <input
            id="exercise-coef"
            type="text"
            inputMode="decimal"
            value={rmCoefficient}
            onChange={(e) => setRmCoefficient(e.target.value)}
            disabled={formulaType === "brzycki"}
            required={formulaType === "epley"}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            placeholder="0.018"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="exercise-curve" className="block text-xs text-slate-500 mb-1">
            Curva de %RM
          </label>
          <select
            id="exercise-curve"
            value={percentageCurve}
            onChange={(e) => setPercentageCurve(e.target.value as PercentageCurveKey)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CURVE_SECTIONS.map((section) => (
              <option key={section.key} value={section.key}>{section.title}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {saving ? "Guardando..." : "Crear ejercicio"}
      </button>
    </form>
  );
}
