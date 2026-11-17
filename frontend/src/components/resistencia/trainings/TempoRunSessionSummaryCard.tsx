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

export function TempoRunSessionSummaryCard({ snapshot, showSavedBanner = true }: Props) {
  const { result: r, ratio } = snapshot;
  const rowCls = "grid grid-cols-2 gap-px bg-slate-200";
  const cellCls = "bg-white px-3 py-2";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
      {showSavedBanner ? (
        <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-2">
          <p className="text-xs font-semibold text-indigo-900">Sesión guardada en el atleta</p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-px bg-slate-200 border-b border-slate-200 sm:grid-cols-4">
        <div className={`${cellCls} text-xs font-semibold text-slate-800`}>Tempo Run</div>
        <div className={`${cellCls} text-center text-xs font-medium text-slate-800`}>{r.entrenamiento}</div>
        <div className={`${cellCls} text-center text-xs font-medium text-slate-800`}>COD {r.cod}</div>
        <div className={`${cellCls} text-center text-xs font-medium text-slate-800`}>
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
      <div className={rowCls}>
        <div className={cellCls}>
          <p className={labelCls}>Dis. serie</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{formatSummaryMeters(r.distancia_m)}</p>
        </div>
        <div className={cellCls}>
          <p className={labelCls}>Dis. ajustada</p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-slate-900">
            <span>{formatSummaryMeters(r.distancia_ajustada_m)}</span>
            {r.cod === "SI" ? (
              <span className="text-[10px] font-normal text-slate-500">
                ({formatSummaryMeters(r.distancia_m)} ÷ ({r.shuttles} + 1))
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div className={rowCls}>
        <div className={cellCls}>
          <p className={labelCls}>Velocidad</p>
          <p className="mt-0.5 text-xs text-slate-700">
            Mín {r.min.velocidad_kmh.toFixed(2)} · Máx {r.max.velocidad_kmh.toFixed(2)} km/h
          </p>
        </div>
        <div className={cellCls}>
          <p className={labelCls}>Ratio · pausa (m)</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{ratio.trim()}</p>
          <p className="text-xs text-slate-600">{formatSummaryMeters(r.pausa_m)}</p>
        </div>
      </div>
      <div className={rowCls}>
        <div className={cellCls}>
          <p className={labelCls}>Ritmo</p>
          <p className="mt-0.5 text-xs text-slate-700">
            Mín {r.min.ritmo_str} · Máx {r.max.ritmo_str}
          </p>
        </div>
        <div className={cellCls}>
          <p className={labelCls}>Pausa (tiempo)</p>
          <p className="mt-0.5 text-xs text-slate-700">
            Mín {r.min.pausa_str} · Máx {r.max.pausa_str}
          </p>
        </div>
      </div>
      <div className={`${cellCls} border-t border-slate-200 text-center text-xs font-medium text-slate-800`}>
        {r.series} series × {r.bloques} bloques · Volumen serie {formatSummaryMeters(r.volumen_serie_m)} · Volumen
        trabajo {formatSummaryMeters(r.volumen_trabajo_m)}
      </div>
    </div>
  );
}