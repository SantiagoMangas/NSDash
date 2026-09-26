"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  onLogout: () => void;
};

function navLinkClass(active: boolean): string {
  return `text-sm font-medium px-3 py-2 rounded-lg transition ${
    active
      ? "text-indigo-700 bg-indigo-50 shadow-sm"
      : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
  }`;
}

export function AppHeader({ onLogout }: Props) {
  const pathname = usePathname();
  const onInicio = pathname === "/inicio";
  const onFuerza = pathname === "/fuerza";
  const onResistencia = pathname === "/resistencia";
  const onAtletas = pathname === "/atletas" || pathname.startsWith("/atletas/");
  const onEquipos = pathname === "/equipos" || pathname.startsWith("/equipos/");
  const onEjercicios = pathname === "/ejercicios" || pathname.startsWith("/ejercicios/");

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <Link href="/inicio" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">NSDash</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/inicio" className={navLinkClass(onInicio)}>
            Inicio
          </Link>
          <Link href="/fuerza" className={navLinkClass(onFuerza)}>
            💪 Fuerza
          </Link>
          <Link href="/resistencia" className={navLinkClass(pathname === "/resistencia")}>
            ⚡ Resistencia
          </Link>
          <Link href="/atletas" className={navLinkClass(onAtletas)}>
            Atletas
          </Link>
          <Link href="/equipos" className={navLinkClass(onEquipos)}>
            Equipos
          </Link>
          <Link href="/ejercicios" className={navLinkClass(onEjercicios)}>
            Ejercicios
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="text-sm font-medium px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition ml-1"
          >
            Salir
          </button>
        </nav>
      </div>
    </header>
  );
}
