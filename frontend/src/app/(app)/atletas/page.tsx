import { Suspense } from "react";
import { AtletasListClient } from "./AtletasListClient";

export default function AtletasPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-sm text-slate-500 animate-pulse">Cargando atletas...</p>
        </main>
      }
    >
      <AtletasListClient />
    </Suspense>
  );
}
