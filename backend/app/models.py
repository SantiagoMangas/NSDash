from .db import Base

from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)


class Athlete(Base):
    __tablename__ = "athletes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)


class TrainingLog(Base):
    __tablename__ = "training_logs"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    date = Column(Date, nullable=False)
    weight = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    estimated_rm = Column(Float, nullable=True)
