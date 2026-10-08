"""Verifica migración idempotente sobre una COPIA de la SQLite (no toca la original).

Uso:
  python scripts/sqlite_backup.py
  copy app\\database.db app\\database.migration-test.db
  python scripts/verify_user_migration.py --db app/database.migration-test.db
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Importar lógica de migración sin levantar FastAPI completo
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import access, models  # noqa: E402
from app.db import Base  # noqa: E402
from app.main import (  # noqa: E402
    migrate_user_profile_columns,
    sync_user_roles_and_admin_profile,
)

MAXIMA_NAME = "Máxima Alvarez Vanolli"


def counts(session) -> dict[str, int]:
    return {
        "users": session.query(models.User).count(),
        "athletes": session.query(models.Athlete).count(),
        "teams": session.query(models.Team).count(),
        "training_logs": session.query(models.TrainingLog).count(),
    }


def maxima_log_fingerprint(session) -> dict[str, object]:
    athlete = (
        session.query(models.Athlete)
        .filter(models.Athlete.name == MAXIMA_NAME)
        .first()
    )
    if athlete is None:
        return {"found": False}
    logs = (
        session.query(models.TrainingLog)
        .filter(models.TrainingLog.athlete_id == athlete.id)
        .order_by(models.TrainingLog.date, models.TrainingLog.id)
        .all()
    )
    rows = [
        {
            "id": log.id,
            "date": str(log.date),
            "exercise_id": log.exercise_id,
            "weight": log.weight,
            "reps": log.reps,
            "estimated_rm": log.estimated_rm,
        }
        for log in logs
    ]
    return {"found": True, "athlete_id": athlete.id, "log_count": len(rows), "logs": rows}


def run_migration_pass() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_user_profile_columns()
    with SessionLocal() as db:
        sync_user_roles_and_admin_profile(db)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, required=True)
    args = parser.parse_args()
    db_path = args.db.resolve()
    if not db_path.is_file():
        raise SystemExit(f"Missing {db_path}")

    global engine, SessionLocal
    url = f"sqlite:///{db_path.as_posix()}"
    engine = create_engine(url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with SessionLocal() as session:
        before_counts = counts(session)
        before_maxima = maxima_log_fingerprint(session)

    user_columns_before = {c["name"] for c in inspect(engine).get_columns("users")}

    run_migration_pass()
    run_migration_pass()

    with SessionLocal() as session:
        after_counts = counts(session)
        after_maxima = maxima_log_fingerprint(session)

    user_columns_after = {c["name"] for c in inspect(engine).get_columns("users")}

    report = {
        "db": str(db_path),
        "counts_before": before_counts,
        "counts_after": after_counts,
        "counts_unchanged": before_counts == after_counts,
        "maxima_before": {
            "log_count": before_maxima.get("log_count"),
            "fingerprint_match_preview": before_maxima.get("logs", [])[:2],
        },
        "maxima_after": {
            "log_count": after_maxima.get("log_count"),
        },
        "maxima_logs_identical": before_maxima == after_maxima,
        "user_columns_added": sorted(user_columns_after - user_columns_before),
        "migration_idempotent": before_counts == after_counts and before_maxima == after_maxima,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["migration_idempotent"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
