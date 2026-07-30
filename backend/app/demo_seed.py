"""Datos de demo para admin@ns.com (idempotente)."""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from .auth import hash_password
from .models import Athlete, RsaFatigueTest, RsaSprintTime, SpeedTest, TrainingLog, User, VamTest
from .rsa_calculator import calculate_rsa_fatigue_index
from .speed_calculator import calculate_vel_kmh
from .vam_calculator import calculate_vam_from_test

ADMIN_EMAIL = "admin@ns.com"
ADMIN_PASSWORD = "1234"
DEMO_ATHLETE_NAME = "Lucía Fernández"
RESISTENCIA_MARKER = "Lucas Fernández"

DEMO_ATHLETES = [
    {
        "name": "Lucía Fernández",
        "sport": "Fútbol",
        "height_cm": 168.0,
        "body_weight_kg": 62.0,
        "goal": "Mejorar fuerza en piernas y potencia de salto para pretemporada.",
        "notes": "Historial de molestia leve en rodilla derecha. Evitar cargas máximas sin calentamiento.",
    },
    {
        "name": "Mateo Ríos",
        "sport": "Rugby",
        "height_cm": 183.0,
        "body_weight_kg": 92.0,
        "goal": "Aumentar fuerza general y resistencia al contacto.",
        "notes": "Buena tolerancia al volumen. Priorizar técnica en sentadilla y peso muerto.",
    },
]

DEMO_LOGS: dict[str, list[tuple[int, float, int]]] = {
    "Lucía Fernández": [
        (1, 85, 5, 8),
        (1, 90, 5, 6),
        (1, 92.5, 5, 5),
        (1, 95, 5, 4),
        (2, 100, 5, 5),
        (2, 105, 5, 4),
        (2, 110, 5, 3),
        (3, 50, 5, 8),
        (3, 52.5, 5, 6),
        (3, 55, 5, 5),
        (4, 35, 5, 8),
        (4, 37.5, 5, 6),
        (5, 80, 5, 10),
        (5, 90, 5, 8),
        (5, 100, 5, 6),
    ],
    "Mateo Ríos": [
        (1, 120, 5, 5),
        (1, 125, 5, 4),
        (1, 130, 5, 3),
        (1, 132.5, 5, 3),
        (2, 140, 5, 5),
        (2, 150, 5, 4),
        (2, 155, 5, 3),
        (2, 160, 5, 2),
        (3, 80, 5, 6),
        (3, 85, 5, 5),
        (3, 90, 5, 4),
        (4, 55, 5, 6),
        (4, 57.5, 5, 5),
        (4, 60, 5, 4),
        (5, 120, 5, 8),
        (5, 130, 5, 6),
        (5, 140, 5, 5),
    ],
}


RESISTENCIA_ATHLETES = [
    {
        "name": "Lucas Fernández",
        "sport": "Fútbol",
        "height_cm": 178.0,
        "body_weight_kg": 74.0,
        "goal": "Optimizar VAM y capacidad aeróbica para competición.",
        "notes": "Atleta avanzado con historial de progresión positiva en tests de resistencia.",
    },
    {
        "name": "Martín González",
        "sport": "Hockey",
        "height_cm": 175.0,
        "body_weight_kg": 70.0,
        "goal": "Consolidar resistencia intermedia y estabilidad en zonas 3-4.",
        "notes": "Progreso estable. Buen cumplimiento de sesiones MAS.",
    },
    {
        "name": "Tomás Rodríguez",
        "sport": "Rugby",
        "height_cm": 181.0,
        "body_weight_kg": 85.0,
        "goal": "Desarrollar base aeróbica inicial.",
        "notes": "Pocos tests registrados. Progreso irregular en pretemporada.",
    },
    {
        "name": "Camila Estévez",
        "sport": "Fútbol",
        "height_cm": 165.0,
        "body_weight_kg": 58.0,
        "goal": "Evaluar resistencia intermitente con Yo-Yo RI1.",
        "notes": "Caso de prueba: historial centrado en Yo-Yo, sin tests VAM clásicos.",
    },
    {
        "name": "Valentina Morales",
        "sport": "Atletismo",
        "height_cm": 170.0,
        "body_weight_kg": 60.0,
        "goal": "Integrar VAM, velocidad MSS y resistencia RSA en pretemporada.",
        "notes": "Perfil completo: evaluaciones aeróbicas, velocidad y fatiga por sprints.",
    },
    {
        "name": "Diego Acosta",
        "sport": "Fútbol",
        "height_cm": 176.0,
        "body_weight_kg": 72.0,
        "goal": "Desarrollar velocidad pura (MSS) sin base VAM clásica.",
        "notes": "Caso speed-only: dashboard debe funcionar solo con tests de velocidad.",
    },
    {
        "name": "Sofía Navarro",
        "sport": "Hockey",
        "height_cm": 168.0,
        "body_weight_kg": 63.0,
        "goal": "Control aeróbico y monitoreo de fatiga RSA.",
        "notes": "VAM + RSA sin historial de velocidad MSS.",
    },
]

# (days_ago, test_type, value1, value2, notes)
RESISTENCIA_VAM_TESTS: dict[str, list[tuple[int, str, float, float | None, str]]] = {
    "Lucas Fernández": [
        (120, "vam_2000m", 2000, 7.8, "Test pretemporada — base aeróbica"),
        (90, "vam_5min", 5, 1450, "Control mensual"),
        (60, "vam_2000m", 2000, 7.35, "Mejora sostenida"),
        (30, "test_30_15_ift", 17.2, None, "IFT control"),
        (7, "vam_2000m", 2000, 6.95, "Mejor marca actual"),
    ],
    "Martín González": [
        (90, "vam_2000m", 2000, 7.55, "Evaluación inicial"),
        (45, "vam_5min", 5, 1380, "Control intermedio"),
        (14, "vam_2000m", 2000, 7.25, "Progreso estable"),
        (5, "test_30_15_ift", 16.0, None, "IFT reciente"),
    ],
    "Tomás Rodríguez": [
        (60, "vam_5min", 5, 1180, "Primer test aeróbico"),
        (20, "vam_2000m", 2000, 8.4, "2000m con fatiga acumulada"),
    ],
    "Camila Estévez": [
        (100, "yoyo_ri1", 14.0, 14.5, "Yo-Yo RI1 — nivel intermedio"),
        (50, "yoyo_ri1", 15.2, 15.5, "Segundo control Yo-Yo"),
        (12, "yoyo_ri1", 16.0, 16.5, "Mejor nivel alcanzado"),
    ],
    "Valentina Morales": [
        (90, "vam_2000m", 2000, 7.1, "Base aeróbica pretemporada"),
        (45, "test_30_15_ift", 17.8, None, "IFT control intermedio"),
        (10, "vam_2000m", 2000, 6.85, "Mejor VAM actual"),
    ],
    "Sofía Navarro": [
        (60, "vam_5min", 5, 1420, "Primer control aeróbico"),
        (21, "vam_5min", 5, 1485, "Progreso en 5 min"),
    ],
}

# (days_ago, distancia_m, tiempo_s, notes)
RESISTENCIA_SPEED_TESTS: dict[str, list[tuple[int, float, float, str]]] = {
    "Martín González": [
        (35, 30.0, 4.25, "MSS 30m — control"),
        (8, 100.0, 12.4, "MSS 100m — mejor marca"),
    ],
    "Valentina Morales": [
        (40, 30.0, 4.05, "MSS 30m inicial"),
        (20, 100.0, 12.1, "MSS 100m progreso"),
        (5, 200.0, 26.8, "MSS 200m — récord"),
    ],
    "Diego Acosta": [
        (45, 30.0, 4.55, "Evaluación inicial 30m"),
        (28, 100.0, 13.15, "100m control"),
        (6, 200.0, 28.2, "200m pretemporada"),
    ],
}

# (days_ago, tiempos_s, distancia_sprint_m, pausa_s, notes)
RESISTENCIA_RSA_TESTS: dict[str, list[tuple[int, list[float], float | None, float | None, str]]] = {
    "Lucas Fernández": [
        (25, [6.8, 7.0, 7.1, 7.2, 7.3, 7.4], 20.0, 20.0, "RSA 6x20m — fatiga moderada"),
    ],
    "Valentina Morales": [
        (
            14,
            [6.0, 6.3, 6.3, 6.4, 6.4, 6.5, 6.5, 6.6],
            20.0,
            20.0,
            "RSA 8x20m — Excelente (validación Excel)",
        ),
    ],
    "Sofía Navarro": [
        (18, [7.2, 7.5, 7.8, 8.0, 8.3], 30.0, 25.0, "RSA 5x30m — fatiga progresiva"),
    ],
}


def estimated_rm(weight: float, reps: int) -> float:
    return round(weight * (1 + reps / 30), 2)


def has_demo_data(db: Session, admin_email: str = ADMIN_EMAIL) -> bool:
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        return False
    return (
        db.query(Athlete)
        .filter(
            Athlete.coach_id == admin.id,
            Athlete.name == DEMO_ATHLETE_NAME,
        )
        .first()
        is not None
    )


def has_resistencia_demo_data(db: Session, admin_email: str = ADMIN_EMAIL) -> bool:
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        return False
    return (
        db.query(Athlete)
        .filter(
            Athlete.coach_id == admin.id,
            Athlete.name == RESISTENCIA_MARKER,
        )
        .first()
        is not None
    )


def seed_resistencia_demo_data(
    db: Session, admin_email: str = ADMIN_EMAIL
) -> tuple[int, int, int, int]:
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            password_hash=hash_password(ADMIN_PASSWORD),
            is_admin=True,
        )
        db.add(admin)
        db.flush()

    today = date.today()
    created_athletes = 0
    created_vam_tests = 0
    created_speed_tests = 0
    created_rsa_tests = 0

    for athlete_data in RESISTENCIA_ATHLETES:
        existing = (
            db.query(Athlete)
            .filter(
                Athlete.coach_id == admin.id,
                Athlete.name == athlete_data["name"],
            )
            .first()
        )
        if existing:
            athlete = existing
        else:
            athlete = Athlete(coach_id=admin.id, **athlete_data)
            db.add(athlete)
            db.flush()
            created_athletes += 1

        for days_ago, test_type, value1, value2, notes in RESISTENCIA_VAM_TESTS.get(
            athlete_data["name"], []
        ):
            test_date = today - timedelta(days=days_ago)
            duplicate = (
                db.query(VamTest)
                .filter(
                    VamTest.athlete_id == athlete.id,
                    VamTest.date == test_date,
                    VamTest.test_type == test_type,
                )
                .first()
            )
            if duplicate:
                continue

            vam_values = calculate_vam_from_test(test_type, value1, value2)
            db.add(
                VamTest(
                    athlete_id=athlete.id,
                    date=test_date,
                    test_type=test_type,
                    vam_mpm=vam_values["vam_mpm"],
                    vam_kmh=vam_values["vam_kmh"],
                    vam_ms=vam_values["vam_ms"],
                    notes=notes,
                )
            )
            created_vam_tests += 1

        for days_ago, distancia_m, tiempo_s, notes in RESISTENCIA_SPEED_TESTS.get(
            athlete_data["name"], []
        ):
            test_date = today - timedelta(days=days_ago)
            duplicate = (
                db.query(SpeedTest)
                .filter(
                    SpeedTest.athlete_id == athlete.id,
                    SpeedTest.date == test_date,
                    SpeedTest.distancia_m == distancia_m,
                    SpeedTest.tiempo_s == tiempo_s,
                )
                .first()
            )
            if duplicate:
                continue

            vel_kmh = calculate_vel_kmh(distancia_m, tiempo_s)
            db.add(
                SpeedTest(
                    athlete_id=athlete.id,
                    date=test_date,
                    distancia_m=distancia_m,
                    tiempo_s=tiempo_s,
                    vel_kmh=vel_kmh,
                    notes=notes,
                )
            )
            created_speed_tests += 1

        for days_ago, tiempos, distancia_sprint_m, pausa_s, notes in RESISTENCIA_RSA_TESTS.get(
            athlete_data["name"], []
        ):
            test_date = today - timedelta(days=days_ago)
            duplicate = (
                db.query(RsaFatigueTest)
                .filter(
                    RsaFatigueTest.athlete_id == athlete.id,
                    RsaFatigueTest.date == test_date,
                    RsaFatigueTest.notes == notes,
                )
                .first()
            )
            if duplicate:
                continue

            results = calculate_rsa_fatigue_index(tiempos)
            db_rsa_test = RsaFatigueTest(
                athlete_id=athlete.id,
                date=test_date,
                distancia_sprint_m=distancia_sprint_m,
                pausa_s=pausa_s,
                notes=notes,
                cantidad_sprints=results["cantidad_sprints"],
                mejor_tiempo=results["mejor_tiempo"],
                peor_tiempo=results["peor_tiempo"],
                tiempo_total=results["tiempo_total"],
                tiempo_ideal=results["tiempo_ideal"],
                indice_fatiga_pct=results["indice_fatiga_pct"],
                categoria=results["categoria"],
            )
            db.add(db_rsa_test)
            db.flush()

            for order, tiempo in enumerate(tiempos):
                db.add(
                    RsaSprintTime(
                        rsa_fatigue_test_id=db_rsa_test.id,
                        sprint_order=order,
                        tiempo_s=tiempo,
                    )
                )
            created_rsa_tests += 1

    db.commit()
    return created_athletes, created_vam_tests, created_speed_tests, created_rsa_tests


def seed_demo_data(db: Session, admin_email: str = ADMIN_EMAIL) -> tuple[int, int]:
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            password_hash=hash_password(ADMIN_PASSWORD),
            is_admin=True,
        )
        db.add(admin)
        db.flush()

    today = date.today()
    created_athletes = 0
    created_logs = 0

    for athlete_data in DEMO_ATHLETES:
        existing = (
            db.query(Athlete)
            .filter(
                Athlete.coach_id == admin.id,
                Athlete.name == athlete_data["name"],
            )
            .first()
        )
        if existing:
            athlete = existing
        else:
            athlete = Athlete(coach_id=admin.id, **athlete_data)
            db.add(athlete)
            db.flush()
            created_athletes += 1

        for exercise_id, days_ago, weight, reps in DEMO_LOGS.get(athlete_data["name"], []):
            log_date = today - timedelta(days=days_ago)
            duplicate = (
                db.query(TrainingLog)
                .filter(
                    TrainingLog.athlete_id == athlete.id,
                    TrainingLog.exercise_id == exercise_id,
                    TrainingLog.date == log_date,
                    TrainingLog.weight == weight,
                    TrainingLog.reps == reps,
                )
                .first()
            )
            if duplicate:
                continue

            db.add(
                TrainingLog(
                    athlete_id=athlete.id,
                    exercise_id=exercise_id,
                    date=log_date,
                    weight=weight,
                    reps=reps,
                    estimated_rm=estimated_rm(weight, reps),
                )
            )
            created_logs += 1

    db.commit()
    return created_athletes, created_logs
