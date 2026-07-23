"""Datos de demo para admin@ns.com (idempotente)."""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from .auth import hash_password
from .models import Athlete, TrainingLog, User

ADMIN_EMAIL = "admin@ns.com"
ADMIN_PASSWORD = "1234"
DEMO_ATHLETE_NAME = "Lucía Fernández"

DEMO_ATHLETES = [
    {
        "name": "Lucía Fernández",
        "sport": "Fútbol",
        "height_cm": 168.0,
        "body_weight_kg": 62.0,
        "goal": "Mejorar fuerza en piernas y potencia de salto para pretemporada.",
        "notes": "Historial de molestia leve en rodilla derecha. Evitar cargas máximas sin calentamiento.",
    },
    {
        "name": "Mateo Ríos",
        "sport": "Rugby",
        "height_cm": 183.0,
        "body_weight_kg": 92.0,
        "goal": "Aumentar fuerza general y resistencia al contacto.",
        "notes": "Buena tolerancia al volumen. Priorizar técnica en sentadilla y peso muerto.",
    },
]

DEMO_LOGS: dict[str, list[tuple[int, float, int]]] = {
    "Lucía Fernández": [
        (1, 85, 5, 8),
        (1, 90, 5, 6),
        (1, 92.5, 5, 5),
        (1, 95, 5, 4),
        (2, 100, 5, 5),
        (2, 105, 5, 4),
        (2, 110, 5, 3),
        (3, 50, 5, 8),
        (3, 52.5, 5, 6),
        (3, 55, 5, 5),
        (4, 35, 5, 8),
        (4, 37.5, 5, 6),
        (5, 80, 5, 10),
        (5, 90, 5, 8),
        (5, 100, 5, 6),
    ],
    "Mateo Ríos": [
        (1, 120, 5, 5),
        (1, 125, 5, 4),
        (1, 130, 5, 3),
        (1, 132.5, 5, 3),
        (2, 140, 5, 5),
        (2, 150, 5, 4),
        (2, 155, 5, 3),
        (2, 160, 5, 2),
        (3, 80, 5, 6),
        (3, 85, 5, 5),
        (3, 90, 5, 4),
        (4, 55, 5, 6),
        (4, 57.5, 5, 5),
        (4, 60, 5, 4),
        (5, 120, 5, 8),
        (5, 130, 5, 6),
        (5, 140, 5, 5),
    ],
}


def estimated_rm(weight: float, reps: int) -> float:
    return round(weight * (1 + reps / 30), 2)


def has_demo_data(db: Session, admin_email: str = ADMIN_EMAIL) -> bool:
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        return False
    return (
        db.query(Athlete)
        .filter(
            Athlete.coach_id == admin.id,
            Athlete.name == DEMO_ATHLETE_NAME,
        )
        .first()
        is not None
    )


def seed_demo_data(db: Session, admin_email: str = ADMIN_EMAIL) -> tuple[int, int]:
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            password_hash=hash_password(ADMIN_PASSWORD),
            is_admin=True,
        )
        db.add(admin)
        db.flush()

    today = date.today()
    created_athletes = 0
    created_logs = 0

    for athlete_data in DEMO_ATHLETES:
        existing = (
            db.query(Athlete)
            .filter(
                Athlete.coach_id == admin.id,
                Athlete.name == athlete_data["name"],
            )
            .first()
        )
        if existing:
            athlete = existing
        else:
            athlete = Athlete(coach_id=admin.id, **athlete_data)
            db.add(athlete)
            db.flush()
            created_athletes += 1

        for exercise_id, days_ago, weight, reps in DEMO_LOGS.get(athlete_data["name"], []):
            log_date = today - timedelta(days=days_ago)
            duplicate = (
                db.query(TrainingLog)
                .filter(
                    TrainingLog.athlete_id == athlete.id,
                    TrainingLog.exercise_id == exercise_id,
                    TrainingLog.date == log_date,
                    TrainingLog.weight == weight,
                    TrainingLog.reps == reps,
                )
                .first()
            )
            if duplicate:
                continue

            db.add(
                TrainingLog(
                    athlete_id=athlete.id,
                    exercise_id=exercise_id,
                    date=log_date,
                    weight=weight,
                    reps=reps,
                    estimated_rm=estimated_rm(weight, reps),
                )
            )
            created_logs += 1

    db.commit()
    return created_athletes, created_logs
