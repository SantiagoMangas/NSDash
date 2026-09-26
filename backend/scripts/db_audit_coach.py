"""Resumen DB del coach demo (sin borrar nada). PYTHONPATH=. python scripts/db_audit_coach.py"""

import json

from app.db import SessionLocal
from app.demo_seed import ADMIN_EMAIL, PROTECTED_ATHLETE_NAMES
from app.models import Athlete, Team, TrainingLog, User, VamTest

db = SessionLocal()
try:
    admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not admin:
        print(json.dumps({"error": "no admin"}))
        raise SystemExit(1)
    teams = db.query(Team).filter(Team.coach_id == admin.id).order_by(Team.name).all()
    athletes = db.query(Athlete).filter(Athlete.coach_id == admin.id).order_by(Athlete.name).all()
    out = {
        "teams_total": len(teams),
        "teams": [{"id": t.id, "name": t.name, "athletes": db.query(Athlete).filter(Athlete.team_id == t.id).count()} for t in teams],
        "athletes_total": len(athletes),
        "athletes_without_team": db.query(Athlete).filter(Athlete.coach_id == admin.id, Athlete.team_id.is_(None)).count(),
        "protected_present": [n for n in PROTECTED_ATHLETE_NAMES if db.query(Athlete).filter(Athlete.coach_id == admin.id, Athlete.name == n).first()],
        "all_athlete_names": [a.name for a in athletes],
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
finally:
    db.close()
