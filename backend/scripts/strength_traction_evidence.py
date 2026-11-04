"""Reporte legible: tracción, dominadas, OLY/DLO (ejecutar tras cambios de RM)."""

from __future__ import annotations

import json
import os
import sys

from app.db import SessionLocal
from app.main import STRENGTH_EXERCISES, on_startup
from app.models import Exercise
from app.strength_log_kinds import (
    HORIZONTAL_TRACTION_EXERCISE_NAME,
    PULL_UP_EXERCISE_NAMES,
    resolve_log_kind_for_exercise_name,
)
from app.strength_percentage import resolve_percentage_curve
from app.strength_rm import (
    EXERCISE_RM_PROFILES,
    OLY_DLO_EXERCISE_NAMES,
    compute_estimated_rm,
    exercise_with_rm_profile,
)


def main() -> int:
    on_startup()
    print("=== NSDash — evidencia tracción / dominadas / OLY-DLO ===\n")

    traction_block = [
        n
        for n in STRENGTH_EXERCISES
        if "Traccion" in n or "Tracción" in n
    ]
    print("Ejercicios de tracción en catálogo:")
    for name in traction_block:
        kind = resolve_log_kind_for_exercise_name(name)
        print(f"  - {name} [{kind}]")

    print("\n--- Remo horizontal (RM + % peso muerto) ---")
    ex = exercise_with_rm_profile(Exercise(name=HORIZONTAL_TRACTION_EXERCISE_NAME))
    sample_rm = compute_estimated_rm(60.0, 6, ex)
    print(f"  formula: {ex.formula_type}, coef: {ex.rm_coefficient}")
    print(f"  curva %: {resolve_percentage_curve(ex)}")
    print(f"  muestra 60 kg x 6 reps -> RM {round(sample_rm, 2)} kg")

    print("\n--- Dominadas (sin RM; modalidades band / PC / lastre) ---")
    for name in sorted(PULL_UP_EXERCISE_NAMES):
        print(f"  - {name}")

    print("\n--- OLY/DLO (Brzycki) ---")
    for name in OLY_DLO_EXERCISE_NAMES:
        prof = EXERCISE_RM_PROFILES.get(name)
        ex = exercise_with_rm_profile(Exercise(name=name))
        clean_style = (
            round(compute_estimated_rm(80.0, 5, ex), 2) if name == "Oly - Clean - Cargada" else None
        )
        extra = f", ref 80×5={clean_style}" if clean_style else ""
        print(f"  - {name}: {prof[0]}{extra}")

    print("\n--- Holly / Hip Strap ---")
    print("  (no están en Excel v4 ni en STRENGTH_EXERCISES; pendiente si Nico los suma)")

    with SessionLocal() as db:
        missing = [
            n for n in STRENGTH_EXERCISES if db.query(Exercise).filter(Exercise.name == n).first() is None
        ]
    if missing:
        print("\nFALLO: faltan en DB:", missing)
        return 1

    print("\nOK: catálogo en DB completo.")
    print("\nJSON resumen:")
    print(
        json.dumps(
            {
                "traction_count": len(traction_block),
                "pull_up_count": len(PULL_UP_EXERCISE_NAMES),
                "oly_dlo_count": len(OLY_DLO_EXERCISE_NAMES),
                "horizontal_sample_rm_60x6": round(sample_rm, 2),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
