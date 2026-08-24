import type { IntervalRow } from "@/lib/types";
import { formatPaceWithUnit } from "@/lib/units";

export const INTERVAL_TYPE_LABELS: Record<string, string> = {
  fit_corto: "HIIT Corto",
  fit_largo: "HIIT Largo",
  mas_training: "MAS Training",
};

function getRowClass(porcentaje: number) {
  if (porcentaje < 90) return "bg-blue-50";
  if (porcentaje <= 100) return "bg-green-50";
  if (porcentaje <= 110) return "bg-yellow-100";
  return "bg-red-100";
}

type Props = {
  rows: IntervalRow[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

export function IntervalRowsTable({ rows, title, subtitle, compact = false }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-slate-500">No hay filas para esta selección.</p>
    );
  }

  const sorted = [...rows].sort((a, b) => a.porcentaje - b.porcentaje);

  return (
    <div className={compact ? "" : "rounded-xl border border-slate-200 bg-slate-50 p-3"}>
      {title ? (
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-white text-slate-900">
            <tr>
              <th className="px-3 py-2">%</th>
              <th className="px-3 py-2">vel. (km/h)</th>
              <th className="px-3 py-2">Ritmo (min/km)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={`${row.tipo}-${row.porcentaje}`} className={getRowClass(row.porcentaje)}>
                <td className="px-3 py-2 font-medium text-slate-900">{row.porcentaje}%</td>
                <td className="px-3 py-2">{row.velocidad_kmh.toFixed(2)}</td>
                <td className="px-3 py-2">{formatPaceWithUnit(row.ritmo_str)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
