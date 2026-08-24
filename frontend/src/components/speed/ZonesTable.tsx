import type { VelocityZone } from "@/lib/types";

const ZONE_ROW_CLASSES: Record<string, string> = {
  "Zona 1": "bg-blue-50",
  "Zona 2": "bg-green-50",
  "Zona 3": "bg-green-100",
  "Zona 4": "bg-yellow-50",
  "Zona 5": "bg-yellow-100",
  "Zona 6": "bg-orange-50",
  "Zona 7": "bg-orange-100",
  "Zona 8": "bg-red-100",
};

type Props = {
  zones: VelocityZone[];
};

export default function ZonesTable({ zones }: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">Cuadro de Zonas</h2>
        <p className="mt-1 text-sm text-slate-600">
          8 zonas de entrenamiento calculadas sobre el mejor test VAM disponible.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-100 text-slate-900">
            <tr>
              <th className="px-4 py-3">Zona</th>
              <th className="px-4 py-3">Intensidad</th>
              <th className="px-4 py-3">% VAM</th>
              <th className="px-4 py-3">Ritmo mín (min/km)</th>
              <th className="px-4 py-3">Ritmo máx (min/km)</th>
              <th className="px-4 py-3">vel. mín (km/h)</th>
              <th className="px-4 py-3">vel. máx (km/h)</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.zona} className={ZONE_ROW_CLASSES[zone.zona] ?? "bg-white"}>
                <td className="px-4 py-3 font-medium text-slate-900">{zone.zona}</td>
                <td className="px-4 py-3">{zone.intensidad}</td>
                <td className="px-4 py-3">{`${Math.round(zone.pct_min * 100)}-${Math.round(zone.pct_max * 100)}%`}</td>
                <td className="px-4 py-3">{zone.ritmo_min}</td>
                <td className="px-4 py-3">{zone.ritmo_max}</td>
                <td className="px-4 py-3">{zone.vel_min_kmh.toFixed(2)}</td>
                <td className="px-4 py-3">{zone.vel_max_kmh.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
