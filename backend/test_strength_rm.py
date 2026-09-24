"""Tests de compute_estimated_rm (Epley / Brzycki)."""

import pytest

from app.models import Exercise
from app.strength_rm import compute_estimated_rm


def _exercise(formula_type: str, rm_coefficient: float) -> Exercise:
    return Exercise(name="Test", formula_type=formula_type, rm_coefficient=rm_coefficient)


class TestComputeEstimatedRm:
    def test_epley_custom_coefficient(self):
        # 100 kg x 5 reps, coef 0.033 → 100 * (1 + 5*0.033) = 116.5
        ex = _exercise("epley", 0.033)
        assert compute_estimated_rm(100.0, 5, ex) == 116.5

    def test_epley_press_plano_coefficient(self):
        ex = _exercise("epley", 0.015)
        # 80 x 8 → 80 * (1 + 8*0.015) = 89.6
        assert compute_estimated_rm(80.0, 8, ex) == pytest.approx(89.6)

    def test_brzycki_ignores_rm_coefficient(self):
        ex = _exercise("brzycki", 0.999)
        # weight / (1.0278 - 0.0278 * reps)
        expected = 100.0 / (1.0278 - 0.0278 * 5)
        assert abs(compute_estimated_rm(100.0, 5, ex) - expected) < 1e-6

    def test_brzycki_invalid_reps_raises(self):
        ex = _exercise("brzycki", 0.03)
        with pytest.raises(ValueError):
            compute_estimated_rm(100.0, 40, ex)
