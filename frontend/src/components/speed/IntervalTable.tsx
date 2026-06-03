import type { IntervalTable as IntervalTableType } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  fit_corto: "Fit Corto (30s-1min)",
  fit_largo: "Fit Largo (1-4min)",
  mas_training: "MAS Training",
};

function getRowClass(porcentaje: number) {
  if (porcentaje < 90) return "bg-blue-50";
  if (porcentaje <= 100) return "bg-green-50";
  if (porcentaje <= 110) return "bg-yellow-100";
  return "bg-red-100";
}

function groupByType(rows: IntervalTableType["rows"]) {
  return rows.reduce<Record<string, typeof rows>>((groups, row) => {
    groups[row.tipo] = groups[row.tipo] ? [...groups[row.tipo], row] : [row];
    return groups;
  }, {});
}

type Props = {
  table: IntervalTableType | null;
};

export default function IntervalTable({ table }: Props) {
  if (!table) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900">Cuadro Intervalado</h2>
        <p className="mt-2 text-sm text-slate-600">Seleccioná una referencia disponible para ver el cuadro.</p>
      </div>
    );
  }

  const grouped = groupByType(table.rows);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">Cuadro Intervalado</h2>
        <p className="mt-1 text-sm text-slate-600">
          Referencia: {table.source.toUpperCase()} · Velocidad base: {table.reference_kmh.toFixed(2)} km/h
        </p>
      </div>
      <div className="space-y-6 p-6">
        {(["fit_corto", "fit_largo", "mas_training"] as const).map((type) => {
          const rows = grouped[type] ?? [];
          if (rows.length === 0) return null;
          return (
            <div key={type} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">{TYPE_LABELS[type]}</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="bg-white text-slate-900">
                    <tr>
                      <th className="px-3 py-2">%</th>
                      <th className="px-3 py-2">Velocidad km/h</th>
                      <th className="px-3 py-2">Ritmo min/km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${type}-${row.porcentaje}`} className={getRowClass(row.porcentaje)}>
                        <td className="px-3 py-2 font-medium text-slate-900">{row.porcentaje}%</td>
                        <td className="px-3 py-2">{row.velocidad_kmh.toFixed(2)}</td>
                        <td className="px-3 py-2">{row.ritmo_str}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
