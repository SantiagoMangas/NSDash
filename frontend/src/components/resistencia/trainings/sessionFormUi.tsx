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

/** Inputs compactos (misma escala que Tempo Run). */
export const compactInputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60";

export const compactDateInputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200";

export function compactInputClassName(disabled = false): string {
  return disabled ? `${compactInputCls} cursor-not-allowed opacity-60` : compactInputCls;
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

export function CompactField({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[11px] font-medium text-slate-500 mb-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}

type MinMaxPair = {
  velocidad_kmh: number;
  ritmo_str: string;
  trabajo_s?: number;
  trabajo_str?: string;
  pausa_s?: number;
  pausa_str?: string;
};

export function InlineMinMaxVelocityRitmo({ min, max }: { min: MinMaxPair; max: MinMaxPair }) {
  return (
    <div className="col-span-full grid gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="hidden min-w-0 lg:block" aria-hidden="true" />
      <div className="hidden min-w-0 lg:block" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Velocidad</p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Mín</span> {min.velocidad_kmh.toFixed(2)} km/h
        </p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Máx</span> {max.velocidad_kmh.toFixed(2)} km/h
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Ritmo</p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Mín</span> {min.ritmo_str}
        </p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Máx</span> {max.ritmo_str}
        </p>
      </div>
    </div>
  );
}

export function InlineMinMaxTrabajoPausa({ min, max }: { min: MinMaxPair; max: MinMaxPair }) {
  const trabajoMin = min.trabajo_str ?? (min.trabajo_s != null ? `${min.trabajo_s.toFixed(2)} s` : "—");
  const trabajoMax = max.trabajo_str ?? (max.trabajo_s != null ? `${max.trabajo_s.toFixed(2)} s` : "—");
  const pausaMin = min.pausa_str ?? (min.pausa_s != null ? `${min.pausa_s.toFixed(2)} s` : "—");
  const pausaMax = max.pausa_str ?? (max.pausa_s != null ? `${max.pausa_s.toFixed(2)} s` : "—");

  return (
    <div className="col-span-full grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Trabajo</p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Mín</span> {trabajoMin}
          {min.trabajo_s != null && min.trabajo_str ? (
            <span className="text-slate-500"> ({min.trabajo_s.toFixed(2)} s)</span>
          ) : null}
        </p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Máx</span> {trabajoMax}
          {max.trabajo_s != null && max.trabajo_str ? (
            <span className="text-slate-500"> ({max.trabajo_s.toFixed(2)} s)</span>
          ) : null}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Pausa</p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Mín</span> {pausaMin}
          {min.pausa_s != null && min.pausa_str ? (
            <span className="text-slate-500"> ({min.pausa_s.toFixed(2)} s)</span>
          ) : null}
        </p>
        <p className="text-xs text-slate-800">
          <span className="text-slate-500">Máx</span> {pausaMax}
          {max.pausa_s != null && max.pausa_str ? (
            <span className="text-slate-500"> ({max.pausa_s.toFixed(2)} s)</span>
          ) : null}
        </p>
      </div>
      <div className="hidden min-w-0 lg:block" aria-hidden="true" />
      <div className="hidden min-w-0 lg:block" aria-hidden="true" />
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

export function SessionFormActions({
  loading,
  saving,
  canSave,
  onSave,
}: {
  loading: boolean;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <CalculateButton loading={loading} />
      <button
        type="button"
        disabled={!canSave || saving || loading}
        onClick={onSave}
        className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar en el atleta"}
      </button>
    </div>
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
