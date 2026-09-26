"""Tablas de %RM por familia de ejercicio (valores fijos Nico)."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .db import engine
from .models import Exercise

PercentageCurveKey = Literal[
    "sentadilla",
    "peso_muerto",
    "banco_plano",
]

DEFAULT_PERCENTAGE_CURVE: PercentageCurveKey = "sentadilla"

# Cada fila: (%RM, repeticiones a esa intensidad). Secuencia fija 1,2,3,4,5,6,8,10.
PERCENTAGE_CURVES: dict[PercentageCurveKey, list[tuple[float, int]]] = {
    "sentadilla": [
        (100.0, 1),
        (95.0, 2),
        (92.5, 3),
        (90.0, 4),
        (87.5, 5),
        (85.0, 6),
        (80.0, 8),
        (75.0, 10),
    ],
    "peso_muerto": [
        (100.0, 1),
        (95.0, 2),
        (93.0, 3),
        (90.0, 4),
        (87.0, 5),
        (85.0, 6),
        (80.0, 8),
        (75.0, 10),
    ],
    "banco_plano": [
        (100.0, 1),
        (97.5, 2),
        (95.0, 3),
        (92.5, 4),
        (90.0, 5),
        (85.0, 6),
        (80.0, 8),
        (75.0, 10),
    ],
}

# Mapeo por nombre de ejercicio → curva (3 tablas %RM independientes).
EXERCISE_PERCENTAGE_CURVE_BY_NAME: dict[str, PercentageCurveKey] = {
    # Sentadilla
    "Sentadilla frontal": "sentadilla",
    "Sentadilla Back": "sentadilla",
    "Sentadilla al Cajon": "sentadilla",
    "Thruster - Br": "sentadilla",
    "Oly - Clean": "sentadilla",
    "DLO - Hang Sq Clean": "sentadilla",
    "DLO - Hang Power Clean": "sentadilla",
    "Hips Thrust": "sentadilla",
    # Peso muerto
    "Peso muerto": "peso_muerto",
    "Peso muerto rumano": "peso_muerto",
    "Peso muerto - Sumo": "peso_muerto",
    "Peso muerto - Convencional": "peso_muerto",
    "Oly - Clean and Jerk": "peso_muerto",
    # Banco plano (press horizontal / derivados Oly listados por Nico)
    "Press Plano - Br": "banco_plano",
    "Push Press - Br": "banco_plano",
    "Oly - Split Jerk": "banco_plano",
    "Oly - Snatch": "banco_plano",
    "Oly - Power Jerk": "banco_plano",
    "DLO - Hang Sq Snatch": "banco_plano",
    "DLO - Hang Power Snatch": "banco_plano",
    "Press Militar - Br": "banco_plano",
}


class PercentageTableRow(TypedDict):
    percentage: float
    reps: int
    weight: float
    rir_plus_1: int
    rir_plus_2: int


def resolve_percentage_curve(exercise: Exercise | None) -> PercentageCurveKey:
    if exercise is None:
        return DEFAULT_PERCENTAGE_CURVE
    if exercise.percentage_curve:
        key = exercise.percentage_curve.strip().lower()
        if key in PERCENTAGE_CURVES:
            return key  # type: ignore[return-value]
    mapped = EXERCISE_PERCENTAGE_CURVE_BY_NAME.get(exercise.name)
    if mapped:
        return mapped
    return DEFAULT_PERCENTAGE_CURVE


def build_percentage_table(
    estimated_rm: float,
    curve_key: PercentageCurveKey | None = None,
    exercise: Exercise | None = None,
) -> list[PercentageTableRow]:
    key = curve_key or resolve_percentage_curve(exercise)
    rows = PERCENTAGE_CURVES[key]
    rm = float(estimated_rm)
    table: list[PercentageTableRow] = []
    for pct, reps in rows:
        weight = round(rm * (pct / 100.0), 2)
        table.append(
            {
                "percentage": pct,
                "reps": reps,
                "weight": weight,
                "rir_plus_1": max(reps - 1, 0),
                "rir_plus_2": max(reps - 2, 0),
            }
        )
    return table


def migrate_exercise_percentage_curve_column() -> None:
    existing_columns = {column["name"] for column in inspect(engine).get_columns("exercises")}
    with engine.begin() as connection:
        if "percentage_curve" not in existing_columns:
            connection.execute(
                text(
                    f"ALTER TABLE exercises ADD COLUMN percentage_curve VARCHAR(32) "
                    f"DEFAULT '{DEFAULT_PERCENTAGE_CURVE}'"
                )
            )


def migrate_legacy_removed_percentage_curves(db: Session) -> None:
    """Curvas eliminadas; mismas secuencias que banco_plano o sentadilla."""
    for exercise in db.query(Exercise).filter(Exercise.percentage_curve == "press_militar").all():
        exercise.percentage_curve = "banco_plano"
    for exercise in db.query(Exercise).filter(Exercise.percentage_curve == "hips_thrust").all():
        exercise.percentage_curve = "sentadilla"
    db.commit()


def apply_exercise_percentage_curves(db: Session) -> None:
    migrate_legacy_removed_percentage_curves(db)
    for exercise in db.query(Exercise).all():
        mapped = EXERCISE_PERCENTAGE_CURVE_BY_NAME.get(exercise.name)
        if mapped is not None:
            exercise.percentage_curve = mapped
        elif not exercise.percentage_curve:
            exercise.percentage_curve = DEFAULT_PERCENTAGE_CURVE
    db.commit()


def curve_row_for_evidence(curve_key: PercentageCurveKey) -> list[dict[str, Any]]:
    """Filas esperadas con RM=100 para comparar contra datos de Nico."""
    return build_percentage_table(100.0, curve_key=curve_key)
