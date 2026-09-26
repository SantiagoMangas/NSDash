"""Tests de creación de ejercicios."""

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app, on_startup
from app.models import Exercise


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


def test_create_epley_exercise(client: TestClient, auth_headers: dict):
    name = "Test Epley Catalog UI"
    with SessionLocal() as db:
        existing = db.query(Exercise).filter(Exercise.name == name).first()
        if existing:
            db.delete(existing)
            db.commit()

    res = client.post(
        "/exercises",
        json={
            "name": name,
            "formula_type": "epley",
            "rm_coefficient": 0.02,
            "percentage_curve": "peso_muerto",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == name
    assert body["formula_type"] == "epley"
    assert body["percentage_curve"] == "peso_muerto"


def test_get_exercise_by_id(client: TestClient, auth_headers: dict):
    res = client.get("/exercises/1")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == 1
    assert isinstance(body["name"], str)


def test_get_exercise_not_found(client: TestClient):
    res = client.get("/exercises/999999")
    assert res.status_code == 404


def test_create_brzycki_without_coef(client: TestClient, auth_headers: dict):
    name = "Test Brzycki Catalog"
    with SessionLocal() as db:
        existing = db.query(Exercise).filter(Exercise.name == name).first()
        if existing:
            db.delete(existing)
            db.commit()

    res = client.post(
        "/exercises",
        json={
            "name": name,
            "formula_type": "brzycki",
            "percentage_curve": "sentadilla",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["formula_type"] == "brzycki"
