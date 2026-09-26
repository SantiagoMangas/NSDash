"""GET percentage-table con mejor RM histórico."""

import pytest
from fastapi.testclient import TestClient

from app.main import app, on_startup


@pytest.fixture(scope="module", autouse=True)
def _startup():
    on_startup()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client: TestClient):
    res = client.post("/auth/login", json={"email": "admin@ns.com", "password": "1234"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_percentage_table_uses_best_historical_rm(client: TestClient, auth_headers: dict):
    athletes = client.get("/athletes", headers=auth_headers)
    assert athletes.status_code == 200
    if not athletes.json():
        pytest.skip("sin atletas demo")

    athlete_id = athletes.json()[0]["id"]
    exercises = client.get("/exercises", headers=auth_headers)
    assert exercises.status_code == 200
    exercise_id = exercises.json()[0]["id"]

    logs = client.get("/logs", headers=auth_headers).json()
    pair_logs = [
        l
        for l in logs
        if l["athlete_id"] == athlete_id and l["exercise_id"] == exercise_id
    ]
    if not pair_logs:
        pytest.skip("sin logs para el par atleta/ejercicio")

    expected_best = max(l["estimated_rm"] for l in pair_logs)

    res = client.get(
        f"/athletes/{athlete_id}/exercises/{exercise_id}/percentage-table",
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["reference_rm_source"] == "best_historical"
    assert body["reference_rm"] == expected_best
    assert len(body["percentages"]) > 0
