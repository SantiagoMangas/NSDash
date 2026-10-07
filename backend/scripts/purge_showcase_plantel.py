"""Elimina el plantel demo del seed (atletas showcase, equipos demo vacíos y ejercicios de prueba).

Uso (desde backend/):
  PYTHONPATH=. python scripts/purge_showcase_plantel.py
"""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.demo_seed import ADMIN_EMAIL, DEMO_TEAMS, PROTECTED_ATHLETE_NAMES, SHOWCASE_ATHLETE_NAMES
from app.main import on_startup
from app.models import Athlete, Exercise, RsaFatigueTest, RsaSprintTime, SpeedTest, Team, TrainingLog, User, VamTest


TEST_EXERCISE_RE = re.compile(
    r"^(prueba catalogo e2e|test brzycki catalog|test epley catalog ui)",
    re.IGNORECASE,
)


def delete_athlete_cascade(db: Session, athlete: Athlete) -> None:
    aid = athlete.id
    db.query(TrainingLog).filter(TrainingLog.athlete_id == aid).delete()
    db.query(SpeedTest).filter(SpeedTest.athlete_id == aid).delete()
    db.query(VamTest).filter(VamTest.athlete_id == aid).delete()
    rsa_test_ids = [
        test_id
        for (test_id,) in db.query(RsaFatigueTest.id).filter(RsaFatigueTest.athlete_id == aid).all()
    ]
    if rsa_test_ids:
        db.query(RsaSprintTime).filter(RsaSprintTime.rsa_fatigue_test_id.in_(rsa_test_ids)).delete(
            synchronize_session=False,
        )
        db.query(RsaFatigueTest).filter(RsaFatigueTest.athlete_id == aid).delete(synchronize_session=False)
    db.delete(athlete)


def main() -> None:
    on_startup()
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if admin is None:
            print("Admin demo no encontrado; nada que purgar.")
            return

        removed_athletes: list[str] = []
        showcase_only = SHOWCASE_ATHLETE_NAMES - PROTECTED_ATHLETE_NAMES
        for name in showcase_only:
            athlete = (
                db.query(Athlete)
                .filter(Athlete.coach_id == admin.id, Athlete.name == name)
                .first()
            )
            if athlete is None:
                continue
            delete_athlete_cascade(db, athlete)
            removed_athletes.append(name)

        removed_teams: list[str] = []
        for team_name in DEMO_TEAMS:
            team = (
                db.query(Team)
                .filter(Team.coach_id == admin.id, Team.name == team_name)
                .first()
            )
            if team is None:
                continue
            still = db.query(Athlete).filter(Athlete.team_id == team.id).count()
            if still == 0:
                db.delete(team)
                removed_teams.append(team_name)

        removed_exercises: list[str] = []
        for exercise in db.query(Exercise).all():
            if TEST_EXERCISE_RE.match(exercise.name.strip()) or (
                "e2e" in exercise.name.lower() and "catalogo" in exercise.name.lower()
            ):
                db.query(TrainingLog).filter(TrainingLog.exercise_id == exercise.id).delete()
                db.delete(exercise)
                removed_exercises.append(exercise.name)

        db.commit()
        print(f"Atletas demo eliminados ({len(removed_athletes)}): {', '.join(removed_athletes) or '—'}")
        print(f"Equipos demo vacíos eliminados ({len(removed_teams)}): {', '.join(removed_teams) or '—'}")
        print(f"Ejercicios de prueba eliminados ({len(removed_exercises)}): {', '.join(removed_exercises) or '—'}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
