"use client";

import { useEffect, useState } from "react";
import { deleteTempoRunSession, getTempoRunSessions, type TempoRunSessionSummary } from "@/lib/api/sessions";
import { MetricsCollapsibleHistory } from "@/components/resistencia/metrics/MetricsCollapsibleHistory";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { formatDisplayDate } from "@/lib/date";
import { parseApiError } from "@/lib/utils";

type Props = {
  athleteId: number | null;
  refreshKey?: number;
  embeddedInMetrics?: boolean;
};

const INITIAL_VISIBLE = 5;

export function TempoRunSessionHistory({
  athleteId,
  refreshKey = 0,
  embeddedInMetrics = true,
}: Props) {
  const [sessions, setSessions] = useState<TempoRunSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (athleteId === null) {
      setSessions([]);
      setError(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        setSessions(await getTempoRunSessions(athleteId));
      } catch {
        setError("No se pudo cargar el historial de Tempo Run.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [athleteId, refreshKey]);

  useEffect(() => {
    setShowAll(false);
  }, [athleteId, refreshKey]);

  const confirmDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await deleteTempoRunSession(deleteId);
      setDeleteId(null);
      if (athleteId !== null) {
        setSessions(await getTempoRunSessions(athleteId));
      }
    } catch (err: unknown) {
      setError(parseApiError(err, "No se pudo eliminar la sesión."));
    } finally {
      setDeleting(false);
    }
  };

  const visible = showAll ? sessions : sessions.slice(0, INITIAL_VISIBLE);

  const countLabel =
    sessions.length > 0
      ? `${sessions.length} sesión${sessions.length === 1 ? "" : "es"} guardada${sessions.length === 1 ? "" : "s"}`
      : null;

  const body = (
    <>
      {loading ? (
        <div className="p-4">
          <LoadingCard />
        </div>
      ) : error ? (
        <p className="p-4 text-sm text-red-600">{error}</p>
      ) : sessions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          Guardá una sesión desde la calculadora Tempo Run (botón «Guardar en el atleta»).
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-indigo-50 text-xs font-semibold uppercase tracking-wide text-indigo-900">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Entrenamiento</th>
                  <th className="px-4 py-2">MSS ref.</th>
                  <th className="px-4 py-2 min-w-[12rem]">Resumen</th>
                  <th className="px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((session) => (
                  <tr key={session.id} className="border-t border-slate-100 bg-white even:bg-slate-50/40">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDisplayDate(session.date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-slate-900">
                      {session.entrenamiento}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{session.reference_kmh.toFixed(2)} km/h</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{session.summary}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setDeleteId(session.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sessions.length > INITIAL_VISIBLE ? (
            <div className="border-t border-slate-200 px-4 py-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                {showAll
                  ? "Ver menos"
                  : `Ver más (${sessions.length - INITIAL_VISIBLE} restantes)`}
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );

  const deleteDialog = (
    <ConfirmDialog
      open={deleteId !== null}
      title="Eliminar sesión Tempo Run"
      description="¿Eliminar este registro del atleta? Esta acción no se puede deshacer."
      confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
      isLoading={deleting}
      onCancel={() => setDeleteId(null)}
      onConfirm={() => void confirmDelete()}
    />
  );

  if (!embeddedInMetrics) {
    return (
      <>
        {deleteDialog}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">{body}</section>
      </>
    );
  }

  return (
    <>
      {deleteDialog}
      <MetricsCollapsibleHistory
        title="Historial de sesiones Tempo Run"
        open={sectionOpen}
        onToggle={() => setSectionOpen((prev) => !prev)}
        countLabel={countLabel}
      >
        {body}
      </MetricsCollapsibleHistory>
    </>
  );
}