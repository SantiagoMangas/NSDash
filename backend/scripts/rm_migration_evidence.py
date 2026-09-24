"""Evidencia de migración RM: perfiles, recálculo y POST /logs nuevo."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal
from app.main import on_startup
from app.models import Exercise, TrainingLog
from app.strength_rm import LAST_RM_RECALC, compute_estimated_rm

API = "http://127.0.0.1:8000"


def main() -> None:
    print("=== Startup (migración + recálculo) ===")
    on_startup()

    print(json.dumps(LAST_RM_RECALC, indent=2, ensure_ascii=False))

    with SessionLocal() as db:
        print("\n=== Perfiles de ejercicios (muestra) ===")
        for name in (
            "Sentadilla Back",
            "Press Plano - Br",
            "Peso muerto",
            "Hips Thrust",
            "Thruster - Br",
        ):
            ex = db.query(Exercise).filter(Exercise.name == name).first()
            if ex:
                print(
                    f"  {ex.name}: formula={ex.formula_type}, coef={ex.rm_coefficient}"
                )

    try:
        import urllib.request

        login_body = json.dumps({"email": "admin@ns.com", "password": "1234"}).encode()
        req = urllib.request.Request(
            f"{API}/auth/login",
            data=login_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            token = json.loads(res.read())["access_token"]

        with SessionLocal() as db:
            press = db.query(Exercise).filter(Exercise.name == "Press Plano - Br").first()
            athlete_id = db.query(TrainingLog.athlete_id).first()[0]

        payload = {
            "athlete_id": athlete_id,
            "exercise_id": press.id,
            "date": "2026-09-24",
            "weight": 80,
            "reps": 8,
        }
        expected = round(compute_estimated_rm(80, 8, press), 2)

        req = urllib.request.Request(
            f"{API}/logs",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            created = json.loads(res.read())

        print("\n=== Log nuevo POST /logs (Press Plano - Br, 80x8) ===")
        print(f"  Coef ejercicio: {press.rm_coefficient} (epley)")
        print(f"  RM esperado (helper): {expected}")
        print(f"  RM API respuesta:   {created.get('estimated_rm')}")
        ok = abs(float(created.get("estimated_rm", 0)) - expected) < 0.01
        print(f"  OK: {ok}")
    except Exception as exc:
        print(f"\n(Saltar POST /logs — API no disponible: {exc})")


if __name__ == "__main__":
    main()
