import type { SprintReference } from "@/lib/types";

type Props = {
  sprintReference: SprintReference[];
};

export default function SprintReferenceTable({ sprintReference }: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">Referencia de Sprint</h2>
        <p className="mt-1 text-sm text-slate-600">
          {/* TODO: ajustar copy según test de referencia (VAM vs speed_test) cuando SprintReferenceTable reciba referenceTestType */}
          Tiempos estimados para distancias de 10m a 1000m usando la mejor VAM.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-100 text-slate-900">
            <tr>
              <th className="px-4 py-3">Distancia</th>
              <th className="px-4 py-3">Tiempo (seg)</th>
              <th className="px-4 py-3">vel. (km/h)</th>
              <th className="px-4 py-3">vel. (m/s)</th>
            </tr>
          </thead>
          <tbody>
            {sprintReference.map((row) => {
              const speedMs = row.tiempo_segundos > 0 ? row.distancia / row.tiempo_segundos : 0;
              const speedKmh = speedMs * 3.6;
              return (
                <tr key={row.distancia} className="odd:bg-slate-50 even:bg-white">
                  <td className="px-4 py-3">{row.distancia} m</td>
                  <td className="px-4 py-3">{row.tiempo_segundos.toFixed(2)}</td>
                  <td className="px-4 py-3">{speedKmh.toFixed(2)}</td>
                  <td className="px-4 py-3">{speedMs.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
