"""RM estimado (Brzycki) para ejercicios de fuerza con rm_estimated."""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .db import engine
from .models import Exercise, TrainingLog
from .strength_log_kinds import (
    LOG_KIND_PULL_UP,
    LOG_KIND_RM_ESTIMATED,
    resolve_log_kind_for_exercise_name,
)

logger = logging.getLogger(__name__)

# Brzycki: RM = carga / (A − B × repeticiones)
BRZYCKI_INTERCEPT = 1.0278
BRZYCKI_REP_COEFFICIENT = 0.0278
DEFAULT_FORMULA_TYPE = "brzycki"
# Legacy DB default; Brzycki no usa coeficiente por ejercicio.
DEFAULT_RM_COEFFICIENT = 1.0 / 30.0

# Confirmado Nico (17/11/2026): todos los rm_estimated usan Brzycki; dominadas sin RM.
MAX_RM_REPS = 30
RM_REPS_MAX_ERROR = (
    "Las repeticiones no pueden superar 30 para estimar RM con la fórmula de Brzycki."
)

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

LAST_RM_RECALC: dict[str, Any] = {
    "logs_total": 0,
    "logs_updated": 0,
    "oly_dlo_logs_updated": 0,
    "samples": [],
}


def validate_rm_reps(reps: int) -> None:
    if not isinstance(reps, int) or reps <= 0:
        raise ValueError("Las repeticiones deben ser un número entero mayor a 0.")
    if reps > MAX_RM_REPS:
        raise ValueError(RM_REPS_MAX_ERROR)


def brzycki_denominator(reps: int) -> float:
    validate_rm_reps(reps)
    return BRZYCKI_INTERCEPT - BRZYCKI_REP_COEFFICIENT * reps


def compute_brzycki_rm(weight: float, reps: int) -> float:
    denominator = brzycki_denominator(reps)
    if denominator <= 0:
        raise ValueError(
            "Brzycki: repeticiones demasiado altas para la fórmula."
        )
    return float(weight) / denominator


def resolve_exercise_log_kind(exercise: Exercise) -> str:
    kind = getattr(exercise, "log_kind", None)
    if isinstance(kind, str) and kind.strip():
        return kind.strip()
    return resolve_log_kind_for_exercise_name(exercise.name)


def resolve_rm_profile(exercise: Exercise) -> tuple[str, None] | None:
    """Perfil de fórmula para persistir en catálogo; None si el ejercicio no estima RM."""
    if resolve_exercise_log_kind(exercise) != LOG_KIND_RM_ESTIMATED:
        return None
    return DEFAULT_FORMULA_TYPE, None


def compute_estimated_rm(weight: float, reps: int, exercise: Exercise) -> float:
    if resolve_exercise_log_kind(exercise) == LOG_KIND_PULL_UP:
        raise ValueError("Este ejercicio no estima RM.")
    return compute_brzycki_rm(weight, reps)


def exercise_with_rm_profile(exercise: Exercise) -> Exercise:
    """Copia lógica de apply_exercise_rm_profiles sin persistir (dry-run)."""
    clone = Exercise(
        name=exercise.name,
        formula_type=exercise.formula_type,
        rm_coefficient=exercise.rm_coefficient,
        log_kind=getattr(exercise, "log_kind", None),
    )
    profile = resolve_rm_profile(exercise)
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
        if not exercise.log_kind:
            exercise.log_kind = resolve_log_kind_for_exercise_name(exercise.name)
        profile = resolve_rm_profile(exercise)
        if profile is not None:
            formula_type, coefficient = profile
            exercise.formula_type = formula_type
            exercise.rm_coefficient = coefficient
        else:
            exercise.formula_type = DEFAULT_FORMULA_TYPE
            exercise.rm_coefficient = None
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
        if resolve_exercise_log_kind(exercise) == LOG_KIND_PULL_UP:
            if log.estimated_rm is not None:
                log.estimated_rm = None
                updated += 1
            continue
        old_rm = log.estimated_rm
        profiled = exercise_with_rm_profile(exercise)
        try:
            validate_rm_reps(int(log.reps))
            new_rm = round(compute_estimated_rm(log.weight, log.reps, profiled), 2)
        except ValueError:
            logger.warning(
                "RM recalc omitido log %s: reps=%s fuera de rango Brzycki",
                log.id,
                log.reps,
            )
            continue
        if old_rm is None or abs(float(old_rm) - new_rm) > 1e-6:
            updated += 1
            if exercise.name in OLY_DLO_EXERCISE_NAMES:
                oly_dlo_updated += 1
        log.estimated_rm = new_rm

        if exercise.name in reference_exercises and exercise.name not in sample_by_exercise:
            sample_by_exercise[exercise.name] = {
                "log_id": log.id,
                "exercise": exercise.name,
                "formula": profiled.formula_type,
                "coefficient": profiled.rm_coefficient,
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
                "formula": profiled.formula_type,
                "coefficient": profiled.rm_coefficient,
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