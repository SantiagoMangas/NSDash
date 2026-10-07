"use client";

import { useEffect, useState } from "react";
import {
  createPosition,
  createSport,
  deletePosition,
  deleteSport,
  getPositions,
  getSports,
  type Position,
  type Sport,
} from "@/lib/api/catalog";
import { parseApiError } from "@/lib/utils";
import type { Team } from "@/lib/api/teams";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AthletePhotoField } from "./AthletePhotoField";
import { DateInputWithDisplay } from "@/components/ui/DateInputWithDisplay";
import { parseLocalDate } from "@/lib/date";
import type { AthleteFormState } from "./athleteFormUtils";

type Props = {
  form: AthleteFormState;
  onChange: (next: AthleteFormState) => void;
  teams: Team[];
  requireEmail?: boolean;
  idPrefix?: string;
  /** Al editar: guarda la foto en el servidor al subir y refresca la ficha. */
  persistAthleteId?: number | null;
  onPhotoPersisted?: () => void;
};

const inputClass =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";
const labelClass = "block text-xs text-slate-500 mb-1";

type CatalogDeleteRequest =
  | { kind: "sport"; id: number; name: string }
  | { kind: "position"; id: number; name: string };

export function AthleteFormFields({
  form,
  onChange,
  teams,
  requireEmail = false,
  idPrefix = "athlete",
  persistAthleteId = null,
  onPhotoPersisted,
}: Props) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [newSportName, setNewSportName] = useState("");
  const [newPositionName, setNewPositionName] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<CatalogDeleteRequest | null>(null);

  const handleConfirmCatalogDelete = async () => {
    if (!deleteRequest) return;
    setCatalogError(null);
    setCatalogBusy(true);
    try {
      if (deleteRequest.kind === "sport") {
        await deleteSport(deleteRequest.id);
        setSports((prev) => prev.filter((s) => s.id !== deleteRequest.id));
        onChange({ ...form, sportId: "", positionId: "" });
        setPositions([]);
      } else {
        await deletePosition(deleteRequest.id);
        setPositions((prev) => prev.filter((p) => p.id !== deleteRequest.id));
        setField("positionId", "");
      }
      setDeleteRequest(null);
    } catch (err) {
      setCatalogError(
        parseApiError(
          err,
          deleteRequest.kind === "sport"
            ? "No se pudo eliminar el deporte."
            : "No se pudo eliminar la posición.",
        ),
      );
    } finally {
      setCatalogBusy(false);
    }
  };

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
          const born = parseLocalDate(form.birthDate);
          if (Number.isNaN(born.getTime())) return null;
          const today = new Date();
          let age = today.getFullYear() - born.getFullYear();
          const m = today.getMonth() - born.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1;
          return age;
        })()
      : null;

  const deleteDialogTitle =
    deleteRequest?.kind === "sport" ? "Eliminar deporte" : "Eliminar posición";
  const deleteDialogDescription =
    deleteRequest?.kind === "sport"
      ? `¿De verdad querés eliminar el deporte «${deleteRequest.name}»? También se quitarán sus posiciones del catálogo. Los atletas no se borran, solo pierden esa asignación.`
      : deleteRequest
        ? `¿De verdad querés eliminar la posición «${deleteRequest.name}»? Los atletas no se borran, solo pierden esa asignación.`
        : "";

  return (
    <>
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
      <AthletePhotoField
        idPrefix={idPrefix}
        photoUrl={form.photoUrl}
        onPhotoUrlChange={(url) => setField("photoUrl", url)}
        firstName={form.firstName}
        lastName={form.lastName}
        persistAthleteId={persistAthleteId}
        onPhotoPersisted={onPhotoPersisted}
      />
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
        <DateInputWithDisplay
          id={`${idPrefix}-birth`}
          label="Fecha de nacimiento"
          value={form.birthDate}
          onChange={(value) => setField("birthDate", value)}
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
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            value={newSportName}
            onChange={(e) => setNewSportName(e.target.value)}
            placeholder="Nuevo deporte (ej. Vóley)"
            className={`${inputClass} flex-1 min-w-[10rem]`}
          />
          <button
            type="button"
            disabled={catalogBusy || !newSportName.trim()}
            onClick={async () => {
              setCatalogError(null);
              setCatalogBusy(true);
              try {
                const sport = await createSport(newSportName.trim());
                setSports((prev) => [...prev, sport].sort((a, b) => a.name.localeCompare(b.name, "es")));
                setField("sportId", String(sport.id));
                setNewSportName("");
              } catch (err) {
                setCatalogError(parseApiError(err, "No se pudo crear el deporte."));
              } finally {
                setCatalogBusy(false);
              }
            }}
            className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Agregar
          </button>
          <button
            type="button"
            disabled={catalogBusy || !form.sportId}
            onClick={() => {
              const sportId = Number.parseInt(form.sportId, 10);
              const sport = sports.find((s) => s.id === sportId);
              if (!sport) return;
              setDeleteRequest({ kind: "sport", id: sportId, name: sport.name });
            }}
            className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Eliminar deporte
          </button>
        </div>
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
        {form.sportId ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="text"
              value={newPositionName}
              onChange={(e) => setNewPositionName(e.target.value)}
              placeholder="Nueva posición (ej. Punta)"
              className={`${inputClass} flex-1 min-w-[10rem]`}
            />
            <button
              type="button"
              disabled={catalogBusy || !newPositionName.trim()}
              onClick={async () => {
                const sportId = Number.parseInt(form.sportId, 10);
                if (!Number.isFinite(sportId)) return;
                setCatalogError(null);
                setCatalogBusy(true);
                try {
                  const position = await createPosition(sportId, newPositionName.trim());
                  setPositions((prev) =>
                    [...prev, position].sort((a, b) => a.name.localeCompare(b.name, "es")),
                  );
                  setField("positionId", String(position.id));
                  setNewPositionName("");
                } catch (err) {
                  setCatalogError(parseApiError(err, "No se pudo crear la posición."));
                } finally {
                  setCatalogBusy(false);
                }
              }}
              className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Agregar
            </button>
            <button
              type="button"
              disabled={catalogBusy || !form.positionId}
              onClick={() => {
                const positionId = Number.parseInt(form.positionId, 10);
                const position = positions.find((p) => p.id === positionId);
                if (!position) return;
                setDeleteRequest({ kind: "position", id: positionId, name: position.name });
              }}
              className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Eliminar posición
            </button>
          </div>
        ) : null}
        {catalogError ? <p className="text-xs text-red-600 mt-1">{catalogError}</p> : null}
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
    <ConfirmDialog
      open={deleteRequest !== null}
      title={deleteDialogTitle}
      description={deleteDialogDescription}
      confirmLabel="Sí, eliminar"
      isLoading={catalogBusy}
      onCancel={() => {
        if (!catalogBusy) setDeleteRequest(null);
      }}
      onConfirm={() => void handleConfirmCatalogDelete()}
    />
    </>
  );
}
