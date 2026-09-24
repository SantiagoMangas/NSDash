"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AthleteProfileHeader } from "@/components/athletes/AthleteProfileHeader";
import { AthleteDetailProvider } from "@/contexts/AthleteDetailContext";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useToast } from "@/contexts/ToastContext";
import { getAthlete } from "@/lib/api/athletes";
import { getTeams, type Team } from "@/lib/api/teams";
import { parseAthlete } from "@/lib/athletes/parseAthlete";
import { persistModule } from "@/lib/storage";
import type { Athlete } from "@/lib/types";

function parseAthleteId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export default function AthleteDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { pushToast } = useToast();

  const athleteId = parseAthleteId(params.id);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAthlete = useCallback(async () => {
    if (athleteId === null) {
      setLoadError("Atleta no válido");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getAthlete(athleteId);
      const parsed = parseAthlete(data);
      if (!parsed) {
        setLoadError("No se pudo leer la ficha del atleta.");
        setAthlete(null);
      } else {
        setAthlete(parsed);
      }
    } catch {
      setLoadError("Atleta no encontrado.");
      setAthlete(null);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    void loadAthlete();
  }, [loadAthlete]);

  useEffect(() => {
    getTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  const basePath = athleteId !== null ? `/atletas/${athleteId}` : "/atletas";
  const onFuerza = pathname.endsWith("/fuerza");
  const onResistencia = pathname.endsWith("/resistencia");

  const tabClass = (active: boolean) =>
    `px-5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
      active
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
    }`;

  if (athleteId === null) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-red-600">{loadError ?? "Atleta no válido"}</p>
        <Link href="/atletas" className="text-sm text-indigo-600 mt-2 inline-block">
          Volver a la lista
        </Link>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <LoadingCard message="Cargando ficha del atleta..." />
      </main>
    );
  }

  if (!athlete || loadError) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-red-600">{loadError ?? "Atleta no encontrado."}</p>
        <Link href="/atletas" className="text-sm text-indigo-600 mt-2 inline-block">
          Volver a la lista
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <AthleteProfileHeader
        athlete={athlete}
        teams={teams}
        onAthleteUpdated={() => void loadAthlete()}
        onAthleteDeleted={() => router.push("/atletas")}
        onToast={(type, message) => pushToast(type, message)}
      />

      <div className="flex gap-2">
        <Link
          href={`${basePath}/fuerza`}
          className={tabClass(onFuerza)}
          onClick={() => persistModule("strength")}
        >
          💪 Fuerza
        </Link>
        <Link
          href={`${basePath}/resistencia`}
          className={tabClass(onResistencia)}
          onClick={() => persistModule("resistencia")}
        >
          ⚡ Velocidad y Resistencia
        </Link>
      </div>

      <AthleteDetailProvider athlete={athlete}>{children}</AthleteDetailProvider>
    </main>
  );
}
