"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { filterExercisesForPanel } from "@/lib/strength/exerciseSearch";

type ExerciseOption = { id: number; name: string };

type Props = {
  exercises: ExerciseOption[];
  selectedExerciseId: number | null;
  onSelect: (exerciseId: number) => void;
  disabled?: boolean;
};

export function ExercisePicker({
  exercises,
  selectedExerciseId,
  onSelect,
  disabled = false,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = exercises.find((e) => e.id === selectedExerciseId) ?? null;

  useEffect(() => {
    if (selectedExerciseId === null) {
      setQuery("");
      return;
    }
    if (selected) setQuery(selected.name);
  }, [selectedExerciseId, selected?.id, selected?.name]);

  const filtered = useMemo(
    () => filterExercisesForPanel(exercises, query),
    [exercises, query],
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showList = open && !disabled && filtered.length > 0;

  return (
    <div ref={rootRef} className="relative max-w-md">
      <input
        type="search"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Escribí para buscar un ejercicio…"
        aria-label="Buscar ejercicio"
        aria-expanded={showList}
        aria-controls={listId}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1"
        >
          {filtered.slice(0, 50).map((exercise) => (
            <li key={exercise.id} role="option" aria-selected={exercise.id === selectedExerciseId}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 ${
                  exercise.id === selectedExerciseId
                    ? "bg-indigo-50 text-indigo-800 font-medium"
                    : "text-slate-700"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(exercise.id);
                  setQuery(exercise.name);
                  setOpen(false);
                }}
              >
                {exercise.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && !disabled && query.trim() && filtered.length === 0 ? (
        <p className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
          Ningún ejercicio coincide.
        </p>
      ) : null}
    </div>
  );
}
