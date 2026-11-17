"use client";

export type IntervalReferenceSourceKey = "vam" | "30_15" | "yoyo";

export const INTERVAL_REFERENCE_LABELS: Record<IntervalReferenceSourceKey, string> = {
  vam: "VAM",
  "30_15": "30-15 IFT",
  yoyo: "Yo-Yo RI1",
};

const SELECTOR_ORDER: IntervalReferenceSourceKey[] = ["vam", "30_15", "yoyo"];

type Props = {
  selected: IntervalReferenceSourceKey | null;
  onSelect: (key: IntervalReferenceSourceKey) => void;
  available: Record<IntervalReferenceSourceKey, boolean>;
  referenceKmh: number | null;
};

export function IntervalBandReferenceSelector({
  selected,
  onSelect,
  available,
  referenceKmh,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-medium text-slate-800">Referencia para HIIT y MAS Training</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SELECTOR_ORDER.map((ref) => {
          const enabled = available[ref];
          const active = selected === ref;
          return (
            <button
              key={ref}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onSelect(ref)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                enabled
                  ? active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  : "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-100"
              }`}
            >
              {INTERVAL_REFERENCE_LABELS[ref]}
            </button>
          );
        })}
      </div>
      {selected && referenceKmh != null ? (
        <p className="mt-2 text-xs text-slate-600">
          <span className="font-medium text-indigo-800">{INTERVAL_REFERENCE_LABELS[selected]}</span>
          {" · "}
          Ref. {referenceKmh.toFixed(2)} km/h
        </p>
      ) : null}
    </div>
  );
}