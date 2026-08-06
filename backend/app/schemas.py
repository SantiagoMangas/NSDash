import math
from datetime import date as Date
from typing import Optional

from pydantic import BaseModel, Field, field_validator


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
    sport: Optional[str] = Field(default=None, max_length=100)
    height_cm: Optional[float] = None
    body_weight_kg: Optional[float] = None
    goal: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("El nombre no puede estar vacío")
        return stripped

    @field_validator("height_cm")
    @classmethod
    def validate_height_cm(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if not math.isfinite(value) or value <= 0:
            raise ValueError("La altura debe ser un número mayor a 0")
        if value < 100 or value > 250:
            raise ValueError("La altura debe estar entre 100 y 250 cm")
        return value

    @field_validator("body_weight_kg")
    @classmethod
    def validate_body_weight_kg(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if not math.isfinite(value) or value <= 0:
            raise ValueError("El peso corporal debe ser un número mayor a 0")
        if value < 30 or value > 300:
            raise ValueError("El peso corporal debe estar entre 30 y 300 kg")
        return value


class AthleteUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = Field(default=None, max_length=100)
    height_cm: Optional[float] = None
    body_weight_kg: Optional[float] = None
    goal: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("El nombre no puede estar vacío")
        return stripped

    @field_validator("height_cm")
    @classmethod
    def validate_height_cm(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if not math.isfinite(value) or value <= 0:
            raise ValueError("La altura debe ser un número mayor a 0")
        if value < 100 or value > 250:
            raise ValueError("La altura debe estar entre 100 y 250 cm")
        return value

    @field_validator("body_weight_kg")
    @classmethod
    def validate_body_weight_kg(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if not math.isfinite(value) or value <= 0:
            raise ValueError("El peso corporal debe ser un número mayor a 0")
        if value < 30 or value > 300:
            raise ValueError("El peso corporal debe estar entre 30 y 300 kg")
        return value


class AthleteResponse(BaseModel):
    id: int
    name: str
    coach_id: int
    sport: Optional[str] = None
    height_cm: Optional[float] = None
    body_weight_kg: Optional[float] = None
    goal: Optional[str] = None
    notes: Optional[str] = None


class ExerciseResponse(BaseModel):
    id: int
    name: str


class TrainingLogCreate(BaseModel):
    athlete_id: int
    exercise_id: int
    date: Date
    weight: float
    reps: int


class TrainingLogUpdate(BaseModel):
    date: Optional[Date] = None
    weight: Optional[float] = None
    reps: Optional[int] = None

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if not math.isfinite(value) or value <= 0:
            raise ValueError("El peso debe ser un número mayor a 0")
        return value

    @field_validator("reps")
    @classmethod
    def validate_reps(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return value
        if not isinstance(value, int) or value <= 0:
            raise ValueError("Las repeticiones deben ser un número entero mayor a 0")
        return value


class TrainingLogResponse(BaseModel):
    id: int
    athlete_id: int
    exercise_id: int
    date: Date
    weight: float
    reps: int
    estimated_rm: Optional[float]


class SprintLogCreate(BaseModel):
    athlete_id: int
    distance: float
    time_seconds: float
    date: Date
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
    date: Date
    notes: Optional[str]
    average_speed: float


class SprintLogDetail(BaseModel):
    id: int
    athlete_id: int
    distance: float
    time_seconds: float
    date: Date
    notes: Optional[str]
    average_speed: float
    pr_time: Optional[float]
    fatigue_percent: Optional[float]


# ─── VAM Schemas ──────────────────────────────────────────────


class VamTestInput(BaseModel):
    athlete_id: int
    date: Date
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
    date: Date
    test_type: str
    vam_mpm: float
    vam_kmh: float
    vam_ms: float
    ritmo_str: str
    notes: Optional[str]
    zonas: list[VamZoneResponse]
    tiempos_sprint: list[SprintTimeResponse]


class VamTestSummary(BaseModel):
    id: int
    athlete_id: int
    date: Date
    test_type: str
    vam_kmh: float
    ritmo_str: str


class YoyoLevelItem(BaseModel):
    nivel: int
    velocidad_kmh: float


class VamTestSummaryItem(BaseModel):
    test_type: str
    date: Date
    vam_kmh: float


class BestVamTest(BaseModel):
    test_type: str
    date: Date
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
    from_speed_test: Optional[IntervalTable] = None


class UnitConversions(BaseModel):
    vam_kmh: float
    vam_mpm: float
    vam_ms: float
    vam_mpm_formatted: str


# ─── Speed Test (MSS) Schemas ───────────────────────────────────


class SpeedTestInput(BaseModel):
    athlete_id: int
    date: Date
    distancia_m: float
    tiempo_s: float
    notes: Optional[str] = None

    @field_validator("distancia_m")
    @classmethod
    def validate_distancia_m(cls, v: float) -> float:
        if not math.isfinite(v) or v <= 0:
            raise ValueError("distancia_m debe ser un número positivo válido")
        return v

    @field_validator("tiempo_s")
    @classmethod
    def validate_tiempo_s(cls, v: float) -> float:
        if not math.isfinite(v) or v <= 0:
            raise ValueError("tiempo_s debe ser un número positivo válido")
        return v


class SpeedTestResponse(BaseModel):
    id: int
    athlete_id: int
    date: Date
    distancia_m: float
    tiempo_s: float
    vel_kmh: float
    ritmo_str: str
    notes: Optional[str]


class SpeedTestSummary(BaseModel):
    id: int
    athlete_id: int
    date: Date
    distancia_m: float
    tiempo_s: float
    vel_kmh: float
    ritmo_str: str


# ─── RSA-IFF Schemas ────────────────────────────────────────────


class RsaFatigueTestInput(BaseModel):
    athlete_id: int
    date: Date
    tiempos: list[float]
    distancia_sprint_m: Optional[float] = None
    pausa_s: Optional[float] = None
    notes: Optional[str] = None

    @field_validator("tiempos")
    @classmethod
    def validate_tiempos(cls, v: list[float]) -> list[float]:
        if len(v) < 2:
            raise ValueError("tiempos debe contener al menos 2 sprints para calcular el índice de fatiga")
        for tiempo in v:
            if not math.isfinite(tiempo) or tiempo <= 0:
                raise ValueError("cada tiempo debe ser un número positivo válido")
        return v

    @field_validator("distancia_sprint_m")
    @classmethod
    def validate_distancia_sprint_m(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (not math.isfinite(v) or v <= 0):
            raise ValueError("distancia_sprint_m debe ser un número positivo válido")
        return v

    @field_validator("pausa_s")
    @classmethod
    def validate_pausa_s(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (not math.isfinite(v) or v <= 0):
            raise ValueError("pausa_s debe ser un número positivo válido")
        return v


class RsaFatigueTestResponse(BaseModel):
    id: int
    athlete_id: int
    date: Date
    tiempos: list[float]
    distancia_sprint_m: Optional[float]
    pausa_s: Optional[float]
    notes: Optional[str]
    cantidad_sprints: int
    mejor_tiempo: float
    peor_tiempo: float
    tiempo_total: float
    tiempo_medio: float
    tiempo_ideal: float
    indice_fatiga_pct: float
    categoria: str
    velocidad_mejor_kmh: Optional[float] = None
    velocidad_peor_kmh: Optional[float] = None
    velocidad_media_kmh: Optional[float] = None


class RsaFatigueTestSummary(BaseModel):
    id: int
    athlete_id: int
    date: Date
    cantidad_sprints: int
    indice_fatiga_pct: float
    categoria: str


# ─── ASR (Anaerobic Speed Reserve) Schemas ───────────────────────


class AsrComparativaPorMss(BaseModel):
    pct_mss: float
    velocidad_kmh: float
    srr_pct: float


class AsrComparativaPorSrr(BaseModel):
    pct_srr: float
    velocidad_kmh: float
    mmss_pct: float


class AsrResponse(BaseModel):
    athlete_id: int
    missing: list[str] = []
    mss_kmh: Optional[float] = None
    ift_kmh: Optional[float] = None
    asr_kmh: Optional[float] = None
    comparativa_por_mss: Optional[AsrComparativaPorMss] = None
    comparativa_por_srr: Optional[AsrComparativaPorSrr] = None


# ─── National table / team grouping ──────────────────────────────


class NationalTableAthleteRow(BaseModel):
    athlete_id: int
    nombre: str
    missing: list[str] = []
    ift_kmh: Optional[float] = None
    mmss_kmh: Optional[float] = None
    asr_kmh: Optional[float] = None
    velocidad_referencia_kmh: Optional[float] = None
    pct_srr: Optional[float] = None


class NationalTableResponse(BaseModel):
    pct_srr: float
    athletes: list[NationalTableAthleteRow]


class NationalGroupAthlete(BaseModel):
    athlete_id: int
    nombre: str
    velocidad_referencia_kmh: float


class NationalGroup(BaseModel):
    grupo: int
    techo_kmh: float
    athletes: list[NationalGroupAthlete]


class NationalTableGroupsResponse(BaseModel):
    pct_srr: float
    cantidad_grupos: int
    diferencia_pct: float
    athletes: list[NationalTableAthleteRow]
    groups: list[NationalGroup]
    sin_datos: list[NationalTableAthleteRow]


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


class PreferredSpeedTestUpdate(BaseModel):
    speed_test_id: Optional[int] = None


class PreferredSpeedTestResponse(BaseModel):
    athlete_id: int
    preferred_speed_test_id: Optional[int] = None


class VelocityDashboard(BaseModel):
    athlete_id: int
    best_test: BestVamTest
    all_tests_summary: list[VamTestSummaryItem]
    zones_source: ZonesSource
    training_zones: list[VelocityZoneResponse]
    interval_tables: IntervalTables
    sprint_reference: list[SprintTimeResponse]
    unit_conversions: UnitConversions
    # Preferencia persistida (null = automático). Id en uso para Tempo/RST/SIT.
    preferred_speed_test_id: Optional[int] = None
    speed_test_reference_id: Optional[int] = None
