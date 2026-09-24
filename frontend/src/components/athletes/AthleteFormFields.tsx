"use client";

import { useEffect, useState } from "react";
import { getPositions, getSports, type Position, type Sport } from "@/lib/api/catalog";
import type { Team } from "@/lib/api/teams";
import type { AthleteFormState } from "./athleteFormUtils";

type Props = {
  form: AthleteFormState;
  onChange: (next: AthleteFormState) => void;
  teams: Team[];
  requireEmail?: boolean;
  idPrefix?: string;
};

const inputClass =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";
const labelClass = "block text-xs text-slate-500 mb-1";

export function AthleteFormFields({
  form,
  onChange,
  teams,
  requireEmail = false,
  idPrefix = "athlete",
}: Props) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    getSports()
      .then(setSports)
      .catch(() => setSports([]));
  }, []);

  useEffect(() => {
    const sportId = form.sportId.trim();
    if (!sportId) {
      setPositions([]);
      return;
    }
    getPositions(Number.parseInt(sportId, 10))
      .then(setPositions)
      .catch(() => setPositions([]));
  }, [form.sportId]);

  const setField = <K extends keyof AthleteFormState>(key: K, value: AthleteFormState[K]) => {
    onChange({ ...form, [key]: value });
  };

  const handleSportChange = (value: string) => {
    onChange({ ...form, sportId: value, positionId: "" });
  };

  const ageLabel =
    form.birthDate.trim() !== ""
      ? (() => {
          const born = new Date(form.birthDate);
          if (Number.isNaN(born.getTime())) return null;
          const today = new Date();
          let age = today.getFullYear() - born.getFullYear();
          const m = today.getMonth() - born.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1;
          return age;
        })()
      : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-first-name`} className={labelClass}>Nombre</label>
        <input
          id={`${idPrefix}-first-name`}
          type="text"
          value={form.firstName}
          onChange={(e) => setField("firstName", e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-last-name`} className={labelClass}>Apellido</label>
        <input
          id={`${idPrefix}-last-name`}
          type="text"
          value={form.lastName}
          onChange={(e) => setField("lastName", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-email`} className={labelClass}>
          Email{requireEmail ? " *" : ""}
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          required={requireEmail}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-phone`} className={labelClass}>Teléfono</label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          value={form.phone}
          onChange={(e) => setField("phone", e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-photo`} className={labelClass}>Foto (URL)</label>
        <input
          id={`${idPrefix}-photo`}
          type="url"
          value={form.photoUrl}
          onChange={(e) => setField("photoUrl", e.target.value)}
          placeholder="https://..."
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-team`} className={labelClass}>Equipo</label>
        <select
          id={`${idPrefix}-team`}
          value={form.teamId}
          onChange={(e) => setField("teamId", e.target.value)}
          className={inputClass}
        >
          <option value="">Sin equipo</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-birth`} className={labelClass}>Fecha de nacimiento</label>
        <input
          id={`${idPrefix}-birth`}
          type="date"
          value={form.birthDate}
          onChange={(e) => setField("birthDate", e.target.value)}
          className={inputClass}
        />
        {ageLabel != null && (
          <p className="text-xs text-slate-400 mt-1">Edad: {ageLabel} años</p>
        )}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-sport`} className={labelClass}>Deporte</label>
        <select
          id={`${idPrefix}-sport`}
          value={form.sportId}
          onChange={(e) => handleSportChange(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>{sport.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-position`} className={labelClass}>Posición</label>
        <select
          id={`${idPrefix}-position`}
          value={form.positionId}
          onChange={(e) => setField("positionId", e.target.value)}
          disabled={!form.sportId}
          className={inputClass}
        >
          <option value="">—</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>{position.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-height`} className={labelClass}>Altura (cm)</label>
        <input
          id={`${idPrefix}-height`}
          type="number"
          step="any"
          value={form.heightCm}
          onChange={(e) => setField("heightCm", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-weight`} className={labelClass}>Peso corporal (kg)</label>
        <input
          id={`${idPrefix}-weight`}
          type="number"
          step="any"
          value={form.bodyWeightKg}
          onChange={(e) => setField("bodyWeightKg", e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-goal`} className={labelClass}>Objetivo</label>
        <textarea
          id={`${idPrefix}-goal`}
          rows={2}
          maxLength={500}
          value={form.goal}
          onChange={(e) => setField("goal", e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-notes`} className={labelClass}>Observaciones</label>
        <textarea
          id={`${idPrefix}-notes`}
          rows={2}
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-injuries`} className={labelClass}>Lesiones</label>
        <textarea
          id={`${idPrefix}-injuries`}
          rows={2}
          value={form.injuries}
          onChange={(e) => setField("injuries", e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}
