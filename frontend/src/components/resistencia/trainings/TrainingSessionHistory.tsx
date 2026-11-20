"use client";

import { Fragment, useEffect, useState } from "react";
import {
  deleteTrainingSession,
  getSavedTrainingSessionDetail,
  getTempoRunSessionDetail,
  getTrainingSessions,
  type TrainingSessionHistoryItem,
} from "@/lib/api/sessions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { formatDisplayDate } from "@/lib/date";
import { parseApiError } from "@/lib/utils";
import { SavedSessionSummaryCard } from "./SavedSessionSummaryCard";
import { sortTrainingSessionsBySavedAt, trainingHistoryTitle } from "./trainingHistoryLabels";
import {
  TempoRunSessionSummaryCard,
  type TempoRunSavedSnapshot,
} from "./TempoRunSessionSummaryCard";

type Props = {
  athleteId: number;
  refreshKey?: number;
};

const INITIAL_VISIBLE = 3;

function rowKey(session: TrainingSessionHistoryItem): string {
  return `${session.source}-${session.id}`;
}

export function TrainingSessionHistory({ athleteId, refreshKey = 0 }: Props) {
  const [sessions, setSessions] = useState<TrainingSessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingSessionHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  type SavedDetail = { source: string; request: Record<string, unknown>; result: Record<string, unknown> };
  const [detailByKey, setDetailByKey] = useState<Record<string, TempoRunSavedSnapshot | SavedDetail>>({});
  const [detailLoadingKey, setDetailLoadingKey] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        setSessions(sortTrainingSessionsBySavedAt(await getTrainingSessions(athleteId)));
      } catch {
        setError("No se pudo cargar el historial de entrenamientos.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [athleteId, refreshKey]);

  useEffect(() => {
    setShowAll(false);
    setExpandedKey(null);
    setDetailByKey({});
    setDetailError(null);
  }, [athleteId, refreshKey]);

  const confirmDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      await deleteTrainingSession(deleteTarget);
      setDeleteTarget(null);
      setSessions(sortTrainingSessionsBySavedAt(await getTrainingSessions(athleteId)));
    } catch (err: unknown) {
      setError(parseApiError(err, "No se pudo eliminar el registro."));
    } finally {
      setDeleting(false);
    }
  };

  const toggleDetail = async (session: TrainingSessionHistoryItem) => {
    const key = rowKey(session);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }

    setExpandedKey(key);
    setDetailError(null);

    if (detailByKey[key]) {
      return;
    }

    setDetailLoadingKey(key);
    try {
      if (session.source === "tempo_run") {
        const detail = await getTempoRunSessionDetail(session.id);
        const ratio = detail.snapshot.request.ratio ?? "";
        setDetailByKey((prev) => ({
          ...prev,
          [key]: { result: detail.snapshot.result, ratio },
        }));
      } else {
        const detail = await getSavedTrainingSessionDetail(session.id);
        setDetailByKey((prev) => ({
          ...prev,
          [key]: detail.snapshot,
        }));
      }
    } catch {
      setDetailError("No se pudo cargar el detalle de la sesión.");
    } finally {
      setDetailLoadingKey(null);
    }
  };

  const visible = showAll ? sessions : sessions.slice(0, INITIAL_VISIBLE);

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Historial de entrenamientos</h3>
      </div>

      {loading ? (
        <div className="p-4">
          <LoadingCard />
        </div>
      ) : error ? (
        <p className="p-4 text-sm text-red-600">{error}</p>
      ) : sessions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Todavía no hay sesiones guardadas. Usá «Guardar en el atleta» en una calculadora.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-indigo-50 text-xs font-semibold uppercase tracking-wide text-indigo-900">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Entrenamiento</th>
                  <th className="px-4 py-2">Ref.</th>
                  <th className="px-4 py-2 min-w-[14rem]">Resumen</th>
                  <th className="px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((session) => {
                  const key = rowKey(session);
                  const isOpen = expandedKey === key;
                  const snapshot = detailByKey[key];

                  return (
                    <Fragment key={key}>
                      <tr className="border-t border-slate-100 bg-white even:bg-slate-50/40">
                        <td className="px-4 py-2 whitespace-nowrap">{formatDisplayDate(session.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap font-medium text-slate-900">
                          {trainingHistoryTitle(session)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{session.reference_kmh.toFixed(2)} km/h</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => void toggleDetail(session)}
                            className="group flex w-full items-start gap-1.5 text-left text-xs text-slate-600 hover:text-indigo-700"
                            aria-expanded={isOpen}
                          >
                            <svg
                              className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:text-indigo-600 ${isOpen ? "rotate-90" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="min-w-0 whitespace-normal">{session.summary}</span>
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(session)}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-t border-slate-100 bg-slate-50/80">
                          <td colSpan={5} className="px-4 py-3">
                            {detailLoadingKey === key ? (
                              <LoadingCard />
                            ) : detailError && !snapshot ? (
                              <p className="text-sm text-red-600">{detailError}</p>
                            ) : snapshot ? (
                              session.source === "tempo_run" ? (
                                <TempoRunSessionSummaryCard snapshot={snapshot as TempoRunSavedSnapshot} showSavedBanner={false} />
                              ) : (
                                <SavedSessionSummaryCard snapshot={snapshot as SavedDetail} showSavedBanner={false} />
                              )
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sessions.length > INITIAL_VISIBLE ? (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                {showAll ? "Ver menos" : `Ver más (${sessions.length - INITIAL_VISIBLE} restantes)`}
              </button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar entrenamiento"
        description="¿Eliminar este registro del atleta? Esta acción no se puede deshacer."
        confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}