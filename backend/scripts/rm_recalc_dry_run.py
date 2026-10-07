#!/usr/bin/env python3
"""
Solo lectura: estima cuántos training_logs cambiarían al pasar Oly/DLO a Epley 0.033
y (opcional) Hips si el coef en DB difiere del perfil. No llama on_startup, no commit, no deploy.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal, get_sqlite_path
from app.models import Exercise, TrainingLog
from app.strength_rm import (
    OLY_DLO_EXERCISE_NAMES,
    compute_estimated_rm,
    exercise_with_rm_profile,
)

HIPS_THRUST_NAME = "Hips Thrust - Br"
TARGET_NAMES = frozenset(OLY_DLO_EXERCISE_NAMES) | {HIPS_THRUST_NAME}


def main() -> int:
    db_path = get_sqlite_path()
    print(f"DB (solo lectura): {db_path}\n")

    with SessionLocal() as db:
        rows = (
            db.query(TrainingLog, Exercise)
            .join(Exercise, TrainingLog.exercise_id == Exercise.id)
            .filter(Exercise.name.in_(TARGET_NAMES))
            .all()
        )

        oly_dlo_logs = [pair for pair in rows if pair[1].name in OLY_DLO_EXERCISE_NAMES]
        hips_logs = [pair for pair in rows if pair[1].name == HIPS_THRUST_NAME]

        changed_oly = 0
        changed_hips = 0
        examples: list[dict] = []
        example_exercises_seen: set[str] = set()

        def maybe_add_example(
            log: TrainingLog,
            exercise: Exercise,
            before: float,
            after: float,
            after_ex: Exercise,
        ) -> None:
            if before == after or len(examples) >= 3:
                return
            if exercise.name in example_exercises_seen:
                return
            example_exercises_seen.add(exercise.name)
            examples.append(
                {
                    "log_id": log.id,
                    "exercise": exercise.name,
                    "weight": log.weight,
                    "reps": log.reps,
                    "formula_before": exercise.formula_type,
                    "coef_before": exercise.rm_coefficient,
                    "estimated_rm_before": before,
                    "formula_after": after_ex.formula_type,
                    "coef_after": after_ex.rm_coefficient,
                    "estimated_rm_after": after,
                }
            )

        for log, exercise in oly_dlo_logs:
            before = round(
                compute_estimated_rm(log.weight, log.reps, exercise),
                2,
            )
            after_ex = exercise_with_rm_profile(exercise)
            after = round(compute_estimated_rm(log.weight, log.reps, after_ex), 2)
            if before != after:
                changed_oly += 1
            maybe_add_example(log, exercise, before, after, after_ex)

        for log, exercise in hips_logs:
            before = round(
                compute_estimated_rm(log.weight, log.reps, exercise),
                2,
            )
            after_ex = exercise_with_rm_profile(exercise)
            after = round(compute_estimated_rm(log.weight, log.reps, after_ex), 2)
            if before != after:
                changed_hips += 1
            maybe_add_example(log, exercise, before, after, after_ex)

        summary = {
            "oly_dlo_logs_total": len(oly_dlo_logs),
            "oly_dlo_logs_would_change": changed_oly,
            "hips_thrust_logs_total": len(hips_logs),
            "hips_thrust_logs_would_change": changed_hips,
            "combined_logs_would_change": changed_oly + changed_hips,
            "examples": examples,
        }

        print("=== Conteo (sin escribir en DB) ===")
        print(f"  Logs Oly/DLO en scope:     {len(oly_dlo_logs)}")
        print(f"  De esos, RM cambiaría:     {changed_oly}")
        print(f"  Logs Hips Thrust - Br:     {len(hips_logs)}")
        print(f"  De esos, RM cambiaría:     {changed_hips}")
        print(f"  Total logs con cambio:     {changed_oly + changed_hips}")

        print("\n=== Hasta 3 ejemplos reales (antes -> despues) ===")
        if not examples:
            print("  (No hay logs en estos ejercicios o el RM ya coincide con el perfil nuevo.)")
        for ex in examples:
            print(
                f"  log {ex['log_id']} | {ex['exercise']} | {ex['weight']}×{ex['reps']} | "
                f"{ex['formula_before']}/{ex['coef_before']} -> RM {ex['estimated_rm_before']} | "
                f"{ex['formula_after']}/{ex['coef_after']} -> RM {ex['estimated_rm_after']}"
            )

        print("\n=== JSON ===")
        print(json.dumps(summary, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
