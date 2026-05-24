import { formatChartDate } from "@/lib/date";

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
};

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white/95 px-4 py-3 shadow-xl shadow-indigo-100/40 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {label ? formatChartDate(label) : "Fecha"}
      </p>
      <p className="text-xl font-bold text-indigo-600 leading-tight">
        {payload[0].value}
        <span className="ml-1 text-xs font-medium text-slate-500">kg RM est.</span>
      </p>
    </div>
  );
}
