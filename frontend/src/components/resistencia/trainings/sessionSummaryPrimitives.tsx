import type { ReactNode } from "react";

export function formatSummaryMeters(meters: number): string {
  const rounded = Math.round(meters * 100) / 100;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${value} m`;
}

export function formatDurationMmSs(seconds: number): string {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function SummaryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-0.5 text-xs text-slate-800">{children}</div>
    </div>
  );
}

export const summaryCellCls = "bg-white px-3 py-3 space-y-2.5";
export const summaryColCls = "min-w-0 bg-white px-3 py-3 space-y-2.5";

export function SavedSessionBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-2">
      <p className="text-xs font-semibold text-indigo-900">Sesión guardada en el atleta</p>
    </div>
  );
}

export function SummaryCardShell({
  showSavedBanner = true,
  header,
  body,
  footer,
}: {
  showSavedBanner?: boolean;
  header: ReactNode;
  body: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
      <SavedSessionBanner show={showSavedBanner} />
      <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">{header}</div>
      <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-3">{body}</div>
      <div className={`${summaryCellCls} border-t border-slate-200 text-center text-xs font-medium text-slate-800 !space-y-0`}>
        {footer}
      </div>
    </div>
  );
}

export function HeaderCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${summaryCellCls} text-center text-xs font-medium text-slate-800 !space-y-0 ${className}`}>
      {children}
    </div>
  );
}

type MinMaxIntensity = {
  velocidad_kmh: number;
  ritmo_str: string;
  trabajo_s?: number;
  trabajo_str?: string;
  pausa_s?: number;
  pausa_str?: string;
};

export function trabajoLine(min: MinMaxIntensity, max: MinMaxIntensity) {
  const minLabel = min.trabajo_str ?? formatDurationMmSs(min.trabajo_s ?? 0);
  const maxLabel = max.trabajo_str ?? formatDurationMmSs(max.trabajo_s ?? 0);
  return (
    <p>
      Mín {minLabel}
      {min.trabajo_s != null ? <span className="text-slate-500"> ({min.trabajo_s.toFixed(2)} s)</span> : null}
      {" · "}
      Máx {maxLabel}
      {max.trabajo_s != null ? <span className="text-slate-500"> ({max.trabajo_s.toFixed(2)} s)</span> : null}
    </p>
  );
}

export function pausaLine(min: MinMaxIntensity, max: MinMaxIntensity) {
  const minLabel = min.pausa_str ?? (min.pausa_s != null ? formatDurationMmSs(min.pausa_s) : "—");
  const maxLabel = max.pausa_str ?? (max.pausa_s != null ? formatDurationMmSs(max.pausa_s) : "—");
  return (
    <p>
      Mín {minLabel}
      {min.pausa_s != null ? <span className="text-slate-500"> ({min.pausa_s.toFixed(2)} s)</span> : null}
      {" · "}
      Máx {maxLabel}
      {max.pausa_s != null ? <span className="text-slate-500"> ({max.pausa_s.toFixed(2)} s)</span> : null}
    </p>
  );
}