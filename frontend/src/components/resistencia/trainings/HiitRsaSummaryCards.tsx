import type {
  HiitContinuoCalculateResponse,
  HiitCortoCalculateResponse,
  HiitLargoCalculateResponse,
  RsaCalculateResponse,
} from "@/lib/api/sessions";
import {
  HeaderCell,
  SummaryCardShell,
  SummaryField,
  formatSummaryMeters,
  pausaLine,
  summaryColCls,
  trabajoLine,
} from "./sessionSummaryPrimitives";

function num(request: Record<string, unknown>, key: string): number {
  const v = request[key];
  return typeof v === "number" ? v : Number(v);
}

export function HiitCortoSessionSummaryCard({
  result: r,
  request,
  showSavedBanner = true,
}: {
  result: HiitCortoCalculateResponse;
  request: Record<string, unknown>;
  showSavedBanner?: boolean;
}) {
  const ratio = typeof request.ratio === "string" ? request.ratio : "—";
  const distancia = num(request, "distancia_m");
  const reps = num(request, "reps");
  const series = num(request, "series");
  const macro = num(request, "macro_pausa_min");

  return (
    <SummaryCardShell
      showSavedBanner={showSavedBanner}
      header={
        <>
          <HeaderCell className="!text-left font-semibold">HIIT Corto</HeaderCell>
          <HeaderCell>{formatSummaryMeters(distancia)}</HeaderCell>
          <HeaderCell>
            {reps} reps × {series} series
          </HeaderCell>
          <HeaderCell>Macro {macro} min</HeaderCell>
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
            </SummaryField>
            <SummaryField label="Tiempo de pausa">{pausaLine(r.min, r.max)}</SummaryField>
          </div>
        </>
      }
      footer={<>Volumen trabajo {formatSummaryMeters(r.volumen_m)}</>}
    />
  );
}

export function HiitLargoSessionSummaryCard({
  result: r,
  request,
  showSavedBanner = true,
}: {
  result: HiitLargoCalculateResponse;
  request: Record<string, unknown>;
  showSavedBanner?: boolean;
}) {
  const ratio = typeof request.ratio === "string" ? request.ratio : "—";
  const distancia = num(request, "distancia_m");
  const reps = num(request, "reps");
  const series = num(request, "series");
  const macro = num(request, "macro_pausa_min");

  return (
    <SummaryCardShell
      showSavedBanner={showSavedBanner}
      header={
        <>
          <HeaderCell className="!text-left font-semibold">HIIT Largo</HeaderCell>
          <HeaderCell>{formatSummaryMeters(distancia)}</HeaderCell>
          <HeaderCell>
            {reps} reps × {series} series
          </HeaderCell>
          <HeaderCell>Macro {macro} min</HeaderCell>
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
            </SummaryField>
            <SummaryField label="Tiempo de pausa">{pausaLine(r.min, r.max)}</SummaryField>
          </div>
        </>
      }
      footer={<>Volumen trabajo {formatSummaryMeters(r.volumen_m)}</>}
    />
  );
}

export function HiitContinuoSessionSummaryCard({
  result: r,
  request,
  showSavedBanner = true,
}: {
  result: HiitContinuoCalculateResponse;
  request: Record<string, unknown>;
  showSavedBanner?: boolean;
}) {
  const ratio = typeof request.ratio === "string" ? request.ratio : "—";
  const serie = num(request, "serie_min");
  const bloques = num(request, "bloques");
  const macro = num(request, "macro_pausa_min");
  const trabajoLabel =
    request.trabajo_min != null
      ? `${num(request, "trabajo_min")} min trabajo`
      : `${num(request, "trabajo_s")} s trabajo`;

  return (
    <SummaryCardShell
      showSavedBanner={showSavedBanner}
      header={
        <>
          <HeaderCell className="!text-left font-semibold">HIIT Continuo</HeaderCell>
          <HeaderCell>{r.entrenamiento}</HeaderCell>
          <HeaderCell>{trabajoLabel}</HeaderCell>
          <HeaderCell>
            Serie {serie} min · {bloques} bloques
          </HeaderCell>
        </>
      }
      body={
        <>
          <div className={summaryColCls}>
            <SummaryField label="Trabajo">{trabajoLine(r.min, r.max)}</SummaryField>
            <SummaryField label="Distancia (calc.)">
              <p>
                Mín {formatSummaryMeters(r.min.distancia_m)} · Máx {formatSummaryMeters(r.max.distancia_m)}
              </p>
            </SummaryField>
            <SummaryField label="Velocidad">
              <p>Mín {r.min.velocidad_kmh.toFixed(2)} km/h</p>
            </SummaryField>
            <SummaryField label="Ritmo">
              <p>Mín {r.min.ritmo_str}</p>
            </SummaryField>
          </div>
          <div className={summaryColCls}>
            <SummaryField label="Z2 (pausa activa)">
              <p>
                {r.z2_kmh.toFixed(2)} km/h ({r.z2_ritmo_str})
              </p>
              <p className="text-slate-500">
                {r.z2_pct_min.toFixed(0)}–{r.z2_pct_max.toFixed(0)} % ref.
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
              <p className="text-slate-600">Macro pausa {macro} min</p>
            </SummaryField>
            <SummaryField label="Tiempo de pausa">{pausaLine(r.min, r.max)}</SummaryField>
          </div>
        </>
      }
      footer={<>Volumen trabajo {formatSummaryMeters(r.volumen_trabajo_m)}</>}
    />
  );
}

export function RsaSessionSummaryCard({
  result: r,
  request,
  showSavedBanner = true,
}: {
  result: RsaCalculateResponse;
  request: Record<string, unknown>;
  showSavedBanner?: boolean;
}) {
  const ratio = typeof request.ratio === "string" ? request.ratio : "—";
  const distancia = num(request, "distancia_m");
  const reps = num(request, "reps");
  const series = num(request, "series");

  return (
    <SummaryCardShell
      showSavedBanner={showSavedBanner}
      header={
        <>
          <HeaderCell className="!text-left font-semibold">RSA</HeaderCell>
          <HeaderCell>{r.entrenamiento}</HeaderCell>
          <HeaderCell>{formatSummaryMeters(distancia)}</HeaderCell>
          <HeaderCell>
            {reps} reps × {series} series
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
            </SummaryField>
            <SummaryField label="Tiempo de pausa">{pausaLine(r.min, r.max)}</SummaryField>
          </div>
        </>
      }
      footer={
        <>
          Volumen serie {formatSummaryMeters(r.volumen_serie_m)} · Volumen trabajo {formatSummaryMeters(r.volumen_trabajo_m)}
        </>
      }
    />
  );
}