#!/usr/bin/env python3
"""
Solo lectura: estima cuántos training_logs cambiarían al pasar a Brzycki.
No llama on_startup, no commit, no deploy.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal, get_sqlite_path
from app.models import Athlete, Exercise, TrainingLog
from app.strength_log_kinds import LOG_KIND_PULL_UP
from app.strength_rm import (
    compute_estimated_rm,
    exercise_with_rm_profile,
    resolve_exercise_log_kind,
)

_PROTECTED_ATHLETE_NAME = "Máxima Alvarez Vanolli"


def _rm_pct_change(before: float | None, after: float) -> float | None:
    if before is None or before == 0:
        return None
    return round((after - before) / before * 100.0, 4)


def main() -> int:
    db_path = get_sqlite_path()
    print(f"DB (solo lectura): {db_path}\n")
    print(
        "Backup SQLite: en deploy/producción corre try_backup_sqlite_before_migrations() "
        "antes del recálculo (ver app/main.py on_startup y sqlite_startup_backup.py).\n"
    )

    with SessionLocal() as db:
        rows = (
            db.query(TrainingLog, Exercise, Athlete)
            .join(Exercise, TrainingLog.exercise_id == Exercise.id)
            .join(Athlete, TrainingLog.athlete_id == Athlete.id)
            .all()
        )

        rm_estimated_logs: list[tuple[TrainingLog, Exercise, Athlete]] = []
        for log, exercise, athlete in rows:
            if resolve_exercise_log_kind(exercise) == LOG_KIND_PULL_UP:
                continue
            rm_estimated_logs.append((log, exercise, athlete))

        changed = 0
        examples: list[dict] = []
        protected_deltas: list[dict] = []

        for log, exercise, athlete in rm_estimated_logs:
            rm_with_db = round(
                compute_estimated_rm(log.weight, log.reps, exercise),
                2,
            )
            after_ex = exercise_with_rm_profile(exercise)
            rm_with_profile = round(
                compute_estimated_rm(log.weight, log.reps, after_ex),
                2,
            )
            stored_before = (
                round(float(log.estimated_rm), 2)
                if log.estimated_rm is not None
                else rm_with_db
            )
            deploy_after = rm_with_profile
            stored_delta_pct = _rm_pct_change(stored_before, deploy_after)

            if stored_before != deploy_after:
                changed += 1
                if len(examples) < 5:
                    examples.append(
                        {
                            "log_id": log.id,
                            "exercise": exercise.name,
                            "weight": log.weight,
                            "reps": log.reps,
                            "formula_before": exercise.formula_type,
                            "coef_before": exercise.rm_coefficient,
                            "estimated_rm_before": stored_before,
                            "formula_after": after_ex.formula_type,
                            "coef_after": after_ex.rm_coefficient,
                            "estimated_rm_after": deploy_after,
                        }
                    )

            if athlete.name == _PROTECTED_ATHLETE_NAME:
                protected_deltas.append(
                    {
                        "log_id": log.id,
                        "weight": log.weight,
                        "reps": log.reps,
                        "estimated_rm_before": stored_before,
                        "estimated_rm_after": deploy_after,
                        "rm_change_pct": stored_delta_pct,
                    }
                )

        pct_values = [
            d["rm_change_pct"]
            for d in protected_deltas
            if d["rm_change_pct"] is not None
        ]

        summary = {
            "rm_estimated_logs_total": len(rm_estimated_logs),
            "logs_would_change_stored_rm": changed,
            "examples": examples,
            "protected_athlete_rm_change_pct_range": {
                "min": min(pct_values) if pct_values else None,
                "max": max(pct_values) if pct_values else None,
                "logs": len(protected_deltas),
                "logs_changed": sum(
                    1
                    for d in protected_deltas
                    if d["estimated_rm_before"] != d["estimated_rm_after"]
                ),
            },
        }

        print("=== Conteo (sin escribir en DB) ===")
        print(f"  Logs rm_estimated en scope: {len(rm_estimated_logs)}")
        print(f"  RM guardado cambiaría:      {changed}")

        print("\n=== Hasta 5 ejemplos (antes -> después) ===")
        if not examples:
            print("  (No hay cambios respecto a Brzycki.)")
        for ex in examples:
            print(
                f"  log {ex['log_id']} | {ex['exercise']} | {ex['weight']}×{ex['reps']} | "
                f"RM {ex['estimated_rm_before']} -> {ex['estimated_rm_after']} "
                f"({ex['formula_before']} -> {ex['formula_after']})"
            )

        print("\n=== Atleta protegido (solo cargas y % cambio RM, sin nombres) ===")
        pr = summary["protected_athlete_rm_change_pct_range"]
        print(f"  Logs rm_estimated: {pr['logs']}")
        print(f"  Con cambio de RM:  {pr['logs_changed']}")
        print(f"  Cambio % RM min/max: {pr['min']} / {pr['max']}")

        print("\n=== JSON ===")
        print(json.dumps(summary, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())