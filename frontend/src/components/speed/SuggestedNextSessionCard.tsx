import type { SessionSuggestion } from "@/lib/types";

type SuggestedNextSessionCardProps = {
  suggestion: SessionSuggestion;
  onSelectDistance?: (distance: number) => void;
};

export function SuggestedNextSessionCard({
  suggestion,
  onSelectDistance,
}: SuggestedNextSessionCardProps) {
  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            →
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
              Próxima sesión sugerida
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-800">{suggestion.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{suggestion.description}</p>
            {suggestion.hint && (
              <p className="mt-2 text-xs text-slate-400">{suggestion.hint}</p>
            )}
          </div>
        </div>
        {suggestion.suggestedDistance != null && onSelectDistance && (
          <button
            type="button"
            onClick={() => onSelectDistance(suggestion.suggestedDistance!)}
            className="shrink-0 self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98]"
          >
            Usar {suggestion.suggestedDistance}m
          </button>
        )}
      </div>
    </section>
  );
}
