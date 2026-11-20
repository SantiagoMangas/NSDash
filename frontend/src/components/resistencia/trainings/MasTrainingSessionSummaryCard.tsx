import type { MasTrainingCalculateResponse } from "@/lib/api/sessions";
import {
  HeaderCell,
  SummaryCardShell,
  SummaryField,
  formatSummaryMeters,
  pausaLine,
  summaryColCls,
  trabajoLine,
} from "./sessionSummaryPrimitives";

export type MasTrainingSavedSnapshot = {
  result: MasTrainingCalculateResponse;
  ratio: string;
  request?: Record<string, unknown>;
};

function num(request: Record<string, unknown> | undefined, key: string, fallback: number): number {
  if (!request) return fallback;
  const v = request[key];
  return typeof v === "number" ? v : Number(v) || fallback;
}

type Props = {
  snapshot: MasTrainingSavedSnapshot;
  showSavedBanner?: boolean;
};

export function MasTrainingSessionSummaryCard({ snapshot, showSavedBanner = true }: Props) {
  const { result: r, ratio, request } = snapshot;
  const bloques = num(request, "bloques", 0);
  const macro = num(request, "macro_pausa_min", 0);
  return (
    <SummaryCardShell
      showSavedBanner={showSavedBanner}
      header={
        <>
          <HeaderCell className="!text-left font-semibold">MAS Training</HeaderCell>
          <HeaderCell>{r.entrenamiento}</HeaderCell>
          <HeaderCell>COD {r.cod}</HeaderCell>
          <HeaderCell>
            {r.cod === "SI" ? (
              <>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Shuttles</span>
                <span className="mt-0.5 inline-block">{r.shuttles}</span>
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </HeaderCell>
        </>
      }
      body={
        <>
          <div className={summaryColCls}>
            <SummaryField label="Tiempo de trabajo">{trabajoLine(r.min, r.max)}</SummaryField>
            <SummaryField label="Velocidad">
              <p>Mín {r.min.velocidad_kmh.toFixed(2)} km/h</p>
            </SummaryField>
            <SummaryField label="Ritmo">
              <p>Mín {r.min.ritmo_str}</p>
            </SummaryField>
          </div>
          <div className={summaryColCls}>
            <SummaryField label="Distancia por intervalo">
              <p>
                Mín {formatSummaryMeters(r.min.distancia_m)} · Máx {formatSummaryMeters(r.max.distancia_m)}
              </p>
            </SummaryField>
            <SummaryField label="Velocidad">
              <p>Máx {r.max.velocidad_kmh.toFixed(2)} km/h</p>
            </SummaryField>
            <SummaryField label="Ritmo">
              <p>Máx {r.max.ritmo_str}</p>
            </SummaryField>
          </div>
          <div className={summaryColCls}>
            <SummaryField label="Ratio">
              <p className="text-sm font-medium text-slate-900">{ratio.trim()}</p>
              {macro > 0 ? <p className="text-slate-600">Macro pausa {macro} min</p> : null}
            </SummaryField>
            <SummaryField label="Tiempo de pausa">{pausaLine(r.min, r.max)}</SummaryField>
          </div>
        </>
      }
      footer={
        <>
          Serie {r.serie_min} min{bloques > 0 ? ` · ${bloques} bloques` : ""} · Volumen trabajo{" "}
          {formatSummaryMeters(r.max.volumen_trabajo_m)}
        </>
      }
    />
  );
}