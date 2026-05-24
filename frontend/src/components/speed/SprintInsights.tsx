import { insightToneClasses } from "@/lib/sprint-ui";
import type { SprintInsight } from "@/lib/types";

type SprintInsightsProps = {
  insights: SprintInsight[];
};

export function SprintInsights({ insights }: SprintInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${insightToneClasses(insight.tone)}`}
        >
          <span className="shrink-0 text-lg" aria-hidden>
            {insight.icon}
          </span>
          <p className="text-sm font-medium leading-snug">{insight.message}</p>
        </div>
      ))}
    </div>
  );
}
