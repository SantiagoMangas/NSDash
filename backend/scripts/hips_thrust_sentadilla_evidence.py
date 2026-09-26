"""Evidencia: Hips Thrust usa la misma tabla %RM que Sentadilla."""

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


def main() -> None:
    with SessionLocal() as db:
        hips = db.query(Exercise).filter(Exercise.name == "Hips Thrust").first()
        squat = db.query(Exercise).filter(Exercise.name == "Sentadilla Back").first()
        if hips is None or squat is None:
            print("ERROR: missing seed exercises", file=sys.stderr)
            sys.exit(1)

        curve = resolve_percentage_curve(hips)
        assert curve == "sentadilla"
        assert hips.percentage_curve == "sentadilla"

        rm = 100.0
        hips_table = build_percentage_table(rm, exercise=hips)
        squat_table = build_percentage_table(rm, exercise=squat)
        assert hips_table == squat_table

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
    print("=== Tabla %RM (RM=100) Hips Thrust vs Sentadilla Back ===")
    print("iguales:", hips_table == squat_table)
    for i, row in enumerate(hips_table):
        s = squat_table[i]
        print(
            f"  {row['percentage']}% x {row['reps']} reps "
            f"-> {row['weight']} kg | sentadilla %={s['percentage']} reps={s['reps']}"
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
        print(f"\nLog existente id={log_id}")

    summary = client.get(f"/logs/{log_id}/summary", headers=headers)
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["exercise"] == "Hips Thrust"
    assert body["percentage_curve"] == "sentadilla"

    squat_ref = build_percentage_table(float(body["estimated_rm"]), curve_key="sentadilla")
    api_rows = body["percentages"]
    assert len(api_rows) == len(squat_ref)
    for api_row, ref in zip(api_rows, squat_ref, strict=True):
        assert api_row["percentage"] == ref["percentage"]
        assert api_row["reps"] == ref["reps"]
        assert api_row["weight"] == ref["weight"]

    print()
    print("=== GET /logs/{id}/summary (Hips Thrust) ===")
    print(json.dumps(body, indent=2, default=str))


if __name__ == "__main__":
    main()
