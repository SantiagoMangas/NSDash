"""
QA: persistencia de sesiones, snapshot coherente y orden del historial.
"""

from __future__ import annotations

import json
import os
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.main import app, migrate_training_session_saved_at
from app import models


@pytest.fixture(scope="module", autouse=True)
def _ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_training_session_saved_at()


@pytest.fixture()
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _login(client: TestClient) -> dict[str, str]:
    password = os.environ.get("ADMIN_INITIAL_PASSWORD", "1234")
    response = client.post("/auth/login", json={"email": "admin@ns.com", "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _ensure_athlete(db: Session) -> models.Athlete:
    athlete = db.query(models.Athlete).order_by(models.Athlete.id.asc()).first()
    if athlete is None:
        pytest.skip("No hay atletas en la base local; creá uno desde la UI para correr este test.")
    return athlete


def test_save_recalculate_matches_hiit_corto(client: TestClient, db: Session) -> None:
    headers = _login(client)
    athlete = _ensure_athlete(db)
    payload = {
        "reference_kmh": 14.5,
        "intensidad_pct_min": 100,
        "intensidad_pct_max": 120,
        "distancia_m": 200,
        "reps": 4,
        "series": 2,
        "macro_pausa_min": 3,
        "ratio": "1:2",
    }
    calc = client.post("/training-sessions/hiit-corto/calculate", json=payload, headers=headers)
    assert calc.status_code == 200, calc.text
    expected = calc.json()

    save = client.post(
        "/saved-training-sessions",
        json={
            "athlete_id": athlete.id,
            "source": "hiit_corto",
            "date": date.today().isoformat(),
            "payload": payload,
        },
        headers=headers,
    )
    assert save.status_code == 200, save.text

    session_id = save.json()["id"]
    detail = client.get(f"/saved-training-sessions/{session_id}", headers=headers)
    assert detail.status_code == 200, detail.text
    snapshot = detail.json()["snapshot"]
    assert snapshot["request"] == payload
    assert snapshot["result"]["volumen_m"] == expected["volumen_m"]
    assert snapshot["result"]["min"]["trabajo_s"] == expected["min"]["trabajo_s"]


def test_history_newest_saved_first(client: TestClient, db: Session) -> None:
    headers = _login(client)
    athlete = _ensure_athlete(db)

    rsa_payload = {
        "reference_kmh": 30.0,
        "intensidad_pct_min": 80,
        "intensidad_pct_max": 90,
        "distancia_m": 30,
        "reps": 6,
        "series": 2,
        "ratio": "1:5",
        "entrenamiento": "RST",
    }
    hiit_payload = {
        "reference_kmh": 14.5,
        "intensidad_pct_min": 100,
        "intensidad_pct_max": 110,
        "distancia_m": 200,
        "reps": 4,
        "series": 2,
        "macro_pausa_min": 3,
        "ratio": "1:2",
    }
    today = date.today().isoformat()

    r1 = client.post(
        "/saved-training-sessions",
        json={"athlete_id": athlete.id, "source": "rsa", "date": today, "payload": rsa_payload},
        headers=headers,
    )
    assert r1.status_code == 200, r1.text
    r2 = client.post(
        "/saved-training-sessions",
        json={"athlete_id": athlete.id, "source": "hiit_corto", "date": today, "payload": hiit_payload},
        headers=headers,
    )
    assert r2.status_code == 200, r2.text

    history = client.get(f"/athletes/{athlete.id}/training-sessions", headers=headers)
    assert history.status_code == 200, history.text
    rows = history.json()
    assert len(rows) >= 2
    # El último guardado (HIIT) debe estar antes que RSA en la lista.
    sources = [row["source"] for row in rows[:5]]
    hiit_idx = sources.index("hiit_corto")
    rsa_idx = sources.index("rsa")
    assert hiit_idx < rsa_idx, sources


def test_mas_snapshot_has_distancia_and_pausa(client: TestClient, db: Session) -> None:
    headers = _login(client)
    athlete = _ensure_athlete(db)
    payload = {
        "reference_kmh": 18.0,
        "intensidad_pct_min": 110,
        "intensidad_pct_max": 120,
        "trabajo_s": 15,
        "serie_min": 4,
        "bloques": 3,
        "macro_pausa_min": 3,
        "ratio": "1:1",
        "entrenamiento": "Intervalo Corto",
        "cod": "NO",
        "shuttles": 0,
        "fecha": None,
    }
    save = client.post(
        "/saved-training-sessions",
        json={
            "athlete_id": athlete.id,
            "source": "mas_training",
            "date": date.today().isoformat(),
            "payload": payload,
        },
        headers=headers,
    )
    assert save.status_code == 200, save.text
    detail = client.get(f"/saved-training-sessions/{save.json()['id']}", headers=headers)
    result = detail.json()["snapshot"]["result"]
    assert result["min"]["pausa_str"]
    assert result["max"]["pausa_str"]
    assert result["min"]["distancia_m"] > 0
    assert "Volumen trabajo" in save.json()["summary"]