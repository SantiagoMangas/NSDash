"use client";

import { useEffect, useState } from "react";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { deleteRsaFatigueTest, getRsaFatigueTests } from "@/lib/api/speed";
import { parseApiError } from "@/lib/utils";

type RsaFatigueTestHistoryItem = {
  id: number;
  athlete_id: number;
  date: string;
  cantidad_sprints: number;
  indice_fatiga_pct: number;
  categoria: string;
};

type Props = {
  athleteId: number | null;
  refreshKey?: number;
  onDeleted?: () => void;
};

export function RsaFatigueTestHistory({ athleteId, refreshKey, onDeleted }: Props) {
  const [tests, setTests] = useState<RsaFatigueTestHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);

  useEffect(() => {
    if (athleteId === null) {
      setTests([]);
      setError(null);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await getRsaFatigueTests(athleteId)) as RsaFatigueTestHistoryItem[];
        setTests(
          [...data].sort((a, b) => {
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            return b.id - a.id;
          }),
        );
      } catch {
        setError("No se pudo cargar el historial de tests RSA.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [athleteId, refreshKey]);

  const handleDelete = async (testId: number) => {
    if (deletingTestId !== null) return;
    if (
      !window.confirm(
        "¿Eliminar este test RSA? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }

    setDeletingTestId(testId);
    setError(null);
    try {
      await deleteRsaFatigueTest(testId);
      setTests((prev) => prev.filter((test) => test.id !== testId));
      onDeleted?.();
    } catch (err) {
      setError(parseApiError(err, "No se pudo eliminar el test. Intentá de nuevo."));
    } finally {
      setDeletingTestId(null);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">Historial de Tests RSA</h2>
        <p className="mt-1 text-sm text-slate-600">Listado de todos los tests de índice de fatiga registrados.</p>
      </div>

      {loading ? (
        <div className="p-6">
          <LoadingCard />
        </div>
      ) : error ? (
        <div className="p-6">
          <EmptyStateCard icon={<span className="text-2xl">⚠️</span>} title="Error" description={error} />
        </div>
      ) : tests.length === 0 ? (
        <div className="p-6">
          <EmptyStateCard
            icon={<span className="text-2xl">📋</span>}
            title="Aún no hay tests registrados"
            description="Cargá el primero desde el formulario de Test RSA."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-900">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Sprints</th>
                <th className="px-4 py-3">Índice de fatiga</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} className="bg-white">
                  <td className="px-4 py-3">{new Date(test.date).toLocaleDateString("es-AR")}</td>
                  <td className="px-4 py-3">{test.cantidad_sprints}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {test.indice_fatiga_pct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">{test.categoria}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(test.id)}
                      disabled={deletingTestId === test.id}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingTestId === test.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
