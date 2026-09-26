import { Suspense } from "react";
import { ExercisesCatalogClient } from "./ExercisesCatalogClient";

export default function EjerciciosPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-sm text-slate-500 animate-pulse">Cargando ejercicios...</p>
        </main>
      }
    >
      <ExercisesCatalogClient />
    </Suspense>
  );
}
