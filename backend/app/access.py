"""Autorización por rol (admin vs coach) y alcance de datos."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Query, Session

from . import models

ROLE_ADMIN = "admin"
ROLE_COACH = "coach"
PLATFORM_ADMIN_EMAIL = "admin@ns.com"


def is_admin(user: models.User) -> bool:
    return user.role == ROLE_ADMIN


def can_access_coach_data(user: models.User, coach_id: int) -> bool:
    return is_admin(user) or user.id == coach_id


def assert_can_access_athlete(user: models.User, athlete: models.Athlete | None) -> None:
    if athlete is None:
        raise HTTPException(status_code=404, detail="Athlete not found")
    if not can_access_coach_data(user, athlete.coach_id):
        raise HTTPException(status_code=403, detail="Access denied")


def get_team_for_user(db: Session, team_id: int, user: models.User) -> models.Team:
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    if not is_admin(user) and team.coach_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return team


def teams_query(db: Session, user: models.User) -> Query:
    query = db.query(models.Team)
    if not is_admin(user):
        query = query.filter(models.Team.coach_id == user.id)
    return query.order_by(models.Team.name.asc())


def athletes_query(
    db: Session,
    user: models.User,
    team_id: Optional[int] = None,
) -> Query:
    query = db.query(models.Athlete)
    if not is_admin(user):
        query = query.filter(models.Athlete.coach_id == user.id)
    if team_id is not None:
        get_team_for_user(db, team_id, user)
        query = query.filter(models.Athlete.team_id == team_id)
    return query


def training_logs_query(db: Session, user: models.User) -> Query:
    query = db.query(models.TrainingLog).join(models.Athlete)
    if not is_admin(user):
        query = query.filter(models.Athlete.coach_id == user.id)
    return query
