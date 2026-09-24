"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  onLogout: () => void;
};

function navLinkClass(active: boolean): string {
  return `text-sm font-medium px-3 py-2 rounded-lg transition ${
    active
      ? "text-indigo-700 bg-indigo-50"
      : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
  }`;
}

export function AppHeader({ onLogout }: Props) {
  const pathname = usePathname();
  const onAtletas = pathname === "/atletas" || pathname.startsWith("/atletas/");
  const onEquipos = pathname === "/equipos" || pathname.startsWith("/equipos/");

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
        <Link href="/atletas" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">NSDash</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/atletas" className={navLinkClass(onAtletas)}>
            Atletas
          </Link>
          <span className="text-slate-300 px-1" aria-hidden="true">|</span>
          <Link href="/equipos" className={navLinkClass(onEquipos)}>
            Equipos
          </Link>
          <span className="text-slate-300 px-1" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={onLogout}
            className="text-sm font-medium px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
