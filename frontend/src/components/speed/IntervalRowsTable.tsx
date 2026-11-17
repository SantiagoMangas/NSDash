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
  /** Encabezado de la primera columna en modo compacto (ej. "% MSS" en speed test). */
  percentHeader?: string;
};

export function IntervalRowsTable({
  rows,
  title,
  subtitle,
  compact = false,
  percentHeader = "%",
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-slate-500">No hay filas para esta selección.</p>
    );
  }

  const sorted = [...rows].sort((a, b) => a.porcentaje - b.porcentaje);

  if (compact) {
    return (
      <div className="min-w-0">
        <table className="w-full table-fixed text-left text-[13px] leading-snug text-slate-700">
          <thead className="text-slate-900">
            <tr className="h-9">
              <th className="w-[24%] px-2.5 font-semibold">{percentHeader}</th>
              <th className="w-[36%] px-2.5 font-semibold">vel. (km/h)</th>
              <th className="w-[40%] px-2.5 font-semibold">Ritmo (m/km)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={`${row.tipo}-${row.porcentaje}`} className={`h-9 ${getRowClass(row.porcentaje)}`}>
                <td className="px-2.5 font-medium text-slate-900">{row.porcentaje}%</td>
                <td className="px-2.5 tabular-nums">{row.velocidad_kmh.toFixed(2)}</td>
                <td className="px-2.5 tabular-nums">{row.ritmo_str}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
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
              <th className="px-3 py-2">Ritmo (m/km)</th>
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
