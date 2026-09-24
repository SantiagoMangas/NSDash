"""Helpers para equipos, catálogos y serialización de atletas."""

from __future__ import annotations

import logging
import re
import unicodedata
from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Query, Session, joinedload

from . import models, schemas

logger = logging.getLogger(__name__)

# Resultado de la última migración legacy sport → sport_id (diagnóstico en startup).
LAST_SPORT_LEGACY_MIGRATION: dict[str, int | list[dict[str, object]]] = {
    "matched": 0,
    "unmigrated": 0,
    "unmigrated_athletes": [],
}


def normalize_catalog_name(value: str) -> str:
    """Comparación case-insensitive sin acentos ni espacios extra."""
    stripped = value.strip()
    normalized = unicodedata.normalize("NFD", stripped)
    without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    collapsed = re.sub(r"\s+", " ", without_marks).strip().lower()
    return collapsed


def calculate_age(birth_date: Optional[date]) -> Optional[int]:
    if birth_date is None:
        return None
    today = date.today()
    years = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


def get_owned_team(db: Session, team_id: int, coach_id: int) -> models.Team:
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.coach_id != coach_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return team


def coach_athletes_query(
    db: Session,
    coach_id: int,
    team_id: Optional[int] = None,
) -> Query:
    query = db.query(models.Athlete).filter(models.Athlete.coach_id == coach_id)
    if team_id is not None:
        get_owned_team(db, team_id, coach_id)
        query = query.filter(models.Athlete.team_id == team_id)
    return query


def validate_sport_id(db: Session, sport_id: Optional[int]) -> None:
    if sport_id is None:
        return
    if db.query(models.Sport).filter(models.Sport.id == sport_id).first() is None:
        raise HTTPException(status_code=400, detail="Sport not found")


def validate_position_id(
    db: Session,
    position_id: Optional[int],
    sport_id: Optional[int],
) -> None:
    if position_id is None:
        return
    position = db.query(models.Position).filter(models.Position.id == position_id).first()
    if position is None:
        raise HTTPException(status_code=400, detail="Position not found")
    if sport_id is not None and position.sport_id != sport_id:
        raise HTTPException(
            status_code=400,
            detail="Position does not belong to the selected sport",
        )


def validate_athlete_relations(
    db: Session,
    coach_id: int,
    team_id: Optional[int] = None,
    sport_id: Optional[int] = None,
    position_id: Optional[int] = None,
) -> None:
    if team_id is not None:
        get_owned_team(db, team_id, coach_id)
    validate_sport_id(db, sport_id)
    effective_sport_id = sport_id
    if position_id is not None:
        position = db.query(models.Position).filter(models.Position.id == position_id).first()
        if position is None:
            raise HTTPException(status_code=400, detail="Position not found")
        if effective_sport_id is None:
            effective_sport_id = position.sport_id
        elif position.sport_id != effective_sport_id:
            raise HTTPException(
                status_code=400,
                detail="Position does not belong to the selected sport",
            )


def sync_legacy_sport_string(db: Session, athlete: models.Athlete) -> None:
    """Mantiene `sport` (string) alineado con sport_id para clientes legacy."""
    if athlete.sport_id is None:
        return
    sport = db.query(models.Sport).filter(models.Sport.id == athlete.sport_id).first()
    if sport is not None:
        athlete.sport = sport.name


def serialize_athlete(athlete: models.Athlete, db: Session) -> schemas.AthleteResponse:
    sport_name = athlete.sport
    if athlete.sport_ref is not None:
        sport_name = athlete.sport_ref.name
    elif athlete.sport_id is not None:
        sport_row = db.query(models.Sport).filter(models.Sport.id == athlete.sport_id).first()
        if sport_row is not None:
            sport_name = sport_row.name

    position_name: Optional[str] = None
    if athlete.position_ref is not None:
        position_name = athlete.position_ref.name
    elif athlete.position_id is not None:
        position_row = (
            db.query(models.Position).filter(models.Position.id == athlete.position_id).first()
        )
        if position_row is not None:
            position_name = position_row.name

    return schemas.AthleteResponse(
        id=athlete.id,
        name=athlete.name,
        coach_id=athlete.coach_id,
        team_id=athlete.team_id,
        sport=sport_name,
        sport_id=athlete.sport_id,
        position_id=athlete.position_id,
        position_name=position_name,
        height_cm=athlete.height_cm,
        body_weight_kg=athlete.body_weight_kg,
        goal=athlete.goal,
        notes=athlete.notes,
        birth_date=athlete.birth_date,
        age=calculate_age(athlete.birth_date),
        injuries=athlete.injuries,
        email=athlete.email,
        phone=athlete.phone,
        photo_url=athlete.photo_url,
    )


def athlete_query_with_relations(db: Session, coach_id: int, team_id: Optional[int] = None):
    return (
        coach_athletes_query(db, coach_id, team_id)
        .options(
            joinedload(models.Athlete.sport_ref),
            joinedload(models.Athlete.position_ref),
        )
        .order_by(models.Athlete.name.asc())
    )


def migrate_legacy_sport_to_sport_id(db: Session) -> None:
    """Mapea athletes.sport (texto) → sport_id por nombre de catálogo."""
    sports = db.query(models.Sport).all()
    by_normalized = {normalize_catalog_name(s.name): s for s in sports}

    matched = 0
    unmigrated: list[dict[str, object]] = []

    athletes = (
        db.query(models.Athlete)
        .filter(models.Athlete.sport_id.is_(None))
        .all()
    )
    for athlete in athletes:
        raw = athlete.sport
        if raw is None or not str(raw).strip():
            continue
        key = normalize_catalog_name(str(raw))
        sport = by_normalized.get(key)
        if sport is None:
            unmigrated.append(
                {
                    "athlete_id": athlete.id,
                    "name": athlete.name,
                    "legacy_sport": raw,
                }
            )
            continue
        athlete.sport_id = sport.id
        athlete.sport = sport.name
        matched += 1

    if matched:
        db.commit()

    LAST_SPORT_LEGACY_MIGRATION["matched"] = matched
    LAST_SPORT_LEGACY_MIGRATION["unmigrated"] = len(unmigrated)
    LAST_SPORT_LEGACY_MIGRATION["unmigrated_athletes"] = unmigrated

    if matched or unmigrated:
        logger.info(
            "Migración sport legacy → sport_id: matched=%d unmigrated=%d",
            matched,
            len(unmigrated),
        )
        for row in unmigrated:
            logger.info(
                "Sport sin matchear: athlete_id=%s name=%s legacy_sport=%s",
                row["athlete_id"],
                row["name"],
                row["legacy_sport"],
            )
