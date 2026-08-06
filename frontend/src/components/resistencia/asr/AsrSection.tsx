"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAsr,
  type AsrComparativaPorMss,
  type AsrComparativaPorSrr,
  type AsrResponse,
} from "@/lib/api/speed";

type Props = {
  athleteId: number | null;
  refreshKey?: number;
};

const DEBOUNCE_MS = 350;
const DEFAULT_PCT_MSS = 80;
const DEFAULT_PCT_SRR = 60;

const MISSING_LABELS: Record<string, string> = {
  speed_test: "Falta cargar un Test de Velocidad (MSS)",
  test_30_15_ift: "Falta cargar un test 30-15 IFT",
};

function mapMissingMessages(missing: string[]): string[] {
  return missing.map((key) => MISSING_LABELS[key] ?? `Falta un dato requerido (${key})`);
}

function parsePositiveNumber(raw: string): number | null {
  const numeric = Number(raw.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

export function AsrSection({ athleteId, refreshKey = 0 }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingMessages, setMissingMessages] = useState<string[] | null>(null);

  const [mssKmh, setMssKmh] = useState<number | null>(null);
  const [iftKmh, setIftKmh] = useState<number | null>(null);
  const [asrKmh, setAsrKmh] = useState<number | null>(null);

  const [pctMssInput, setPctMssInput] = useState(String(DEFAULT_PCT_MSS));
  const [pctSrrInput, setPctSrrInput] = useState(String(DEFAULT_PCT_SRR));
  const [pctMss, setPctMss] = useState(DEFAULT_PCT_MSS);
  const [pctSrr, setPctSrr] = useState(DEFAULT_PCT_SRR);

  const [comparativaMss, setComparativaMss] = useState<AsrComparativaPorMss | null>(null);
  const [comparativaSrr, setComparativaSrr] = useState<AsrComparativaPorSrr | null>(null);

  const requestIdRef = useRef(0);
  const debounceMssRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceSrrRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pctMssRef = useRef(DEFAULT_PCT_MSS);
  const pctSrrRef = useRef(DEFAULT_PCT_SRR);

  const applyBaseMetrics = useCallback((data: AsrResponse) => {
    setMssKmh(data.mss_kmh);
    setIftKmh(data.ift_kmh);
    setAsrKmh(data.asr_kmh);
  }, []);

  const fetchAsr = useCallback(
    async (
      nextPctMss: number,
      nextPctSrr: number,
      update: "both" | "mss" | "srr",
    ) => {
      if (athleteId === null) return;

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const data = await getAsr(athleteId, nextPctMss, nextPctSrr);
        if (requestId !== requestIdRef.current) return;

        if (data.missing.length > 0) {
          setMissingMessages(mapMissingMessages(data.missing));
          setMssKmh(null);
          setIftKmh(null);
          setAsrKmh(null);
          setComparativaMss(null);
          setComparativaSrr(null);
          return;
        }

        setMissingMessages(null);
        applyBaseMetrics(data);

        if (update === "both" || update === "mss") {
          setComparativaMss(data.comparativa_por_mss);
        }
        if (update === "both" || update === "srr") {
          setComparativaSrr(data.comparativa_por_srr);
        }
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError("No se pudo cargar el ASR. Intentá de nuevo.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [athleteId, applyBaseMetrics],
  );

  useEffect(() => {
    if (debounceMssRef.current) clearTimeout(debounceMssRef.current);
    if (debounceSrrRef.current) clearTimeout(debounceSrrRef.current);
    requestIdRef.current += 1;

    setPctMssInput(String(DEFAULT_PCT_MSS));
    setPctSrrInput(String(DEFAULT_PCT_SRR));
    setPctMss(DEFAULT_PCT_MSS);
    setPctSrr(DEFAULT_PCT_SRR);
    pctMssRef.current = DEFAULT_PCT_MSS;
    pctSrrRef.current = DEFAULT_PCT_SRR;
    setMissingMessages(null);
    setError(null);
    setComparativaMss(null);
    setComparativaSrr(null);
    setMssKmh(null);
    setIftKmh(null);
    setAsrKmh(null);

    if (athleteId === null) {
      setLoading(false);
      return;
    }

    void fetchAsr(DEFAULT_PCT_MSS, DEFAULT_PCT_SRR, "both");
  }, [athleteId, refreshKey, fetchAsr]);

  useEffect(() => {
    return () => {
      if (debounceMssRef.current) clearTimeout(debounceMssRef.current);
      if (debounceSrrRef.current) clearTimeout(debounceSrrRef.current);
    };
  }, []);

  function handlePctMssChange(raw: string) {
    setPctMssInput(raw);
    setError(null);

    if (debounceMssRef.current) clearTimeout(debounceMssRef.current);

    const parsed = parsePositiveNumber(raw);
    if (parsed === null) {
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }

    debounceMssRef.current = setTimeout(() => {
      setPctMss(parsed);
      pctMssRef.current = parsed;
      void fetchAsr(parsed, pctSrrRef.current, "mss");
    }, DEBOUNCE_MS);
  }

  function handlePctSrrChange(raw: string) {
    setPctSrrInput(raw);
    setError(null);

    if (debounceSrrRef.current) clearTimeout(debounceSrrRef.current);

    const parsed = parsePositiveNumber(raw);
    if (parsed === null) {
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }

    debounceSrrRef.current = setTimeout(() => {
      setPctSrr(parsed);
      pctSrrRef.current = parsed;
      void fetchAsr(pctMssRef.current, parsed, "srr");
    }, DEBOUNCE_MS);
  }

  if (athleteId === null) {
    return null;
  }

  const hasCompleteData =
    missingMessages === null &&
    mssKmh !== null &&
    iftKmh !== null &&
    asrKmh !== null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-1">
            ASR (Reserva de Velocidad Anaeróbica)
          </h2>
          <p className="text-xs text-slate-400">
            ASR = MSS − IFT. Ajustá los porcentajes para comparar por %MSS o %SRR.
          </p>
        </div>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            Actualizando…
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {missingMessages && missingMessages.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-medium text-amber-900">No se puede calcular el ASR todavía</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {missingMessages.map((msg) => (
              <li key={msg}>• {msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!missingMessages && !hasCompleteData && loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Cargando ASR…
        </div>
      ) : null}

      {hasCompleteData ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">MSS</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {mssKmh.toFixed(2)} <span className="text-sm font-normal">km/h</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Velocidad máxima (Speed Test)</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">IFT</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {iftKmh.toFixed(2)} <span className="text-sm font-normal">km/h</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Mejor test 30-15 IFT</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-600">ASR</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {asrKmh.toFixed(2)} <span className="text-sm font-normal">km/h</span>
              </p>
              <p className="mt-1 text-xs text-indigo-700">MSS − IFT</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Comparativa por %MSS</h3>
              <label className="mt-3 block space-y-2">
                <span className="text-xs font-medium text-slate-600">% MSS</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={pctMssInput}
                  onChange={(event) => handlePctMssChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>
                  Velocidad:{" "}
                  <strong className="text-slate-900">
                    {comparativaMss ? `${comparativaMss.velocidad_kmh.toFixed(2)} km/h` : "—"}
                  </strong>
                </p>
                <p>
                  % SRR equivalente:{" "}
                  <strong className="text-indigo-700">
                    {comparativaMss ? `${comparativaMss.srr_pct.toFixed(2)}%` : "—"}
                  </strong>
                </p>
                <p className="text-xs text-slate-400">Usando {pctMss}% MSS</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Comparativa por %SRR</h3>
              <label className="mt-3 block space-y-2">
                <span className="text-xs font-medium text-slate-600">% SRR</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={pctSrrInput}
                  onChange={(event) => handlePctSrrChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>
                  Velocidad:{" "}
                  <strong className="text-slate-900">
                    {comparativaSrr ? `${comparativaSrr.velocidad_kmh.toFixed(2)} km/h` : "—"}
                  </strong>
                </p>
                <p>
                  % MSS equivalente:{" "}
                  <strong className="text-indigo-700">
                    {comparativaSrr ? `${comparativaSrr.mmss_pct.toFixed(2)}%` : "—"}
                  </strong>
                </p>
                <p className="text-xs text-slate-400">Usando {pctSrr}% SRR</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
