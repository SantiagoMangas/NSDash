from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import models, schemas
from .db import Base, SessionLocal, engine, get_db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STRENGTH_EXERCISES = [
    "Back Squat",
    "Deadlift",
    "Bench Press",
    "Overhead Press",
    "Hip Thrust",
]
PERCENTAGE_MAP = {
    1: 100.0,
    2: 97.5,
    3: 95.0,
    4: 92.5,
    5: 90.0,
    6: 87.5,
    7: 85.0,
    8: 82.5,
    9: 80.0,
    10: 77.5,
}


def build_percentage_table(estimated_rm: float) -> list[dict[str, float | int]]:
    table = []
    for reps, percentage in PERCENTAGE_MAP.items():
        weight = round(float(estimated_rm) * (percentage / 100), 2)
        table.append({"reps": reps, "percentage": percentage, "weight": weight})
    return table


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        existing_names = {exercise.name for exercise in db.query(models.Exercise).all()}
        missing_names = [name for name in STRENGTH_EXERCISES if name not in existing_names]
        if missing_names:
            has_legacy_type = "type" in {
                column["name"] for column in inspect(engine).get_columns("exercises")
            }
            for name in missing_names:
                if has_legacy_type:
                    db.execute(
                        text(
                            "INSERT INTO exercises (name, type) VALUES (:name, :exercise_type)"
                        ),
                        {"name": name, "exercise_type": "strength"},
                    )
                else:
                    db.add(models.Exercise(name=name))
            db.commit()


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Backend is running"}


@app.post("/athletes", response_model=schemas.AthleteResponse)
def create_athlete(
    athlete: schemas.AthleteCreate, db: Session = Depends(get_db)
) -> models.Athlete:
    db_athlete = models.Athlete(name=athlete.name, coach_id=athlete.coach_id)
    db.add(db_athlete)
    db.commit()
    db.refresh(db_athlete)
    return db_athlete


@app.get("/athletes", response_model=list[schemas.AthleteResponse])
def list_athletes(db: Session = Depends(get_db)) -> list[models.Athlete]:
    return db.query(models.Athlete).all()


@app.post("/exercises")
def create_exercise() -> None:
    raise HTTPException(
        status_code=405,
        detail="Exercise creation is disabled. Use predefined strength exercises.",
    )


@app.get("/exercises", response_model=list[schemas.ExerciseResponse])
def list_exercises(db: Session = Depends(get_db)) -> list[models.Exercise]:
    return db.query(models.Exercise).all()


@app.post("/logs", response_model=schemas.TrainingLogResponse)
def create_log(
    log: schemas.TrainingLogCreate, db: Session = Depends(get_db)
) -> models.TrainingLog:
    estimated_rm = float(log.weight * (1 + log.reps / 30))
    db_log = models.TrainingLog(
        athlete_id=log.athlete_id,
        exercise_id=log.exercise_id,
        date=log.date,
        weight=log.weight,
        reps=log.reps,
        estimated_rm=estimated_rm,
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@app.get("/logs", response_model=list[schemas.TrainingLogResponse])
def list_logs(db: Session = Depends(get_db)) -> list[models.TrainingLog]:
    return db.query(models.TrainingLog).all()


@app.get("/logs/{log_id}/percentages")
def get_log_percentages(
    log_id: int, db: Session = Depends(get_db)
) -> list[dict[str, float | int]]:
    log = db.query(models.TrainingLog).filter(models.TrainingLog.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="TrainingLog not found")

    return build_percentage_table(float(log.estimated_rm))


@app.get("/athletes/{athlete_id}/progress/{exercise_id}")
def get_athlete_progress(
    athlete_id: int, exercise_id: int, db: Session = Depends(get_db)
) -> dict[str, object]:
    exercise = db.query(models.Exercise).filter(models.Exercise.id == exercise_id).first()
    exercise_name = exercise.name if exercise else "Unknown Exercise"

    logs = (
        db.query(models.TrainingLog)
        .filter(
            models.TrainingLog.athlete_id == athlete_id,
            models.TrainingLog.exercise_id == exercise_id,
        )
        .order_by(models.TrainingLog.date.asc())
        .all()
    )

    return {
        "exercise": exercise_name,
        "history": [
            {
                "date": log.date,
                "estimated_rm": round(float(log.estimated_rm), 2),
                "weight": log.weight,
                "reps": log.reps,
            }
            for log in logs
        ],
    }


@app.get("/logs/{log_id}/summary")
def get_log_summary(log_id: int, db: Session = Depends(get_db)) -> dict[str, object]:
    log = db.query(models.TrainingLog).filter(models.TrainingLog.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="TrainingLog not found")

    exercise = db.query(models.Exercise).filter(models.Exercise.id == log.exercise_id).first()
    exercise_name = exercise.name if exercise else "Unknown Exercise"

    percentages = build_percentage_table(float(log.estimated_rm))

    return {
        "exercise": exercise_name,
        "weight": log.weight,
        "reps": log.reps,
        "date": log.date,
        "estimated_rm": round(float(log.estimated_rm), 2),
        "percentages": [{"reps": row["reps"], "weight": row["weight"]} for row in percentages],
    }
