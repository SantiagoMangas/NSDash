"""Evidencia: Hips Thrust usa la misma tabla %RM que Peso muerto."""

from __future__ import annotations

import json
import sys

from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app, on_startup
from app.models import Exercise, TrainingLog
from app.strength_percentage import build_percentage_table, resolve_percentage_curve

on_startup()
client = TestClient(app)

login = client.post("/auth/login", json={"email": "admin@ns.com", "password": "1234"})
assert login.status_code == 200, login.text
headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

EXPECTED_PCTS = [100.0, 95.0, 93.0, 90.0, 87.0, 85.0, 80.0, 75.0]


def main() -> None:
    with SessionLocal() as db:
        hips = db.query(Exercise).filter(Exercise.name == "Hips Thrust").first()
        dead = db.query(Exercise).filter(Exercise.name == "Peso muerto").first()
        if hips is None or dead is None:
            print("ERROR: missing seed exercises", file=sys.stderr)
            sys.exit(1)

        curve = resolve_percentage_curve(hips)
        assert curve == "peso_muerto"
        assert hips.percentage_curve == "peso_muerto"

        rm = 100.0
        hips_table = build_percentage_table(rm, exercise=hips)
        dead_table = build_percentage_table(rm, exercise=dead)
        assert hips_table == dead_table
        assert [r["percentage"] for r in hips_table] == EXPECTED_PCTS

        log = (
            db.query(TrainingLog)
            .filter(TrainingLog.exercise_id == hips.id)
            .order_by(TrainingLog.id.desc())
            .first()
        )

    print("=== DB: Hips Thrust ===")
    print(f"percentage_curve: {hips.percentage_curve}")
    print(f"resolve_percentage_curve: {curve}")
    print()
    print("=== Tabla %RM (RM=100) Hips Thrust vs Peso muerto ===")
    print("iguales:", hips_table == dead_table)
    for i, row in enumerate(hips_table):
        d = dead_table[i]
        print(
            f"  {row['percentage']}% x {row['reps']} reps "
            f"-> {row['weight']} kg | peso_muerto %={d['percentage']} reps={d['reps']}"
        )

    if log is None:
        print("\nNo hay logs de Hips Thrust; creando uno de evidencia...")
        athletes = client.get("/athletes", headers=headers)
        assert athletes.status_code == 200
        athlete_id = athletes.json()[0]["id"]
        create = client.post(
            "/logs",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "exercise_id": hips.id,
                "date": "2026-03-26",
                "weight": 80.0,
                "reps": 5,
            },
        )
        assert create.status_code == 200, create.text
        log_id = create.json()["id"]
    else:
        log_id = log.id
        print(f"\nLog existente id={log_id} RM={log.estimated_rm}")

    summary = client.get(f"/logs/{log_id}/summary", headers=headers)
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["exercise"] == "Hips Thrust"
    assert body["percentage_curve"] == "peso_muerto"

    dead_ref = build_percentage_table(float(body["estimated_rm"]), curve_key="peso_muerto")
    api_rows = body["percentages"]
    assert len(api_rows) == len(dead_ref)
    for api_row, ref in zip(api_rows, dead_ref, strict=True):
        assert api_row["percentage"] == ref["percentage"]
        assert api_row["reps"] == ref["reps"]
        assert api_row["weight"] == ref["weight"]

    print()
    print("=== GET /logs/{id}/summary (Hips Thrust) ===")
    print("percentages:", [r["percentage"] for r in api_rows])
    print(json.dumps(body, indent=2, default=str))


if __name__ == "__main__":
    main()
