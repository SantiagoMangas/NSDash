import type { IntervalTable as IntervalTableType } from "@/lib/types";
import { INTERVAL_TYPE_LABELS, IntervalRowsTable } from "@/components/speed/IntervalRowsTable";

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
            <IntervalRowsTable
              key={type}
              rows={rows}
              title={INTERVAL_TYPE_LABELS[type]}
            />
          );
        })}
      </div>
    </div>
  );
}
