"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate } from "@/lib/date";
import { formatTestTypeLabel } from "@/lib/resistencia/constants";
import type { VamProgressPoint } from "@/lib/types";

type Props = {
  history: VamProgressPoint[];
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: VamProgressPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-800">{formatChartDate(label ?? "")}</p>
      <p className="text-indigo-600">{payload[0]?.value?.toFixed(2)} km/h</p>
      {point?.test_type && (
        <p className="text-slate-500 mt-0.5">{formatTestTypeLabel(point.test_type)}</p>
      )}
    </div>
  );
}

export function VamProgressChart({ history }: Props) {
  const chartData = [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point) => ({
      date: point.date,
      vam_kmh: point.vam_kmh,
      test_type: point.test_type,
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm text-slate-500">Registrá al menos un test para ver la progresión.</p>
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6">
        <p className="text-sm text-slate-600">
          Primer registro: <strong>{chartData[0].vam_kmh.toFixed(2)} km/h</strong> (
          {formatChartDate(chartData[0].date)}). Agregá más tests para ver la evolución.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Progresión VAM</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={["auto", "auto"]}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="vam_kmh"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
