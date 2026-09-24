from .db import Base

from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    image_url = Column(String, nullable=True)


class Sport(Base):
    __tablename__ = "sports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)

    positions = relationship("Position", back_populates="sport", cascade="all, delete-orphan")


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False, index=True)
    name = Column(String, nullable=False)

    sport = relationship("Sport", back_populates="positions")


class Athlete(Base):
    __tablename__ = "athletes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True, index=True)
    sport = Column(String(100), nullable=True)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=True, index=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=True, index=True)
    height_cm = Column(Float, nullable=True)
    body_weight_kg = Column(Float, nullable=True)
    goal = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    birth_date = Column(Date, nullable=True)
    injuries = Column(Text, nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    photo_url = Column(String(2048), nullable=True)
    # Null = usar el SpeedTest más veloz (automático).
    # Sin FK en SQLAlchemy para evitar ciclo athletes ↔ speed_tests; la pertenencia se valida en el endpoint.
    preferred_speed_test_id = Column(Integer, nullable=True)

    team = relationship("Team", foreign_keys=[team_id])
    sport_ref = relationship("Sport", foreign_keys=[sport_id])
    position_ref = relationship("Position", foreign_keys=[position_id])


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rm_coefficient = Column(Float, nullable=False, default=1.0 / 30.0)
    formula_type = Column(String(20), nullable=False, default="epley")


class TrainingLog(Base):
    __tablename__ = "training_logs"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    date = Column(Date, nullable=False)
    weight = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    estimated_rm = Column(Float, nullable=True)


class SprintLog(Base):
    __tablename__ = "sprint_logs"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"), nullable=False)
    distance = Column(Float, nullable=False)
    time_seconds = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    notes = Column(String, nullable=True)


class VamTest(Base):
    __tablename__ = "vam_tests"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"), nullable=False)
    date = Column(Date, nullable=False)
    test_type = Column(String, nullable=False)
    # test_type values: "vam_2000m", "vam_5min", "test_30_15_ift", "yoyo_ri1"
    vam_mpm = Column(Float, nullable=False)   # VAM en m/min
    vam_kmh = Column(Float, nullable=False)   # VAM en km/h
    vam_ms = Column(Float, nullable=False)    # VAM en m/s
    notes = Column(String, nullable=True)


class SpeedTest(Base):
    __tablename__ = "speed_tests"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"), nullable=False)
    date = Column(Date, nullable=False)
    distancia_m = Column(Float, nullable=False)
    tiempo_s = Column(Float, nullable=False)
    vel_kmh = Column(Float, nullable=False)  # velocidad promedio calculada (dist/tiempo)
    velocidad_pico_kmh = Column(Float, nullable=True)  # opcional: radar/GPS u otra tecnología
    notes = Column(String, nullable=True)


class RsaFatigueTest(Base):
    __tablename__ = "rsa_fatigue_tests"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"), nullable=False)
    date = Column(Date, nullable=False)
    distancia_sprint_m = Column(Float, nullable=True)
    pausa_s = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    cantidad_sprints = Column(Integer, nullable=False)
    mejor_tiempo = Column(Float, nullable=False)
    peor_tiempo = Column(Float, nullable=False)
    tiempo_total = Column(Float, nullable=False)
    tiempo_ideal = Column(Float, nullable=False)
    indice_fatiga_pct = Column(Float, nullable=False)
    categoria = Column(String, nullable=False)


class RsaSprintTime(Base):
    __tablename__ = "rsa_sprint_times"

    id = Column(Integer, primary_key=True, index=True)
    rsa_fatigue_test_id = Column(Integer, ForeignKey("rsa_fatigue_tests.id"), nullable=False)
    sprint_order = Column(Integer, nullable=False)
    tiempo_s = Column(Float, nullable=False)
