"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAthletes } from "@/lib/api/athletes";
import { getTeams } from "@/lib/api/teams";
import { parseAthlete } from "@/lib/athletes/parseAthlete";

type Tile = {
  href: string;
  title: string;
  description: string;
  emoji: string;
};

const TILES: Tile[] = [
  {
    href: "/fuerza",
    title: "Fuerza",
    description: "Registros, RM estimado, gráficos y tabla de porcentajes.",
    emoji: "💪",
  },
  {
    href: "/resistencia",
    title: "Velocidad y resistencia",
    description: "VAM, tests de velocidad, entrenamientos e historial.",
    emoji: "⚡",
  },
  {
    href: "/atletas",
    title: "Atletas",
    description: "Lista, fichas, alta y acceso rápido a cada módulo.",
    emoji: "👤",
  },
  {
    href: "/equipos",
    title: "Equipos",
    description: "Plantel, Tabla Nacional y asignación de atletas.",
    emoji: "🏟️",
  },
];

export default function InicioPage() {
  const [athleteCount, setAthleteCount] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);

  useEffect(() => {
    getAthletes()
      .then((data) =>
        setAthleteCount(
          Array.isArray(data)
            ? data.map(parseAthlete).filter(Boolean).length
            : 0,
        ),
      )
      .catch(() => setAthleteCount(0));
    getTeams()
      .then((t) => setTeamCount(t.length))
      .catch(() => setTeamCount(0));
  }, []);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-3">
            NSDash
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight text-balance">
            Tu centro de preparación física
          </h1>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Elegí un módulo para empezar. No hace falta seleccionar un atleta hasta que quieras
            cargar o revisar datos.
          </p>
          {(athleteCount !== null || teamCount !== null) && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {athleteCount !== null && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 text-sm text-slate-600 shadow-sm">
                  <span className="font-semibold text-slate-800">{athleteCount}</span> atletas
                </span>
              )}
              {teamCount !== null && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 text-sm text-slate-600 shadow-sm">
                  <span className="font-semibold text-slate-800">{teamCount}</span> equipos
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md hover:bg-indigo-50/30 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <div className="flex flex-col h-full min-h-[128px]">
                <span
                  className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-indigo-50 text-2xl mb-4"
                  aria-hidden
                >
                  {tile.emoji}
                </span>
                <h2 className="text-lg font-semibold text-slate-800">{tile.title}</h2>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed flex-1">
                  {tile.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
                  Entrar
                  <span className="transition group-hover:translate-x-0.5" aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          En Fuerza y Resistencia podés elegir un atleta desde el selector superior cuando lo
          necesites.
        </p>
      </div>
    </main>
  );
}
