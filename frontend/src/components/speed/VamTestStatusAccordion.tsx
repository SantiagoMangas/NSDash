"use client";

import { useEffect, useState } from "react";

interface VamTestStatus {
  vam_2000m: { active: boolean; last_date?: string; last_vam?: number };
  vam_5min: { active: boolean; last_date?: string; last_vam?: number };
  test_30_15_ift: { active: boolean; last_date?: string; last_vam?: number };
  yoyo_ri1: { active: boolean; last_date?: string; last_vam?: number };
}

interface VamTestResponse {
  id: number;
  athlete_id: number;
  date: string;
  test_type: string;
  vam_kmh: number;
}

interface Props {
  athleteId: number | null;
  authToken: string;
}

const TEST_TYPES = [
  { key: "vam_2000m", label: "Test VAM 2000m" },
  { key: "vam_5min", label: "Test VAM 5 minutos" },
  { key: "test_30_15_ift", label: "Test 30-15 IFT" },
  { key: "yoyo_ri1", label: "Yo-Yo Test RI1" },
];

const BASE_URL = "http://127.0.0.1:8000";

export function VamTestStatusAccordion({ athleteId, authToken }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<VamTestStatus>({
    vam_2000m: { active: false },
    vam_5min: { active: false },
    test_30_15_ift: { active: false },
    yoyo_ri1: { active: false },
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) {
      setTestStatus({
        vam_2000m: { active: false },
        vam_5min: { active: false },
        test_30_15_ift: { active: false },
        yoyo_ri1: { active: false },
      });
      setError(null);
      return;
    }

    const fetchVamTests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${BASE_URL}/athletes/${athleteId}/vam-tests`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Error al cargar tests VAM");
        }

        const tests: VamTestResponse[] = await res.json();
        const newStatus: VamTestStatus = {
          vam_2000m: { active: false },
          vam_5min: { active: false },
          test_30_15_ift: { active: false },
          yoyo_ri1: { active: false },
        };

        // Agrupar por test_type y tomar el más reciente
        const testsByType: Record<string, VamTestResponse[]> = {};
        for (const test of tests) {
          if (!testsByType[test.test_type]) {
            testsByType[test.test_type] = [];
          }
          testsByType[test.test_type].push(test);
        }

        // Para cada tipo, tomar el más reciente
        for (const testType in testsByType) {
          const testsOfType = testsByType[testType];
          const latest = testsOfType.sort((a, b) =>
            b.date.localeCompare(a.date)
          )[0];

          newStatus[testType as keyof VamTestStatus] = {
            active: true,
            last_date: latest.date,
            last_vam: latest.vam_kmh,
          };
        }

        setTestStatus(newStatus);
      } catch {
        setError("No se pudieron cargar los tests VAM");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVamTests();
  }, [athleteId, authToken]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="border border-gray-200 rounded-lg mt-4">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors w-full"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            Estado de tests del atleta
          </span>
          {isLoading && (
            <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="divide-y divide-gray-200">
          {TEST_TYPES.map((testType) => {
            const status =
              testStatus[testType.key as keyof VamTestStatus];
            const isActive = status.active;

            return (
              <div
                key={testType.key}
                className={`flex items-center justify-between px-4 py-3 ${
                  isActive ? "" : "opacity-60"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {testType.label}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isActive ? "✓ Registrado" : "Sin datos"}
                    </span>
                  </div>
                  {isActive && status.last_date && status.last_vam && (
                    <p className="text-xs text-slate-400 mt-1">
                      Último: {formatDate(status.last_date)} — VAM:{" "}
                      {status.last_vam} km/h
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error message (discrete) */}
      {error && !isLoading && (
        <div className="px-4 py-2 text-xs text-slate-400 bg-slate-50">
          {error}
        </div>
      )}
    </div>
  );
}
