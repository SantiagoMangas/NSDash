import math
from datetime import date
from typing import Optional

from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    email: str


class AthleteCreate(BaseModel):
    name: str


class AthleteResponse(BaseModel):
    id: int
    name: str
    coach_id: int


class ExerciseResponse(BaseModel):
    id: int
    name: str


class TrainingLogCreate(BaseModel):
    athlete_id: int
    exercise_id: int
    date: date
    weight: float
    reps: int


class TrainingLogResponse(BaseModel):
    id: int
    athlete_id: int
    exercise_id: int
    date: date
    weight: float
    reps: int
    estimated_rm: Optional[float]


class SprintLogCreate(BaseModel):
    athlete_id: int
    distance: float
    time_seconds: float
    date: date
    notes: Optional[str] = None

    @field_validator("distance", "time_seconds")
    @classmethod
    def validate_positive_finite(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("El valor debe ser un número válido")
        if value <= 0:
            raise ValueError("El valor debe ser mayor a 0")
        return value


class SprintLogResponse(BaseModel):
    id: int
    athlete_id: int
    distance: float
    time_seconds: float
    date: date
    notes: Optional[str]
    average_speed: float


class SprintLogDetail(BaseModel):
    id: int
    athlete_id: int
    distance: float
    time_seconds: float
    date: date
    notes: Optional[str]
    average_speed: float
    pr_time: Optional[float]
    fatigue_percent: Optional[float]
