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

# PROVISORIO (Nico, WhatsApp): Oly y DLO usan Epley 0.033 en lugar de Brzycki — a confirmar.
EPLEY_OLY_DLO_COEFFICIENT = 0.033

OLY_DLO_EXERCISE_NAMES: tuple[str, ...] = (
    "Oly - Clean - Cargada",
    "Oly - Clean & Jerk - Envión",
    "Oly - Split Jerk - 2do tiempo de tijera",
    "Oly - Snatch - Arranque",
    "Oly - Power Jerk - 2do tiempo de potencia",
    "DLO - Hang Sq Clean - Cargada de Colgado a Profundo",
    "DLO - Hang Sq Snatch - Arranque de Colgado a Prufundo",
    "DLO - Hang Power Clean - Cargada de Colgado",
    "DLO - Hang Power Snatch - Arranque de Colgado",
)

# Coeficientes confirmados por nombre de ejercicio (familia).
# Hips Thrust - Br: epley 0.024 (confirmado Nico, 07/10).
# Thruster - Br: no está aquí; queda DEFAULT_RM_COEFFICIENT (pendiente Nico).
EXERCISE_RM_PROFILES: dict[str, tuple[str, float]] = {
    "Sentadilla - Front Squat": ("epley", 0.033),
    "Sentadilla - Box Squat": ("epley", 0.033),
    "Sentadilla - Back Squat": ("epley", 0.033),
    "Press Plano - Br": ("epley", 0.015),
    "Press Militar - Estricto": ("epley", 0.020),
    "Push Press - Br": ("epley", 0.020),
    "Peso muerto - Rumano": ("epley", 0.018),
    "Hips Thrust - Br": ("epley", 0.024),
    "Peso muerto - Sumo": ("epley", 0.018),
    "Peso muerto - Convencional": ("epley", 0.018),
    "Oly - Clean - Cargada": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
    "Oly - Clean & Jerk - Envión": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
    "Oly - Split Jerk - 2do tiempo de tijera": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
    "Oly - Snatch - Arranque": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
    "Oly - Power Jerk - 2do tiempo de potencia": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
    "DLO - Hang Sq Clean - Cargada de Colgado a Profundo": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
    "DLO - Hang Sq Snatch - Arranque de Colgado a Prufundo": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
    "DLO - Hang Power Clean - Cargada de Colgado": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
    "DLO - Hang Power Snatch - Arranque de Colgado": ("epley", EPLEY_OLY_DLO_COEFFICIENT),
}

LAST_RM_RECALC: dict[str, Any] = {
    "logs_total": 0,
    "logs_updated": 0,
    "oly_dlo_logs_updated": 0,
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


def exercise_with_rm_profile(exercise: Exercise) -> Exercise:
    """Copia lógica de apply_exercise_rm_profiles sin persistir (dry-run)."""
    profile = EXERCISE_RM_PROFILES.get(exercise.name)
    clone = Exercise(
        name=exercise.name,
        formula_type=exercise.formula_type,
        rm_coefficient=exercise.rm_coefficient,
    )
    if profile is not None:
        clone.formula_type, clone.rm_coefficient = profile
    return clone


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
    reference_exercises = (
        "Sentadilla - Back Squat",
        "Press Plano - Br",
        "Peso muerto - Convencional",
    )
    oly_dlo_sample_targets = (
        "Oly - Clean - Cargada",
        "DLO - Hang Power Clean - Cargada de Colgado",
        "Oly - Snatch - Arranque",
    )
    updated = 0
    oly_dlo_updated = 0

    for log, exercise in logs:
        old_rm = log.estimated_rm
        new_rm = round(compute_estimated_rm(log.weight, log.reps, exercise), 2)
        if old_rm is None or abs(float(old_rm) - new_rm) > 1e-6:
            updated += 1
            if exercise.name in OLY_DLO_EXERCISE_NAMES:
                oly_dlo_updated += 1
        log.estimated_rm = new_rm

        if exercise.name in reference_exercises and exercise.name not in sample_by_exercise:
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

        if (
            exercise.name in oly_dlo_sample_targets
            and exercise.name not in sample_by_exercise
        ):
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

    sample_order = list(reference_exercises) + list(oly_dlo_sample_targets)
    samples = [sample_by_exercise[name] for name in sample_order if name in sample_by_exercise]
    db.commit()
    LAST_RM_RECALC["logs_total"] = len(logs)
    LAST_RM_RECALC["logs_updated"] = updated
    LAST_RM_RECALC["oly_dlo_logs_updated"] = oly_dlo_updated
    LAST_RM_RECALC["samples"] = samples
    logger.info(
        "RM recalc: %s logs, %s updated, samples=%s",
        len(logs),
        updated,
        samples,
    )


def get_exercise_for_log(db: Session, exercise_id: int) -> Optional[Exercise]:
    return db.query(Exercise).filter(Exercise.id == exercise_id).first()
