"""Evidencia: tablas %RM Sentadilla vs Peso Muerto (RM=100 y log real si existe)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal
from app.models import Exercise, TrainingLog
from app.strength_percentage import (
    apply_exercise_percentage_curves,
    build_percentage_table,
    curve_row_for_evidence,
    migrate_exercise_percentage_curve_column,
)


def print_table(title: str, rows: list) -> None:
    print(f"\n=== {title} ===")
    print(f"{'%RM':>6} | {'Reps':>4} | {'Carga':>8} | {'RIR+1':>5} | {'RIR+2':>5}")
    print("-" * 40)
    for row in rows:
        print(
            f"{row['percentage']:>6.1f} | {row['reps']:>4} | {row['weight']:>8.2f} | "
            f"{row['rir_plus_1']:>5} | {row['rir_plus_2']:>5}"
        )


def main() -> None:
    print("Curvas con RM estimado = 100 kg (valores de referencia Nico)\n")
    print_table("Sentadilla (sentadilla)", curve_row_for_evidence("sentadilla"))
    print_table("Peso Muerto (peso_muerto)", curve_row_for_evidence("peso_muerto"))

    migrate_exercise_percentage_curve_column()
    with SessionLocal() as db:
        apply_exercise_percentage_curves(db)
        targets = ("Sentadilla Back", "Peso muerto")
        for name in targets:
            exercise = db.query(Exercise).filter(Exercise.name == name).first()
            if not exercise:
                print(f"\n(No hay ejercicio '{name}' en DB)")
                continue
            log = (
                db.query(TrainingLog)
                .filter(TrainingLog.exercise_id == exercise.id)
                .order_by(TrainingLog.id.desc())
                .first()
            )
            if not log or log.estimated_rm is None:
                print(f"\n(Sin logs para '{name}')")
                continue
            rm = float(log.estimated_rm)
            rows = build_percentage_table(rm, exercise=exercise)
            print_table(
                f"Log real #{log.id} — {name} (RM={rm:.2f} kg, {log.weight}×{log.reps})",
                rows,
            )

    print("\nJSON (sentadilla vs peso_muerto @ RM=100):")
    print(
        json.dumps(
            {
                "sentadilla": curve_row_for_evidence("sentadilla"),
                "peso_muerto": curve_row_for_evidence("peso_muerto"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
