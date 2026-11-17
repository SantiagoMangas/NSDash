"""Dominadas sin RM y tracción horizontal."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Exercise
from app.strength_log_kinds import (
    HORIZONTAL_TRACTION_EXERCISE_NAME,
    LOG_KIND_PULL_UP,
    LOG_KIND_RM_ESTIMATED,
)
from app.strength_percentage import resolve_percentage_curve
from app.strength_rm import compute_estimated_rm, resolve_rm_profile


def _ex(name: str, log_kind: str = LOG_KIND_RM_ESTIMATED) -> Exercise:
    return Exercise(
        name=name,
        formula_type="brzycki",
        rm_coefficient=None,
        log_kind=log_kind,
    )


class TestHorizontalTractionCatalog:
    def test_rm_profile_brzycki(self):
        profile = resolve_rm_profile(_ex(HORIZONTAL_TRACTION_EXERCISE_NAME))
        assert profile == ("brzycki", None)

    def test_percentage_curve_peso_muerto(self):
        assert resolve_percentage_curve(_ex(HORIZONTAL_TRACTION_EXERCISE_NAME)) == "peso_muerto"

    def test_sample_60x6_brzycki(self):
        ex = _ex(HORIZONTAL_TRACTION_EXERCISE_NAME)
        assert round(compute_estimated_rm(60.0, 6, ex), 2) == 69.69


class TestPullUpLogKind:
    def test_dominada_names_are_pull_up(self):
        from app.strength_log_kinds import PULL_UP_EXERCISE_NAMES, resolve_log_kind_for_exercise_name

        for name in PULL_UP_EXERCISE_NAMES:
            assert resolve_log_kind_for_exercise_name(name) == LOG_KIND_PULL_UP

    def test_pull_up_has_no_rm_profile(self):
        from app.strength_log_kinds import PULL_UP_EXERCISE_NAMES

        for name in PULL_UP_EXERCISE_NAMES:
            ex = Exercise(name=name, log_kind=LOG_KIND_PULL_UP)
            assert resolve_rm_profile(ex) is None


class TestPullUpBandNoLoad:
    def test_band_uses_zero_weight(self):
        from app.main import _resolve_training_log_values

        ex = Exercise(
            name="Traccion Vertical - Dominadas Agarre Neutro",
            log_kind=LOG_KIND_PULL_UP,
            formula_type="brzycki",
            rm_coefficient=None,
        )
        weight, reps, rm, modality = _resolve_training_log_values(ex, 0.0, 8, "band")
        assert weight == 0.0
        assert reps == 8
        assert rm is None
        assert modality == "band"


@pytest.fixture
def client():
    return TestClient(app)