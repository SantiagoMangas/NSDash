"""Tests de RM Brzycki y límite de repeticiones."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Exercise
from app.strength_rm import (
    MAX_RM_REPS,
    compute_brzycki_rm,
    compute_estimated_rm,
    validate_rm_reps,
)


def _br_exercise() -> Exercise:
    return Exercise(
        name="Test",
        formula_type="brzycki",
        rm_coefficient=None,
        log_kind="rm_estimated",
    )


class TestBrzyckiRmExact:
    def test_100x1(self):
        assert round(compute_brzycki_rm(100.0, 1), 2) == 100.00

    def test_100x5(self):
        assert round(compute_brzycki_rm(100.0, 5), 2) == 112.51

    def test_80x8(self):
        assert round(compute_brzycki_rm(80.0, 8), 2) == 99.33

    def test_100x10(self):
        assert round(compute_brzycki_rm(100.0, 10), 2) == 133.37

    def test_via_exercise_wrapper(self):
        ex = _br_exercise()
        assert round(compute_estimated_rm(100.0, 5, ex), 2) == 112.51


class TestRmRepsLimit:
    def test_31_reps_rejected(self):
        with pytest.raises(ValueError, match="30"):
            validate_rm_reps(31)

    def test_max_allowed(self):
        validate_rm_reps(MAX_RM_REPS)

    def test_api_rejects_31_reps(self, client: TestClient, auth_headers: dict):
        from app.db import SessionLocal
        from app.models import Athlete

        with SessionLocal() as db:
            athlete = db.query(Athlete).first()
            assert athlete is not None
        res = client.post(
            "/logs",
            headers=auth_headers,
            json={
                "athlete_id": athlete.id,
                "exercise_id": 2,
                "date": "2026-11-17",
                "weight": 100.0,
                "reps": 31,
            },
        )
        assert res.status_code == 422


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client: TestClient):
    import os

    res = client.post(
        "/auth/login",
        json={"email": "admin@ns.com", "password": os.environ["ADMIN_INITIAL_PASSWORD"]},
    )
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}