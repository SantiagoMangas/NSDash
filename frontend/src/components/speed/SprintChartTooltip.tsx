import { formatChartDate } from "@/lib/date";

type SprintChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number; payload?: { distance?: number; time_seconds?: number } }>;
  label?: string;
};

export function SprintChartTooltip({ active, payload, label }: SprintChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="min-w-[150px] rounded-2xl border border-indigo-100 bg-white/95 px-4 py-3 shadow-xl shadow-indigo-100/50 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {label ? formatChartDate(label) : "Fecha"}
      </p>
      <p className="text-xl font-bold text-indigo-600 leading-tight">
        {payload[0].value.toFixed(2)}
        <span className="ml-1 text-xs font-medium text-slate-500">m/s</span>
      </p>
      {point?.distance != null && point?.time_seconds != null && (
        <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
          <p className="text-xs text-slate-600">
            <span className="text-slate-400">Distancia:</span> {point.distance} m
          </p>
          <p className="text-xs text-slate-600">
            <span className="text-slate-400">Tiempo:</span> {point.time_seconds.toFixed(2)} s
          </p>
        </div>
      )}
    </div>
  );
}
