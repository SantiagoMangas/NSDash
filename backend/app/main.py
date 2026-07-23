import math
import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import auth, models, schemas, vam_calculator
from .db import Base, SessionLocal, engine, get_db, get_db_backend_name, log_db_startup_info

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://ns-dash.vercel.app",
]


def get_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    extra = [origin.strip() for origin in raw.split(",") if origin.strip()]
    # Merge defaults with env so local dev keeps working in production too.
    return list(dict.fromkeys(DEFAULT_ALLOWED_ORIGINS + extra))


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
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
ATHLETE_PROFILE_COLUMNS: dict[str, str] = {
    "sport": "VARCHAR(100)",
    "height_cm": "FLOAT",
    "body_weight_kg": "FLOAT",
    "goal": "VARCHAR(500)",
    "notes": "TEXT",
}

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


def migrate_athlete_profile_columns() -> None:
    existing_columns = {
        column["name"] for column in inspect(engine).get_columns("athletes")
    }
    with engine.begin() as connection:
        for column_name, column_type in ATHLETE_PROFILE_COLUMNS.items():
            if column_name not in existing_columns:
                connection.execute(
                    text(f"ALTER TABLE athletes ADD COLUMN {column_name} {column_type}")
                )


def build_percentage_table(estimated_rm: float) -> list[dict[str, float | int]]:
    table = []
    for reps, percentage in PERCENTAGE_MAP.items():
        weight = round(float(estimated_rm) * (percentage / 100), 2)
        table.append({"reps": reps, "percentage": percentage, "weight": weight})
    return table


DEFAULT_ADMIN_EMAIL = "admin@ns.com"
DEFAULT_ADMIN_PASSWORD = "1234"


@app.on_event("startup")
def on_startup() -> None:
    log_db_startup_info()
    Base.metadata.create_all(bind=engine)
    migrate_athlete_profile_columns()
    with SessionLocal() as db:
        if db.query(models.User).count() == 0:
            db.add(
                models.User(
                    email=DEFAULT_ADMIN_EMAIL,
                    password_hash=auth.hash_password(DEFAULT_ADMIN_PASSWORD),
                    is_admin=True,
                )
            )
            db.commit()
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


@app.get("/health")
def health_check() -> dict[str, str]:
    """Simple health check endpoint to verify CORS is working."""
    return {"status": "ok", "database": get_db_backend_name()}


@app.get("/test-auth")
def test_auth(current_user: int = Depends(auth.get_current_user)) -> dict[str, int]:
    """Test endpoint to verify auth and CORS work together."""
    return {"user_id": current_user}


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
    db_athlete = models.Athlete(
        name=athlete.name,
        coach_id=current_user,
        sport=athlete.sport,
        height_cm=athlete.height_cm,
        body_weight_kg=athlete.body_weight_kg,
        goal=athlete.goal,
        notes=athlete.notes,
    )
    db.add(db_athlete)
    db.commit()
    db.refresh(db_athlete)
    return db_athlete


@app.get("/athletes", response_model=list[schemas.AthleteResponse])
def list_athletes(db: Session = Depends(get_db), current_user: int = Depends(auth.get_current_user)) -> list[models.Athlete]:
    return db.query(models.Athlete).filter(models.Athlete.coach_id == current_user).all()


@app.patch("/athletes/{athlete_id}", response_model=schemas.AthleteResponse)
def update_athlete(
    athlete_id: int,
    athlete_update: schemas.AthleteUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user),
) -> models.Athlete:
    db_athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if db_athlete is None:
        raise HTTPException(status_code=404, detail="Athlete not found")
    if db_athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = athlete_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_athlete, field, value)

    db.commit()
    db.refresh(db_athlete)
    return db_athlete


@app.delete("/athletes/{athlete_id}")
def delete_athlete(
    athlete_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user),
) -> dict[str, str]:
    db_athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if db_athlete is None:
        raise HTTPException(status_code=404, detail="Athlete not found")
    if db_athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")

    db.query(models.TrainingLog).filter(models.TrainingLog.athlete_id == athlete_id).delete()
    db.query(models.SprintLog).filter(models.SprintLog.athlete_id == athlete_id).delete()
    db.query(models.VamTest).filter(models.VamTest.athlete_id == athlete_id).delete()
    db.delete(db_athlete)
    db.commit()
    return {"detail": "Athlete deleted"}


def get_owned_training_log(
    log_id: int, db: Session, current_user: int
) -> models.TrainingLog:
    log = db.query(models.TrainingLog).filter(models.TrainingLog.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="TrainingLog not found")

    athlete = db.query(models.Athlete).filter(models.Athlete.id == log.athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    return log


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


@app.patch("/logs/{log_id}", response_model=schemas.TrainingLogResponse)
def update_log(
    log_id: int,
    log_update: schemas.TrainingLogUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user),
) -> models.TrainingLog:
    db_log = get_owned_training_log(log_id, db, current_user)

    update_data = log_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    for field, value in update_data.items():
        setattr(db_log, field, value)

    if "weight" in update_data or "reps" in update_data:
        db_log.estimated_rm = float(db_log.weight * (1 + db_log.reps / 30))

    db.commit()
    db.refresh(db_log)
    return db_log


@app.delete("/logs/{log_id}")
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user),
) -> dict[str, str]:
    db_log = get_owned_training_log(log_id, db, current_user)
    db.delete(db_log)
    db.commit()
    return {"detail": "TrainingLog deleted"}


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


# ─── VAM Endpoints ──────────────────────────────────────────────


@app.post("/vam-tests", response_model=schemas.VamTestResponse)
def create_vam_test(
    data: schemas.VamTestInput,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user)
) -> dict:
    """
    Recibe los datos del test, calcula VAM, persiste en DB,
    y retorna la VAM calculada + todas las zonas + tiempos de sprint.
    """
    # Verify athlete ownership
    athlete = db.query(models.Athlete).filter(models.Athlete.id == data.athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Calculate VAM from test data
        vam_values = vam_calculator.calculate_vam_from_test(
            data.test_type, data.value1, data.value2
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Create and persist VamTest record
    db_vam_test = models.VamTest(
        athlete_id=data.athlete_id,
        date=data.date,
        test_type=data.test_type,
        vam_mpm=vam_values["vam_mpm"],
        vam_kmh=vam_values["vam_kmh"],
        vam_ms=vam_values["vam_ms"],
        notes=data.notes,
    )
    db.add(db_vam_test)
    db.commit()
    db.refresh(db_vam_test)
    
    # Calculate zones and sprint times
    zonas = vam_calculator.calculate_zones(vam_values["vam_mpm"])
    tiempos_sprint = vam_calculator.calculate_sprint_times(vam_values["vam_ms"])
    
    return {
        "id": db_vam_test.id,
        "athlete_id": db_vam_test.athlete_id,
        "date": db_vam_test.date,
        "test_type": db_vam_test.test_type,
        "vam_mpm": db_vam_test.vam_mpm,
        "vam_kmh": db_vam_test.vam_kmh,
        "vam_ms": db_vam_test.vam_ms,
        "notes": db_vam_test.notes,
        "zonas": zonas,
        "tiempos_sprint": tiempos_sprint,
    }


@app.get("/athletes/{athlete_id}/vam-tests", response_model=list[schemas.VamTestSummary])
def list_vam_tests(
    athlete_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user)
) -> list:
    """Lista todos los tests VAM del atleta, ordenados por fecha desc."""
    # Verify athlete ownership
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    tests = (
        db.query(models.VamTest)
        .filter(models.VamTest.athlete_id == athlete_id)
        .order_by(models.VamTest.date.desc())
        .all()
    )
    
    return tests


def format_seconds_to_pace(seconds: float) -> str:
    if not math.isfinite(seconds) or seconds <= 0:
        return "0:00"

    minutes = int(seconds // 60)
    remaining = int(round(seconds - (minutes * 60)))
    if remaining == 60:
        minutes += 1
        remaining = 0
    return f"{minutes}:{remaining:02d}"


def build_dashboard_zones(zones: list[dict]) -> list[dict]:
    converted = []
    for zone in zones:
        converted.append({
            "zona": zone["zona"],
            "intensidad": zone["intensidad"],
            "pct_min": zone["pct_min"],
            "pct_max": zone["pct_max"],
            "vel_min_kmh": zone["vel_min_kmh"],
            "vel_max_kmh": zone["vel_max_kmh"],
            "velocidad_ms": zone["velocidad_ms"],
            "velocidad_kmh": zone["velocidad_kmh"],
            "ritmo_min": format_seconds_to_pace(zone["ritmo_min_seg"]),
            "ritmo_max": format_seconds_to_pace(zone["ritmo_max_seg"]),
        })
    return converted


def build_vam_test_zones(zones: list[dict]) -> list[dict]:
    """Convert raw zones for VamTestResponse (keeps ritmo_min_seg/ritmo_max_seg as numbers)."""
    converted = []
    for zone in zones:
        converted.append({
            "zona": zone["zona"],
            "intensidad": zone["intensidad"],
            "pct_min": zone["pct_min"],
            "pct_max": zone["pct_max"],
            "velocidad_ms": zone["velocidad_ms"],
            "velocidad_kmh": zone["velocidad_kmh"],
            "vel_min_kmh": zone["vel_min_kmh"],
            "vel_max_kmh": zone["vel_max_kmh"],
            "ritmo_min_seg": zone["ritmo_min_seg"],
            "ritmo_max_seg": zone["ritmo_max_seg"],
        })
    return converted


def get_best_vam_test(tests: list[models.VamTest]) -> models.VamTest:
    return max(tests, key=lambda test: (test.vam_kmh, test.date))


def convert_units(value: float, from_unit: str) -> dict[str, float | str]:
    from_unit = from_unit.lower()
    if from_unit == "kmh":
        kmh = value
    elif from_unit == "mpm":
        kmh = 60.0 / value if value > 0 else 0.0
    elif from_unit == "ms":
        kmh = value * 3.6
    else:
        raise HTTPException(status_code=400, detail="from_unit debe ser kmh, mpm o ms")

    mpm = 60.0 / kmh if kmh > 0 else 0.0
    ms = kmh / 3.6
    mpm_str = format_seconds_to_pace(3600 / kmh) if kmh > 0 else "0:00"

    return {
        "kmh": round(kmh, 2),
        "mpm": round(mpm, 2),
        "mpm_str": mpm_str,
        "ms": round(ms, 2),
    }
    return max(tests, key=lambda test: (test.vam_kmh, test.date))


@app.get("/vam-tests/{test_id}", response_model=schemas.VamTestResponse)
def get_vam_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user)
) -> dict:
    """Retorna un test VAM con sus zonas y tiempos calculados."""
    test = db.query(models.VamTest).filter(models.VamTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="VamTest not found")
    
    # Verify athlete ownership
    athlete = db.query(models.Athlete).filter(models.Athlete.id == test.athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate zones and sprint times
    zonas = build_vam_test_zones(vam_calculator.calculate_zones(test.vam_mpm))
    tiempos_sprint = vam_calculator.calculate_sprint_times(test.vam_ms)
    
    return {
        "id": test.id,
        "athlete_id": test.athlete_id,
        "date": test.date,
        "test_type": test.test_type,
        "vam_mpm": test.vam_mpm,
        "vam_kmh": test.vam_kmh,
        "vam_ms": test.vam_ms,
        "notes": test.notes,
        "zonas": zonas,
        "tiempos_sprint": tiempos_sprint,
    }


@app.get("/athletes/{athlete_id}/vam-progress")
def get_vam_progress(
    athlete_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user)
) -> dict:
    """
    Retorna el historial de VAM del atleta para graficar progresión.
    Respuesta: {"athlete_id": int, "history": [{"date", "vam_kmh", "test_type"}]}
    """
    # Verify athlete ownership
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete or athlete.coach_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    tests = (
        db.query(models.VamTest)
        .filter(models.VamTest.athlete_id == athlete_id)
        .order_by(models.VamTest.date.asc())
        .all()
    )
    
    history = [
        {
            "date": test.date,
            "vam_kmh": test.vam_kmh,
            "test_type": test.test_type,
        }
        for test in tests
    ]
    
    return {
        "athlete_id": athlete_id,
        "history": history,
    }


@app.get("/athletes/{athlete_id}/velocity-dashboard", response_model=schemas.VelocityDashboard)
def get_velocity_dashboard(
    athlete_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(auth.get_current_user)
) -> dict:
    """Retorna el dashboard de velocidad completo usando siempre el mejor VAM registrado."""
    try:
        athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
        if not athlete or athlete.coach_id != current_user:
            raise HTTPException(status_code=403, detail="Access denied")

        tests = (
            db.query(models.VamTest)
            .filter(models.VamTest.athlete_id == athlete_id)
            .all()
        )
        if not tests:
            raise HTTPException(status_code=404, detail="No VAM tests found for athlete")

        best_test = get_best_vam_test(tests)
        best_test_data = {
            "test_type": best_test.test_type,
            "date": best_test.date,
            "vam_kmh": best_test.vam_kmh,
            "vam_mpm": best_test.vam_mpm,
            "vam_ms": best_test.vam_ms,
            "vam_mpm_formatted": format_seconds_to_pace(3600 / best_test.vam_kmh) if best_test.vam_kmh > 0 else "0:00",
        }

        all_tests_summary = [
            {
                "test_type": test.test_type,
                "date": test.date,
                "vam_kmh": test.vam_kmh,
            }
            for test in sorted(tests, key=lambda test: test.date, reverse=True)
        ]

        vam_tests = [test for test in tests if test.test_type in {"vam_2000m", "vam_5min"}]
        best_vam_source_test = get_best_vam_test(vam_tests) if vam_tests else None
        if best_vam_source_test:
            zones_source = {
                "available": True,
                "test_type": best_vam_source_test.test_type,
                "vam_kmh": best_vam_source_test.vam_kmh,
            }
            training_zones = build_dashboard_zones(vam_calculator.calculate_zones(best_vam_source_test.vam_mpm))
        else:
            zones_source = {"available": False, "test_type": None, "vam_kmh": None}
            training_zones = []

        best_30_15_test = max((test for test in tests if test.test_type == "test_30_15_ift"), key=lambda test: (test.vam_kmh, test.date), default=None)
        best_yoyo_test = max((test for test in tests if test.test_type == "yoyo_ri1"), key=lambda test: (test.vam_kmh, test.date), default=None)

        interval_tables = {
            "from_vam": vam_calculator.calculate_interval_table(best_vam_source_test.vam_kmh, "vam") if best_vam_source_test else None,
            "from_30_15": vam_calculator.calculate_interval_table(best_30_15_test.vam_kmh, "30_15") if best_30_15_test else None,
            "from_yoyo": vam_calculator.calculate_interval_table(best_yoyo_test.vam_kmh, "yoyo") if best_yoyo_test else None,
        }

        sprint_reference = vam_calculator.calculate_sprint_times(best_test.vam_ms)

        unit_conversions = {
            "vam_kmh": best_test.vam_kmh,
            "vam_mpm": best_test.vam_mpm,
            "vam_ms": best_test.vam_ms,
            "vam_mpm_formatted": best_test_data["vam_mpm_formatted"],
        }

        return {
            "athlete_id": athlete_id,
            "best_test": best_test_data,
            "all_tests_summary": all_tests_summary,
            "zones_source": zones_source,
            "training_zones": training_zones,
            "interval_tables": interval_tables,
            "sprint_reference": sprint_reference,
            "unit_conversions": unit_conversions,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] velocity-dashboard: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/convert-units", response_model=schemas.UnitConversionResponse)
def post_convert_units(
    payload: schemas.UnitConversionRequest,
    current_user: int = Depends(auth.get_current_user)
) -> dict[str, float | str]:
    """Convierte entre km/h, m/min y m/s para el picker de la UI."""
    return convert_units(payload.value, payload.from_unit)
