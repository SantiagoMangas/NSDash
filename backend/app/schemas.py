from pydantic import BaseModel
from datetime import date
from typing import Optional


class AthleteCreate(BaseModel):
    name: str
    coach_id: int


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
