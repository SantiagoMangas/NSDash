"""RM estimado por ejercicio (Epley / Brzycki)."""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .db import engine
from .models import Exercise, TrainingLog

logger = logging.getLogger(__name__)

# Default histórico: weight * (1 + reps/30)
DEFAULT_RM_COEFFICIENT = 1.0 / 30.0
DEFAULT_FORMULA_TYPE = "epley"

# Coeficientes confirmados por nombre de ejercicio (familia).
# Hips Thrust: placeholder — pendiente confirmación Nico.
# Thruster - Br: no está aquí; queda DEFAULT_RM_COEFFICIENT (pendiente Nico).
EXERCISE_RM_PROFILES: dict[str, tuple[str, float]] = {
    "Sentadilla frontal": ("epley", 0.033),
    "Sentadilla Back": ("epley", 0.033),
    "Sentadilla al Cajon": ("epley", 0.033),
    "Press Plano - Br": ("epley", 0.015),
    "Press Militar - Br": ("epley", 0.020),
    "Push Press - Br": ("epley", 0.020),
    "Peso muerto": ("epley", 0.018),
    "Peso muerto rumano": ("epley", 0.018),
    # PLACEHOLDER Nico — revisar coeficiente real
    "Hips Thrust": ("epley", 0.024),
    "Peso muerto - Sumo": ("epley", 0.018),
    "Peso muerto - Convencional": ("epley", 0.018),
    "Oly - Clean": ("brzycki", DEFAULT_RM_COEFFICIENT),
    "Oly - Clean and Jerk": ("brzycki", DEFAULT_RM_COEFFICIENT),
    "Oly - Split Jerk": ("brzycki", DEFAULT_RM_COEFFICIENT),
    "Oly - Snatch": ("brzycki", DEFAULT_RM_COEFFICIENT),
    "Oly - Power Jerk": ("brzycki", DEFAULT_RM_COEFFICIENT),
    "DLO - Hang Sq Clean": ("brzycki", DEFAULT_RM_COEFFICIENT),
    "DLO - Hang Sq Snatch": ("brzycki", DEFAULT_RM_COEFFICIENT),
    "DLO - Hang Power Clean": ("brzycki", DEFAULT_RM_COEFFICIENT),
    "DLO - Hang Power Snatch": ("brzycki", DEFAULT_RM_COEFFICIENT),
}

LAST_RM_RECALC: dict[str, Any] = {
    "logs_total": 0,
    "logs_updated": 0,
    "samples": [],
}


def compute_estimated_rm(weight: float, reps: int, exercise: Exercise) -> float:
    formula = (exercise.formula_type or DEFAULT_FORMULA_TYPE).lower()
    if formula == "brzycki":
        denominator = 1.0278 - 0.0278 * reps
        if denominator <= 0:
            raise ValueError("Brzycki: repeticiones demasiado altas para la fórmula")
        return float(weight / denominator)

    coefficient = (
        exercise.rm_coefficient
        if exercise.rm_coefficient is not None
        else DEFAULT_RM_COEFFICIENT
    )
    return float(weight * (1 + reps * coefficient))


def migrate_exercise_rm_columns() -> None:
    existing_columns = {column["name"] for column in inspect(engine).get_columns("exercises")}
    with engine.begin() as connection:
        if "rm_coefficient" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE exercises ADD COLUMN rm_coefficient FLOAT "
                    f"DEFAULT {DEFAULT_RM_COEFFICIENT}"
                )
            )
        if "formula_type" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE exercises ADD COLUMN formula_type VARCHAR(20) "
                    f"DEFAULT '{DEFAULT_FORMULA_TYPE}'"
                )
            )


def apply_exercise_rm_profiles(db: Session) -> None:
    for exercise in db.query(Exercise).all():
        profile = EXERCISE_RM_PROFILES.get(exercise.name)
        if profile is not None:
            formula_type, coefficient = profile
            exercise.formula_type = formula_type
            exercise.rm_coefficient = coefficient
        else:
            if exercise.formula_type is None:
                exercise.formula_type = DEFAULT_FORMULA_TYPE
            if exercise.rm_coefficient is None:
                exercise.rm_coefficient = DEFAULT_RM_COEFFICIENT
    db.commit()


def recalculate_all_training_logs_rm(db: Session) -> None:
    logs = (
        db.query(TrainingLog, Exercise)
        .join(Exercise, TrainingLog.exercise_id == Exercise.id)
        .all()
    )
    sample_by_exercise: dict[str, dict[str, Any]] = {}
    target_exercises = ("Sentadilla Back", "Press Plano - Br", "Peso muerto")
    updated = 0

    for log, exercise in logs:
        old_rm = log.estimated_rm
        new_rm = round(compute_estimated_rm(log.weight, log.reps, exercise), 2)
        if old_rm is None or abs(float(old_rm) - new_rm) > 1e-6:
            updated += 1
        log.estimated_rm = new_rm

        if exercise.name in target_exercises and exercise.name not in sample_by_exercise:
            sample_by_exercise[exercise.name] = {
                "log_id": log.id,
                "exercise": exercise.name,
                "formula": exercise.formula_type,
                "coefficient": exercise.rm_coefficient,
                "weight": log.weight,
                "reps": log.reps,
                "estimated_rm_before": old_rm,
                "estimated_rm_after": new_rm,
            }

    samples = [sample_by_exercise[name] for name in target_exercises if name in sample_by_exercise]
    db.commit()
    LAST_RM_RECALC["logs_total"] = len(logs)
    LAST_RM_RECALC["logs_updated"] = updated
    LAST_RM_RECALC["samples"] = samples
    logger.info(
        "RM recalc: %s logs, %s updated, samples=%s",
        len(logs),
        updated,
        samples,
    )


def get_exercise_for_log(db: Session, exercise_id: int) -> Optional[Exercise]:
    return db.query(Exercise).filter(Exercise.id == exercise_id).first()
