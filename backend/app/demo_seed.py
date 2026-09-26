"""Datos de demo para admin@ns.com (idempotente, solo agrega o completa).

El seed histórico en repo creaba atletas y logs de fuerza/resistencia pero **no**
insertaba equipos (`teams`): los demo quedaban con `team_id` NULL en /equipos.
Este módulo crea equipos demo si faltan, asigna solo al catálogo listado abajo,
y agrega historial que no exista. **No borra** atletas, equipos ni registros.

Datos reales de Nico: no tocar atletas en PROTECTED_ATHLETE_NAMES ni sus equipos.
"""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from .auth import hash_password
from .models import (
    Athlete,
    Exercise,
    Position,
    RsaFatigueTest,
    RsaSprintTime,
    Sport,
    SpeedTest,
    Team,
    TrainingLog,
    User,
    VamTest,
)
from .rsa_calculator import calculate_rsa_fatigue_index
from .speed_calculator import calculate_vel_kmh
from .strength_rm import compute_estimated_rm
from .vam_calculator import calculate_vam_from_test

ADMIN_EMAIL = "admin@ns.com"
ADMIN_PASSWORD = "1234"
SHOWCASE_TEAM_MARKER = "Hockey Primera"

# Historial demo con fechas fijas (idempotente). No usar date.today() para filas de seed.
DEMO_HISTORY_ANCHOR = date(2025, 9, 25)


def _demo_history_date(days_ago: int) -> date:
    return DEMO_HISTORY_ANCHOR - timedelta(days=days_ago)

# Cargado por Nico en producción/local — no modificar ni reasignar equipo.
PROTECTED_ATHLETE_NAMES = frozenset({"Máxima Alvarez Vanolli"})

# Plantel demo que Nico debe ver al entrar (no incluye atletas de prueba ajenos al seed).
SHOWCASE_ATHLETE_NAMES = frozenset(
    {
        "Lucía Fernández",
        "Mateo Ríos",
        "Lucas Fernández",
        "Martín González",
        "Camila Estévez",
        "Valentina Morales",
        "Diego Acosta",
        "Sofía Navarro",
        "Tomás Rodríguez",
    }
)

DEMO_TEAMS = [
    "Hockey Primera",
    "Atletismo Sub-18",
    "Fútbol Primera",
]

ATHLETE_TEAM_BY_NAME: dict[str, str] = {
    "Lucía Fernández": "Fútbol Primera",
    "Lucas Fernández": "Fútbol Primera",
    "Mateo Ríos": "Fútbol Primera",
    "Camila Estévez": "Fútbol Primera",
    "Martín González": "Hockey Primera",
    "Sofía Navarro": "Hockey Primera",
    "Valentina Morales": "Atletismo Sub-18",
    "Diego Acosta": "Atletismo Sub-18",
    "Tomás Rodríguez": "Atletismo Sub-18",
}

# (deporte catálogo, posición) — solo si el campo está vacío en la ficha.
ATHLETE_SPORT_POSITION: dict[str, tuple[str, str]] = {
    "Martín González": ("Hockey", "Medio"),
    "Sofía Navarro": ("Hockey", "Delantera"),
    "Valentina Morales": ("Atletismo", "Velocista"),
    "Diego Acosta": ("Atletismo", "Velocista"),
    "Tomás Rodríguez": ("Atletismo", "Mediofondista"),
}

DEMO_ATHLETES = [
    {
        "name": "Lucía Fernández",
        "sport": "Fútbol",
        "birth_date": date(2002, 4, 12),
        "height_cm": 168.0,
        "body_weight_kg": 62.0,
        "goal": "Mejorar fuerza en piernas y potencia de salto para pretemporada.",
        "notes": "Molestia leve rodilla derecha. Evitar máximos sin calentamiento completo.",
        "email": "lucia.fernandez@demo.local",
    },
    {
        "name": "Mateo Ríos",
        "sport": "Rugby",
        "birth_date": date(2000, 9, 3),
        "height_cm": 183.0,
        "body_weight_kg": 92.0,
        "goal": "Aumentar fuerza general y tolerancia al contacto en el scrum.",
        "notes": "Buena tolerancia al volumen. Priorizar técnica en sentadilla y peso muerto.",
        "email": "mateo.rios@demo.local",
    },
]

# (nombre ejercicio, días atrás, kg, reps)
DEMO_STRENGTH_LOGS: dict[str, list[tuple[str, int, float, int]]] = {
    "Lucía Fernández": [
        ("Sentadilla Back", 70, 70.0, 6),
        ("Sentadilla Back", 63, 75.0, 5),
        ("Sentadilla Back", 56, 80.0, 5),
        ("Sentadilla Back", 49, 82.5, 5),
        ("Sentadilla Back", 42, 85.0, 5),
        ("Sentadilla Back", 35, 87.5, 5),
        ("Sentadilla Back", 28, 90.0, 5),
        ("Peso muerto rumano", 56, 50.0, 8),
        ("Peso muerto rumano", 42, 52.5, 6),
        ("Peso muerto rumano", 28, 55.0, 5),
        ("Press Plano - Br", 45, 35.0, 8),
        ("Press Plano - Br", 30, 37.5, 6),
        ("Press Militar - Br", 40, 30.0, 8),
        ("Press Militar - Br", 25, 32.5, 6),
        ("Hips Thrust", 50, 80.0, 10),
        ("Hips Thrust", 35, 90.0, 8),
        ("Hips Thrust", 21, 100.0, 6),
    ],
    "Mateo Ríos": [
        ("Sentadilla Back", 65, 120.0, 5),
        ("Sentadilla Back", 58, 125.0, 5),
        ("Sentadilla Back", 51, 130.0, 4),
        ("Sentadilla Back", 44, 132.5, 3),
        ("Peso muerto", 60, 140.0, 5),
        ("Peso muerto", 45, 150.0, 4),
        ("Peso muerto", 32, 155.0, 3),
        ("Peso muerto", 21, 160.0, 2),
        ("Press Plano - Br", 50, 80.0, 6),
        ("Press Plano - Br", 35, 85.0, 5),
        ("Press Militar - Br", 40, 55.0, 6),
        ("Press Militar - Br", 28, 57.5, 5),
        ("Hips Thrust", 55, 120.0, 8),
        ("Hips Thrust", 40, 130.0, 6),
        ("Hips Thrust", 25, 140.0, 5),
    ],
    "Lucas Fernández": [
        ("Sentadilla Back", 56, 95.0, 5),
        ("Sentadilla Back", 42, 100.0, 5),
        ("Sentadilla Back", 28, 105.0, 4),
        ("Peso muerto", 49, 130.0, 5),
        ("Peso muerto", 35, 140.0, 5),
        ("Press Militar - Br", 40, 38.0, 6),
        ("Press Militar - Br", 30, 40.0, 6),
    ],
    "Camila Estévez": [
        ("Sentadilla Back", 50, 55.0, 6),
        ("Sentadilla Back", 35, 60.0, 5),
        ("Sentadilla Back", 21, 62.5, 5),
        ("Hips Thrust", 45, 70.0, 10),
        ("Hips Thrust", 28, 75.0, 8),
    ],
    "Martín González": [
        ("Sentadilla Back", 55, 90.0, 5),
        ("Sentadilla Back", 40, 95.0, 4),
        ("Peso muerto rumano", 48, 70.0, 6),
        ("Press Plano - Br", 35, 65.0, 6),
    ],
    "Sofía Navarro": [
        ("Sentadilla Back", 52, 65.0, 6),
        ("Sentadilla Back", 38, 70.0, 5),
        ("Hips Thrust", 44, 75.0, 10),
        ("Hips Thrust", 30, 82.5, 8),
    ],
    "Valentina Morales": [
        ("Sentadilla Back", 60, 75.0, 5),
        ("Sentadilla Back", 45, 80.0, 4),
        ("Peso muerto rumano", 50, 60.0, 6),
        ("Press Militar - Br", 32, 28.0, 8),
    ],
    "Diego Acosta": [
        ("Sentadilla Back", 45, 85.0, 5),
        ("Sentadilla Back", 30, 90.0, 4),
        ("Peso muerto", 38, 110.0, 5),
    ],
    "Tomás Rodríguez": [
        ("Sentadilla Back", 58, 110.0, 5),
        ("Sentadilla Back", 42, 115.0, 4),
        ("Peso muerto", 50, 150.0, 5),
        ("Press Plano - Br", 36, 75.0, 5),
    ],
}

RESISTENCIA_ATHLETES = [
    {
        "name": "Lucía Fernández",
        "sport": "Fútbol",
        "birth_date": date(2002, 4, 12),
        "height_cm": 168.0,
        "body_weight_kg": 62.0,
        "goal": "Mejorar fuerza en piernas y potencia de salto para pretemporada.",
        "notes": "Molestia leve rodilla derecha. Evitar máximos sin calentamiento completo.",
        "email": "lucia.fernandez@demo.local",
    },
    {
        "name": "Mateo Ríos",
        "sport": "Rugby",
        "birth_date": date(2000, 9, 3),
        "height_cm": 183.0,
        "body_weight_kg": 92.0,
        "goal": "Aumentar fuerza general y tolerancia al contacto en el scrum.",
        "notes": "Buena tolerancia al volumen. Priorizar técnica en sentadilla y peso muerto.",
        "email": "mateo.rios@demo.local",
    },
    {
        "name": "Lucas Fernández",
        "sport": "Fútbol",
        "birth_date": date(2001, 7, 20),
        "height_cm": 178.0,
        "body_weight_kg": 74.0,
        "goal": "Optimizar VAM y capacidad aeróbica para competición.",
        "notes": "Mediocampista. Historial de progresión positiva en tests aeróbicos.",
        "email": "lucas.fernandez@demo.local",
    },
    {
        "name": "Martín González",
        "sport": "Hockey",
        "birth_date": date(1999, 11, 8),
        "height_cm": 175.0,
        "body_weight_kg": 70.0,
        "goal": "Consolidar resistencia intermedia y estabilidad en zonas 3-4.",
        "notes": "Progreso estable. Buen cumplimiento de sesiones MAS.",
    },
    {
        "name": "Tomás Rodríguez",
        "sport": "Rugby",
        "birth_date": date(2000, 2, 14),
        "height_cm": 181.0,
        "body_weight_kg": 85.0,
        "goal": "Desarrollar base aeróbica inicial.",
        "notes": "Tercera línea. Pocos tests registrados en pretemporada.",
    },
    {
        "name": "Camila Estévez",
        "sport": "Fútbol",
        "birth_date": date(2003, 1, 5),
        "height_cm": 165.0,
        "body_weight_kg": 58.0,
        "goal": "Evaluar resistencia intermitente con Yo-Yo RI1.",
        "notes": "Caso demo: historial centrado en Yo-Yo.",
    },
    {
        "name": "Valentina Morales",
        "sport": "Atletismo",
        "birth_date": date(2001, 5, 18),
        "height_cm": 170.0,
        "body_weight_kg": 60.0,
        "goal": "Integrar VAM, velocidad MSS y RSA en pretemporada.",
        "notes": "Perfil completo: aeróbico, velocidad y fatiga por sprints.",
    },
    {
        "name": "Diego Acosta",
        "sport": "Atletismo",
        "birth_date": date(2002, 8, 30),
        "height_cm": 176.0,
        "body_weight_kg": 72.0,
        "goal": "Desarrollar velocidad pura (MSS) sin base VAM clásica.",
        "notes": "Extremo. Dashboard con tests de velocidad.",
    },
    {
        "name": "Sofía Navarro",
        "sport": "Hockey",
        "birth_date": date(2002, 12, 2),
        "height_cm": 168.0,
        "body_weight_kg": 63.0,
        "goal": "Control aeróbico y monitoreo de fatiga RSA.",
        "notes": "VAM + RSA sin historial MSS.",
    },
]

RESISTENCIA_VAM_TESTS: dict[str, list[tuple[int, str, float, float | None, str]]] = {
    "Lucía Fernández": [
        (75, "vam_2000m", 2000, 8.1, "Control pretemporada"),
        (40, "vam_5min", 5, 1320, "Progreso aeróbico"),
        (14, "vam_2000m", 2000, 7.65, "Mejor marca reciente"),
    ],
    "Mateo Ríos": [
        (70, "vam_5min", 5, 1580, "Base aeróbica rugby"),
        (35, "vam_2000m", 2000, 7.5, "Control in-season"),
    ],
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
    "Diego Acosta": [
        (88, "vam_2000m", 2000, 7.35, "Base aeróbica — complemento al trabajo MSS"),
        (42, "vam_5min", 5, 1360, "Control 5 min pretemporada"),
    ],
}

RESISTENCIA_SPEED_TESTS: dict[str, list[tuple[int, float, float, str]]] = {
    "Lucía Fernández": [
        (50, 30.0, 4.45, "MSS 30m — control"),
        (20, 100.0, 13.8, "MSS 100m"),
    ],
    "Lucas Fernández": [
        (55, 30.0, 4.35, "Sprint 30m"),
        (25, 100.0, 12.9, "MSS 100m"),
    ],
    "Mateo Ríos": [
        (48, 30.0, 4.55, "30m pesado"),
        (22, 100.0, 13.4, "100m control"),
    ],
    "Camila Estévez": [
        (40, 30.0, 4.65, "30m técnica"),
        (15, 100.0, 14.2, "100m"),
    ],
    "Tomás Rodríguez": [
        (42, 30.0, 4.7, "30m inicial"),
        (18, 100.0, 13.9, "100m"),
    ],
    "Sofía Navarro": [
        (33, 30.0, 4.5, "30m hockey"),
    ],
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


def _is_protected_name(name: str) -> bool:
    return name in PROTECTED_ATHLETE_NAMES


def _protected_team_ids(db: Session, admin: User) -> set[int]:
    ids: set[int] = set()
    for protected_name in PROTECTED_ATHLETE_NAMES:
        athlete = (
            db.query(Athlete)
            .filter(Athlete.coach_id == admin.id, Athlete.name == protected_name)
            .first()
        )
        if athlete is not None and athlete.team_id is not None:
            ids.add(athlete.team_id)
    return ids


def _fill_missing_profile_fields(existing: Athlete, athlete_data: dict) -> None:
    """Completa campos vacíos del catálogo demo; no pisa valores ya cargados."""
    for key, value in athlete_data.items():
        if key == "name" or value is None:
            continue
        current = getattr(existing, key, None)
        if current is None:
            setattr(existing, key, value)
            continue
        if isinstance(current, str) and not current.strip():
            setattr(existing, key, value)


def _get_admin(db: Session, admin_email: str = ADMIN_EMAIL) -> User:
    admin = db.query(User).filter(User.email == admin_email).first()
    if admin:
        return admin
    admin = User(
        email=admin_email,
        password_hash=hash_password(ADMIN_PASSWORD),
        is_admin=True,
    )
    db.add(admin)
    db.flush()
    return admin


def has_showcase_data(db: Session, admin_email: str = ADMIN_EMAIL) -> bool:
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        return False
    return (
        db.query(Team)
        .filter(
            Team.coach_id == admin.id,
            Team.name == SHOWCASE_TEAM_MARKER,
        )
        .first()
        is not None
    )


def has_demo_data(db: Session, admin_email: str = ADMIN_EMAIL) -> bool:
    """Compat: fuerza demo presente si existe Lucía."""
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        return False
    return (
        db.query(Athlete)
        .filter(Athlete.coach_id == admin.id, Athlete.name == "Lucía Fernández")
        .first()
        is not None
    )


def has_resistencia_demo_data(db: Session, admin_email: str = ADMIN_EMAIL) -> bool:
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        return False
    return (
        db.query(Athlete)
        .filter(Athlete.coach_id == admin.id, Athlete.name == "Lucas Fernández")
        .first()
        is not None
    )


def seed_demo_teams(db: Session, admin_email: str = ADMIN_EMAIL) -> int:
    admin = _get_admin(db, admin_email)
    created = 0
    for team_name in DEMO_TEAMS:
        exists = (
            db.query(Team)
            .filter(Team.coach_id == admin.id, Team.name == team_name)
            .first()
        )
        if exists is None:
            db.add(Team(coach_id=admin.id, name=team_name))
            created += 1
    db.commit()
    return created


def assign_demo_teams(db: Session, admin_email: str = ADMIN_EMAIL) -> int:
    admin = _get_admin(db, admin_email)
    protected_teams = _protected_team_ids(db, admin)
    teams = {
        t.name: t
        for t in db.query(Team).filter(Team.coach_id == admin.id).all()
    }
    updated = 0
    for athlete_name, team_name in ATHLETE_TEAM_BY_NAME.items():
        if _is_protected_name(athlete_name):
            continue
        athlete = (
            db.query(Athlete)
            .filter(Athlete.coach_id == admin.id, Athlete.name == athlete_name)
            .first()
        )
        team = teams.get(team_name)
        if athlete is None or team is None:
            continue
        if team.id in protected_teams:
            continue
        if athlete.team_id in protected_teams:
            continue
        if athlete.team_id != team.id:
            athlete.team_id = team.id
            updated += 1
    db.commit()
    return updated


def _upsert_athlete(db: Session, admin: User, athlete_data: dict) -> tuple[Athlete, bool]:
    if _is_protected_name(athlete_data["name"]):
        existing = (
            db.query(Athlete)
            .filter(Athlete.coach_id == admin.id, Athlete.name == athlete_data["name"])
            .first()
        )
        if existing:
            return existing, False
        # No crear duplicado si el nombre protegido no existe (solo Nico la crea).
        raise ValueError(f"Atleta protegido ausente: {athlete_data['name']}")

    existing = (
        db.query(Athlete)
        .filter(Athlete.coach_id == admin.id, Athlete.name == athlete_data["name"])
        .first()
    )
    if existing:
        _fill_missing_profile_fields(existing, athlete_data)
        return existing, False
    athlete = Athlete(coach_id=admin.id, **athlete_data)
    db.add(athlete)
    db.flush()
    return athlete, True


def seed_strength_logs(db: Session, admin_email: str = ADMIN_EMAIL) -> int:
    admin = _get_admin(db, admin_email)
    created_logs = 0

    for athlete_name, rows in DEMO_STRENGTH_LOGS.items():
        athlete = (
            db.query(Athlete)
            .filter(Athlete.coach_id == admin.id, Athlete.name == athlete_name)
            .first()
        )
        if athlete is None or _is_protected_name(athlete_name):
            continue

        for exercise_name, days_ago, weight, reps in rows:
            exercise = (
                db.query(Exercise).filter(Exercise.name == exercise_name).first()
            )
            if exercise is None:
                continue
            log_date = _demo_history_date(days_ago)
            duplicate = (
                db.query(TrainingLog)
                .filter(
                    TrainingLog.athlete_id == athlete.id,
                    TrainingLog.exercise_id == exercise.id,
                    TrainingLog.date == log_date,
                    TrainingLog.weight == weight,
                    TrainingLog.reps == reps,
                )
                .first()
            )
            if duplicate:
                continue
            rm = round(compute_estimated_rm(weight, reps, exercise), 2)
            db.add(
                TrainingLog(
                    athlete_id=athlete.id,
                    exercise_id=exercise.id,
                    date=log_date,
                    weight=weight,
                    reps=reps,
                    estimated_rm=rm,
                )
            )
            created_logs += 1

    db.commit()
    return created_logs


def seed_resistencia_demo_data(
    db: Session, admin_email: str = ADMIN_EMAIL
) -> tuple[int, int, int, int]:
    admin = _get_admin(db, admin_email)
    created_athletes = 0
    created_vam_tests = 0
    created_speed_tests = 0
    created_rsa_tests = 0

    for athlete_data in RESISTENCIA_ATHLETES:
        if _is_protected_name(athlete_data["name"]):
            continue
        athlete, is_new = _upsert_athlete(db, admin, athlete_data)
        if is_new:
            created_athletes += 1

        for days_ago, test_type, value1, value2, notes in RESISTENCIA_VAM_TESTS.get(
            athlete_data["name"], []
        ):
            test_date = _demo_history_date(days_ago)
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
            test_date = _demo_history_date(days_ago)
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
            test_date = _demo_history_date(days_ago)
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


def seed_demo_data(db: Session, admin_email: str = ADMIN_EMAIL) -> int:
    admin = _get_admin(db, admin_email)
    created_athletes = 0

    for athlete_data in DEMO_ATHLETES:
        _, is_new = _upsert_athlete(db, admin, athlete_data)
        if is_new:
            created_athletes += 1

    db.commit()
    return created_athletes


def link_showcase_sport_positions(db: Session, admin_email: str = ADMIN_EMAIL) -> int:
    admin = _get_admin(db, admin_email)
    updated = 0
    for athlete_name, (sport_name, position_name) in ATHLETE_SPORT_POSITION.items():
        if _is_protected_name(athlete_name):
            continue
        athlete = (
            db.query(Athlete)
            .filter(Athlete.coach_id == admin.id, Athlete.name == athlete_name)
            .first()
        )
        if athlete is None:
            continue
        sport = db.query(Sport).filter(Sport.name == sport_name).first()
        if sport is None:
            continue
        position = (
            db.query(Position)
            .filter(Position.sport_id == sport.id, Position.name == position_name)
            .first()
        )
        if position is None:
            continue
        changed = False
        if athlete.sport_id is None:
            athlete.sport_id = sport.id
            changed = True
        if athlete.position_id is None:
            athlete.position_id = position.id
            changed = True
        if changed:
            updated += 1
    db.commit()
    return updated


def seed_showcase_data(db: Session, admin_email: str = ADMIN_EMAIL) -> dict[str, int]:
    """Equipos + atletas + historial fuerza/resistencia (idempotente)."""
    teams_new = seed_demo_teams(db, admin_email)
    athletes_f = seed_demo_data(db, admin_email)
    res_a, res_vam, res_speed, res_rsa = seed_resistencia_demo_data(db, admin_email)
    logs_f = seed_strength_logs(db, admin_email)
    teams_linked = assign_demo_teams(db, admin_email)
    positions_linked = link_showcase_sport_positions(db, admin_email)
    return {
        "teams_created": teams_new,
        "fuerza_athletes_new": athletes_f,
        "strength_logs_new": logs_f,
        "resistencia_athletes_new": res_a,
        "vam_tests_new": res_vam,
        "speed_tests_new": res_speed,
        "rsa_tests_new": res_rsa,
        "team_assignments_updated": teams_linked,
        "sport_positions_linked": positions_linked,
    }


def showcase_inventory(db: Session, admin_email: str = ADMIN_EMAIL) -> dict[str, object]:
    """Resumen para describir el plantel demo a Nico."""
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        return {"error": "admin no encontrado"}

    teams = (
        db.query(Team)
        .filter(Team.coach_id == admin.id, Team.name.in_(DEMO_TEAMS))
        .order_by(Team.name)
        .all()
    )
    athletes_detail = []
    totals = {
        "strength_logs": 0,
        "vam_tests": 0,
        "speed_tests": 0,
        "rsa_tests": 0,
    }

    for name in sorted(SHOWCASE_ATHLETE_NAMES):
        athlete = (
            db.query(Athlete)
            .filter(Athlete.coach_id == admin.id, Athlete.name == name)
            .first()
        )
        if athlete is None:
            athletes_detail.append({"name": name, "missing": True})
            continue
        team_name = None
        if athlete.team_id:
            team = db.get(Team, athlete.team_id)
            team_name = team.name if team else None
        logs = db.query(TrainingLog).filter(TrainingLog.athlete_id == athlete.id).count()
        vam = db.query(VamTest).filter(VamTest.athlete_id == athlete.id).count()
        spd = db.query(SpeedTest).filter(SpeedTest.athlete_id == athlete.id).count()
        rsa = db.query(RsaFatigueTest).filter(RsaFatigueTest.athlete_id == athlete.id).count()
        totals["strength_logs"] += logs
        totals["vam_tests"] += vam
        totals["speed_tests"] += spd
        totals["rsa_tests"] += rsa
        athletes_detail.append(
            {
                "name": name,
                "team": team_name,
                "sport": athlete.sport,
                "strength_logs": logs,
                "vam_tests": vam,
                "speed_tests": spd,
                "rsa_tests": rsa,
            }
        )

    canonical = {
        "strength_logs": sum(len(v) for v in DEMO_STRENGTH_LOGS.values()),
        "vam_tests": sum(len(v) for v in RESISTENCIA_VAM_TESTS.values()),
        "speed_tests": sum(len(v) for v in RESISTENCIA_SPEED_TESTS.values()),
        "rsa_tests": sum(len(v) for v in RESISTENCIA_RSA_TESTS.values()),
        "history_anchor": DEMO_HISTORY_ANCHOR.isoformat(),
    }

    return {
        "demo_teams": [{"name": t.name, "athletes": db.query(Athlete).filter(Athlete.team_id == t.id, Athlete.name.in_(SHOWCASE_ATHLETE_NAMES)).count()} for t in teams],
        "showcase_athletes": athletes_detail,
        "totals_showcase": totals,
        "canonical_seed_counts": canonical,
        "note_calculators": (
            "HIIT / MAS / Tempo Run son calculadoras en la UI (sin guardado en DB). "
            "Para resistencia persisten VAM, tests de velocidad (MSS) y RSA."
        ),
    }
