"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getNationalTableGroups,
  type NationalGroup,
  type NationalTableAthleteRow,
} from "@/lib/api/speed";

type Props = {
  refreshKey?: number;
};

const DEBOUNCE_MS = 350;
const DEFAULT_PCT_SRR = 60;
const DEFAULT_CANTIDAD_GRUPOS = 3;
const DEFAULT_DIFERENCIA_PCT = 5;

const MISSING_LABELS: Record<string, string> = {
  speed_test: "Falta Test de Velocidad (MSS)",
  test_30_15_ift: "Falta test 30-15 IFT",
};

function mapMissingMessages(missing: string[]): string[] {
  return missing.map((key) => MISSING_LABELS[key] ?? `Falta dato (${key})`);
}

function parsePositiveNumber(raw: string): number | null {
  const numeric = Number(raw.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function parseNonNegativeNumber(raw: string): number | null {
  const numeric = Number(raw.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
}

function parsePositiveInt(raw: string): number | null {
  const numeric = Number(raw.replace(",", "."));
  if (!Number.isInteger(numeric) || numeric < 1) return null;
  return numeric;
}

function formatKmh(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(2);
}

export function NationalTableSection({ refreshKey = 0 }: Props) {
  const [pctSrrInput, setPctSrrInput] = useState(String(DEFAULT_PCT_SRR));
  const [cantidadInput, setCantidadInput] = useState(String(DEFAULT_CANTIDAD_GRUPOS));
  const [diferenciaInput, setDiferenciaInput] = useState(String(DEFAULT_DIFERENCIA_PCT));

  const [pctSrr, setPctSrr] = useState(DEFAULT_PCT_SRR);
  const [cantidadGrupos, setCantidadGrupos] = useState(DEFAULT_CANTIDAD_GRUPOS);
  const [diferenciaPct, setDiferenciaPct] = useState(DEFAULT_DIFERENCIA_PCT);

  const [athletes, setAthletes] = useState<NationalTableAthleteRow[]>([]);
  const [groups, setGroups] = useState<NationalGroup[]>([]);
  const [sinDatos, setSinDatos] = useState<NationalTableAthleteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pctSrrRef = useRef(DEFAULT_PCT_SRR);
  const cantidadRef = useRef(DEFAULT_CANTIDAD_GRUPOS);
  const diferenciaRef = useRef(DEFAULT_DIFERENCIA_PCT);

  const completeAthletes = useMemo(
    () => athletes.filter((row) => row.missing.length === 0),
    [athletes],
  );

  const fetchGroups = useCallback(
    async (nextPctSrr: number, nextCantidad: number, nextDiferencia: number) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const data = await getNationalTableGroups(nextPctSrr, nextCantidad, nextDiferencia);
        if (requestId !== requestIdRef.current) return;

        setAthletes(data.athletes);
        setGroups(data.groups);
        setSinDatos(data.sin_datos);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError("No se pudo cargar la Tabla Nacional. Intentá de nuevo.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const scheduleFetch = useCallback(
    (nextPctSrr: number, nextCantidad: number, nextDiferencia: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void fetchGroups(nextPctSrr, nextCantidad, nextDiferencia);
      }, DEBOUNCE_MS);
    },
    [fetchGroups],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;

    setPctSrrInput(String(DEFAULT_PCT_SRR));
    setCantidadInput(String(DEFAULT_CANTIDAD_GRUPOS));
    setDiferenciaInput(String(DEFAULT_DIFERENCIA_PCT));
    setPctSrr(DEFAULT_PCT_SRR);
    setCantidadGrupos(DEFAULT_CANTIDAD_GRUPOS);
    setDiferenciaPct(DEFAULT_DIFERENCIA_PCT);
    pctSrrRef.current = DEFAULT_PCT_SRR;
    cantidadRef.current = DEFAULT_CANTIDAD_GRUPOS;
    diferenciaRef.current = DEFAULT_DIFERENCIA_PCT;

    void fetchGroups(DEFAULT_PCT_SRR, DEFAULT_CANTIDAD_GRUPOS, DEFAULT_DIFERENCIA_PCT);
  }, [refreshKey, fetchGroups]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handlePctSrrChange(raw: string) {
    setPctSrrInput(raw);
    setError(null);
    const parsed = parsePositiveNumber(raw);
    if (parsed === null) {
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }
    setPctSrr(parsed);
    pctSrrRef.current = parsed;
    scheduleFetch(parsed, cantidadRef.current, diferenciaRef.current);
  }

  function handleCantidadChange(raw: string) {
    setCantidadInput(raw);
    setError(null);
    const parsed = parsePositiveInt(raw);
    if (parsed === null) {
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }
    setCantidadGrupos(parsed);
    cantidadRef.current = parsed;
    scheduleFetch(pctSrrRef.current, parsed, diferenciaRef.current);
  }

  function handleDiferenciaChange(raw: string) {
    setDiferenciaInput(raw);
    setError(null);
    const parsed = parseNonNegativeNumber(raw);
    if (parsed === null) {
      requestIdRef.current += 1;
      setLoading(false);
      return;
    }
    setDiferenciaPct(parsed);
    diferenciaRef.current = parsed;
    scheduleFetch(pctSrrRef.current, cantidadRef.current, parsed);
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-1">Tabla Nacional</h2>
          <p className="text-xs text-slate-400">
            Vista de equipo (todos tus atletas). ASR y velocidad de referencia al %SRR elegido, con
            agrupamiento por techo propio.
          </p>
        </div>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            Actualizando…
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <label className="space-y-2">
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
        <label className="space-y-2">
          <span className="text-xs font-medium text-slate-600">Cantidad de grupos</span>
          <input
            type="number"
            min="1"
            step="1"
            value={cantidadInput}
            onChange={(event) => handleCantidadChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-slate-600">Diferencia %</span>
          <input
            type="number"
            min="0"
            step="any"
            value={diferenciaInput}
            onChange={(event) => handleDiferenciaChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {!loading && completeAthletes.length === 0 && sinDatos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No hay atletas cargados todavía.
        </div>
      ) : null}

      {completeAthletes.length > 0 ? (
        <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Atleta</th>
                <th className="px-4 py-3 font-medium">IFT</th>
                <th className="px-4 py-3 font-medium">MMSS</th>
                <th className="px-4 py-3 font-medium">ASR</th>
                <th className="px-4 py-3 font-medium">Vel. ref. ({pctSrr}% SRR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...completeAthletes]
                .sort(
                  (a, b) =>
                    (b.velocidad_referencia_kmh ?? 0) - (a.velocidad_referencia_kmh ?? 0),
                )
                .map((row) => (
                  <tr key={row.athlete_id} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.nombre}</td>
                    <td className="px-4 py-3 text-slate-700">{formatKmh(row.ift_kmh)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatKmh(row.mmss_kmh)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatKmh(row.asr_kmh)}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">
                      {formatKmh(row.velocidad_referencia_kmh)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {groups.length > 0 ? (
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Agrupamiento · {cantidadGrupos} grupos · {diferenciaPct}% diferencia
          </h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.grupo}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">Grupo {group.grupo}</h4>
                  <span className="text-xs text-slate-500">
                    Techo {group.techo_kmh.toFixed(2)} km/h
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {group.athletes.map((athlete) => (
                    <li
                      key={athlete.athlete_id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-slate-800">{athlete.nombre}</span>
                      <span className="text-indigo-700 font-semibold">
                        {athlete.velocidad_referencia_kmh.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {sinDatos.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <h3 className="text-sm font-semibold text-amber-900">Sin datos (fuera del agrupamiento)</h3>
          <ul className="mt-3 space-y-2">
            {sinDatos.map((row) => (
              <li key={row.athlete_id} className="text-sm text-amber-900">
                <span className="font-medium">{row.nombre}</span>
                <span className="text-amber-800">
                  {" — "}
                  {mapMissingMessages(row.missing).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
