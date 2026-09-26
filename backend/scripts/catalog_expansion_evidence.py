"""Evidencia catálogo ampliado: 21 ejercicios + POST Oly - Clean (Brzycki + curva sentadilla)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import STRENGTH_EXERCISES, app, on_startup
from app.models import Athlete, Exercise
from app.strength_percentage import build_percentage_table
from app.strength_rm import compute_estimated_rm


def auth_headers(client: TestClient) -> dict[str, str]:
    res = client.post(
        "/auth/login",
        json={"email": "admin@ns.com", "password": "1234"},
    )
    res.raise_for_status()
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def main() -> None:
    print("=== Startup (inserta ejercicios nuevos + perfiles) ===")
    on_startup()

    with SessionLocal() as db:
        oly = db.query(Exercise).filter(Exercise.name == "Oly - Clean").first()
        assert oly is not None, "Falta Oly - Clean en DB"
        print(
            f"\nDB Oly - Clean: formula={oly.formula_type}, "
            f"coef={oly.rm_coefficient}, curve={oly.percentage_curve}"
        )

    client = TestClient(app)
    headers = auth_headers(client)

    exercises = client.get("/exercises", headers=headers).json()
    print(f"\n=== GET /exercises ({len(exercises)} ítems, esperados {len(STRENGTH_EXERCISES)}) ===")
    for item in exercises:
        print(f"  {item['id']:>3}  {item['name']}")

    ok_count = len(exercises) == len(STRENGTH_EXERCISES) == 21
    print(f"\nTotal 21 ejercicios: {'OK' if ok_count else 'FALLO'}")

    with SessionLocal() as db:
        oly = db.query(Exercise).filter(Exercise.name == "Oly - Clean").first()
        athlete = db.query(Athlete).first()
        if not athlete:
            print("Sin atletas en DB")
            return

    weight, reps = 70.0, 3
    brzycki_rm = round(compute_estimated_rm(weight, reps, oly), 2)
    epley_wrong = round(weight * (1 + reps * 0.033), 2)

    payload = {
        "athlete_id": athlete.id,
        "exercise_id": oly.id,
        "date": "2026-09-25",
        "weight": weight,
        "reps": reps,
    }
    created = client.post("/logs", json=payload, headers=headers).json()
    log_id = created["id"]
    summary = client.get(f"/logs/{log_id}/summary", headers=headers).json()

    table = build_percentage_table(brzycki_rm, exercise=oly)
    row_925 = next(r for r in table if r["percentage"] == 92.5)

    print(f"\n=== POST /logs — Oly - Clean {weight}×{reps} ===")
    print(f"  formula_type (DB): {oly.formula_type}")
    print(f"  RM Brzycki esperado: {brzycki_rm}")
    print(f"  RM si fuera Epley 0.033 (no debe coincidir): {epley_wrong}")
    print(f"  RM API: {round(float(created.get('estimated_rm')), 2)}")
    print(f"  Brzycki OK: {abs(float(created['estimated_rm']) - brzycki_rm) < 0.02}")

    print(f"\n=== GET /logs/{log_id}/summary — tabla % ===")
    print(f"  percentage_curve: {summary.get('percentage_curve')}")
    api_row = next(r for r in summary["percentages"] if r["percentage"] == 92.5)
    print(f"  Fila 92.5%: reps={api_row['reps']}, RIR+1={api_row['rir_plus_1']}, carga={api_row['weight']}")
    print(
        f"  Curva sentadilla OK: {api_row == row_925 and summary.get('percentage_curve') == 'sentadilla'}"
    )

    print("\n=== JSON resumen ===")
    print(
        json.dumps(
            {
                "exercise_count": len(exercises),
                "oly_clean_post": {
                    "estimated_rm": round(float(created["estimated_rm"]), 2),
                    "brzycki_expected": brzycki_rm,
                },
                "summary_curve": summary.get("percentage_curve"),
                "row_92_5": api_row,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
