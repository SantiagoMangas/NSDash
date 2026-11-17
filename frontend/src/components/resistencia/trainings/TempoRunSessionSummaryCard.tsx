import type { ReactNode } from "react";
import type { TempoRunCalculateResponse } from "@/lib/api/sessions";

export type TempoRunSavedSnapshot = {
  result: TempoRunCalculateResponse;
  ratio: string;
};

function formatSummaryMeters(meters: number): string {
  const rounded = Math.round(meters * 100) / 100;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${value} m`;
}

type Props = {
  snapshot: TempoRunSavedSnapshot;
  /** Si es false, no muestra la franja «Sesión guardada…» (p. ej. historial). */
  showSavedBanner?: boolean;
};

function SummaryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-0.5 text-xs text-slate-800">{children}</div>
    </div>
  );
}

export function TempoRunSessionSummaryCard({ snapshot, showSavedBanner = true }: Props) {
  const { result: r, ratio } = snapshot;
  const cellCls = "bg-white px-3 py-3 space-y-2.5";
  const colCls = "min-w-0 bg-white px-3 py-3 space-y-2.5";

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
      {showSavedBanner ? (
        <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-2">
          <p className="text-xs font-semibold text-indigo-900">Sesión guardada en el atleta</p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-px bg-slate-200 border-b border-slate-200 sm:grid-cols-4">
        <div className={`${cellCls} text-xs font-semibold text-slate-800 !space-y-0`}>Tempo Run</div>
        <div className={`${cellCls} text-center text-xs font-medium text-slate-800 !space-y-0`}>{r.entrenamiento}</div>
        <div className={`${cellCls} text-center text-xs font-medium text-slate-800 !space-y-0`}>COD {r.cod}</div>
        <div className={`${cellCls} text-center text-xs font-medium text-slate-800 !space-y-0`}>
          {r.cod === "SI" ? (
            <>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Shuttles</span>
              <span className="mt-0.5 inline-block">{r.shuttles}</span>
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-3">
        <div className={colCls}>
          <SummaryField label="Serie">
            <p className="text-sm font-medium text-slate-900">{formatSummaryMeters(r.distancia_m)}</p>
            <p className="mt-1 text-slate-700">
              Tiempo Mín {r.min.trabajo_str}
              <span className="text-slate-500"> ({r.min.trabajo_s.toFixed(2)} s)</span>
              {" · "}
              Máx {r.max.trabajo_str}
              <span className="text-slate-500"> ({r.max.trabajo_s.toFixed(2)} s)</span>
            </p>
          </SummaryField>
          <SummaryField label="Velocidad">
            <p>Mín {r.min.velocidad_kmh.toFixed(2)} km/h</p>
          </SummaryField>
          <SummaryField label="Ritmo">
            <p>Mín {r.min.ritmo_str}</p>
          </SummaryField>
        </div>

        <div className={colCls}>
          <SummaryField label="Dis. ajustada">
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-slate-900">
              <span>{formatSummaryMeters(r.distancia_ajustada_m)}</span>
              {r.cod === "SI" ? (
                <span className="text-[10px] font-normal text-slate-500">
                  ({formatSummaryMeters(r.distancia_m)} ÷ ({r.shuttles} + 1))
                </span>
              ) : null}
            </p>
          </SummaryField>
          <SummaryField label="Velocidad">
            <p>Máx {r.max.velocidad_kmh.toFixed(2)} km/h</p>
          </SummaryField>
          <SummaryField label="Ritmo">
            <p>Máx {r.max.ritmo_str}</p>
          </SummaryField>
        </div>

        <div className={colCls}>
          <SummaryField label="Ratio">
            <p className="text-sm font-medium text-slate-900">{ratio.trim()}</p>
            <p className="text-slate-600">Pausa {formatSummaryMeters(r.pausa_m)}</p>
          </SummaryField>
          <SummaryField label="Tiempo de pausa">
            <p>
              Mín {r.min.pausa_str}
              <span className="text-slate-500"> ({r.min.pausa_s.toFixed(2)} s)</span>
              {" · "}
              Máx {r.max.pausa_str}
              <span className="text-slate-500"> ({r.max.pausa_s.toFixed(2)} s)</span>
            </p>
          </SummaryField>
        </div>
      </div>

      <div className={`${cellCls} border-t border-slate-200 text-center text-xs font-medium text-slate-800 !space-y-0`}>
        {r.series} series × {r.bloques} bloques · Volumen serie {formatSummaryMeters(r.volumen_serie_m)} · Volumen
        trabajo {formatSummaryMeters(r.volumen_trabajo_m)}
      </div>
    </div>
  );
}