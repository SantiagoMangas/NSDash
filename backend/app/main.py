import math

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import auth, models, schemas
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


@app.post("/auth/login", response_model=schemas.Token)
def login(login_request: schemas.LoginRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    # Find user by email
    user = db.query(models.User).filter(models.User.email == login_request.email).first()
    
    # Verify user exists and password is correct
    if not user or not auth.verify_password(login_request.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    # Create and return JWT token
    access_token = auth.create_access_token({"user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/register", response_model=schemas.UserResponse)
def register(register_request: schemas.LoginRequest, db: Session = Depends(get_db)) -> models.User:
    # Create and save new user
    new_user = models.User(
        email=register_request.email,
        password_hash=auth.hash_password(register_request.password),
        is_admin=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/athletes", response_model=schemas.AthleteResponse)
def create_athlete(
    athlete: schemas.AthleteCreate, db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)
) -> models.Athlete:
    db_athlete = models.Athlete(name=athlete.name, coach_id=current_user)
    db.add(db_athlete)
    db.commit()
    db.refresh(db_athlete)
    return db_athlete


@app.get("/athletes", response_model=list[schemas.AthleteResponse])
def list_athletes(db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)) -> list[models.Athlete]:
    return db.query(models.Athlete).filter(models.Athlete.coach_id == current_user).all()


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
    log: schemas.TrainingLogCreate, db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)
) -> models.TrainingLog:
    athlete = db.query(models.Athlete).filter(models.Athlete.id == log.athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
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
def list_logs(db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)) -> list[models.TrainingLog]:
    return db.query(models.TrainingLog).join(
        models.Athlete
    ).filter(models.Athlete.coach_id == current_user).all()


@app.get("/logs/{log_id}/percentages")
def get_log_percentages(
    log_id: int, db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)
) -> list[dict[str, float | int]]:
    log = db.query(models.TrainingLog).filter(models.TrainingLog.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="TrainingLog not found")
    
    athlete = db.query(models.Athlete).filter(models.Athlete.id == log.athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")

    return build_percentage_table(float(log.estimated_rm))


@app.get("/athletes/{athlete_id}/progress/{exercise_id}")
def get_athlete_progress(
    athlete_id: int, exercise_id: int, db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)
) -> dict[str, object]:
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
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
def get_log_summary(log_id: int, db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)) -> dict[str, object]:
    log = db.query(models.TrainingLog).filter(models.TrainingLog.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="TrainingLog not found")

    athlete = db.query(models.Athlete).filter(models.Athlete.id == log.athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")

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


# ─── Sprint Tracking Endpoints ──────────────────────────────────────────────

def validate_sprint_values(distance: float, time_seconds: float) -> None:
    if not math.isfinite(distance) or not math.isfinite(time_seconds):
        raise HTTPException(status_code=400, detail="Los valores deben ser números válidos")
    if distance <= 0:
        raise HTTPException(status_code=400, detail="La distancia debe ser mayor a 0")
    if time_seconds <= 0:
        raise HTTPException(status_code=400, detail="El tiempo debe ser mayor a 0")


def safe_average_speed(distance: float, time_seconds: float) -> float:
    if time_seconds <= 0 or not math.isfinite(distance) or not math.isfinite(time_seconds):
        return 0.0
    speed = distance / time_seconds
    return round(speed, 2) if math.isfinite(speed) else 0.0


def classify_fatigue(fatigue_percent: float) -> tuple[str, str]:
    if fatigue_percent < 3:
        return "Excelente", "emerald"
    if fatigue_percent < 5:
        return "Normal", "blue"
    return "Fatiga alta", "orange"


def session_rating(score: float) -> str:
    if score >= 85:
        return "Excelente sesión"
    if score >= 70:
        return "Buena"
    if score >= 50:
        return "Fatiga"
    return "Mala recuperación"


def compute_sprint_metrics(log: models.SprintLog, sprint_logs: list[models.SprintLog]) -> dict[str, object]:
    average_speed = safe_average_speed(float(log.distance), float(log.time_seconds))
    same_distance_logs = [l for l in sprint_logs if l.distance == log.distance]
    pr_time_value = min(l.time_seconds for l in same_distance_logs) if same_distance_logs else None
    is_pr = pr_time_value == log.time_seconds
    sorted_by_time = sorted(same_distance_logs, key=lambda l: l.time_seconds)
    previous_pr = sorted_by_time[1].time_seconds if len(sorted_by_time) > 1 else None
    improvement_percent = None
    if previous_pr and is_pr:
        improvement_percent = ((previous_pr - log.time_seconds) / previous_pr) * 100
    if same_distance_logs and len(same_distance_logs) > 1:
        best_time = min(l.time_seconds for l in same_distance_logs)
        worst_time = max(l.time_seconds for l in same_distance_logs)
        fatigue_percent = ((worst_time - best_time) / best_time) * 100
    else:
        fatigue_percent = 0.0
    fatigue_level, fatigue_color = classify_fatigue(fatigue_percent)
    return {
        "id": log.id,
        "athlete_id": log.athlete_id,
        "distance": log.distance,
        "time_seconds": log.time_seconds,
        "date": log.date,
        "notes": log.notes,
        "average_speed": round(average_speed, 2),
        "pr_time": pr_time_value,
        "is_pr": is_pr,
        "improvement_percent": round(improvement_percent, 1) if improvement_percent else None,
        "previous_pr_time": previous_pr,
        "fatigue_percent": round(fatigue_percent, 1),
        "fatigue_level": fatigue_level,
        "fatigue_color": fatigue_color,
    }


@app.post("/sprint-logs")
def create_sprint_log(
    sprint_log: schemas.SprintLogCreate, db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)
) -> dict[str, object]:
    athlete = db.query(models.Athlete).filter(models.Athlete.id == sprint_log.athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")

    validate_sprint_values(float(sprint_log.distance), float(sprint_log.time_seconds))

    db_sprint_log = models.SprintLog(
        athlete_id=sprint_log.athlete_id,
        distance=sprint_log.distance,
        time_seconds=sprint_log.time_seconds,
        date=sprint_log.date,
        notes=sprint_log.notes,
    )
    db.add(db_sprint_log)
    db.commit()
    db.refresh(db_sprint_log)

    all_logs = (
        db.query(models.SprintLog)
        .filter(models.SprintLog.athlete_id == sprint_log.athlete_id)
        .all()
    )
    return compute_sprint_metrics(db_sprint_log, all_logs)


@app.get("/athletes/{athlete_id}/sprint-logs", response_model=list[dict[str, object]])
def get_athlete_sprint_logs(
    athlete_id: int, db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)
) -> list[dict[str, object]]:
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    sprint_logs = (
        db.query(models.SprintLog)
        .filter(models.SprintLog.athlete_id == athlete_id)
        .order_by(models.SprintLog.date.asc())
        .all()
    )
    
    return [compute_sprint_metrics(log, sprint_logs) for log in sprint_logs]


# [NEW] Session Quality Score endpoint
@app.get("/athletes/{athlete_id}/sprint-session-score")
def get_sprint_session_score(
    athlete_id: int, date: str, db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)
) -> dict[str, object]:
    """Calculate quality score for a specific training session (day)"""
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from datetime import datetime as dt
    session_date = dt.strptime(date, "%Y-%m-%d").date()
    
    session_logs = (
        db.query(models.SprintLog)
        .filter(
            models.SprintLog.athlete_id == athlete_id,
            models.SprintLog.date == session_date
        )
        .all()
    )
    
    if not session_logs:
        return {
            "score": 0,
            "rating": "Sin datos",
            "consistency": 0,
            "avg_fatigue": 0,
            "has_pr": False,
            "sprint_count": 0,
        }
    
    # Get all sprints for fatigue calculations
    all_logs = (
        db.query(models.SprintLog)
        .filter(models.SprintLog.athlete_id == athlete_id)
        .all()
    )
    
    # Calculate metrics for session
    speeds = []
    fatigue_values = []
    has_pr = False
    
    for log in session_logs:
        speed = safe_average_speed(float(log.distance), float(log.time_seconds))
        speeds.append(speed)
        
        # Check if is PR for distance
        same_distance_logs = [l for l in all_logs if l.distance == log.distance]
        pr_time = min([l.time_seconds for l in same_distance_logs]) if same_distance_logs else None
        if pr_time == log.time_seconds:
            has_pr = True
        
        # Fatiga for this distance
        if same_distance_logs and len(same_distance_logs) > 1:
            best_time = min([l.time_seconds for l in same_distance_logs])
            worst_time = max([l.time_seconds for l in same_distance_logs])
            fatigue = ((worst_time - best_time) / best_time) * 100
            fatigue_values.append(fatigue)
    
    # Consistency: inverse of std dev
    if len(speeds) > 1:
        import statistics
        std_dev = statistics.stdev(speeds)
        consistency = max(0, 100 - (std_dev * 20))  # Normalize
    else:
        consistency = 100
    
    # Average fatigue
    avg_fatigue = sum(fatigue_values) / len(fatigue_values) if fatigue_values else 0
    
    # Calculate score (0-100)
    consistency_weight = 0.3
    fatigue_weight = 0.3
    pr_weight = 0.4
    
    fatigue_score = max(0, 100 - avg_fatigue * 10)  # Higher fatigue = lower score
    pr_bonus = 20 if has_pr else 0
    
    score = (
        (consistency * consistency_weight) +
        (fatigue_score * fatigue_weight) +
        (pr_bonus * pr_weight)
    )
    score = min(100, max(0, score))
    
    return {
        "score": round(score, 1),
        "rating": session_rating(score),
        "consistency": round(consistency, 1),
        "avg_fatigue": round(avg_fatigue, 1),
        "has_pr": has_pr,
        "sprint_count": len(session_logs),
    }
