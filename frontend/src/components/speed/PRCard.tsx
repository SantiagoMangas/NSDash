import type { SprintLog } from "@/lib/types";

type PRCardProps = {
  prs: SprintLog[];
};

export function PRCard({ prs }: PRCardProps) {
  if (prs.length === 0) return null;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-lg text-white shadow-md shadow-emerald-200">
          🏆
        </div>
        <div>
          <h2 className="text-base font-semibold text-emerald-800">Records personales</h2>
          <p className="text-xs text-emerald-600">Mejor marca histórica por distancia</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {prs.map((pr) => (
          <div
            key={pr.distance}
            className="rounded-xl border border-emerald-200 bg-white p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
          >
            <p className="mb-1 text-xs font-medium text-emerald-600">{pr.distance}m</p>
            <p className="text-2xl font-bold text-emerald-700">{pr.time_seconds.toFixed(2)}s</p>
            <p className="mt-1 text-xs text-slate-500">
              {pr.average_speed.toFixed(2)} m/s · {pr.date}
            </p>
            {pr.improvement_percent !== null && (
              <p className="mt-2 text-xs font-semibold text-emerald-600">
                ↓ {pr.improvement_percent}% vs PR anterior
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
