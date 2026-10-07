"""Restaura atletas protegidos desde producción (ficha + logs de fuerza).

Uso (desde backend/):
  PYTHONPATH=. python scripts/restore_protected_athlete_from_production.py

Requiere API_URL (default Railway) y credenciales admin en demo_seed.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import date

from app.auth import hash_password
from app.db import SessionLocal
from app.demo_seed import ADMIN_EMAIL, ADMIN_PASSWORD, PROTECTED_ATHLETE_NAMES
from app.models import Athlete, Exercise, Team, TrainingLog, User

DEFAULT_API_URL = "https://ns-dash-production.up.railway.app"


def _request(base: str, path: str, token: str | None = None, method: str = "GET", body: dict | None = None):
    headers: dict[str, str] = {}
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    else:
        data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode())


def login(base: str) -> str:
    payload = _request(base, "/auth/login", method="POST", body={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return payload["access_token"]


def restore_one(db, base: str, token: str, canonical_name: str) -> None:
    prod_athletes = _request(base, "/athletes", token)
    prod = next(
        (a for a in prod_athletes if a.get("name") == canonical_name),
        None,
    )
    if prod is None:
        print(f"[skip] No está en producción: {canonical_name}")
        return

    admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if admin is None:
        admin = User(email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD), is_admin=True)
        db.add(admin)
        db.flush()

    existing = (
        db.query(Athlete)
        .filter(Athlete.coach_id == admin.id, Athlete.name == canonical_name)
        .first()
    )
    if existing is not None:
        print(f"[ok] Ya existe localmente: {canonical_name} (id={existing.id})")
        return

    prod_teams = _request(base, "/teams", token)
    prod_team = next((t for t in prod_teams if t["id"] == prod.get("team_id")), None)
    team = None
    if prod_team is not None:
        team = (
            db.query(Team)
            .filter(Team.coach_id == admin.id, Team.name == prod_team["name"])
            .first()
        )
        if team is None:
            team = Team(coach_id=admin.id, name=prod_team["name"], image_url=prod_team.get("image_url"))
            db.add(team)
            db.flush()

    athlete = Athlete(
        name=canonical_name,
        coach_id=admin.id,
        team_id=team.id if team else None,
        sport=prod.get("sport"),
        sport_id=prod.get("sport_id"),
        position_id=prod.get("position_id"),
        height_cm=prod.get("height_cm"),
        body_weight_kg=prod.get("body_weight_kg"),
        goal=prod.get("goal"),
        notes=prod.get("notes"),
        email=prod.get("email"),
        phone=prod.get("phone"),
        photo_url=prod.get("photo_url"),
    )
    if prod.get("birth_date"):
        athlete.birth_date = date.fromisoformat(prod["birth_date"])
    db.add(athlete)
    db.flush()

    prod_logs = [l for l in _request(base, "/logs", token) if l.get("athlete_id") == prod["id"]]
    prod_exercises = {e["id"]: e for e in _request(base, "/exercises", token)}
    local_exercises = {e.name: e for e in db.query(Exercise).all()}
    imported = 0
    skipped = 0
    for log in prod_logs:
        exercise = prod_exercises.get(log.get("exercise_id"))
        if exercise is None:
            skipped += 1
            continue
        local = local_exercises.get(exercise["name"])
        if local is None:
            local = Exercise(
                name=exercise["name"],
                rm_coefficient=exercise.get("rm_coefficient", 1.0 / 30.0),
                formula_type=exercise.get("formula_type", "epley"),
                percentage_curve=exercise.get("percentage_curve", "sentadilla"),
            )
            db.add(local)
            db.flush()
            local_exercises[exercise["name"]] = local
        db.add(
            TrainingLog(
                athlete_id=athlete.id,
                exercise_id=local.id,
                date=date.fromisoformat(log["date"]),
                weight=log["weight"],
                reps=log["reps"],
                estimated_rm=log.get("estimated_rm"),
            )
        )
        imported += 1

    db.commit()
    print(
        f"[restored] {canonical_name} (id local={athlete.id}, logs={imported}, omitidos={skipped})",
    )


def main() -> None:
    base = os.getenv("API_URL", DEFAULT_API_URL).rstrip("/")
    try:
        token = login(base)
    except urllib.error.URLError as err:
        print(f"No se pudo conectar a {base}: {err}")
        return

    db = SessionLocal()
    try:
        for name in sorted(PROTECTED_ATHLETE_NAMES):
            restore_one(db, base, token, name)
    finally:
        db.close()


if __name__ == "__main__":
    main()
