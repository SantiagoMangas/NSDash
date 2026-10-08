"""Tipos de registro de fuerza (RM estimado vs dominadas sin RM)."""

from __future__ import annotations

LOG_KIND_RM_ESTIMATED = "rm_estimated"
LOG_KIND_PULL_UP = "pull_up"

PULL_UP_MODALITIES = frozenset({"band", "bodyweight", "weighted"})

# Hoja "RM para app" — filas 46-49 (sin estimación de RM).
PULL_UP_EXERCISE_NAMES = frozenset(
    {
        "Traccion Vertical - Dominadas Agarre Neutro",
        "Traccion Vertical - Dominada Palmar",
        "Traccion Vertical - Domianda Prona",
        "Traccion Vertical - Dominada Prona Abierta",
    }
)

HORIZONTAL_TRACTION_EXERCISE_NAME = "Tracción Horizontal - Remo a 90°"
HORIZONTAL_TRACTION_RM_COEFFICIENT = 0.062


def resolve_log_kind_for_exercise_name(name: str) -> str:
    if name in PULL_UP_EXERCISE_NAMES:
        return LOG_KIND_PULL_UP
    return LOG_KIND_RM_ESTIMATED


def is_pull_up_exercise_name(name: str) -> bool:
    return name in PULL_UP_EXERCISE_NAMES
