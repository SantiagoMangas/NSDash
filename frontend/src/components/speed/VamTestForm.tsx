"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type VamTestType = "vam_2000m" | "vam_5min" | "test_30_15_ift" | "yoyo_ri1";

interface Props {
  athleteId: number | null;
  authToken: string | null;
  onSuccess?: () => void;
}

interface VamTestResponse {
  id: number;
  athlete_id: number;
  date: string;
  test_type: VamTestType;
  vam_kmh: number;
  vam_mpm: number;
  vam_ms: number;
}

const BASE_URL = "http://127.0.0.1:8000";

const TEST_TYPES: Array<{ key: VamTestType; label: string }> = [
  { key: "vam_2000m", label: "Test VAM 2000m" },
  { key: "vam_5min", label: "Test VAM 5 minutos" },
  { key: "test_30_15_ift", label: "Test 30-15 IFT" },
  { key: "yoyo_ri1", label: "Yo-Yo Test RI1" },
];

const TEST_DESCRIPTIONS: Record<
  VamTestType,
  { title: string; description: string }
> = {
  vam_2000m: {
    title: "Test VAM 2000m",
    description:
      "El atleta corre 2000 metros a máxima intensidad sostenida. Ingresá el tiempo total en minutos (podés usar decimales: 7.5 = 7min 30seg). A partir del tiempo, la app calcula la Velocidad Aeróbica Máxima.",
  },
  vam_5min: {
    title: "Test VAM 5 minutos",
    description:
      "El atleta corre durante exactamente 5 minutos a máxima intensidad. Ingresá la distancia total recorrida en metros. La app calcula la VAM dividiendo esa distancia por el tiempo.",
  },
  test_30_15_ift: {
    title: "Test 30-15 IFT (Buchheit)",
    description:
      "Test intervalado con estadios de velocidad creciente (30 seg de carrera, 15 seg de pausa). Ingresá la velocidad en km/h del último estadio completado. Ese valor es la VIFT y equivale directamente a la VAM del atleta.",
  },
  yoyo_ri1: {
    title: "Yo-Yo Test RI1 (Intermittent Recovery)",
    description:
      "Test de ida y vuelta con recuperaciones de 10 seg entre series. Ingresá el nivel alcanzado (puede tener decimal, ej: 19.4). La app toma el número entero del nivel y lo convierte a km/h usando la tabla oficial del test.",
  },
};

function buildFieldLabels(testType: VamTestType) {
  switch (testType) {
    case "vam_2000m":
      return { value1: "Distancia (m)", value2: "Tiempo total (min)" };
    case "vam_5min":
      return { value1: "Tiempo total (min)", value2: "Distancia recorrida (m)" };
    case "test_30_15_ift":
      return { value1: "Velocidad final (km/h)", value2: null };
    case "yoyo_ri1":
      return { value1: "Nivel alcanzado", value2: "Velocidad de referencia (km/h)" };
  }
}

function formatSecondsToPace(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds - minutes * 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function calculatePreview(testType: VamTestType, value1: number, value2: number | null) {
  if (value1 <= 0 || (testType !== "test_30_15_ift" && value2 !== null && value2 <= 0)) {
    return null;
  }

  let vamKmh = 0;
  if (testType === "vam_2000m") {
    const tiempoMin = value2 ?? 0;
    if (tiempoMin <= 0) return null;
    const ritmo = (tiempoMin * 60) / value1; // segundos por metro
    const vamMpm = 60 / ritmo;
    vamKmh = (vamMpm * 60) / 1000;
  } else if (testType === "vam_5min") {
    const distancia = value2 ?? 0;
    if (distancia <= 0) return null;
    const ritmo = (value1 * 60) / distancia;
    const vamMpm = 60 / ritmo;
    vamKmh = (vamMpm * 60) / 1000;
  } else if (testType === "test_30_15_ift") {
    vamKmh = value1;
  } else if (testType === "yoyo_ri1") {
    vamKmh = value2 ?? 0;
  }

  if (!Number.isFinite(vamKmh) || vamKmh <= 0) {
    return null;
  }

  const ritmo = formatSecondsToPace(3600 / vamKmh);
  return { vamPreview: vamKmh.toFixed(2), ritmoPreview: ritmo };
}

export function VamTestForm({ athleteId, authToken, onSuccess }: Props) {
  const [testType, setTestType] = useState<VamTestType>("vam_2000m");
  const [value1, setValue1] = useState<string>("2000");
  const [value2, setValue2] = useState<string>("7");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<VamTestResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);

  const fieldLabels = useMemo(() => buildFieldLabels(testType), [testType]);
  const description = TEST_DESCRIPTIONS[testType];
  const isAuthenticated = Boolean(authToken);
  const today = new Date().toISOString().slice(0, 10);

  const parsedValue1 = useMemo(() => Number(value1.replace(",", ".")), [value1]);
  const parsedValue2 = useMemo(
    () => (value2.trim() === "" ? null : Number(value2.replace(",", "."))),
    [value2],
  );

  const preview = useMemo(
    () => calculatePreview(testType, parsedValue1, parsedValue2),
    [testType, parsedValue1, parsedValue2],
  );

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccess(null);
    }, 4000);
  }, [success]);

  const resetForm = () => {
    setError(null);
    setSuccess(null);
    setCreatedTest(null);
  };

  const handleTypeChange = (newType: VamTestType) => {
    setTestType(newType);
    resetForm();

    switch (newType) {
      case "vam_2000m":
        setValue1("2000");
        setValue2("7");
        break;
      case "vam_5min":
        setValue1("5");
        setValue2("1500");
        break;
      case "test_30_15_ift":
        setValue1("16");
        setValue2("");
        break;
      case "yoyo_ri1":
        setValue1("16");
        setValue2("16");
        break;
    }
  };

  const extractErrorMessage = (error: any) => {
    if (!error || typeof error !== "object") {
      return "Error al guardar el test. Intentá de nuevo.";
    }

    if (typeof error?.response?.data?.detail === "string") {
      return error.response.data.detail;
    }

    if (typeof error?.message === "string") {
      return error.message;
    }

    if (typeof error?.detail === "string") {
      return error.detail;
    }

    return "Error al guardar el test. Intentá de nuevo.";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatedTest(null);

    if (!athleteId) {
      setError("Seleccioná un atleta antes de registrar un test VAM.");
      return;
    }

    if (!isAuthenticated) {
      setError("Iniciá sesión para guardar el test VAM.");
      return;
    }

    if (!Number.isFinite(parsedValue1) || parsedValue1 <= 0) {
      setError("Ingresá un valor válido para el primer campo.");
      return;
    }

    if ((testType === "vam_2000m" || testType === "vam_5min" || testType === "yoyo_ri1") && (!parsedValue2 || parsedValue2 <= 0)) {
      setError("Ingresá un valor válido para el segundo campo.");
      return;
    }

    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        athlete_id: athleteId,
        date: today,
        test_type: testType,
        value1: parsedValue1,
        value2: parsedValue2 !== null ? parsedValue2 : null,
        notes: notes.trim() || null,
      };

      const response = await fetch(`${BASE_URL}/vam-tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as any)?.detail ?? `Error ${response.status}`,
        );
      }

      const data: VamTestResponse = await response.json();
      setCreatedTest(data);
      setSuccess(`✅ Test guardado. VAM: ${data.vam_kmh.toFixed(2)} km/h`);
      setValue1(testType === "vam_5min" ? "5" : testType === "test_30_15_ift" ? "16" : testType === "yoyo_ri1" ? "16" : "2000");
      setValue2(
        testType === "vam_2000m"
          ? "7"
          : testType === "vam_5min"
          ? "1500"
          : testType === "test_30_15_ift"
          ? ""
          : "16",
      );
      setNotes("");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setError(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Formulario de Test VAM</h3>
          <p className="mt-1 text-sm text-slate-500">
            Registra una prueba de VAM separada del sprint log y obtén los resultados oficiales.
          </p>
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Iniciá sesión para registrar un test VAM.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TEST_TYPES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleTypeChange(option.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  testType === option.key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
            <span className="font-medium">ℹ️ {description.title}</span>
            <p className="mt-1 text-blue-700">{description.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500 mb-2">{fieldLabels.value1}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={value1}
                onChange={(event) => setValue1(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            {fieldLabels.value2 && (
              <div>
                <label className="block text-xs text-slate-500 mb-2">{fieldLabels.value2}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={value2}
                  onChange={(event) => setValue2(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            )}
          </div>

          {preview && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <p className="text-sm font-medium text-green-800">Vista previa del resultado</p>
              <div className="flex gap-6 mt-1">
                <span className="text-green-700 text-sm">
                  VAM: <strong>{preview.vamPreview} km/h</strong>
                </span>
                <span className="text-green-700 text-sm">
                  Ritmo: <strong>{preview.ritmoPreview} /km</strong>
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-2">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Registrar test VAM"}
          </button>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          )}

          {createdTest && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Resultado del test registrado</p>
              <p>Test: {createdTest.test_type.replace("_", " ")}</p>
              <p>Fecha: {createdTest.date}</p>
              <p>VAM: {createdTest.vam_kmh.toFixed(2)} km/h</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
