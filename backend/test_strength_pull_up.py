"""Dominadas sin RM y tracción horizontal (coef. 0.062)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Exercise
from app.strength_log_kinds import (
    HORIZONTAL_TRACTION_EXERCISE_NAME,
    HORIZONTAL_TRACTION_RM_COEFFICIENT,
    LOG_KIND_PULL_UP,
)
from app.strength_percentage import resolve_percentage_curve
from app.strength_rm import EXERCISE_RM_PROFILES, compute_estimated_rm


def _ex(name: str, log_kind: str = "rm_estimated") -> Exercise:
    return Exercise(name=name, formula_type="epley", rm_coefficient=0.03, log_kind=log_kind)


class TestHorizontalTractionCatalog:
    def test_rm_coefficient_0062(self):
        assert EXERCISE_RM_PROFILES[HORIZONTAL_TRACTION_EXERCISE_NAME] == (
            "epley",
            HORIZONTAL_TRACTION_RM_COEFFICIENT,
        )

    def test_percentage_curve_peso_muerto(self):
        assert resolve_percentage_curve(_ex(HORIZONTAL_TRACTION_EXERCISE_NAME)) == "peso_muerto"


class TestPullUpLogKind:
    def test_dominada_names_are_pull_up(self):
        from app.strength_log_kinds import PULL_UP_EXERCISE_NAMES, resolve_log_kind_for_exercise_name

        for name in PULL_UP_EXERCISE_NAMES:
            assert resolve_log_kind_for_exercise_name(name) == LOG_KIND_PULL_UP


class TestPullUpBandNoLoad:
    def test_band_uses_zero_weight(self):
        from app.main import _resolve_training_log_values

        ex = Exercise(
            name="Traccion Vertical - Dominadas Agarre Neutro",
            log_kind=LOG_KIND_PULL_UP,
            formula_type="epley",
            rm_coefficient=0.03,
        )
        weight, reps, rm, modality = _resolve_training_log_values(ex, 0.0, 8, "band")
        assert weight == 0.0
        assert reps == 8
        assert rm is None
        assert modality == "band"


@pytest.fixture
def client():
    return TestClient(app)
