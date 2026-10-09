"""RSA list/detail API incluye distancia, pausa y tiempos."""

import os

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app, on_startup
from app.models import Athlete, Exercise


@pytest.fixture(scope="module", autouse=True)
def _startup():
    on_startup()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client: TestClient):
    password = os.environ.get("ADMIN_INITIAL_PASSWORD", "1234")
    res = client.post(
        "/auth/login",
        json={"email": "admin@ns.com", "password": password},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_rsa_list_and_get_include_distance_pause(client: TestClient, auth_headers: dict):
    with SessionLocal() as db:
        athlete = db.query(Athlete).first()
        exercise = db.query(Exercise).first()
        assert athlete and exercise
        athlete_id, exercise_id = athlete.id, exercise.id

    create = client.post(
        "/rsa-fatigue-tests",
        headers=auth_headers,
        json={
            "athlete_id": athlete_id,
            "date": "2026-10-08",
            "tiempos": [6.1, 6.3, 6.2],
            "distancia_sprint_m": 30.0,
            "pausa_s": 20.0,
            "notes": None,
        },
    )
    assert create.status_code == 200, create.text
    created = create.json()
    test_id = created["id"]
    assert created["distancia_sprint_m"] == 30.0
    assert created["pausa_s"] == 20.0

    listed = client.get(f"/athletes/{athlete_id}/rsa-fatigue-tests", headers=auth_headers)
    assert listed.status_code == 200
    row = next(item for item in listed.json() if item["id"] == test_id)
    assert row["distancia_sprint_m"] == 30.0
    assert row["pausa_s"] == 20.0
    assert len(row["tiempos"]) == 3

    detail = client.get(f"/rsa-fatigue-tests/{test_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["pausa_s"] == 20.0

    delete = client.delete(f"/rsa-fatigue-tests/{test_id}", headers=auth_headers)
    assert delete.status_code == 200
