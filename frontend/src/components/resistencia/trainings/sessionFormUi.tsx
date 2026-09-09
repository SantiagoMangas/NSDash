"use client";

import type { FormEvent, ReactNode } from "react";

export const SOURCE_LABELS: Record<string, string> = {
  "30_15": "30-15 IFT",
  yoyo: "Yo-Yo RI1",
  vam: "VAM",
  speed_test: "Speed Test (MSS)",
};

export function formatDensidadMmSs(densidadMin: number): string {
  const totalSeconds = Math.round(densidadMin * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parseNumber(value: string): number {
  return Number(value.replace(",", "."));
}

export function inputClassName(disabled = false): string {
  return `w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
    disabled ? "cursor-not-allowed opacity-60" : ""
  }`;
}

export function Field({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-slate-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export function InfoBanner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
      <span className="font-medium">ℹ️ {title}</span>
      <p className="mt-1 text-blue-700">{children}</p>
    </div>
  );
}

export function EmptyReference({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}

export function CalculateButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Calculando..." : "Calcular sesión"}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
  );
}

export type ResultColumn = {
  key: string;
  header: string;
  min: string;
  max: string;
};

export type SessionStat = {
  label: string;
  value: string;
};

export function ResultTable({
  summary,
  columns,
  sessionStats,
}: {
  summary: string;
  columns: ResultColumn[];
  sessionStats: SessionStat[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="font-medium text-slate-900">Resultado calculado</p>
        {summary ? <p className="text-xs text-slate-500 mt-0.5">{summary}</p> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-100 text-slate-900">
            <tr>
              <th className="px-4 py-2">Extremo</th>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-2">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-4 py-2 font-medium">Mín</td>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-2">
                  {column.min}
                </td>
              ))}
            </tr>
            <tr className="bg-white">
              <td className="px-4 py-2 font-medium">Máx</td>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-2">
                  {column.max}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {sessionStats.length > 0 ? (
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">Resumen de sesión</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {sessionStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-sm font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function preventDefaultSubmit(handler: () => Promise<void>) {
  return async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handler();
  };
}
