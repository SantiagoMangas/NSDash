"""Evidencia: Press Militar usa la misma tabla %RM que Banco plano."""

from __future__ import annotations

import json
import sys

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

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
        press = db.query(Exercise).filter(Exercise.name == "Press Militar - Br").first()
        bench = db.query(Exercise).filter(Exercise.name == "Press Plano - Br").first()
        if press is None or bench is None:
            print("ERROR: missing seed exercises", file=sys.stderr)
            sys.exit(1)

        curve = resolve_percentage_curve(press)
        assert curve == "banco_plano"
        assert press.percentage_curve == "banco_plano"

        rm = 100.0
        press_table = build_percentage_table(rm, exercise=press)
        bench_table = build_percentage_table(rm, exercise=bench)
        assert press_table == bench_table

        log = (
            db.query(TrainingLog)
            .filter(TrainingLog.exercise_id == press.id)
            .order_by(TrainingLog.id.desc())
            .first()
        )

    print("=== DB: Press Militar - Br ===")
    print(f"percentage_curve: {press.percentage_curve}")
    print(f"resolve_percentage_curve: {curve}")
    print()
    print("=== Tabla %RM (RM=100) Press Militar vs Banco plano (Press Plano - Br) ===")
    print("iguales:", press_table == bench_table)
    for i, row in enumerate(press_table):
        b = bench_table[i]
        print(
            f"  {row['percentage']}% x {row['reps']} reps "
            f"-> {row['weight']} kg | bench %={b['percentage']} reps={b['reps']}"
        )

    if log is None:
        print("\nNo hay logs de Press Militar; creando uno de evidencia...")
        athletes = client.get("/athletes", headers=headers)
        assert athletes.status_code == 200
        athlete_id = athletes.json()[0]["id"]
        create = client.post(
            "/logs",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "exercise_id": press.id,
                "date": "2026-03-26",
                "weight": 50.0,
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
    assert body["exercise"] == "Press Militar - Br"
    assert body["percentage_curve"] == "banco_plano"

    bench_ref = build_percentage_table(float(body["estimated_rm"]), curve_key="banco_plano")
    api_rows = body["percentages"]
    assert len(api_rows) == len(bench_ref)
    for api_row, ref in zip(api_rows, bench_ref, strict=True):
        assert api_row["percentage"] == ref["percentage"]
        assert api_row["reps"] == ref["reps"]
        assert api_row["weight"] == ref["weight"]

    print()
    print("=== GET /logs/{id}/summary (Press Militar) ===")
    print(json.dumps(body, indent=2, default=str))


if __name__ == "__main__":
    main()
