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


# ─── VAM Schemas ──────────────────────────────────────────────


class VamTestInput(BaseModel):
    athlete_id: int
    date: date
    test_type: str  # "vam_2000m" | "vam_5min" | "test_30_15_ift" | "yoyo_ri1"
    value1: float   # distancia o velocidad según test_type
    value2: Optional[float] = None  # tiempo o nivel según test_type
    notes: Optional[str] = None

    @field_validator("test_type")
    @classmethod
    def validate_test_type(cls, v):
        allowed = {"vam_2000m", "vam_5min", "test_30_15_ift", "yoyo_ri1"}
        if v not in allowed:
            raise ValueError(f"test_type debe ser uno de: {allowed}")
        return v

    @field_validator("value1")
    @classmethod
    def validate_value1(cls, v):
        if not math.isfinite(v) or v <= 0:
            raise ValueError("value1 debe ser un número positivo válido")
        return v

    @field_validator("value2")
    @classmethod
    def validate_value2(cls, v):
        if v is not None and (not math.isfinite(v) or v <= 0):
            raise ValueError("value2 debe ser un número positivo válido")
        return v


class VamZoneResponse(BaseModel):
    zona: str
    intensidad: str
    pct_min: float
    pct_max: float
    velocidad_ms: float
    velocidad_kmh: float
    vel_min_kmh: float
    vel_max_kmh: float
    ritmo_min_seg: float   # ritmo mínimo en segundos por km
    ritmo_max_seg: float


class SprintTimeResponse(BaseModel):
    distancia: float
    tiempo_segundos: float


class VamTestResponse(BaseModel):
    id: int
    athlete_id: int
    date: date
    test_type: str
    vam_mpm: float
    vam_kmh: float
    vam_ms: float
    notes: Optional[str]
    zonas: list[VamZoneResponse]
    tiempos_sprint: list[SprintTimeResponse]


class VamTestSummary(BaseModel):
    id: int
    athlete_id: int
    date: date
    test_type: str
    vam_kmh: float


class VamTestSummaryItem(BaseModel):
    test_type: str
    date: date
    vam_kmh: float


class BestVamTest(BaseModel):
    test_type: str
    date: date
    vam_kmh: float
    vam_mpm: float
    vam_ms: float
    vam_mpm_formatted: str


class VelocityZoneResponse(BaseModel):
    zona: str
    intensidad: str
    pct_min: float
    pct_max: float
    velocidad_ms: float
    velocidad_kmh: float
    vel_min_kmh: float
    vel_max_kmh: float
    ritmo_min: str
    ritmo_max: str


class ZonesSource(BaseModel):
    available: bool
    test_type: Optional[str] = None
    vam_kmh: Optional[float] = None


class IntervalRow(BaseModel):
    porcentaje: int
    velocidad_kmh: float
    ritmo_str: str
    tipo: str


class IntervalTable(BaseModel):
    source: str
    reference_kmh: float
    rows: list[IntervalRow]


class IntervalTables(BaseModel):
    from_vam: Optional[IntervalTable] = None
    from_30_15: Optional[IntervalTable] = None
    from_yoyo: Optional[IntervalTable] = None


class UnitConversions(BaseModel):
    vam_kmh: float
    vam_mpm: float
    vam_ms: float
    vam_mpm_formatted: str


class UnitConversionRequest(BaseModel):
    value: float
    from_unit: str

    @field_validator("from_unit")
    @classmethod
    def validate_from_unit(cls, v: str) -> str:
        allowed = {"kmh", "mpm", "ms"}
        if v not in allowed:
            raise ValueError(f"from_unit debe ser uno de: {allowed}")
        return v


class UnitConversionResponse(BaseModel):
    kmh: float
    mpm: float
    mpm_str: str
    ms: float


class VelocityDashboard(BaseModel):
    athlete_id: int
    best_test: BestVamTest
    all_tests_summary: list[VamTestSummaryItem]
    zones_source: ZonesSource
    training_zones: list[VelocityZoneResponse]
    interval_tables: IntervalTables
    sprint_reference: list[SprintTimeResponse]
    unit_conversions: UnitConversions
