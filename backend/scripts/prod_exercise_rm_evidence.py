#!/usr/bin/env python3
"""Evidencia post-deploy: GET /exercises (prod) + query local DB si DATABASE_PATH apunta a prod."""

import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db import SessionLocal, get_sqlite_path
from app.main import STRENGTH_EXERCISES
from app.strength_rm import LAST_RM_RECALC, OLY_DLO_EXERCISE_NAMES


def fetch_exercises_from_api(base: str, email: str, password: str) -> list[dict]:
    login = urllib.request.Request(
        f"{base.rstrip('/')}/auth/login",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(login, timeout=30) as res:
        token = json.loads(res.read())["access_token"]

    req = urllib.request.Request(
        f"{base.rstrip('/')}/exercises",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read())


def fetch_exercises_from_db() -> list[dict]:
    with SessionLocal() as db:
        rows = db.execute(
            text(
                "SELECT name, formula_type, rm_coefficient, percentage_curve "
                "FROM exercises ORDER BY name"
            )
        ).fetchall()
    return [
        {
            "name": r[0],
            "formula_type": r[1],
            "rm_coefficient": r[2],
            "percentage_curve": r[3],
        }
        for r in rows
    ]


def main() -> int:
    api_base = os.getenv("PROD_API_URL", "").strip()
    email = os.getenv("PROD_LOGIN_EMAIL", "admin@ns.com")
    password = os.getenv("PROD_LOGIN_PASSWORD", "1234")

    print(f"SQLite path: {get_sqlite_path()}")
    print(f"LAST_RM_RECALC (memoria del ultimo startup en este proceso): {json.dumps(LAST_RM_RECALC, indent=2)}")

    if api_base:
        print(f"\n=== GET /exercises via API ({api_base}) ===")
        exercises = fetch_exercises_from_api(api_base, email, password)
    else:
        print("\n=== SELECT exercises (DB local / DATABASE_PATH) ===")
        exercises = fetch_exercises_from_db()

    by_name = {e["name"]: e for e in exercises}
    print("\n| name | formula_type | rm_coefficient | percentage_curve |")
    print("|------|--------------|----------------|----------------|")
    for name in STRENGTH_EXERCISES:
        row = by_name.get(name)
        if not row:
            print(f"| {name} | **MISSING** | | |")
            continue
        print(
            f"| {row['name']} | {row['formula_type']} | {row['rm_coefficient']} | "
            f"{row['percentage_curve']} |"
        )

    oly_dlo_in_db = sum(
        1
        for name in OLY_DLO_EXERCISE_NAMES
        if name in by_name and by_name[name].get("formula_type") == "epley"
    )
    print(f"\nOly/DLO con epley en API/DB: {oly_dlo_in_db}/{len(OLY_DLO_EXERCISE_NAMES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
