"""Tests de tablas %RM por curva."""

import pytest

from app.models import Exercise
from app.strength_percentage import (
    PERCENTAGE_CURVES,
    build_percentage_table,
    resolve_percentage_curve,
)


def _ex(name: str, curve: str | None = None) -> Exercise:
    ex = Exercise(name=name)
    if curve is not None:
        ex.percentage_curve = curve
    return ex


class TestPercentageCurves:
    def test_sentadilla_row_at_92_5_percent(self):
        rows = build_percentage_table(100.0, curve_key="sentadilla")
        row = next(r for r in rows if r["percentage"] == 92.5)
        assert row == {
            "percentage": 92.5,
            "reps": 3,
            "weight": 92.5,
            "rir_plus_1": 2,
            "rir_plus_2": 1,
        }

    def test_peso_muerto_differs_at_third_row(self):
        sent = build_percentage_table(100.0, curve_key="sentadilla")
        dead = build_percentage_table(100.0, curve_key="peso_muerto")
        assert sent[2]["percentage"] == 92.5
        assert dead[2]["percentage"] == 93.0
        assert sent[2]["reps"] == dead[2]["reps"] == 3

    def test_eight_rows_no_seven_or_nine_reps(self):
        for key in PERCENTAGE_CURVES:
            rows = build_percentage_table(50.0, curve_key=key)
            assert len(rows) == 8
            assert [r["reps"] for r in rows] == [1, 2, 3, 4, 5, 6, 8, 10]

    def test_weight_scales_with_rm(self):
        rows = build_percentage_table(200.0, curve_key="peso_muerto")
        assert rows[0]["weight"] == 200.0
        assert rows[1]["weight"] == 190.0

    def test_resolve_from_exercise_name(self):
        assert resolve_percentage_curve(_ex("Peso muerto")) == "peso_muerto"
        assert resolve_percentage_curve(_ex("Press Militar - Br")) == "banco_plano"
        assert resolve_percentage_curve(_ex("Hips Thrust")) == "sentadilla"

    def test_press_militar_matches_banco_plano_table(self):
        rm = 80.0
        press = _ex("Press Militar - Br", "banco_plano")
        bench = _ex("Press Plano - Br", "banco_plano")
        press_rows = build_percentage_table(rm, exercise=press)
        bench_rows = build_percentage_table(rm, curve_key="banco_plano")
        assert press_rows == bench_rows
        assert [r["percentage"] for r in press_rows] == [
            100.0,
            97.5,
            95.0,
            92.5,
            90.0,
            85.0,
            80.0,
            75.0,
        ]

    def test_hips_thrust_matches_sentadilla_table(self):
        rm = 80.0
        hips = _ex("Hips Thrust", "sentadilla")
        squat = _ex("Sentadilla Back", "sentadilla")
        hips_rows = build_percentage_table(rm, exercise=hips)
        squat_rows = build_percentage_table(rm, exercise=squat)
        assert hips_rows == squat_rows
        assert [r["percentage"] for r in hips_rows] == [
            100.0,
            95.0,
            92.5,
            90.0,
            87.5,
            85.0,
            80.0,
            75.0,
        ]

    def test_rir_floor_at_zero_for_single_rep(self):
        row = build_percentage_table(100.0, curve_key="sentadilla")[0]
        assert row["reps"] == 1
        assert row["rir_plus_1"] == 0
        assert row["rir_plus_2"] == 0
