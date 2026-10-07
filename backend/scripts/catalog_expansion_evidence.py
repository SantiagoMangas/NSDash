"""Evidencia catálogo: Oly - Clean - Cargada (Epley 0.033 prov. + curva sentadilla)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import STRENGTH_EXERCISES, app, on_startup
from app.models import Athlete, Exercise
from app.strength_percentage import build_percentage_table
from app.strength_rm import EPLEY_OLY_DLO_COEFFICIENT, compute_estimated_rm


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

    oly_name = "Oly - Clean - Cargada"
    with SessionLocal() as db:
        oly = db.query(Exercise).filter(Exercise.name == oly_name).first()
        assert oly is not None, f"Falta {oly_name} en DB"
        print(
            f"\nDB {oly_name}: formula={oly.formula_type}, "
            f"coef={oly.rm_coefficient}, curve={oly.percentage_curve}"
        )

    client = TestClient(app)
    headers = auth_headers(client)

    exercises = client.get("/exercises", headers=headers).json()
    print(f"\n=== GET /exercises ({len(exercises)} ítems, esperados {len(STRENGTH_EXERCISES)}) ===")
    for item in exercises:
        print(f"  {item['id']:>3}  {item['name']}")

    ok_count = len(exercises) == len(STRENGTH_EXERCISES)
    print(f"\nTotal {len(STRENGTH_EXERCISES)} ejercicios: {'OK' if ok_count else 'FALLO'}")

    with SessionLocal() as db:
        oly = db.query(Exercise).filter(Exercise.name == oly_name).first()
        athlete = db.query(Athlete).first()
        if not athlete:
            print("Sin atletas en DB")
            return

    weight, reps = 70.0, 3
    epley_rm = round(compute_estimated_rm(weight, reps, oly), 2)
    brzycki_legacy = round(weight / (1.0278 - 0.0278 * reps), 2)

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

    table = build_percentage_table(epley_rm, exercise=oly)
    row_925 = next(r for r in table if r["percentage"] == 92.5)

    print(f"\n=== POST /logs — {oly_name} {weight}×{reps} ===")
    print(f"  formula_type (DB): {oly.formula_type}")
    print(f"  coef esperado (provisional): {EPLEY_OLY_DLO_COEFFICIENT}")
    print(f"  RM Epley esperado: {epley_rm}")
    print(f"  RM API: {round(float(created.get('estimated_rm')), 2)}")
    print(f"  Epley OK: {abs(float(created['estimated_rm']) - epley_rm) < 0.02}")
    print(f"  (Brzycki legacy ref. 100×3 sería ~{brzycki_legacy} — no debe usarse)")

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
                    "epley_expected": epley_rm,
                },
                "summary_curve": summary.get("percentage_curve"),
                "row_92_5": api_row,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
